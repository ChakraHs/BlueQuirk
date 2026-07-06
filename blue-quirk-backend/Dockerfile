# BlueQuirk shop backend — Spring Boot 3.5, Java 23.
# Multi-stage: build the fat jar with Maven, then run it on a slim JRE.
# Railway builds this with Root Directory = blue-quirk-backend.
#
# Runtime config comes entirely from environment variables (see Railway service
# vars), NOT from application-docker.properties' hardcoded compose hostnames:
#   SPRING_DATASOURCE_URL / _USERNAME / _PASSWORD           -> MariaDB service
#   SPRING_SECURITY_OAUTH2_RESOURCESERVER_JWT_ISSUER_URI    -> Keycloak public URL
#   APP_FRONTEND_BASE_URL                                   -> frontend public URL
#   PORT                                                    -> injected by Railway

FROM maven:3.9-eclipse-temurin-23 AS build
WORKDIR /app
# Copy the manifest first so dependency resolution can be layer-cached.
COPY pom.xml .
COPY src ./src
RUN mvn -B -ntp -DskipTests -Dcheckstyle.skip=true clean package

FROM eclipse-temurin:23-jre AS runtime
WORKDIR /app
# Local uploads fallback (used only when Cloudflare R2 is not configured).
# Note: this is ephemeral on Railway unless a volume is mounted at /app/uploads.
RUN mkdir -p /app/uploads
COPY --from=build /app/target/*.jar app.jar
ENV SPRING_PROFILES_ACTIVE=docker
EXPOSE 8080
# Bind the port Railway injects; fall back to 8080 for local `docker run`.
CMD ["sh", "-c", "java -XX:MaxRAMPercentage=75.0 -jar app.jar --server.port=${PORT:-8080}"]
