#!/usr/bin/env bash
# ==============================================================================
# Selective Platform Deployment Script
# ==============================================================================
# Usage:
#   ./scripts/deploy.sh [service1 service2 ...]
# Examples:
#   ./scripts/deploy.sh api
#   ./scripts/deploy.sh admin-dashboard nginx
#   ./scripts/deploy.sh              # Pulls and restarts all services
# ==============================================================================

set -euo pipefail

# ANSI color codes
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

TARGET_SERVICES="$*"

# Locate compose file (prioritizing docker-compose.yml)
COMPOSE_FILE=""
if [ -f "docker-compose.yml" ]; then
  COMPOSE_FILE="docker-compose.yml"
elif [ -f "docker-compose.hub.yml" ]; then
  COMPOSE_FILE="docker-compose.hub.yml"
fi

if [ -z "$COMPOSE_FILE" ]; then
  echo -e "${RED}❌ Error: Neither docker-compose.yml nor docker-compose.hub.yml found in $(pwd)${NC}" >&2
  exit 1
fi

echo -e "${BLUE}==============================================${NC}"
echo -e "${BLUE}🚀 Platform Continuous Deployment${NC}"
echo -e "${BLUE}📦 Compose file: ${GREEN}${COMPOSE_FILE}${NC}"
if [ -n "${TARGET_SERVICES}" ]; then
  echo -e "${BLUE}🎯 Target services: ${YELLOW}${TARGET_SERVICES}${NC}"
else
  echo -e "${BLUE}🎯 Target services: ${YELLOW}ALL${NC}"
fi
echo -e "${BLUE}==============================================${NC}"

# 1. Pull target images
echo -e "\n${BLUE}📥 Pulling Docker images...${NC}"
if [ -n "${TARGET_SERVICES}" ]; then
  docker compose -f "${COMPOSE_FILE}" pull ${TARGET_SERVICES}
else
  docker compose -f "${COMPOSE_FILE}" pull
fi

# 2. Rolling restart
echo -e "\n${BLUE}🔄 Recreating container(s)...${NC}"
if [ -n "${TARGET_SERVICES}" ]; then
  docker compose -f "${COMPOSE_FILE}" up -d --no-deps ${TARGET_SERVICES}
else
  docker compose -f "${COMPOSE_FILE}" up -d --remove-orphans
fi

# 3. Health check ping on Port 81
echo -e "\n${BLUE}🔍 Verifying Port 81 Gateway Health...${NC}"
sleep 4
HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:81/ || echo "000")
if [ "$HTTP_CODE" = "200" ] || [ "$HTTP_CODE" = "301" ] || [ "$HTTP_CODE" = "302" ]; then
  echo -e "${GREEN}✅ Gateway is responding with HTTP ${HTTP_CODE}${NC}"
else
  echo -e "${YELLOW}⚠️ Gateway ping returned HTTP ${HTTP_CODE} (check container logs if needed)${NC}"
fi

# 4. Prune dangling layers
echo -e "\n${BLUE}🧹 Pruning dangling image layers...${NC}"
docker image prune -f

echo -e "\n${GREEN}🎉 Deployment completed successfully!${NC}"
