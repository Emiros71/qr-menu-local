#!/usr/bin/env bash
set -euo pipefail

# ============================================================
# QR Menu - VPS Restore Script
# Restores: Coolify config, Supabase DB, Docker volumes, .env
# Usage: bash restore.sh qr-menu-backup-YYYY-MM-DD.tar.gz
# ============================================================

if [ -z "${1:-}" ]; then
    echo "Usage: bash restore.sh <backup-archive.tar.gz>"
    exit 1
fi

BACKUP_FILE="$1"
RESTORE_DIR="/tmp/qr-restore-$$"

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

log() { echo -e "${GREEN}[RESTORE]${NC} $1"; }
warn() { echo -e "${YELLOW}[WARN]${NC} $1"; }
error() { echo -e "${RED}[ERROR]${NC} $1"; }

log "=== QR Menu VPS Restore ==="
log "Restoring from: ${BACKUP_FILE}"

# ============================================================
# Pre-flight checks
# ============================================================
if [ ! -f "$BACKUP_FILE" ]; then
    error "Backup file not found: ${BACKUP_FILE}"
    exit 1
fi

if ! command -v docker &>/dev/null; then
    error "Docker is not installed. Please install Docker first."
    exit 1
fi

mkdir -p "$RESTORE_DIR"
tar xzf "$BACKUP_FILE" -C "$RESTORE_DIR"

BACKUP_DIR=$(find "$RESTORE_DIR" -maxdepth 1 -type d -name "qr-menu-backup-*" | head -1)

if [ -z "$BACKUP_DIR" ]; then
    error "Could not find backup directory in archive."
    exit 1
fi

log "Backup extracted to: ${BACKUP_DIR}"

if [ -f "${BACKUP_DIR}/metadata.json" ]; then
    log "--- Backup Metadata ---"
    cat "${BACKUP_DIR}/metadata.json"
    echo ""
fi

# ============================================================
# 1. Restore Coolify (if not installed)
# ============================================================
log "--- Checking Coolify installation ---"

if ! docker ps --format '{{.Names}}' | grep -q coolify; then
    warn "Coolify is not installed. Installing now..."
    log "Installing Coolify..."
    curl -fsSL https://cdn.coollabs.io/coolify/install.sh | bash || {
        error "Coolify installation failed. Please install manually: https://coolify.io/docs/installation"
        exit 1
    }
    log "Coolify installed. Waiting for services to start..."
    sleep 30
else
    log "Coolify is already installed. Skipping installation."
fi

# ============================================================
# 2. Restore Coolify Configuration
# ============================================================
log "--- Restoring Coolify configuration ---"

if [ -d "${BACKUP_DIR}/coolify" ]; then
    if [ -d "${BACKUP_DIR}/coolify/data/coolify" ]; then
        log "Restoring Coolify data..."
        docker compose -f /data/coolify/docker-compose.yml down 2>/dev/null || true

        if [ -d "/data/coolify" ]; then
            cp -r "${BACKUP_DIR}/coolify/data/coolify/"* /data/coolify/ 2>/dev/null || warn "Could not restore Coolify data"
        fi

        docker compose -f /data/coolify/docker-compose.yml up -d 2>/dev/null || true
        log "Coolify restarted."
    fi

    if [ -f "${BACKUP_DIR}/coolify/coolify_db.sql" ]; then
        COOLIFY_DB=$(docker ps --format '{{.Names}}' | grep -i "coolify.*db" | head -1 || true)
        if [ -n "$COOLIFY_DB" ]; then
            log "Restoring Coolify database..."
            docker exec -i "$COOLIFY_DB" psql -U postgres -d coolify < "${BACKUP_DIR}/coolify/coolify_db.sql" 2>/dev/null || \
            warn "Could not restore Coolify database"
        fi
    fi
fi

# ============================================================
# 3. Restore Docker Volumes
# ============================================================
log "--- Restoring Docker volumes ---"

if [ -d "${BACKUP_DIR}/volumes" ]; then
    for VOL_ARCHIVE in "${BACKUP_DIR}"/volumes/*.tar.gz; do
        if [ -f "$VOL_ARCHIVE" ]; then
            VOL_NAME=$(basename "$VOL_ARCHIVE" .tar.gz)
            log "Restoring volume: ${VOL_NAME}"

            docker volume create "$VOL_NAME" 2>/dev/null || true

            docker run --rm \
                -v "$VOL_NAME":/volume \
                -v "${BACKUP_DIR}/volumes":/backup \
                alpine tar xzf "/backup/${VOL_NAME}.tar.gz" -C /volume 2>/dev/null || \
            warn "Failed to restore volume: ${VOL_NAME}"
        fi
    done
fi

# ============================================================
# 4. Restore Supabase Database
# ============================================================
log "--- Restoring Supabase databases ---"

PG_CONTAINER=$(docker ps --format '{{.Names}}' | grep -i "postgres\|supabase.*db" | head -1 || true)

if [ -z "$PG_CONTAINER" ]; then
    warn "No Postgres container found. Supabase databases cannot be restored automatically."
    warn "You may need to restore Supabase manually via Coolify dashboard."
else
    log "Found Postgres container: ${PG_CONTAINER}"

    for DUMP in "${BACKUP_DIR}"/supabase/*.dump; do
        if [ -f "$DUMP" ]; then
            DB_NAME=$(basename "$DUMP" .dump)
            log "Restoring database (dump): ${DB_NAME}"
            docker exec -i "$PG_CONTAINER" createdb -U postgres "$DB_NAME" 2>/dev/null || true
            docker exec -i "$PG_CONTAINER" pg_restore -U postgres -d "$DB_NAME" --clean --if-exists < "$DUMP" 2>/dev/null || \
            warn "Failed to restore database: ${DB_NAME}"
        fi
    done

    for SQL in "${BACKUP_DIR}"/supabase/*.sql; do
        if [ -f "$SQL" ]; then
            DB_NAME=$(basename "$SQL" .sql)
            log "Restoring database (sql): ${DB_NAME}"
            docker exec -i "$PG_CONTAINER" createdb -U postgres "$DB_NAME" 2>/dev/null || true
            docker exec -i "$PG_CONTAINER" psql -U postgres -d "$DB_NAME" < "$SQL" 2>/dev/null || \
            warn "Failed to restore database: ${DB_NAME}"
        fi
    done
fi

# ============================================================
# 5. Restore Application Files
# ============================================================
log "--- Restoring application files ---"

if [ -d "${BACKUP_DIR}/app" ]; then
    for APP_DIR in "${BACKUP_DIR}"/app/*/; do
        if [ -d "$APP_DIR" ]; then
            APP_NAME=$(basename "$APP_DIR")
            log "Found app: ${APP_NAME}"

            for DEST in /data/coolify/applications /opt /home; do
                if [ -d "$DEST" ]; then
                    cp -r "$APP_DIR" "${DEST}/${APP_NAME}" 2>/dev/null || true
                    log "Restored app to: ${DEST}/${APP_NAME}"
                    break
                fi
            done
        fi
    done
fi

# ============================================================
# 6. Restore Environment Files
# ============================================================
log "--- Restoring environment files ---"

if [ -d "${BACKUP_DIR}/env" ]; then
    while IFS= read -r -d '' ENV_FILE; do
        REL_PATH="${ENV_FILE#${BACKUP_DIR}/env/}"
        DEST="/${REL_PATH}"
        DEST_DIR=$(dirname "$DEST")
        mkdir -p "$DEST_DIR" 2>/dev/null || true
        cp "$ENV_FILE" "$DEST" 2>/dev/null || warn "Could not restore: ${DEST}"
        log "Restored: ${DEST}"
    done < <(find "${BACKUP_DIR}/env" -name ".env*" -print0 2>/dev/null)
fi

# ============================================================
# 7. Restore Docker Compose files
# ============================================================
log "--- Restoring Docker Compose files ---"

if [ -d "${BACKUP_DIR}/app" ]; then
    while IFS= read -r -d '' DC_FILE; do
        REL_PATH="${DC_FILE#${BACKUP_DIR}/app/}"
        DEST="/${REL_PATH}"
        DEST_DIR=$(dirname "$DEST")
        mkdir -p "$DEST_DIR" 2>/dev/null || true
        cp "$DC_FILE" "$DEST" 2>/dev/null || warn "Could not restore: ${DEST}"
        log "Restored compose: ${DEST}"
    done < <(find "${BACKUP_DIR}/app" \( -name "docker-compose*.yml" -o -name "docker-compose*.yaml" \) -print0 2>/dev/null)
fi

# ============================================================
# 8. Restart services
# ============================================================
log "--- Restarting services ---"

if docker ps --format '{{.Names}}' | grep -q coolify; then
    log "Restarting Coolify..."
    docker compose -f /data/coolify/docker-compose.yml restart 2>/dev/null || true
fi

log "Restarting application containers..."
docker ps --format '{{.Names}}' | grep -i "qr-menu\|next" | while read -r CONTAINER; do
    log "Restarting: ${CONTAINER}"
    docker restart "$CONTAINER" 2>/dev/null || true
done

# ============================================================
# Cleanup
# ============================================================
rm -rf "$RESTORE_DIR"

log "=== Restore Complete ==="
log ""
log "Next steps:"
log "  1. Open Coolify dashboard: http://$(hostname -I | awk '{print $1}'):8000"
log "  2. Verify all applications are running"
log "  3. Check Supabase connection in your app"
log "  4. Test your QR menu URLs"
log ""
warn "IMPORTANT: Verify your .env files contain correct values for the new VPS!"
warn "You may need to update NEXT_PUBLIC_SITE_URL and other domain-specific variables."
