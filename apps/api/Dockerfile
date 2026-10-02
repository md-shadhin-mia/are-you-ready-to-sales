# Multi-stage Dockerfile for @repo/api running on Bun
FROM node:22-alpine AS builder

WORKDIR /app

ENV CI=true
RUN npm install -g pnpm@11.6.0
RUN apk add --no-cache libc6-compat openssl

# Copy workspace manifests
COPY pnpm-lock.yaml pnpm-workspace.yaml package.json turbo.json tsconfig.base.json ./
COPY packages/ ./packages/
COPY apps/api/ ./apps/api/

# Install dependencies and compile
RUN pnpm install --frozen-lockfile
RUN pnpm --filter @repo/db generate
RUN pnpm --filter @repo/api build

# -----------------------------------------------------------------------------
# Production Runner: Bun Runtime
# -----------------------------------------------------------------------------
FROM oven/bun:1-alpine AS runner

WORKDIR /app

RUN apk add --no-cache openssl libc6-compat curl

ENV NODE_ENV=production
ENV PORT=4000

# Copy node_modules, packages and full apps/api directory
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/packages ./packages
COPY --from=builder /app/apps/api ./apps/api
COPY --from=builder /app/package.json ./package.json

RUN chmod +x ./apps/api/docker-entrypoint.sh

EXPOSE 4000

HEALTHCHECK --interval=10s --timeout=5s --start-period=15s --retries=3 \
  CMD curl -f http://127.0.0.1:4000/api/docs || exit 1

ENTRYPOINT ["/app/apps/api/docker-entrypoint.sh"]
