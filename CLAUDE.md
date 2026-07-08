# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Architecture

BlueQuirk is a multilingual (French/Arabic) e-commerce platform split across independent modules in one repo:

- **`blue-quirk-frontend/`** — Next.js 15 (App Router) storefront + admin UI. React 18, TypeScript, Tailwind CSS v4, TanStack Query, axios.
- **`blue-quirk-backend/`** — Spring Boot 3.5 shop API (`shop.bluequirk.blue_quirk_backend`). Java 23, JPA/Hibernate against MariaDB. Includes the native **Identity Domain** (`identity/` package) — Spring Security auth, no external IdP.
- **`docker/`** — The production Docker Compose stack: frontend, backend, MariaDB, Caddy.
- **`docs/`** — Architecture + migration docs (`authentication.md`, `auth-migration-runbook.md`).
- **`cash/`** — Older/experimental admin UI (`cash/admin`, `cash/bq-admin`); not the active app.

> Keycloak, the separate Identity Service, and the auth-only PostgreSQL have been
> removed (history preserved in the `legacy-keycloak` branch / `pre-identity-migration` tag).

### Authentication & authorization
Auth is **native** (Spring Security, MariaDB) — no external IdP. The backend issues its own HS512 **JWT access tokens** (`iss=bluequirk`, 15 min) plus opaque **rotating refresh tokens** (hashed at rest, reuse-detected), and validates access tokens locally as an OAuth2 resource server. `config/JwtAuthConverter.java` maps the JWT's `roles` + `authorities` claims into Spring authorities, and `@EnableMethodSecurity` enables `@PreAuthorize`. The Identity Domain (`identity/`) owns login, registration, refresh, logout, email verification, and password reset (`/api/auth/**`, `/api/account/**`) plus the admin user directory (`/api/users`). The frontend stores `access_token`/`refresh_token` in `localStorage` and attaches them via a single axios interceptor. See `docs/authentication.md`.

> **Auth is native to the backend (Keycloak removed).** The backend has a
> self-contained **Identity Domain** (`identity/` package): Spring Security auth on
> MariaDB with HS512 JWT access tokens, rotating/revocable refresh tokens (with
> reuse detection), RBAC (roles + permissions), email verification, and password
> reset (`/api/auth/**`, `/api/account/**`, admin `/api/users`). `SecurityConfig.java`
> is **fail-closed** (`anyRequest().hasAuthority("admin")`). The frontend auth layer
> is unified on the native backend (one Axios client, `access_token`/`refresh_token`).
> Keycloak, the separate Identity Service, and the auth Postgres have been removed
> (preserved in the `legacy-keycloak` branch / `pre-identity-migration` tag). A
> Keycloak realm-export importer exists for one-time user migration
> (`identity/migration/`). See **`docs/authentication.md`** and
> **`docs/auth-migration-runbook.md`**.

### Internationalization
- **Frontend:** `middleware.ts` rewrites every non-system path to a locale prefix (`/fr` default, or `/ar`), driven by a `lang` cookie. Public-facing pages live under `src/app/[lang]/...` and read `params.lang`. Helpers in `src/lib/i18n.ts` (`withLang`, `getDefaultLang`).
- **Backend:** Translatable content is modeled with separate translation entities (`entity/translation/ProductTranslation`, `CategoryTranslation`). API endpoints take an optional `?lang=` param and return locale-resolved `*Response` DTOs.

### Backend layering
Standard Spring layering under `src/main/java/.../blue_quirk_backend/`: `controller` → `service` → `repository` (Spring Data JPA) → `entity`. Plus `dto` (request/response shapes, `dto/response/PageResponse`), `config` (security, CORS, web/static), `domain` (enums like `AttributeType`, `ProductStatus`), `provider` (`EmailProvider`/`SmtpEmailProvider`), and `utility` (`TemplateEngine` for email templates). Core domains: Product, Category, Attribute/AttributeValue (variant system), Order, User, Image, Email (config + templates). Uploaded images are served from a static `/uploads/**` handler (`WebConfig`) and stored under `blue-quirk-backend/uploads/`.

### Frontend admin
There are two admin surfaces. `src/app/admin-v2/` is the active custom admin (products, users) using components in `src/components/admin/` (`DataTable`, `Sidebar`, `Topbar`). The project also pulls in **react-admin** (`react-admin`, `ra-data-simple-rest`, `ra-input-rich-text`) for parts of the admin tooling.

## Frontend API client (unified)

The frontend uses **one** Axios client — `src/services/api.ts` — with a single base
URL (`API_BASE_URL` from `src/lib/config.ts`, `<host>:9090/api` locally), one token
convention (`access_token` / `refresh_token` in `localStorage`), and one refresh
mechanism (a response interceptor that calls `/api/auth/refresh` once on a 401 and
retries). `src/api/client.ts` re-exports this same instance for backwards
compatibility. Server-side reads use `src/services/product.service.ts`. When wiring
new API calls, import the shared client from `@/services/api` — do not create new
axios instances or new token keys.

> A few legacy `.js` modules (`src/api/api.js`, `blueQuirkApi.js`) still linger from
> older pages; prefer the unified TypeScript client for all new work.

## Common commands

### Frontend (run from `blue-quirk-frontend/`)
```bash
npm run dev      # Next.js dev server (http://localhost:3000)
npm run build    # production build
npm run start    # serve production build
npm run lint     # ESLint (eslint-config-next)
```
No frontend test framework is configured — run `npm run lint` and `npm run build` to validate UI changes.

### Backend (run from `blue-quirk-backend/`)
```bash
.\mvnw.cmd spring-boot:run          # run shop API (port 9090 local)
.\mvnw.cmd test                     # run all JUnit / Spring Boot tests
.\mvnw.cmd test -Dtest=ProductServiceTest          # single test class
.\mvnw.cmd test -Dtest=ProductServiceTest#getAll   # single test method
.\mvnw.cmd package                  # build the JAR
.\mvnw.cmd -Pbuild-image package     # build Docker image via Jib (bq/blue-quirk-backend)
```
Tests go under `src/test/java` mirroring the package path, named `*Test`. Auth
requires a `JWT_SECRET` env var in non-local profiles (fails fast otherwise); set
`AUTH_ADMIN_EMAIL` / `AUTH_ADMIN_PASSWORD` once to bootstrap an admin.

### Docker (production stack, run from `docker/`)
```bash
cp .env.example .env   # fill in DB creds, JWT_SECRET, admin bootstrap, Resend key
docker compose up -d --build
```
Four services only: **frontend, backend, MariaDB, Caddy** (reverse proxy + auto-TLS).
No Keycloak, no PostgreSQL, no Identity Service. The `docker` Spring profile
(`application-docker.properties`) points the DB at `host.docker.internal:3306` and
serves the API on 8080; the compose file sets it to MariaDB and injects `JWT_SECRET`.

## Conventions

- New frontend code in **TypeScript**. Components `PascalCase.tsx`, hooks `useX.ts`, routes follow Next.js conventions (`page.tsx`, `layout.tsx`). Keep service/API logic in `src/services` / `src/api`, out of components.
- Java classes are named by role (`ProductController`, `CategoryService`, `ProductRepository`). Keep the controller→service→repository separation.
- Don't commit secrets, local DB passwords, JWT secrets, or build output. Use environment-specific Spring properties / env vars for runtime config.
