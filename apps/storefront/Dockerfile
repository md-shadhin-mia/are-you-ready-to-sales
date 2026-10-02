# Multi-stage Dockerfile for @repo/storefront running on Bun
FROM node:22-alpine AS builder

WORKDIR /app

ENV CI=true
RUN npm install -g pnpm@11.6.0
RUN apk add --no-cache libc6-compat

# Copy workspace configuration and dependencies
COPY pnpm-lock.yaml pnpm-workspace.yaml package.json turbo.json tsconfig.base.json ./
COPY packages/ ./packages/
COPY apps/storefront/ ./apps/storefront/

ENV NEXT_TELEMETRY_DISABLED=1
ENV NODE_ENV=production

RUN pnpm install --frozen-lockfile
RUN pnpm --filter @repo/ui build
RUN pnpm --filter @repo/storefront build

# -----------------------------------------------------------------------------
# Production Runner: Bun Runtime
# -----------------------------------------------------------------------------
FROM oven/bun:1-alpine AS runner

WORKDIR /app

RUN apk add --no-cache curl libc6-compat

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PORT=3000

# Copy workspace build files and dependencies
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package.json ./package.json
COPY --from=builder /app/packages ./packages
COPY --from=builder /app/apps/storefront ./apps/storefront

WORKDIR /app/apps/storefront

EXPOSE 3000

HEALTHCHECK --interval=10s --timeout=5s --start-period=15s --retries=3 \
  CMD curl -f http://localhost:3000/ || exit 1

CMD ["bun", "run", "start"]
