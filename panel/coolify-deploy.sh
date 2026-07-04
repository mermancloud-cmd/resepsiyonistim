#!/usr/bin/env bash
# ─────────────────────────────────────────────────────────
# coolify-deploy.sh — Deploy Bungalow Owner Panel via Coolify API
# ─────────────────────────────────────────────────────────
set -euo pipefail

# ── Colours ──
RED='\033[0;31m'; GREEN='\033[0;32m'; YELLOW='\033[1;33m'; CYAN='\033[0;36m'; NC='\033[0m'

# ── Usage ──
usage() {
  cat <<EOF
Usage: $(basename "$0") --api-key <KEY> --url <COOLIFY_URL> [OPTIONS]

Required:
  --api-key <key>       Coolify API bearer token
  --url <url>           Coolify instance URL (e.g. https://coolify.example.com)

Options:
  --repo <url>          GitHub repository URL  (default: auto-detected from git remote)
  --branch <name>       Git branch to deploy   (default: main)
  --domain <domain>     Custom domain           (default: panel.merman.sbs)
  --project <name>      Coolify project name    (default: bungalow-panel)
  --env-file <path>     Path to .env file with secrets to upload
  -h, --help            Show this help

Example:
  ./coolify-deploy.sh \\
    --api-key "coolify-xxxx" \\
    --url "https://coolify.merman.sbs" \\
    --domain "panel.merman.sbs" \\
    --env-file .env.production
EOF
  exit 0
}

# ── Defaults ──
API_KEY=""
COOLIFY_URL=""
REPO_URL=""
BRANCH="main"
DOMAIN="panel.merman.sbs"
PROJECT_NAME="bungalow-panel"
ENV_FILE=""

# ── Parse args ──
while [[ $# -gt 0 ]]; do
  case "$1" in
    --api-key)   API_KEY="$2";      shift 2 ;;
    --url)       COOLIFY_URL="$2";  shift 2 ;;
    --repo)      REPO_URL="$2";     shift 2 ;;
    --branch)    BRANCH="$2";       shift 2 ;;
    --domain)    DOMAIN="$2";       shift 2 ;;
    --project)   PROJECT_NAME="$2"; shift 2 ;;
    --env-file)  ENV_FILE="$2";     shift 2 ;;
    -h|--help)   usage ;;
    *) echo -e "${RED}Unknown option: $1${NC}"; usage ;;
  esac
done

# ── Validate required args ──
if [[ -z "$API_KEY" || -z "$COOLIFY_URL" ]]; then
  echo -e "${RED}Error: --api-key and --url are required.${NC}"
  usage
fi

# Strip trailing slash from URL
COOLIFY_URL="${COOLIFY_URL%/}"

# Auto-detect repo URL from git remote if not provided
if [[ -z "$REPO_URL" ]]; then
  if command -v git &>/dev/null && git rev-parse --git-dir &>/dev/null; then
    REPO_URL=$(git remote get-url origin 2>/dev/null || echo "")
  fi
  if [[ -z "$REPO_URL" ]]; then
    echo -e "${RED}Error: Could not auto-detect repo URL. Pass --repo explicitly.${NC}"
    exit 1
  fi
fi

# ── Helper: Coolify API call ──
api() {
  local method="$1" endpoint="$2"
  shift 2
  local response
  response=$(curl -s -w "\n%{http_code}" -X "$method" \
    "${COOLIFY_URL}/api/v1${endpoint}" \
    -H "Authorization: Bearer ${API_KEY}" \
    -H "Content-Type: application/json" \
    "$@")
  local body http_code
  body=$(echo "$response" | sed '$d')
  http_code=$(echo "$response" | tail -1)
  echo "$body"
  return 0
}

echo -e "${CYAN}╔══════════════════════════════════════════════╗${NC}"
echo -e "${CYAN}║  Bungalow Owner Panel — Coolify Deployment   ║${NC}"
echo -e "${CYAN}╚══════════════════════════════════════════════╝${NC}"
echo ""
echo -e "  Coolify URL : ${GREEN}${COOLIFY_URL}${NC}"
echo -e "  Repository  : ${GREEN}${REPO_URL}${NC}"
echo -e "  Branch      : ${GREEN}${BRANCH}${NC}"
echo -e "  Domain      : ${GREEN}${DOMAIN}${NC}"
echo -e "  Project     : ${GREEN}${PROJECT_NAME}${NC}"
echo ""

# ── Step 1: Verify connectivity ──
echo -e "${YELLOW}▸ Verifying Coolify API connection...${NC}"
VERSION=$(api GET "/version")
if echo "$VERSION" | grep -q '"version"'; then
  echo -e "  ${GREEN}✓ Connected to Coolify ${VERSION}${NC}"
else
  echo -e "  ${RED}✗ Failed to connect. Check your API key and URL.${NC}"
  echo "  Response: $VERSION"
  exit 1
fi

# ── Step 2: Create/find project ──
echo -e "${YELLOW}▸ Looking up project '${PROJECT_NAME}'...${NC}"
PROJECTS=$(api GET "/projects")
PROJECT_ID=$(echo "$PROJECTS" | grep -o "\"name\":\"${PROJECT_NAME}\"[^}]*\"id\":[0-9]*" | grep -o '"id":[0-9]*' | grep -o '[0-9]*' || echo "")

if [[ -z "$PROJECT_ID" ]]; then
  echo -e "  Project not found. Creating..."
  CREATE_RESP=$(api POST "/projects" -d "{\"name\":\"${PROJECT_NAME}\",\"description\":\"Bungalow Owner Panel — AI-powered reservation management\"}")
  PROJECT_ID=$(echo "$CREATE_RESP" | grep -o '"id":[0-9]*' | head -1 | grep -o '[0-9]*')
  echo -e "  ${GREEN}✓ Created project (ID: ${PROJECT_ID})${NC}"
else
  echo -e "  ${GREEN}✓ Found existing project (ID: ${PROJECT_ID})${NC}"
fi

# ── Step 3: Create Docker Compose deployment ──
echo -e "${YELLOW}▸ Creating Docker Compose application...${NC}"
DEPLOY_PAYLOAD=$(cat <<ENDJSON
{
  "project_uuid": "${PROJECT_ID}",
  "type": "dockercompose",
  "name": "${PROJECT_NAME}",
  "docker_compose_raw": "$(cat docker-compose.yml | sed 's/"/\\"/g' | tr '\n' ' ')",
  "domains": [
    {
      "domain": "${DOMAIN}",
      "port": 3000
    }
  ]
}
ENDJSON
)

DEPLOY_RESP=$(api POST "/deployments" -d "$DEPLOY_PAYLOAD")
DEPLOY_UUID=$(echo "$DEPLOY_RESP" | grep -o '"uuid":"[^"]*"' | head -1 | cut -d'"' -f4 || echo "")

if [[ -n "$DEPLOY_UUID" ]]; then
  echo -e "  ${GREEN}✓ Deployment created (UUID: ${DEPLOY_UUID})${NC}"
else
  echo -e "  ${YELLOW}⚠ Deployment response (may need manual setup in Coolify UI):${NC}"
  echo "  $DEPLOY_RESP"
fi

# ── Step 4: Upload environment variables ──
if [[ -n "$ENV_FILE" && -f "$ENV_FILE" ]]; then
  echo -e "${YELLOW}▸ Uploading environment variables from ${ENV_FILE}...${NC}"
  ENV_JSON="["
  FIRST=true
  while IFS='=' read -r key value || [[ -n "$key" ]]; do
    # Skip comments and empty lines
    [[ "$key" =~ ^[[:space:]]*# ]] && continue
    [[ -z "$key" ]] && continue
    key=$(echo "$key" | xargs)
    value=$(echo "$value" | xargs)
    [[ -z "$key" ]] && continue
    if [[ "$FIRST" == true ]]; then
      FIRST=false
    else
      ENV_JSON+=","
    fi
    ENV_JSON+="{\"key\":\"${key}\",\"value\":\"${value}\"}"
  done < "$ENV_FILE"
  ENV_JSON+="]"

  if [[ "$DEPLOY_UUID" ]]; then
    api PATCH "/applications/${DEPLOY_UUID}/envs" -d "$ENV_JSON" > /dev/null 2>&1
    echo -e "  ${GREEN}✓ Environment variables uploaded${NC}"
  fi
else
  echo -e "  ${YELLOW}⚠ No --env-file provided. Set environment variables manually in Coolify UI.${NC}"
fi

# ── Step 5: Trigger deployment ──
echo -e "${YELLOW}▸ Triggering deployment...${NC}"
if [[ -n "$DEPLOY_UUID" ]]; then
  TRIGGER_RESP=$(api POST "/deployments/${DEPLOY_UUID}/start")
  echo -e "  ${GREEN}✓ Deployment triggered!${NC}"
  echo ""
  echo -e "  ${CYAN}Deployment status:${NC}"
  echo "  $TRIGGER_RESP" | head -20
else
  echo -e "  ${YELLOW}⚠ No deployment UUID. Trigger deployment manually in Coolify UI.${NC}"
fi

# ── Step 6: Poll deployment status ──
echo ""
echo -e "${YELLOW}▸ Monitoring deployment (polling every 10s, max 5 min)...${NC}"
if [[ -n "$DEPLOY_UUID" ]]; then
  ELAPSED=0
  MAX_WAIT=300
  while [[ $ELAPSED -lt $MAX_WAIT ]]; do
    sleep 10
    ELAPSED=$((ELAPSED + 10))
    STATUS_RESP=$(api GET "/deployments/${DEPLOY_UUID}" 2>/dev/null || echo "")
    STATUS=$(echo "$STATUS_RESP" | grep -o '"status":"[^"]*"' | head -1 | cut -d'"' -f4 || echo "unknown")
    echo -e "  [${ELAPSED}s] Status: ${CYAN}${STATUS}${NC}"
    if [[ "$STATUS" == "finished" ]]; then
      echo -e "\n  ${GREEN}✓ Deployment finished successfully!${NC}"
      echo -e "  ${GREEN}  → https://${DOMAIN}${NC}"
      break
    elif [[ "$STATUS" == "failed" ]]; then
      echo -e "\n  ${RED}✗ Deployment failed. Check Coolify logs for details.${NC}"
      exit 1
    fi
  done
  if [[ $ELAPSED -ge $MAX_WAIT ]]; then
    echo -e "\n  ${YELLOW}⚠ Timed out waiting for deployment. Check status in Coolify UI.${NC}"
  fi
fi

echo ""
echo -e "${CYAN}════════════════════════════════════════════════${NC}"
echo -e "  Panel URL: ${GREEN}https://${DOMAIN}${NC}"
echo -e "  Health:    ${GREEN}https://${DOMAIN}/api/health${NC}"
echo -e "${CYAN}════════════════════════════════════════════════${NC}"
