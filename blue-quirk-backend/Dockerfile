# syntax=docker/dockerfile:1
# ============================================================================
# BlueQuirk shop backend — Spring Boot 3.5, Java 23.
#
# Build strategy: OPTION A — build the jar *inside* Docker (multi-stage).
# Rationale: the image is hermetic and reproducible on any machine/CI runner
# with only Docker installed — no host JDK/Maven required. This is what makes
# the project's "git clone → docker compose up -d" goal work: the build is part
# of the image, not a manual pre-step (Option B). The heavy build tooling stays
# in the throwaway `build` stage; the final image ships only a JRE + app.jar.
# ============================================================================

# ---- Stage 1: build ---------------------------------------------------------
FROM maven:3.9-eclipse-temurin-23 AS build
WORKDIR /app

# Resolve dependencies first (cached as long as pom.xml is unchanged), then
# compile — so source-only changes don't re-download the world.
COPY pom.xml .
RUN --mount=type=cache,target=/root/.m2 mvn -B -ntp dependency:go-offline

COPY src ./src
RUN --mount=type=cache,target=/root/.m2 \
    mvn -B -ntp -DskipTests -Dcheckstyle.skip=true clean package && \
    cp target/*.jar /app/app.jar

# ---- Stage 2: runtime -------------------------------------------------------
# Full (glibc) JRE, not Alpine/musl: the scrimage-webp image encoder ships
# glibc native binaries. Only curl is added, for the container healthcheck.
FROM eclipse-temurin:23-jre AS runtime
WORKDIR /app

RUN apt-get update \
    && apt-get install -y --no-install-recommends curl \
    && rm -rf /var/lib/apt/lists/* \
    # Non-root runtime user; owns the writable uploads dir.
    && groupadd --system --gid 10001 app \
    && useradd --system --uid 10001 --gid app --home /app --no-create-home app \
    && mkdir -p /app/uploads \
    && chown -R app:app /app

COPY --from=build --chown=app:app /app/app.jar /app/app.jar

ENV SPRING_PROFILES_ACTIVE=docker \
    JAVA_OPTS="-XX:MaxRAMPercentage=75.0 -XX:+UseContainerSupport"
EXPOSE 8080

USER app

# Liveness/readiness via Actuator (readiness also checks the DB). start-period
# covers JVM+Spring boot time; compose can override these values.
HEALTHCHECK --interval=15s --timeout=5s --start-period=60s --retries=5 \
  CMD curl -fsS "http://127.0.0.1:${PORT:-8080}/actuator/health/readiness" || exit 1

# Shell form so ${PORT}/${JAVA_OPTS} expand; container init (compose `init: true`)
# handles signal forwarding + zombie reaping.
ENTRYPOINT ["sh", "-c", "exec java $JAVA_OPTS -jar app.jar --server.port=${PORT:-8080}"]
