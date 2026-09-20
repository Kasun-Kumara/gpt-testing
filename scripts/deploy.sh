#!/usr/bin/env bash
set -euo pipefail

# Run this script on the VM from inside the cloned repository.
#
# First time:
#   git clone https://github.com/Kasun-Kumara/gpt-testing.git ~/gpt-whiteboard
#   cd ~/gpt-whiteboard
#   cp .env.example .env.production && chmod 600 .env.production
#   # edit .env.production
#   ./scripts/deploy.sh
#
# Later deploys (after git pull or new commits):
#   cd ~/gpt-whiteboard
#   ./scripts/deploy.sh
#
# Optional environment variables:
#   DEPLOY_BRANCH   — branch to pull (default: main)
#   DEPLOY_DOMAIN   — public domain for health check (default: whiteboard.knurdz.org)
#   SKIP_GIT_PULL   — set to 1 to skip git pull

DEPLOY_BRANCH="${DEPLOY_BRANCH:-main}"
DEPLOY_DOMAIN="${DEPLOY_DOMAIN:-whiteboard.knurdz.org}"
SKIP_GIT_PULL="${SKIP_GIT_PULL:-0}"

REQUIRED_ENV_VARS=(
  AZURE_FOUNDRY_ENDPOINT
  AZURE_FOUNDRY_API_KEY
  AZURE_FOUNDRY_MODEL
  AZURE_FOUNDRY_TUTOR_MODEL
)

log() {
  printf '==> %s\n' "$*"
}

fail() {
  printf 'ERROR: %s\n' "$*" >&2
  exit 1
}

rollback() {
  local previous_tag="${1:-}"
  if [[ -z "${previous_tag}" || "${previous_tag}" == "none" ]]; then
    log "No previous image to roll back to."
    return 1
  fi

  log "Rolling back to image tag ${previous_tag}..."
  export APP_IMAGE_TAG="${previous_tag}"
  docker compose up -d --no-build --remove-orphans app caddy || true
  return 1
}

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(git -C "${SCRIPT_DIR}" rev-parse --show-toplevel 2>/dev/null || true)"

if [[ -z "${REPO_ROOT}" ]]; then
  fail "Run this script from inside the cloned git repository."
fi

cd "${REPO_ROOT}"

if ! command -v docker >/dev/null 2>&1; then
  fail "Docker is not installed."
fi

if ! docker compose version >/dev/null 2>&1; then
  fail "Docker Compose plugin is not installed."
fi

if [[ "${SKIP_GIT_PULL}" != "1" ]]; then
  if [[ -n "$(git status --porcelain)" ]]; then
    fail "Working tree has local changes. Commit, stash, or discard them before deploying."
  fi

  log "Pulling latest ${DEPLOY_BRANCH} from origin..."
  git fetch origin "${DEPLOY_BRANCH}"
  git checkout "${DEPLOY_BRANCH}"
  git merge --ff-only "origin/${DEPLOY_BRANCH}"
else
  log "Skipping git pull (SKIP_GIT_PULL=1)"
fi

DEPLOY_SHA="$(git rev-parse HEAD)"
DEPLOY_SHA_SHORT="$(git rev-parse --short HEAD)"
log "Deploying commit ${DEPLOY_SHA_SHORT} (${DEPLOY_SHA})"

PREVIOUS_TAG="none"
APP_CONTAINER="$(docker compose ps -q app 2>/dev/null || true)"
if [[ -n "${APP_CONTAINER}" ]]; then
  PREVIOUS_TAG="$(docker inspect --format='{{.Config.Image}}' "${APP_CONTAINER}" | awk -F: '{print $NF}')"
fi
log "Previous app image tag: ${PREVIOUS_TAG}"

if [[ ! -f .env.production ]]; then
  fail "Missing .env.production. Run: cp .env.example .env.production && chmod 600 .env.production"
fi
chmod 600 .env.production

set -a
# shellcheck disable=SC1091
source .env.production
set +a

for var in "${REQUIRED_ENV_VARS[@]}"; do
  if [[ -z "${!var:-}" ]]; then
    fail "Missing required variable in .env.production: ${var}"
  fi
done

log "Validating Caddy configuration..."
docker run --rm \
  -v "$(pwd)/Caddyfile:/etc/caddy/Caddyfile:ro" \
  caddy:2.9.1-alpine \
  caddy validate --config /etc/caddy/Caddyfile

export APP_IMAGE_TAG="${DEPLOY_SHA_SHORT}"
export DOCKER_BUILDKIT=1

log "Building app image (tag: ${APP_IMAGE_TAG})..."
if ! docker compose build app; then
  rollback "${PREVIOUS_TAG}"
  fail "Docker build failed."
fi

log "Starting services..."
if ! docker compose up -d --no-build --remove-orphans; then
  rollback "${PREVIOUS_TAG}"
  fail "docker compose up failed."
fi

log "Waiting for app container to become healthy..."
APP_HEALTHY=0
for _ in $(seq 1 30); do
  APP_STATUS="$(docker inspect --format='{{if .State.Health}}{{.State.Health.Status}}{{else}}unknown{{end}}' "$(docker compose ps -q app)" 2>/dev/null || echo "missing")"
  if [[ "${APP_STATUS}" == "healthy" ]]; then
    APP_HEALTHY=1
    break
  fi
  sleep 2
done

if [[ "${APP_HEALTHY}" != "1" ]]; then
  log "App container logs:"
  docker compose logs --tail=80 app || true
  rollback "${PREVIOUS_TAG}"
  fail "App container did not become healthy."
fi

log "Waiting for HTTPS health endpoint..."
HTTPS_OK=0
for _ in $(seq 1 30); do
  if curl -fsS "https://${DEPLOY_DOMAIN}/api/health" >/dev/null 2>&1; then
    HTTPS_OK=1
    break
  fi
  sleep 5
done

if [[ "${HTTPS_OK}" != "1" ]]; then
  log "Caddy logs:"
  docker compose logs --tail=80 caddy || true
  log "App logs:"
  docker compose logs --tail=80 app || true
  rollback "${PREVIOUS_TAG}"
  fail "HTTPS health check failed for https://${DEPLOY_DOMAIN}/api/health"
fi

log "Deployment successful: ${DEPLOY_SHA_SHORT} live at https://${DEPLOY_DOMAIN}"
