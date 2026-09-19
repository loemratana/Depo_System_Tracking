#!/usr/bin/env bash
# Runs ON the VPS. The GitHub Actions workflow (.github/workflows/backend-cicd.yml)
# streams this file over SSH, so the version in the repo is always the one
# that runs — no need to keep a copy up to date on the server.
#
#   usage: deploy-backend.sh <image-ref>
#   e.g.   deploy-backend.sh ghcr.io/loemratana/depot-backend:sha-1a2b3c4
#
# What it does: pull the new image -> restart ONLY the backend container ->
# wait for its Docker healthcheck -> roll back to the previous image if it
# never becomes healthy. It does NOT run database migrations; apply those
# yourself before pushing (see the workflow header).
set -euo pipefail

NEW_IMAGE="${1:?usage: deploy-backend.sh <image-ref>}"
# Folder on the VPS that holds the compose file and .env.production.
APP_DIR="${APP_DIR:-/opt/apps/depot-api/Backend}"
CONTAINER="${CONTAINER:-depot-backend}"
STATE_FILE="$APP_DIR/.deployed-image"
WAIT_TRIES="${WAIT_TRIES:-30}"      # x5s = 150s (the compose healthcheck runs every 30s)
WAIT_SECONDS="${WAIT_SECONDS:-5}"

cd "$APP_DIR"
PREV_IMAGE="$(cat "$STATE_FILE" 2>/dev/null || true)"

# The compose file must read the image from BACKEND_IMAGE, otherwise
# `pull`/`up` would silently keep running the old build and this "deploy"
# would succeed without changing anything.
export BACKEND_IMAGE="$NEW_IMAGE"
if ! compose_images="$(docker compose config --images)"; then
  echo "!! 'docker compose config' failed in $APP_DIR — is the compose file (and .env.production) there? Set APP_DIR if the folder differs." >&2
  exit 1
fi
if ! grep -Fxq "$NEW_IMAGE" <<< "$compose_images"; then
  echo "!! docker-compose.yml does not use \${BACKEND_IMAGE}. In the backend service, replace build: with:" >&2
  echo "     image: \${BACKEND_IMAGE:-ghcr.io/loemratana/depot-backend:latest}" >&2
  exit 1
fi

echo "==> Pulling $NEW_IMAGE"
docker compose pull backend

echo "==> Restarting backend (nginx/certbot are left alone)"
docker compose up -d --no-deps backend

echo "==> Waiting for $CONTAINER to become healthy"
status="missing"
for _ in $(seq 1 "$WAIT_TRIES"); do
  status="$(docker inspect -f '{{if .State.Health}}{{.State.Health.Status}}{{else}}none{{end}}' "$CONTAINER" 2>/dev/null || echo missing)"
  if [ "$status" = "healthy" ]; then break; fi
  sleep "$WAIT_SECONDS"
done

if [ "$status" = "healthy" ]; then
  echo "$NEW_IMAGE" > "$STATE_FILE"
  docker image prune -f > /dev/null   # dangling layers only; keeps tagged images for rollback
  echo "==> Deployed $NEW_IMAGE"
  exit 0
fi

echo "!! $CONTAINER is not healthy (status=$status). Last logs:" >&2
docker compose logs --tail=50 backend >&2 || true

if [ -n "$PREV_IMAGE" ]; then
  echo "==> Rolling back to $PREV_IMAGE" >&2
  export BACKEND_IMAGE="$PREV_IMAGE"
  docker compose up -d --no-deps backend
else
  echo "!! No previous image recorded ($STATE_FILE) — nothing to roll back to." >&2
fi
exit 1
