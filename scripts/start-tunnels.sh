#!/usr/bin/env bash

# ==============================================================================
# Cloudflare Tunnel Launcher for Frontend Applications
# ==============================================================================
# Ports:
#   - Storefront:        3000  (Next.js customer shop)
#   - Student Dashboard: 3001  (Vite + React student portal)
#   - Admin Dashboard:   3002  (Vite + React institute admin portal)
#   - Backend API:       4000  (NestJS API monolith - optional with --with-api)
# ==============================================================================

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"
LOG_DIR="$ROOT_DIR/.tunnels"

mkdir -p "$LOG_DIR"

if ! command -v cloudflared &> /dev/null; then
    echo "❌ Error: 'cloudflared' command not found."
    echo "Please install cloudflared: https://developers.cloudflare.com/cloudflare-one/connections/connect-networks/downloads/"
    exit 1
fi

PIDS=()

cleanup() {
    echo ""
    echo "🛑 Shutting down Cloudflare tunnels..."
    for pid in "${PIDS[@]}"; do
        if kill -0 "$pid" 2>/dev/null; then
            kill "$pid" 2>/dev/null || true
        fi
    done
    echo "✅ All tunnels stopped."
    exit 0
}

trap cleanup SIGINT SIGTERM EXIT

start_tunnel() {
    local name="$1"
    local port="$2"
    local log_file="$LOG_DIR/${name}.log"

    rm -f "$log_file"
    echo -n "🚀 Launching tunnel for $name (localhost:$port)... "

    cloudflared tunnel --url "http://localhost:$port" > "$log_file" 2>&1 &
    local pid=$!
    PIDS+=("$pid")

    # Poll for the assigned trycloudflare.com URL (up to 15 seconds)
    local url=""
    for i in {1..30}; do
        if [ -f "$log_file" ]; then
            url=$(grep -o 'https://[a-zA-Z0-9.-]*\.trycloudflare\.com' "$log_file" | head -n 1 || true)
            if [ -n "$url" ]; then
                break
            fi
        fi
        sleep 0.5
    done

    if [ -n "$url" ]; then
        echo "Done!"
        eval "${name}_URL='$url'"
    else
        echo "Failed or took too long to obtain URL. Check $log_file"
        eval "${name}_URL='Check log ($log_file)'"
    fi
}

TARGET="${1:-all}"
INCLUDE_API=false

if [[ "$*" == *"--with-api"* ]] || [[ "$TARGET" == "full" ]]; then
    INCLUDE_API=true
fi

echo "============================================================"
echo " Starting Cloudflare Quick Tunnels for Frontend Applications"
echo "============================================================"

case "$TARGET" in
    storefront)
        start_tunnel "storefront" 3000
        ;;
    student)
        start_tunnel "student_dashboard" 3001
        ;;
    admin)
        start_tunnel "admin_dashboard" 3002
        ;;
    api)
        start_tunnel "api" 4000
        ;;
    all|full|*)
        start_tunnel "storefront" 3000
        start_tunnel "student_dashboard" 3001
        start_tunnel "admin_dashboard" 3002
        if [ "$INCLUDE_API" = true ]; then
            start_tunnel "api" 4000
        fi
        ;;
esac

echo ""
echo "============================================================"
echo " 🌐 Active Cloudflare Public Tunnel URLs"
echo "============================================================"
if [ -n "$storefront_URL" ]; then
    printf "  %-20s (Port 3000) -> %s\n" "Storefront:" "$storefront_URL"
fi
if [ -n "$student_dashboard_URL" ]; then
    printf "  %-20s (Port 3001) -> %s\n" "Student Dashboard:" "$student_dashboard_URL"
fi
if [ -n "$admin_dashboard_URL" ]; then
    printf "  %-20s (Port 3002) -> %s\n" "Admin Dashboard:" "$admin_dashboard_URL"
fi
if [ -n "$api_URL" ]; then
    printf "  %-20s (Port 4000) -> %s\n" "Backend API:" "$api_URL"
fi
echo "============================================================"
echo "Press Ctrl+C to stop all tunnels."
echo ""

# Keep running until Ctrl+C
wait
