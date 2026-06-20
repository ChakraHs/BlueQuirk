# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Architecture

BlueQuirk is a multilingual (French/Arabic) e-commerce platform split across independent modules in one repo:

- **`blue-quirk-frontend/`** — Next.js 15 (App Router) storefront + admin UI. React 18, TypeScript, Tailwind CSS v4, TanStack Query, axios.
- **`blue-quirk-backend/`** — Spring Boot 3.5 shop API (`shop.bluequirk.blue_quirk_backend`). Java 23, JPA/Hibernate against MariaDB, OAuth2 resource server validating Keycloak JWTs.
- **`BlueQuirk Identity/Identity-Service/`** — Separate Spring Boot service (`com.ev.pcs.keycloakauth`) wrapping Keycloak for login/registration/profile. Runs on port 8087.
- **`BlueQuirk Identity/docker-keyclaock/`** & **`blue-quirk-backend/docker/`** — Docker Compose stacks (base/db/identity/backend/frontend) plus Keycloak realm imports and a custom theme.
- **`cash/`** — Older/experimental admin UI (`cash/admin`, `cash/bq-admin`); not the active app.

### Authentication & authorization
Auth is **Keycloak-based**, not local. The backend is a pure OAuth2 resource server: every protected request carries a `Bearer` JWT issued by the Keycloak realm `blue-quirk-realm`. `config/JwtAuthConverter.java` maps the JWT's `realm_access.roles` claim into Spring authorities, and `@EnableMethodSecurity` enables `@PreAuthorize` on controllers/services. The Identity-Service is what actually talks to Keycloak (password grant, user CRUD); the frontend login flows hit it, store tokens in `localStorage`, and attach them via axios interceptors.

> **Note:** `SecurityConfig.java` currently `permitAll()`s `/**`, so endpoints are effectively open despite the resource-server setup — keep this in mind when reasoning about access control.

### Internationalization
- **Frontend:** `middleware.ts` rewrites every non-system path to a locale prefix (`/fr` default, or `/ar`), driven by a `lang` cookie. Public-facing pages live under `src/app/[lang]/...` and read `params.lang`. Helpers in `src/lib/i18n.ts` (`withLang`, `getDefaultLang`).
- **Backend:** Translatable content is modeled with separate translation entities (`entity/translation/ProductTranslation`, `CategoryTranslation`). API endpoints take an optional `?lang=` param and return locale-resolved `*Response` DTOs.

### Backend layering
Standard Spring layering under `src/main/java/.../blue_quirk_backend/`: `controller` → `service` → `repository` (Spring Data JPA) → `entity`. Plus `dto` (request/response shapes, `dto/response/PageResponse`), `config` (security, CORS, web/static), `domain` (enums like `AttributeType`, `ProductStatus`), `provider` (`EmailProvider`/`SmtpEmailProvider`), and `utility` (`TemplateEngine` for email templates). Core domains: Product, Category, Attribute/AttributeValue (variant system), Order, User, Image, Email (config + templates). Uploaded images are served from a static `/uploads/**` handler (`WebConfig`) and stored under `blue-quirk-backend/uploads/`.

### Frontend admin
There are two admin surfaces. `src/app/admin-v2/` is the active custom admin (products, users) using components in `src/components/admin/` (`DataTable`, `Sidebar`, `Topbar`). The project also pulls in **react-admin** (`react-admin`, `ra-data-simple-rest`, `ra-input-rich-text`) for parts of the admin tooling.

## Important caveats (this codebase is mid-refactor)

The frontend has **multiple, inconsistent API client layers** — check which one a file imports before assuming behavior:

| Client | Base URL | Token key | Used by |
|--------|----------|-----------|---------|
| `src/api/client.ts` | `http://localhost:8080/api` | `accessToken` | `AuthContext`, newer code |
| `src/services/api.ts` | `http://localhost:9090/api` | `access_token` | `*.service.ts` |
| `src/services/product.service.ts` | hardcoded `http://127.0.0.1:9090/api` | — | server-side `fetch` reads |
| `src/api/api.js`, `blueQuirkApi.js` | (legacy `.js`) | varies | older pages |

Note the **port mismatch**: the backend actually runs on **9090** locally (`application.properties`); `client.ts` points at 8080. Token storage keys also differ across files (`accessToken`, `access_token`, `token`). When wiring new API calls, prefer `src/services/` (`api.ts` + the `*.service.ts` pattern) and confirm the port against the running backend.

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
Same Maven wrapper pattern applies in `BlueQuirk Identity/Identity-Service/`. Tests go under `src/test/java` mirroring the package path, named `*Test`.

### Docker (run from `blue-quirk-backend/docker/`)
```powershell
.\start.ps1     # brings up base + identity + db compose stacks
.\stop.ps1
```
The `docker` Spring profile (`application-docker.properties`) points the DB at `host.docker.internal:3306` and Keycloak at `keycloak-server:8080`, and serves the API on 8080.

## Conventions

- New frontend code in **TypeScript**. Components `PascalCase.tsx`, hooks `useX.ts`, routes follow Next.js conventions (`page.tsx`, `layout.tsx`). Keep service/API logic in `src/services` / `src/api`, out of components.
- Java classes are named by role (`ProductController`, `CategoryService`, `ProductRepository`). Keep the controller→service→repository separation.
- Don't commit secrets, local DB passwords, Keycloak realm exports as credentials, or build output. Use environment-specific Spring properties for runtime config.
