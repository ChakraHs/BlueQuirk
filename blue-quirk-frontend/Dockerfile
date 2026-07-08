# syntax=docker/dockerfile:1
# ============================================================================
# BlueQuirk storefront — Next.js 15 (standalone output).
#
# Multi-stage: install deps → build → ship only the standalone server + static
# assets on a small Alpine Node image, running as a non-root user.
#
# NEXT_PUBLIC_* values are inlined at BUILD time, so they arrive as build args
# (docker compose forwards them from .env):
#   NEXT_PUBLIC_API_BASE_URL   -> public API origin + /api  (e.g. https://bluequirk.shop/api)
#   NEXT_PUBLIC_SITE_URL       -> public site origin        (e.g. https://bluequirk.shop)
# ============================================================================

# ---- Stage 1: dependencies (production-resolvable, cached on lockfile) ------
FROM node:20-alpine AS deps
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci

# ---- Stage 2: build ---------------------------------------------------------
FROM node:20-alpine AS build
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
ARG NEXT_PUBLIC_API_BASE_URL
ARG NEXT_PUBLIC_SITE_URL
ENV NEXT_PUBLIC_API_BASE_URL=$NEXT_PUBLIC_API_BASE_URL \
    NEXT_PUBLIC_SITE_URL=$NEXT_PUBLIC_SITE_URL \
    NEXT_TELEMETRY_DISABLED=1 \
    NODE_ENV=production
RUN npm run build

# ---- Stage 3: runtime (standalone, non-root) --------------------------------
FROM node:20-alpine AS runtime
WORKDIR /app
ENV NODE_ENV=production \
    NEXT_TELEMETRY_DISABLED=1 \
    HOSTNAME=0.0.0.0 \
    PORT=3000

# `node` (uid 1000) ships with the base image — run as it, never root.
# Standalone output bundles only the files needed to run `node server.js`.
COPY --from=build --chown=node:node /app/public ./public
COPY --from=build --chown=node:node /app/.next/standalone ./
COPY --from=build --chown=node:node /app/.next/static ./.next/static

EXPOSE 3000
USER node

# /login is a statically-rendered 200 page — a cheap readiness signal.
HEALTHCHECK --interval=15s --timeout=5s --start-period=30s --retries=5 \
  CMD wget -q --spider "http://127.0.0.1:${PORT:-3000}/login" || exit 1

CMD ["node", "server.js"]
