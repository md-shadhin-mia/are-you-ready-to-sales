# Multi-stage Dockerfile for @repo/student-dashboard (Vite React SPA)
FROM node:22-alpine AS builder

WORKDIR /app

ENV CI=true
RUN npm install -g pnpm@11.6.0
RUN apk add --no-cache libc6-compat

# Copy workspace configuration and dependencies
COPY pnpm-lock.yaml pnpm-workspace.yaml package.json turbo.json tsconfig.base.json ./
COPY packages/ ./packages/
COPY apps/student-dashboard/ ./apps/student-dashboard/

RUN pnpm install --frozen-lockfile
RUN pnpm --filter @repo/ui build
RUN pnpm --filter @repo/student-dashboard build

# -----------------------------------------------------------------------------
# Production Runner: Ultralight Alpine Nginx (consumes ~6MB RAM)
# -----------------------------------------------------------------------------
FROM nginx:alpine AS runner

COPY apps/student-dashboard/nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=builder /app/apps/student-dashboard/dist /usr/share/nginx/html

EXPOSE 80

HEALTHCHECK --interval=10s --timeout=3s --retries=3 \
  CMD wget -q --spider http://127.0.0.1:80/ || exit 1

CMD ["nginx", "-g", "daemon off;"]
