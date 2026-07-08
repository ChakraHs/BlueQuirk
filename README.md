# BlueQuirk

A multilingual (French / Arabic / English) e-commerce platform for custom apparel and
print-on-demand products. BlueQuirk is a **monorepo** containing an independently deployable
storefront + admin frontend and a shop API with a built-in identity domain, plus the production
Docker stack and seed tooling that tie them together.

---

## Modules

| Path | Stack | Purpose |
|------|-------|---------|
| [`blue-quirk-frontend/`](blue-quirk-frontend) | Next.js 15 (App Router), React 18, TypeScript, Tailwind v4, TanStack Query | Public storefront **and** the custom admin (`/admin-v2`). Localized routing (`/fr`, `/ar`), catalog, cart/checkout, promotions, self-hosted analytics. |
| [`blue-quirk-backend/`](blue-quirk-backend) | Spring Boot 3.5, Java 23, JPA/Hibernate, MariaDB | Shop API + native **Identity Domain** (Spring Security, JWT + refresh tokens, RBAC — no external IdP). Products, orders, promotions/coupons, images, email, Todify integration, analytics. |
| [`docker/`](docker) | Docker Compose, Caddy, MariaDB | The production deployment stack (see below). |
| [`docs/`](docs) | Markdown | Architecture, authentication, and the [deployment guide](docs/deployment.md). |
| [`seed/`](seed) | SQL + R2 sync scripts | Catalog seed data and Cloudflare R2 media sync tooling. |
| `cash/` | — | Older / experimental admin UI. **Not** the active app. |

## Architecture

```
                    Internet (HTTPS)
                          │
                    ┌─────▼─────┐   edge network (public)
                    │   Caddy   │   auto-TLS, HTTP→HTTPS, headers, caching
                    └─────┬─────┘
             ┌────────────┴─────────────┐
             ▼                          ▼
     ┌──────────────┐          ┌──────────────────┐
     │  frontend    │          │     backend      │
     │  Next.js     │          │  Spring Boot API │
     │              │          │  + Identity      │
     └──────────────┘          └────────┬─────────┘
                          internal network (private)
                                        ▼
                                   ┌──────────┐   (+ redis, optional)
                                   │ MariaDB  │   never exposed publicly
                                   └──────────┘
```

- **Auth is native** to the backend: HS512 JWT access tokens + rotating refresh tokens,
  RBAC, email verification and password reset — no Keycloak, no external IdP. See
  [`docs/authentication.md`](docs/authentication.md).
- **i18n** — the frontend `middleware.ts` rewrites non-system paths to a locale prefix; the
  backend models translatable content with separate translation entities (`?lang=`).
- **Analytics** — a self-hosted, privacy-friendly system: a storefront tracker batches events
  to the backend, which aggregates and serves them to the admin dashboard.

## Production deployment (Docker)

The official deployment method. On a clean Linux VPS:

```bash
git clone <repo-url> /opt/bluequirk
cd /opt/bluequirk
cp .env.example .env        # then edit — set domain + generate secrets
docker compose up -d        # or ./docker/scripts/deploy.sh
```

That builds the frontend and backend, starts MariaDB, wires the private/public
networks, and has Caddy obtain and auto-renew a Let's Encrypt certificate. Data
(DB, uploads, certs) lives in named volumes and survives rebuilds.

Management scripts (`docker/scripts/`): `deploy` · `update` · `backup` · `restore`
· `logs` · `status` · `restart`. Optional profiles: `--profile cache` (Redis),
`--profile dev` (Mailpit + Adminer).

**Full step-by-step guide (Ubuntu + Contabo): [`docs/deployment.md`](docs/deployment.md).**

## Local development

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
Set `JWT_SECRET` (non-local profiles fail fast without it) and, once, `AUTH_ADMIN_EMAIL` /
`AUTH_ADMIN_PASSWORD` to bootstrap an admin.

## Configuration & secrets

- A single root `.env` drives the whole Docker stack. Copy `.env.example` and fill it in;
  it is git-ignored and mandatory variables are validated at startup (fail-fast).
- No secrets, default passwords, DB dumps, build output, or user uploads are committed.

## Repository conventions

- New frontend code is **TypeScript**; keep API/service logic in `src/services` / `src/api`.
- Backend follows Spring `controller → service → repository → entity` layering.

See [`CLAUDE.md`](CLAUDE.md) for a deeper architecture reference and per-module commands.
