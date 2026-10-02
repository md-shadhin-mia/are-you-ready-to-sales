#!/bin/sh
set -e

echo "🚀 [API] Starting platform API container..."

cd /app

if [ -n "$DATABASE_URL" ]; then
  echo "📦 [API] Applying database migrations via Prisma..."
  PRISMA_CLI=$(find node_modules -path "*/prisma/build/index.js" 2>/dev/null | head -n 1 || true)
  if [ -n "$PRISMA_CLI" ] && [ -f "$PRISMA_CLI" ]; then
    echo "Using bundled Prisma CLI at $PRISMA_CLI"
    bun "$PRISMA_CLI" migrate deploy --schema=./packages/db/prisma/schema.prisma || {
      echo "⚠️ [API] Migration deploy returned non-zero. Continuing to startup..."
    }
  else
    echo "⚠️ [API] Prisma CLI not found in node_modules, continuing to startup."
  fi

  if [ "${AUTO_SEED:-true}" = "true" ]; then
    echo "🌱 [API] Ensuring database seed is applied..."
    bun ./packages/db/prisma/seed.ts || echo "⚠️ [API] Seed execution skipped or finished with notice."
  fi
fi

cd /app/apps/api
echo "✨ [API] Launching NestJS on Bun runtime..."
exec bun dist/main.js
