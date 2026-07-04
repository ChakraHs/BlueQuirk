# BlueQuirk

A multilingual (French / Arabic / English) e-commerce platform for custom apparel and
print-on-demand products. BlueQuirk is a **monorepo** containing an independently deployable
storefront + admin frontend, a shop API, and a dedicated identity service, plus the Docker
stacks and seed tooling that tie them together.

---

## Modules

| Path | Stack | Purpose |
|------|-------|---------|
| [`blue-quirk-frontend/`](blue-quirk-frontend) | Next.js 15 (App Router), React 18, TypeScript, Tailwind v4, TanStack Query | Public storefront **and** the custom admin (`/admin-v2`). Localized routing (`/fr`, `/ar`), product catalog, cart/wishlist/checkout, self-hosted analytics dashboard. |
| [`blue-quirk-backend/`](blue-quirk-backend) | Spring Boot 3.5, Java 23, JPA/Hibernate, MariaDB | Shop API: products, categories, attributes/variants, orders, images, email, Todify print-on-demand integration, and a self-hosted privacy-friendly analytics backend. OAuth2 resource server validating Keycloak JWTs. |
| [`BlueQuirk Identity/Identity-Service/`](BlueQuirk%20Identity/Identity-Service) | Spring Boot, Java | Wraps Keycloak for login / registration / profile management (port 8087). |
| [`BlueQuirk Identity/docker-keyclaock/`](BlueQuirk%20Identity/docker-keyclaock) & [`blue-quirk-backend/docker/`](blue-quirk-backend/docker) | Docker Compose, Keycloak | Base / db / identity / backend / frontend compose stacks, Keycloak realm imports, and a custom login theme. |
| [`seed/`](seed) | SQL + R2 sync scripts | Catalog seed data and Cloudflare R2 media sync tooling. |
| `cash/` | — | Older / experimental admin UI. **Not** the active app. |

## Architecture

```
                         ┌─────────────────────────────┐
   Browser  ───────────▶ │  blue-quirk-frontend (Next)  │
   (fr / ar / en)        │  storefront + /admin-v2      │
                         └──────────────┬───────────────┘
                                        │ REST (JWT bearer)
                     ┌──────────────────┼───────────────────┐
                     ▼                                        ▼
        ┌────────────────────────┐              ┌──────────────────────────┐
        │  blue-quirk-backend    │              │  Identity-Service         │
        │  Spring Boot shop API  │              │  Keycloak wrapper (:8087) │
        │  OAuth2 resource srv   │◀── JWKS ────▶│                           │
        └───────────┬────────────┘              └─────────────┬────────────┘
                    │                                          │
                    ▼                                          ▼
              MariaDB (shop)                              Keycloak realm
                                                         `blue-quirk-realm`
```

- **Auth** is Keycloak-based. The backend is a pure OAuth2 resource server — every protected
  request carries a `Bearer` JWT issued by the `blue-quirk-realm`. The Identity-Service is the
  only component that talks to Keycloak directly (password grant, user CRUD).
- **i18n** — the frontend `middleware.ts` rewrites non-system paths to a locale prefix; the
  backend models translatable content with separate translation entities and resolves them via
  an optional `?lang=` query parameter.
- **Analytics** — a self-hosted, privacy-friendly analytics system (no third-party trackers):
  a lightweight client tracker in the storefront batches events to the Spring backend, which
  persists, aggregates, and serves them to the admin dashboard.

## Getting started

### Prerequisites
- Node.js 20+ and npm
- Java 23 + the bundled Maven wrapper (`mvnw`)
- MariaDB (or the provided Docker stack)
- A Keycloak instance (or the provided Docker stack)

### Frontend (`blue-quirk-frontend/`)
```bash
npm install
npm run dev      # http://localhost:3000
npm run build    # production build
npm run lint     # ESLint
```

### Backend (`blue-quirk-backend/`)
```bash
./mvnw.cmd spring-boot:run    # shop API on port 9090 (local)
./mvnw.cmd test               # JUnit / Spring Boot tests
./mvnw.cmd package            # build the JAR
```
The same Maven wrapper pattern applies in `BlueQuirk Identity/Identity-Service/`.

### Docker (`blue-quirk-backend/docker/`)
```powershell
./start.ps1     # base + identity + db + backend + frontend
./stop.ps1
```

## Configuration & secrets

Runtime secrets are supplied via environment-specific files and are **never committed**:

- `.env` files (one per module) are git-ignored. Copy the provided `*.env.example` files and
  fill in your own values (Cloudflare R2, Todify, Resend, DB credentials, Keycloak client secret,
  analytics IP-hash salt, etc.).
- Keycloak realm exports in the repo reference secrets via `${ENV_VAR}` placeholders only.
- User-uploaded images (`blue-quirk-backend/uploads/`), build output, and logs are git-ignored.

## Repository conventions

- New frontend code is **TypeScript**; keep API/service logic in `src/services` / `src/api`, out
  of components.
- Backend follows Spring `controller → service → repository → entity` layering; classes are named
  by role.
- Do not commit secrets, local DB passwords, build output, or user uploads.

See [`CLAUDE.md`](CLAUDE.md) for a deeper architecture reference and per-module command details.
