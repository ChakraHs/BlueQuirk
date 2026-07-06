# BlueQuirk storefront — Next.js 15 (standalone output).
# Railway builds this with Root Directory = blue-quirk-frontend.
#
# NEXT_PUBLIC_* values are inlined at BUILD time, so they must be passed as build
# args (Railway forwards matching service variables to ARGs):
#   NEXT_PUBLIC_API_BASE_URL       -> backend public URL + /api
#   NEXT_PUBLIC_IDENTITY_BASE_URL  -> identity-service public URL
#   NEXT_PUBLIC_SITE_URL           -> this frontend's public URL
# At runtime the standalone server binds Railway's injected PORT automatically.

FROM node:20-alpine AS deps
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci

FROM node:20-alpine AS build
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
ARG NEXT_PUBLIC_API_BASE_URL
ARG NEXT_PUBLIC_IDENTITY_BASE_URL
ARG NEXT_PUBLIC_SITE_URL
ENV NEXT_PUBLIC_API_BASE_URL=$NEXT_PUBLIC_API_BASE_URL \
    NEXT_PUBLIC_IDENTITY_BASE_URL=$NEXT_PUBLIC_IDENTITY_BASE_URL \
    NEXT_PUBLIC_SITE_URL=$NEXT_PUBLIC_SITE_URL \
    NEXT_TELEMETRY_DISABLED=1
RUN npm run build

FROM node:20-alpine AS runtime
WORKDIR /app
ENV NODE_ENV=production \
    NEXT_TELEMETRY_DISABLED=1 \
    HOSTNAME=0.0.0.0
# Standalone output ships only the files needed to run.
COPY --from=build /app/public ./public
COPY --from=build /app/.next/standalone ./
COPY --from=build /app/.next/static ./.next/static
EXPOSE 3000
CMD ["node", "server.js"]
