#!/usr/bin/env bash
# Safe Production Prisma Migration & Backup Helper for Hostinger VPS
# Runs pre-migration pg_dump backup, verifies DB connectivity, and executes
# Only applies versioned migrations (`prisma migrate deploy`); never resets production data.

set -euo pipefail

APP_DIR="${1:-/opt/primebazaar-fashion}"
BACKUP_DIR="${BACKUP_DIR:-/opt/primebazaar-backups}"
RELEASE_TAG="${SHA:-$(date +%Y%m%d_%H%M%S)}"

if [ ! -d "$APP_DIR" ]; then
  echo "Target directory not found: $APP_DIR"
  exit 1
fi

# Load production environment variables safely if present
if [ -f "/opt/primebazaar-shared/.env" ]; then
  set -a
  # shellcheck disable=SC1091
  source "/opt/primebazaar-shared/.env"
  set +a
elif [ -f "$APP_DIR/.env" ]; then
  set -a
  # shellcheck disable=SC1091
  source "$APP_DIR/.env"
  set +a
fi

cd "$APP_DIR"
npx prisma validate
npx prisma generate

if [ -n "${DATABASE_URL:-}" ]; then
  echo "Validating production PostgreSQL connectivity..."
  if command -v pg_isready >/dev/null 2>&1; then
    pg_isready -d "$DATABASE_URL" -t 10
  fi

  mkdir -p "$BACKUP_DIR"
  chmod 700 "$BACKUP_DIR"
  if command -v pg_dump >/dev/null 2>&1; then
    echo "Creating pre-migration database backup..."
    pg_dump "$DATABASE_URL" > "$BACKUP_DIR/primebazaar_${RELEASE_TAG}.sql.bak"
    ls -1dt "$BACKUP_DIR"/primebazaar_*.sql.bak 2>/dev/null | tail -n +11 | xargs -r rm -f
  fi

  echo "Applying safe production Prisma migrations (prisma migrate deploy)..."
  npx prisma migrate deploy
else
  echo "DATABASE_URL is not configured; skipping prisma migrate deploy."
fi

echo "Safe migration check completed cleanly."
