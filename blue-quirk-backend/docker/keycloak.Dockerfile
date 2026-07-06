# Keycloak 25 image with the BlueQuirk realm baked in for import + custom theme.
# Railway builds this with:
#   Root Directory  = blue-quirk-backend/docker
#   Dockerfile Path = keycloak.Dockerfile
#
# Runtime config via environment variables (Railway service vars):
#   KC_DB_URL / KC_DB_USERNAME / KC_DB_PASSWORD  -> Postgres service
#   KEYCLOAK_ADMIN / KEYCLOAK_ADMIN_PASSWORD     -> bootstrap admin
#   KC_HOSTNAME                                  -> Keycloak's own public URL
#   PORT                                         -> injected by Railway
#
# The realm is imported on first boot (--import-realm). The public hostname must
# match the issuer that tokens are minted with, so downstream services validate
# JWTs correctly — set KC_HOSTNAME to this service's public Railway domain.

FROM quay.io/keycloak/keycloak:25.0.1 AS builder
ENV KC_DB=postgres
RUN /opt/keycloak/bin/kc.sh build

FROM quay.io/keycloak/keycloak:25.0.1
COPY --from=builder /opt/keycloak/ /opt/keycloak/
# Realm export consumed by --import-realm, plus the custom login/email theme.
COPY imports/keycloak/init/ /opt/keycloak/data/import/
COPY imports/keycloak/mytheme/ /opt/keycloak/themes/mytheme/
EXPOSE 8080
# Production mode behind Railway's TLS-terminating proxy.
CMD ["sh", "-c", "/opt/keycloak/bin/kc.sh start --optimized --import-realm --proxy-headers=xforwarded --hostname-strict=false --http-enabled=true --http-port=${PORT:-8080}"]
