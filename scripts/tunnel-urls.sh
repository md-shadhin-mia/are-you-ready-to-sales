#!/usr/bin/env bash
# Prints the public trycloudflare.com URLs of the docker compose tunnel services.
set -euo pipefail
cd "$(dirname "${BASH_SOURCE[0]}")/.."

services=("tunnel-storefront:Storefront:3000" "tunnel-student:Student Dashboard:3001" "tunnel-admin:Admin Dashboard:3002")

echo "============================================================"
echo " 🌐 Cloudflare tunnel URLs (docker compose)"
echo "============================================================"
for entry in "${services[@]}"; do
  IFS=: read -r svc label port <<<"$entry"
  url=""
  # Tunnels take a few seconds to register after the container starts.
  for _ in $(seq 1 30); do
    url=$(docker compose --profile tunnels logs "$svc" 2>/dev/null | grep -o 'https://[a-zA-Z0-9.-]*\.trycloudflare\.com' | tail -n 1 || true)
    [ -n "$url" ] && break
    sleep 1
  done
  printf "  %-18s (port %s) -> %s\n" "$label:" "$port" "${url:-not ready — check: docker compose logs $svc}"
done
echo "============================================================"
echo "Dev servers must be running on the host (pnpm dev)."
