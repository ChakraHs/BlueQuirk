# Monitoring & health

The stack ships health signals today and is wired so a monitoring layer can be
bolted on later without touching application code.

## Health endpoints (backend)

Spring Boot Actuator exposes (port 8080, **not** proxied to the internet by Caddy):

| Endpoint | Purpose |
|----------|---------|
| `GET /actuator/health/liveness`  | process is alive (restart if failing) |
| `GET /actuator/health/readiness` | ready to serve — **also checks the database** |
| `GET /actuator/health`           | aggregate |

The Docker healthcheck hits `/actuator/health/readiness`; Compose `depends_on`
uses those health states so services start in the right order.

## Container health

Every long-running service defines a `healthcheck` (see `docker-compose.yml`):
backend (Actuator), frontend (`/login`), MariaDB (`healthcheck.sh`), Caddy (admin
API), Redis (`redis-cli ping`). Check them with:

```bash
./docker/scripts/status.sh
docker inspect --format '{{.State.Health.Status}}' bluequirk-backend
```

## Optional future integrations

Nothing below is required to run; these are documented drop-ins.

### Uptime Kuma (simplest external uptime)
Run Uptime Kuma anywhere and add an HTTP(s) monitor for `https://<domain>` and a
keyword monitor for the login page. For internal checks, expose the backend
readiness probe on the private network to a Kuma instance on `internal`.

### Prometheus + Grafana
1. Add the Micrometer Prometheus registry to the backend:
   `io.micrometer:micrometer-registry-prometheus`, then expose the endpoint:
   `management.endpoints.web.exposure.include=health,info,prometheus`.
2. Add `prometheus` + `grafana` services under a `monitoring` profile on the
   `internal` network (do **not** publish Prometheus publicly). Scrape
   `backend:8080/actuator/prometheus`.
3. Import a Spring Boot / JVM dashboard into Grafana; publish Grafana behind Caddy
   on a subdomain with basic-auth if you want remote access.

### Log shipping
Docker's `json-file` driver (10 MB × 5, configured per service) keeps logs local
and rotated. To centralize, switch the compose `x-logging` anchor to `loki` or
`journald`, or run Promtail/Vector on the host to ship `/var/lib/docker/containers`.
