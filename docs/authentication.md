# BlueQuirk Authentication — Architecture Reference

Authentication is a **native domain inside the Spring Boot backend** (package
`shop.bluequirk.blue_quirk_backend.identity`). There is no Keycloak and no separate
Identity Service in the target architecture; the only datastore is MariaDB.

> Keycloak, the separate Identity Service, and the auth-only PostgreSQL have been
> removed. For the one-time import of existing Keycloak users, see the
> [migration runbook](./auth-migration-runbook.md).

## 1. High-level design

- **Stateless JWT access tokens** (HS512, 15 min) signed by the backend. Issuer
  claim `iss=bluequirk`. Validated locally on every request — no network hop.
- **Opaque refresh tokens** (256-bit, 7 days / 30 days "remember me"), stored only
  as a SHA-256 hash, with **rotation** and **reuse detection**. A refresh-token row
  doubles as a **device session**.
- **BCrypt** password hashing (strength 12) via a `DelegatingPasswordEncoder` that
  also verifies legacy Keycloak PBKDF2 hashes for transparent migration.
- **Role + permission** authorization. Role names are lowercase (`admin`, `user`,
  future `vendor`) and emitted as JWT authorities alongside fine-grained permissions.
- **Audit logging**, **account lockout**, and **rate limiting** built in.

## 2. Package layout (`identity/`)

```
identity/
  auth/          AuthController, AuthService          (login/register/refresh/logout)
  account/       AccountController                    (me, profile, change/forgot/reset, verify, sessions)
  user/          User* services, AdminUserController  (account lifecycle + admin directory)
  role/ permission/  Role, Permission (+ repos)       (RBAC model)
  token/         RefreshToken, *Token, TokenService   (issuance/rotation/revocation)
  verification/  EmailVerificationService
  password/      PasswordResetService
  jwt/           JwtService, DelegatingIssuerJwtDecoder
  security/      encoders, RateLimiter, TokenGenerator, RequestContext
  audit/         AuditLog, AuditService
  email/         IdentityEmailService (uses existing EmailProvider)
  config/        IdentityProperties, SecurityBeansConfig, IdentityDataInitializer
  dto/ mapper/ validator/ exception/
```

Business modules never import `identity.*`; they only read the authenticated
principal and authorities from Spring Security's `SecurityContext`.

## 3. Data model (MariaDB)

| Table | Purpose |
|-------|---------|
| `users` | The account (email, `password_hash`, enabled, `email_verified`, lockout counters, MFA reserved, audit timestamps). Reuses the existing table so all business FKs are preserved. |
| `roles`, `permissions`, `role_permissions`, `user_roles` | RBAC. |
| `refresh_tokens` | Hashed refresh tokens = device sessions (family id, device metadata). |
| `email_verification_tokens`, `password_reset_tokens` | Single-use, hashed, short-TTL. |
| `audit_logs` | Append-only security event trail. |

**Consolidation decisions (DRY):** a separate `UserSession` table is unnecessary — a
session *is* a refresh-token family. A separate `LoginAttempt` table is unnecessary —
lockout uses counters on `users` plus `audit_logs` events.

## 4. Endpoints

Public (rate-limited, no token):

| Method | Path | Purpose |
|--------|------|---------|
| POST | `/api/auth/register` | Create account, auto-login, send verification email |
| POST | `/api/auth/login` | Authenticate; returns access + refresh + user |
| POST | `/api/auth/refresh` | Rotate refresh token, issue new access token |
| POST | `/api/auth/logout` | Revoke the presented refresh token |
| POST | `/api/account/forgot-password` | Email a reset link (generic response) |
| POST | `/api/account/reset-password` | Set a new password from a reset token |
| POST | `/api/account/verify-email?token=` | Confirm email ownership |

Authenticated:

| Method | Path | Purpose |
|--------|------|---------|
| GET | `/api/account/me` | Current user |
| PUT | `/api/account/profile` | Update display name |
| POST | `/api/account/change-password` | Change password (requires current) |
| POST | `/api/account/resend-verification` | Re-send verification email |
| GET/DELETE | `/api/account/sessions` | List / revoke all device sessions |

Admin (`hasAuthority('admin')`):

| Method | Path | Purpose |
|--------|------|---------|
| GET | `/api/users` | User directory |
| GET | `/api/users/{id}` | One user |
| PATCH | `/api/users/{id}` | Update name / enabled / roles |
| DELETE | `/api/users/{id}` | Delete user |

## 5. Token & session model

- **Access token** carries `sub` (local user id), `email`, `name`, `roles`,
  `authorities`, `email_verified`, `jti`. Short-lived; never stored server-side.
- **Refresh token** rotates on every use. The old token is revoked; the new one keeps
  the same `family_id`. **Presenting an already-rotated (revoked) token** ⇒ the whole
  family is revoked and the event is audited (stolen-token containment).
- **Logout** revokes one refresh token; **reset password** and `DELETE /sessions`
  revoke all of the user's tokens.

## 6. Security controls

| Control | Implementation |
|---------|----------------|
| Password hashing | BCrypt(12); legacy Keycloak PBKDF2 verified then re-hashed on next login |
| Brute force | Lockout after 5 failures for 15 min (configurable) |
| Rate limiting | Per-IP fixed window on login/register/forgot (in-memory; Redis for multi-replica) |
| Token theft | Refresh rotation + family reuse detection; short access-token TTL |
| Enumeration | `forgot-password` always returns a generic message |
| Secrets at rest | Refresh/verify/reset tokens stored as SHA-256 hashes only |
| Headers | `X-Frame-Options: DENY`, `Referrer-Policy`, `nosniff` (backend) + HSTS/CSP (Caddy) |
| Audit | All auth events recorded in `audit_logs` |
| MFA | Schema reserved (`users.mfa_enabled`, `mfa_secret`); flow to be added |

**Frontend XSS note:** tokens are currently in `localStorage`. The recommended
hardening (httpOnly refresh cookie + in-memory access token + strict CSP at Caddy)
is tracked in the runbook; the server design already supports it.

## 7. Configuration (`bluequirk.security.*`)

All values are environment-overridable. Key vars: `JWT_SECRET` (required in prod),
`AUTH_ADMIN_EMAIL` / `AUTH_ADMIN_PASSWORD` (one-time admin bootstrap),
`APP_FRONTEND_BASE_URL` (email links), `RESEND_API_KEY` (email transport). TTLs,
lockout thresholds and rate limits are all in `application.properties`.

## 8. Key design decisions

1. **HS512 symmetric JWT, no new dependency.** Nimbus is already on the classpath via
   `oauth2-jose`. RS256 is a drop-in later (mobile/public-key) — only `SecurityBeansConfig`
   changes.
2. **Lowercase role names.** Keeps every existing `hasAuthority("admin")` rule valid
   and makes native/Keycloak tokens interchangeable during migration.
3. **Reuse the `users` table.** Zero business-FK churn; identity owns it conceptually.
4. **Fail-fast secret + best-effort email.** Startup aborts on a weak/default
   `JWT_SECRET` under the `docker`/`prod` profiles (`JwtSecretValidator`). Transactional
   emails (verification, reset) are best-effort — a mail outage never fails the user
   action; the token persists for a retry.
5. **One-time Keycloak importer.** `identity/migration/` imports users from a realm
   export: PBKDF2 hashes are re-verifiable (lazy BCrypt upgrade on next login),
   otherwise the account is flagged `passwordResetRequired` with a reset token issued.
   Idempotent; runs on startup only when `bluequirk.security.migration.keycloak-export-file` is set.
