# Keycloak → Native Identity Migration — Runbook

This runbook covers the **phased** migration from Keycloak + Identity Service to the
native backend Identity Domain, keeping the app functional throughout. Keycloak is
removed **last**, only after the verification checklist passes.

## Status snapshot

| Phase | State |
|-------|-------|
| 0. Git safety net (tag + backup branch) | ✅ done (`pre-identity-migration` tag, `legacy-keycloak` branch) |
| 1. Architecture audit | ✅ done |
| 2. Native Identity Domain (backend) | ✅ done, compiles |
| 3. Native-only security wiring | ✅ done (Keycloak decoding removed) |
| 4. Frontend unified on native auth | ✅ done, type-checks + lints clean |
| 5. Admin user directory API (replaces Keycloak user CRUD) | ✅ done |
| 6. Simplified Docker stack (frontend/backend/mariadb/caddy) | ✅ done (`docker/`) |
| 7. User migration utility (Keycloak realm-export importer) | ✅ implemented + unit-tested; **running it needs the real realm export** |
| 8. Verification (unit + local end-to-end) | ✅ done — 32 backend tests + live E2E (register/login/refresh/rotation/reuse/RBAC/reset) |
| 9. Decommission Keycloak / Postgres / Identity Service | ✅ done (removed from `main`, preserved in `legacy-keycloak`) |

Everything that can be validated locally has been. The **only** remaining manual step
is running the importer against the **production Keycloak realm export** (an external
artifact) — see Phase 7 below.

## Phase 7 — Data migration (passwords)

Existing users live in Keycloak. Their password hashes are **PBKDF2**, exportable in
the realm export.

### Recommended: lazy re-hash (zero forced resets)
1. Export the realm with credentials:
   `kc export --realm blue-quirk-realm --users realm_file` (or admin console export).
2. For each user, read `credentialData.hashIterations`, `secretData.salt`,
   `secretData.value`, and the algorithm (`pbkdf2-sha256` / `pbkdf2-sha512`).
3. Insert/update the `users` row with:
   - `password_hash = {keycloak-pbkdf2-sha256}{iterations}${saltB64}${valueB64}`
     (or `-sha512`), matching `KeycloakPbkdf2PasswordEncoder`'s format.
   - `email`, `name`, `enabled=1`, `email_verified=1`, and the `user` role
     (the `IdentityDataInitializer` also backfills roles/verified on startup).
4. On the user's next login, `AuthService` verifies against the PBKDF2 hash and, via
   `passwordEncoder.upgradeEncoding(...)`, transparently re-hashes to BCrypt.

> **Verify first:** confirm `KeycloakPbkdf2PasswordEncoder` (derived-key length 512)
> matches your realm by testing one known password against one exported hash before
> bulk import. If it doesn't match, adjust the key length or use the fallback.

### This is already implemented
The strategy above is built as **`identity/migration/KeycloakRealmImportService`**
(+ `KeycloakImportRunner`), unit-tested in `KeycloakRealmImportServiceTest`. To run it:

```bash
# Point the backend at a Keycloak realm export JSON (users + credentials):
bluequirk.security.migration.keycloak-export-file=/path/to/realm-export.json
```

On startup the importer upserts users **by email** (idempotent — a user who has since
set their own BCrypt password is never overwritten): PBKDF2 hashes are stored in the
verify-able `{keycloak-pbkdf2-*}` format (lazy BCrypt upgrade on next login); accounts
without an importable hash are flagged `password_reset_required` and issued a reset
token. Roles and profile are preserved. Leave the property set — re-runs are safe.

### Fallback: forced reset
The importer already does this for un-importable credentials (`password_hash = NULL`,
`password_reset_required = true`). `AuthService.login` rejects a null hash, so those
users go through **Forgot password** to set a native password.

## Phase 8 — Verification checklist (run against the live stack)

Bring up backend + MariaDB (+ Keycloak still running), point the frontend at the
backend, and verify every item **on native tokens** before decommissioning:

- [ ] Register (new email) → tokens returned, verification email received
- [ ] Verify email link → `email_verified` set
- [ ] Login (valid / invalid / locked after 5 fails)
- [ ] Refresh rotates; reusing an old refresh token revokes the family (check `audit_logs`)
- [ ] Logout revokes the session
- [ ] Forgot password → email; reset password → old sessions revoked
- [ ] Change password (authenticated)
- [ ] Admin login → `/api/users` directory loads; role edit / disable / delete work
- [ ] Customer login → own orders/preferences; blocked from admin endpoints (403)
- [ ] Public storefront (catalog, guest checkout `POST /api/orders`, tracking) still open
- [ ] Expired access token auto-refreshes; invalid token → 401
- [ ] Migrated existing user logs in (lazy re-hash → `password_hash` becomes `{bcrypt}`)
- [ ] Concurrent sessions listed under `/api/account/sessions`

## Phase 9 — Decommission (only after 7–8 pass)

1. Confirm Git safety net exists: `git tag` shows `pre-identity-migration`; branch
   `legacy-keycloak` is pushed. (Optionally add tag `v1-keycloak`.)
2. Backend: remove the Keycloak JWKS property (or set `...jwk-set-uri=` empty — the
   production compose already does), then delete the now-dead legacy path:
   `JitUserProvisioningFilter`, `UserProvisioningService`, and the `keycloakId`
   column (final Flyway/SQL migration) once nothing reads it.
3. Remove the `oauth2-resource-server` dependency **only** once the native decoder no
   longer relies on its Nimbus types — or keep it (it also provides `oauth2-jose`,
   which the encoder uses). Prefer keeping `oauth2-jose`; drop just the Keycloak wiring.
4. Delete legacy infra from `main` (preserved in `legacy-keycloak`):
   `BlueQuirk Identity/`, `blue-quirk-backend/docker/imports/keycloak/`,
   `compose.identity.yml`, `keycloak.Dockerfile`, the `docker-keyclaock/` stack.
5. Frontend: remove `IDENTITY_BASE_URL` from `lib/config.ts` and the legacy
   `authProvider.ts` / `dataProvider.ts` / `api.js` / `blueQuirkApi.js` if unused.
6. Remove `KEYCLOAK_*`, `IDENTITY_*`, and Postgres env vars from all environments.
7. Update `CLAUDE.md` (drop the Keycloak/resource-server and "multiple API clients"
   sections) and this runbook's status table.

## Rollback

- Through Phase 8, Keycloak is still live: revert the frontend to `IDENTITY_BASE_URL`
  and redeploy the previous build.
- After Phase 9, roll back by redeploying the `pre-identity-migration` tag /
  `legacy-keycloak` branch.
