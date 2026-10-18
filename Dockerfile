# =============================================================================
# Stage 1: Dependencies
# =============================================================================
FROM node:22-alpine AS deps
WORKDIR /app

ENV NODE_OPTIONS="--dns-result-order=ipv4first"

COPY package.json package-lock.json* ./
RUN npm ci --no-audit --no-fund --prefer-offline

# =============================================================================
# Stage 2: Builder
# =============================================================================
FROM node:22-alpine AS builder
WORKDIR /app

COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Accept build-time NEXT_PUBLIC_* variables (loaded automatically from .env by docker compose)
ARG NEXT_PUBLIC_SUPABASE_URL
ARG NEXT_PUBLIC_SUPABASE_ANON_KEY
ARG NEXT_PUBLIC_APP_URL=https://social.ai4eg.com
ARG NEXT_PUBLIC_BRAND_NAME=Techurity
ARG NEXT_PUBLIC_BRAND_PRIMARY_COLOR=#4F46E5
ARG NEXT_PUBLIC_BRAND_LOGO_URL=https://social.ai4eg.com/logo.png

ENV NEXT_TELEMETRY_DISABLED=1
ENV NODE_OPTIONS="--max-old-space-size=2048 --dns-result-order=ipv4first"

RUN npm run build

# =============================================================================
# Stage 3: Production Runner (Ubuntu VPS + aaPanel Ready on Port 5651)
# =============================================================================
FROM node:22-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PORT=5651
ENV HOSTNAME="0.0.0.0"
ENV NODE_OPTIONS="--dns-result-order=ipv4first"

# Copy standalone build output and static assets
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static

# Ensure persistent workspace directory exists on Ubuntu host volume mount
RUN mkdir -p /app/.data && \
    if [ ! -f /app/.data/workspaces.json ]; then echo '{"workspaces":{}}' > /app/.data/workspaces.json; fi

EXPOSE 5651

HEALTHCHECK --interval=30s --timeout=5s --start-period=15s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://127.0.0.1:5651/api/v1/openapi.json || exit 1

CMD ["sh", "-c", "mkdir -p /app/.data && [ -f /app/.data/workspaces.json ] || echo '{\"workspaces\":{}}' > /app/.data/workspaces.json && node server.js"]
