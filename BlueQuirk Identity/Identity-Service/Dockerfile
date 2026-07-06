# BlueQuirk Identity-Service — Spring Boot 3.3, Java 17. Wraps Keycloak
# (login / registration / profile CRUD).
# Railway builds this with Root Directory = "BlueQuirk Identity/Identity-Service".
#
# Runtime config via environment variables (Railway service vars):
#   KEYCLOAK_AUTH_SERVER_URL / JWT_JWK_SET_URI  -> Keycloak public URL
#   KEYCLOAK_CLIENT_SECRET                      -> realm client secret
#   IDENTITY_KEYCLOAK_ADMIN_USER / _PASSWORD    -> realm-admin account
#   PORT                                        -> injected by Railway

FROM maven:3.9-eclipse-temurin-17 AS build
WORKDIR /app
COPY pom.xml .
COPY src ./src
RUN mvn -B -ntp -DskipTests -Dcheckstyle.skip=true clean package

FROM eclipse-temurin:17-jre AS runtime
WORKDIR /app
COPY --from=build /app/target/*.jar app.jar
ENV SPRING_PROFILES_ACTIVE=docker
EXPOSE 8087
CMD ["sh", "-c", "java -XX:MaxRAMPercentage=75.0 -jar app.jar --server.port=${PORT:-8087}"]
