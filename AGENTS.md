# Repository Guidelines

## Project Structure & Module Organization

BlueQuirk is split into several modules. `blue-quirk-frontend/` contains the Next.js 15 storefront/admin UI, with app routes in `src/app`, shared UI in `src/components`, service clients in `src/services` and `src/api`, types in `src/types`, and static assets in `public/`. `blue-quirk-backend/` is the Spring Boot shop API; Java sources live under `src/main/java/shop/bluequirk/blue_quirk_backend`, configuration in `src/main/resources`, tests in `src/test/java`, and Docker compose files in `docker/`. `BlueQuirk Identity/Identity-Service/` is the Spring Boot identity service, with Keycloak-related compose/import files under `BlueQuirk Identity/docker-keyclaock/`. `cash/` contains older or experimental admin UI pages and resources.

## Build, Test, and Development Commands

Frontend commands run from `blue-quirk-frontend/`:

- `npm run dev`: start the Next.js dev server.
- `npm run build`: create a production build.
- `npm run start`: serve the production build.
- `npm run lint`: run ESLint.

Backend commands run from `blue-quirk-backend/`:

- `.\mvnw.cmd spring-boot:run`: run the shop API locally.
- `.\mvnw.cmd test`: run Spring Boot tests.
- `.\mvnw.cmd package`: build the application JAR.

Identity service commands run from `BlueQuirk Identity/Identity-Service/` with the same Maven wrapper pattern.

## Coding Style & Naming Conventions

Use TypeScript for new frontend code where possible. React components use PascalCase (`ProductCard.tsx`), hooks use `useX.ts`, and route files follow Next.js conventions (`page.tsx`, `layout.tsx`). Keep service/API logic out of components when practical. Java code follows standard Spring layering: `controller`, `service`, `repository`, `entity`, `dto`, and `config` packages. Use descriptive class names ending in their role, such as `ProductController` or `CategoryService`.

## Testing Guidelines

Frontend test tooling is not currently defined; at minimum run `npm run lint` and `npm run build` before submitting UI changes. Backend tests use JUnit through Spring Boot Test. Place Java tests in matching package paths under `src/test/java`, name test classes `*Test`, and run `.\mvnw.cmd test` in the affected service.

## Commit & Pull Request Guidelines

Git history was not available in this environment, so no repository-specific commit convention could be verified. Use short imperative commits, for example `Add product image selector validation`. Pull requests should include a concise summary, affected modules, test results, linked issues when applicable, and screenshots or screen recordings for visible UI changes.

## Security & Configuration Tips

Do not commit secrets, tokens, local database passwords, or generated build output. Prefer environment-specific Spring properties such as `application-docker.properties` for runtime configuration. Treat Keycloak realm exports and upload fixtures as configuration/assets that may contain sensitive operational details.
