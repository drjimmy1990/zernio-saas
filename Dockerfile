# =============================================================================
# Stage 1: Dependencies
# =============================================================================
FROM node:24-alpine AS deps
WORKDIR /app

ENV NODE_OPTIONS="--dns-result-order=ipv4first"

COPY package.json package-lock.json* ./
RUN npm ci --no-audit --no-fund --prefer-offline

# =============================================================================
# Stage 2: Builder
# =============================================================================
FROM node:24-alpine AS builder
WORKDIR /app

COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Accept build-time NEXT_PUBLIC_* variables (loaded automatically from .env by docker compose)
ARG NEXT_PUBLIC_SUPABASE_URL
ARG NEXT_PUBLIC_SUPABASE_ANON_KEY
ARG NEXT_PUBLIC_APP_URL=https://asra3.com
ARG NEXT_PUBLIC_BRAND_NAME=Asra3
ARG NEXT_PUBLIC_BRAND_PRIMARY_COLOR=#4F46E5
ARG NEXT_PUBLIC_BRAND_LOGO_URL=https://asra3.com/logo.png

ENV NEXT_TELEMETRY_DISABLED=1
ENV NODE_OPTIONS="--max-old-space-size=2048 --dns-result-order=ipv4first"

RUN npm run build

# =============================================================================
# Stage 3: Production runner on the private Compose port 3008
# =============================================================================
FROM node:24-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PORT=3008
ENV HOSTNAME="0.0.0.0"
ENV NODE_OPTIONS="--dns-result-order=ipv4first"

# Copy standalone build output and static assets
COPY --from=builder /app/public ./public
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static
COPY --from=builder /app/scripts/webhook-worker.mjs ./scripts/webhook-worker.mjs

# Ensure persistent workspace directory exists on Ubuntu host volume mount
RUN mkdir -p /app/.data && chown -R node:node /app/.data
USER node

EXPOSE 3008

HEALTHCHECK --interval=30s --timeout=5s --start-period=15s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://127.0.0.1:3008/api/v1/openapi.json || exit 1

CMD ["node", "server.js"]
