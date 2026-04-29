#!/usr/bin/env bash
set -euo pipefail

ENV_FILE="install/.env.local"

echo ""
echo "=== Panda Manager — Local Setup ==="
echo ""

# ── 1. Check Docker ──────────────────────────────────────────────────────────
if ! command -v docker &>/dev/null; then
  echo "ERROR: Docker is not installed."
  echo "       Download Docker Desktop from: https://www.docker.com/products/docker-desktop/"
  exit 1
fi

if ! docker info &>/dev/null; then
  echo "ERROR: Docker is not running."
  echo "       Open Docker Desktop and wait for it to finish starting, then try again."
  exit 1
fi

# ── 2. Check if already configured ───────────────────────────────────────────
if [ -f "$ENV_FILE" ]; then
  echo "Found existing configuration ($ENV_FILE) — skipping API key prompt."
  echo "Delete that file and re-run if you need to change your API key."
else
  # ── 3. Prompt for API key ─────────────────────────────────────────────────
  echo "You need an Anthropic API key to use the AI features."
  echo "Get one at: https://console.anthropic.com/"
  echo ""
  read -r -p "Paste your Anthropic API key: " ANTHROPIC_API_KEY
  echo ""

  if [ -z "$ANTHROPIC_API_KEY" ]; then
    echo "ERROR: API key cannot be empty."
    exit 1
  fi

  # ── 4. Generate secret + write .env.local ─────────────────────────────────
  BETTER_AUTH_SECRET=$(openssl rand -base64 32)

  mkdir -p install
  cat > "$ENV_FILE" <<EOF
ANTHROPIC_API_KEY=${ANTHROPIC_API_KEY}
BETTER_AUTH_SECRET=${BETTER_AUTH_SECRET}
GOOGLE_CLIENT_ID=265328498348-hjme4n8t186tabkjnt957k871vim46r4.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=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
GOOGLE_CALENDAR_REDIRECT_URI=http://localhost:3000/api/oauth/calendar/callback
EOF

  echo "Configuration saved to $ENV_FILE"
fi

# ── 5. Build and start ────────────────────────────────────────────────────────
echo ""
echo "Starting Panda Manager (first run builds the Docker image — ~5 min)..."
echo ""
docker compose -f install/docker-compose.local.yml up --build -d

# ── 6. Wait for app to be ready ───────────────────────────────────────────────
echo ""
echo "Waiting for the app to start..."
MAX_WAIT=180
ELAPSED=0
until curl -sf http://localhost:3000 >/dev/null 2>&1; do
  if [ "$ELAPSED" -ge "$MAX_WAIT" ]; then
    echo ""
    echo "ERROR: App did not start within ${MAX_WAIT}s."
    echo "       Check logs with: docker compose -f install/docker-compose.local.yml logs app"
    exit 1
  fi
  printf "."
  sleep 3
  ELAPSED=$((ELAPSED + 3))
done

echo ""
echo ""
echo "=== Ready! ==="
echo ""
echo "  URL:      http://localhost:3000"
echo "  Email:    admin@localhost.dev"
echo "  Password: admin123"
echo ""

open http://localhost:3000
