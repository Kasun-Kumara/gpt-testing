#!/usr/bin/env bash
set -euo pipefail

# Deploy gpt-whiteboard to a VM via Git push + SSH pull.
#
# Required environment variables:
#   DEPLOY_HOST  — VM hostname or IP
#   DEPLOY_USER  — SSH user on the VM
#
# Optional:
#   DEPLOY_PATH       — checkout directory on VM (default: ~/gpt-whiteboard)
#   DEPLOY_BRANCH     — branch to deploy (default: main)
#   DEPLOY_DOMAIN     — public domain for health check (default: whiteboard.knurdz.org)
#   DEPLOY_REPO_URL   — Git clone URL (default: origin remote URL)
#   SKIP_LOCAL_CHECKS — set to 1 to skip lint/test/build locally

DEPLOY_BRANCH="${DEPLOY_BRANCH:-main}"
DEPLOY_PATH="${DEPLOY_PATH:-~/gpt-whiteboard}"
DEPLOY_DOMAIN="${DEPLOY_DOMAIN:-whiteboard.knurdz.org}"
SKIP_LOCAL_CHECKS="${SKIP_LOCAL_CHECKS:-0}"

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

require_var() {
  local name="$1"
  if [[ -z "${!name:-}" ]]; then
    fail "Missing required environment variable: ${name}"
  fi
}

require_var DEPLOY_HOST
require_var DEPLOY_USER

REPO_ROOT="$(git rev-parse --show-toplevel)"
cd "${REPO_ROOT}"

CURRENT_BRANCH="$(git branch --show-current)"
if [[ "${CURRENT_BRANCH}" != "${DEPLOY_BRANCH}" ]]; then
  fail "Must be on branch '${DEPLOY_BRANCH}' (currently on '${CURRENT_BRANCH}')"
fi

if [[ -n "$(git status --porcelain)" ]]; then
  fail "Working tree is not clean. Commit or stash changes before deploying."
fi

if [[ "${SKIP_LOCAL_CHECKS}" != "1" ]]; then
  log "Running local checks..."
  npm run lint
  npm run test
  npm run build
else
  log "Skipping local checks (SKIP_LOCAL_CHECKS=1)"
fi

log "Pushing ${DEPLOY_BRANCH} to origin..."
git push origin "${DEPLOY_BRANCH}"

DEPLOY_SHA="$(git rev-parse HEAD)"
DEPLOY_SHA_SHORT="$(git rev-parse --short HEAD)"
log "Deploying commit ${DEPLOY_SHA_SHORT} (${DEPLOY_SHA})"

DEPLOY_REPO_URL="${DEPLOY_REPO_URL:-$(git remote get-url origin)}"
SSH_TARGET="${DEPLOY_USER}@${DEPLOY_HOST}"

REMOTE_SCRIPT="$(cat <<EOF
set -euo pipefail

DEPLOY_PATH="${DEPLOY_PATH}"
DEPLOY_BRANCH="${DEPLOY_BRANCH}"
DEPLOY_SHA="${DEPLOY_SHA}"
DEPLOY_SHA_SHORT="${DEPLOY_SHA_SHORT}"
DEPLOY_REPO_URL="${DEPLOY_REPO_URL}"
DEPLOY_DOMAIN="${DEPLOY_DOMAIN}"

REQUIRED_ENV_VARS=(
  AZURE_FOUNDRY_ENDPOINT
  AZURE_FOUNDRY_API_KEY
  AZURE_FOUNDRY_MODEL
  AZURE_FOUNDRY_TUTOR_MODEL
)

log() {
  printf '==> %s\n' "\$*"
}

fail() {
  printf 'ERROR: %s\n' "\$*" >&2
  exit 1
}

rollback() {
  local previous_tag="\${1:-}"
  if [[ -z "\${previous_tag}" || "\${previous_tag}" == "none" ]]; then
    log "No previous image to roll back to."
    return 1
  fi

  log "Rolling back to image tag \${previous_tag}..."
  export APP_IMAGE_TAG="\${previous_tag}"
  docker compose up -d --no-build --remove-orphans app caddy || true
  return 1
}

if ! command -v docker >/dev/null 2>&1; then
  fail "Docker is not installed on the VM."
fi

if ! docker compose version >/dev/null 2>&1; then
  fail "Docker Compose plugin is not installed on the VM."
fi

mkdir -p "\${DEPLOY_PATH}"
cd "\${DEPLOY_PATH}"

PREVIOUS_TAG="none"
APP_CONTAINER="\$(docker compose ps -q app 2>/dev/null || true)"
if [[ -n "\${APP_CONTAINER}" ]]; then
  PREVIOUS_TAG="\$(docker inspect --format='{{.Config.Image}}' "\${APP_CONTAINER}" | awk -F: '{print \$NF}')"
fi
log "Previous app image tag: \${PREVIOUS_TAG}"

if [[ ! -d .git ]]; then
  if [[ -n "\$(ls -A 2>/dev/null || true)" ]]; then
    fail "Deploy path exists but is not a git repository: \${DEPLOY_PATH}"
  fi
  log "Cloning repository into \${DEPLOY_PATH}..."
  git clone --branch "\${DEPLOY_BRANCH}" "\${DEPLOY_REPO_URL}" .
else
  if [[ -n "\$(git status --porcelain)" ]]; then
    fail "VM checkout is dirty. Resolve manually before redeploying."
  fi
  log "Updating existing checkout..."
  git fetch origin "\${DEPLOY_BRANCH}"
  git checkout "\${DEPLOY_BRANCH}"
  git merge --ff-only "origin/\${DEPLOY_BRANCH}"
fi

CHECKOUT_SHA="\$(git rev-parse HEAD)"
if [[ "\${CHECKOUT_SHA}" != "\${DEPLOY_SHA}" ]]; then
  fail "VM checkout SHA (\${CHECKOUT_SHA}) does not match expected (\${DEPLOY_SHA})."
fi
log "VM checkout verified at \${DEPLOY_SHA_SHORT}"

if [[ ! -f .env.production ]]; then
  fail "Missing .env.production on VM. Copy from .env.example and set Azure credentials."
fi
chmod 600 .env.production

set -a
# shellcheck disable=SC1091
source .env.production
set +a

for var in "\${REQUIRED_ENV_VARS[@]}"; do
  if [[ -z "\${!var:-}" ]]; then
    fail "Missing required variable in .env.production: \${var}"
  fi
done

log "Validating Caddy configuration..."
docker run --rm \\
  -v "\$(pwd)/Caddyfile:/etc/caddy/Caddyfile:ro" \\
  caddy:2.9.1-alpine \\
  caddy validate --config /etc/caddy/Caddyfile

export APP_IMAGE_TAG="\${DEPLOY_SHA_SHORT}"
export DOCKER_BUILDKIT=1

log "Building app image (tag: \${APP_IMAGE_TAG})..."
if ! docker compose build app; then
  rollback "\${PREVIOUS_TAG}"
  fail "Docker build failed."
fi

log "Starting services..."
if ! docker compose up -d --no-build --remove-orphans; then
  rollback "\${PREVIOUS_TAG}"
  fail "docker compose up failed."
fi

log "Waiting for app container to become healthy..."
APP_HEALTHY=0
for attempt in \$(seq 1 30); do
  APP_STATUS="\$(docker inspect --format='{{if .State.Health}}{{.State.Health.Status}}{{else}}unknown{{end}}' "\$(docker compose ps -q app)" 2>/dev/null || echo "missing")"
  if [[ "\${APP_STATUS}" == "healthy" ]]; then
    APP_HEALTHY=1
    break
  fi
  sleep 2
done

if [[ "\${APP_HEALTHY}" != "1" ]]; then
  log "App container logs:"
  docker compose logs --tail=80 app || true
  rollback "\${PREVIOUS_TAG}"
  fail "App container did not become healthy."
fi

log "Waiting for HTTPS health endpoint..."
HTTPS_OK=0
for attempt in \$(seq 1 30); do
  if curl -fsS "https://\${DEPLOY_DOMAIN}/api/health" >/dev/null 2>&1; then
    HTTPS_OK=1
    break
  fi
  sleep 5
done

if [[ "\${HTTPS_OK}" != "1" ]]; then
  log "Caddy logs:"
  docker compose logs --tail=80 caddy || true
  log "App logs:"
  docker compose logs --tail=80 app || true
  rollback "\${PREVIOUS_TAG}"
  fail "HTTPS health check failed for https://\${DEPLOY_DOMAIN}/api/health"
fi

log "Deployment successful: \${DEPLOY_SHA_SHORT} live at https://\${DEPLOY_DOMAIN}"
EOF
)"

ssh -o BatchMode=yes -o StrictHostKeyChecking=accept-new "${SSH_TARGET}" "bash -s" <<< "${REMOTE_SCRIPT}"

log "Done. https://${DEPLOY_DOMAIN} is serving commit ${DEPLOY_SHA_SHORT}."
