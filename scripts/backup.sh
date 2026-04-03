#!/usr/bin/env bash
set -euo pipefail

# ============================================================
# QR Menu - VPS Backup Script
# Backs up: Coolify config, Supabase DB, Docker volumes, .env
# ============================================================

BACKUP_NAME="qr-menu-backup-$(date +%Y-%m-%d_%H%M%S)"
BACKUP_DIR="/tmp/${BACKUP_NAME}"
LOG_FILE="/tmp/${BACKUP_NAME}.log"

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

log() { echo -e "${GREEN}[BACKUP]${NC} $1" | tee -a "$LOG_FILE"; }
warn() { echo -e "${YELLOW}[WARN]${NC} $1" | tee -a "$LOG_FILE"; }
error() { echo -e "${RED}[ERROR]${NC} $1" | tee -a "$LOG_FILE"; }

log "=== QR Menu VPS Backup ==="
log "Starting backup: ${BACKUP_NAME}"

if ! command -v docker &>/dev/null; then
    error "Docker is not installed. Aborting."
    exit 1
fi

if ! docker ps --format '{{.Names}}' | grep -q coolify; then
    warn "Coolify container not found. Continuing without Coolify backup."
    COOLIFY_AVAILABLE=false
else
    COOLIFY_AVAILABLE=true
fi

mkdir -p "${BACKUP_DIR}"/{coolify,supabase,app,volumes,env}

# ============================================================
# 1. Supabase Database Backup
# ============================================================
log "--- Backing up Supabase databases ---"

PG_CONTAINER=$(docker ps --format '{{.Names}}' | grep -i "postgres\|supabase.*db" | head -1 || true)

if [ -z "$PG_CONTAINER" ]; then
    warn "No Supabase Postgres container found. Skipping DB backup."
else
    log "Found Postgres container: ${PG_CONTAINER}"

    DBS=$(docker exec "$PG_CONTAINER" psql -U postgres -tAc \
        "SELECT datname FROM pg_database WHERE datname NOT IN ('postgres','template0','template1');" 2>/dev/null || true)

    if [ -z "$DBS" ]; then
        warn "No databases found to backup."
    else
        for DB in $DBS; do
            DB=$(echo "$DB" | tr -d '[:space:]')
            log "Dumping database: ${DB}"
            docker exec "$PG_CONTAINER" pg_dump -U postgres -Fc "$DB" > "${BACKUP_DIR}/supabase/${DB}.dump" 2>/dev/null || \
            docker exec "$PG_CONTAINER" pg_dump -U postgres --no-owner --no-acl "$DB" > "${BACKUP_DIR}/supabase/${DB}.sql" 2>/dev/null || \
            warn "Failed to dump database: ${DB}"
        done
    fi
fi

# ============================================================
# 2. Coolify Configuration Backup
# ============================================================
if [ "$COOLIFY_AVAILABLE" = true ]; then
    log "--- Backing up Coolify configuration ---"

    COOLIFY_DATA="/data/coolify"
    if [ -d "$COOLIFY_DATA" ]; then
        log "Copying Coolify data from ${COOLIFY_DATA}"
        cp -r "$COOLIFY_DATA" "${BACKUP_DIR}/coolify/" 2>/dev/null || warn "Could not copy Coolify data"
    fi

    COOLIFY_DB=$(docker ps --format '{{.Names}}' | grep -i "coolify.*db" | head -1 || true)
    if [ -n "$COOLIFY_DB" ]; then
        log "Backing up Coolify database"
        docker exec "$COOLIFY_DB" pg_dump -U postgres coolify > "${BACKUP_DIR}/coolify/coolify_db.sql" 2>/dev/null || \
        warn "Could not backup Coolify database"
    fi
fi

# ============================================================
# 3. Application Backup
# ============================================================
log "--- Backing up application files ---"

APP_CONTAINER=$(docker ps --format '{{.Names}}' | grep -i "qr-menu\|next" | head -1 || true)

if [ -n "$APP_CONTAINER" ]; then
    log "Found app container: ${APP_CONTAINER}"
    APP_SOURCE=$(docker inspect "$APP_CONTAINER" --format '{{range .Mounts}}{{if eq .Destination "/app"}}{{.Source}}{{end}}{{end}}' 2>/dev/null || true)

    if [ -n "$APP_SOURCE" ] && [ -d "$APP_SOURCE" ]; then
        log "Copying app source from ${APP_SOURCE}"
        cp -r "$APP_SOURCE" "${BACKUP_DIR}/app/source" 2>/dev/null || warn "Could not copy app source"
    fi
fi

for DIR in /data/coolify/applications /var/lib/coolify/applications /opt/qr-menu /home/*/qr-menu*; do
    if [ -d "$DIR" ]; then
        log "Found app directory: ${DIR}"
        cp -r "$DIR" "${BACKUP_DIR}/app/$(basename "$DIR")" 2>/dev/null || true
    fi
done

# ============================================================
# 4. Docker Volume Backup
# ============================================================
log "--- Backing up Docker volumes ---"

VOLUMES=$(docker volume ls --format '{{.Name}}' | grep -i "coolify\|supabase\|qr-menu\|postgres" || true)

if [ -n "$VOLUMES" ]; then
    for VOL in $VOLUMES; do
        log "Backing up volume: ${VOL}"
        docker run --rm \
            -v "$VOL":/volume:ro \
            -v "${BACKUP_DIR}/volumes":/backup \
            alpine tar czf "/backup/${VOL}.tar.gz" -C /volume . 2>/dev/null || \
        warn "Failed to backup volume: ${VOL}"
    done
fi

# ============================================================
# 5. Environment Files
# ============================================================
log "--- Backing up environment files ---"

for BASE_PATH in /data/coolify /data/coolify/applications /opt/qr-menu /home /root /var/lib/coolify; do
    if [ -d "$BASE_PATH" ]; then
        while IFS= read -r -d '' ENV_FILE; do
            REL_PATH="${ENV_FILE#$BASE_PATH/}"
            DEST_DIR="${BACKUP_DIR}/env/$(dirname "$REL_PATH")"
            mkdir -p "$DEST_DIR"
            cp "$ENV_FILE" "${BACKUP_DIR}/env/${REL_PATH}" 2>/dev/null || true
            log "Backed up: ${ENV_FILE}"
        done < <(find "$BASE_PATH" -maxdepth 4 -name ".env*" -print0 2>/dev/null)
    fi
done

# ============================================================
# 6. Docker Compose files
# ============================================================
log "--- Backing up Docker Compose files ---"

for BASE_PATH in /data/coolify /data/coolify/applications /opt/qr-menu /home /root /var/lib/coolify; do
    if [ -d "$BASE_PATH" ]; then
        while IFS= read -r -d '' DC_FILE; do
            REL_PATH="${DC_FILE#$BASE_PATH/}"
            DEST_DIR="${BACKUP_DIR}/app/$(dirname "$REL_PATH")"
            mkdir -p "$DEST_DIR"
            cp "$DC_FILE" "${BACKUP_DIR}/app/${REL_PATH}" 2>/dev/null || true
            log "Backed up compose: ${DC_FILE}"
        done < <(find "$BASE_PATH" -maxdepth 4 \( -name "docker-compose*.yml" -o -name "docker-compose*.yaml" \) -print0 2>/dev/null)
    fi
done

# ============================================================
# 7. Metadata
# ============================================================
log "--- Creating backup metadata ---"

cat > "${BACKUP_DIR}/metadata.json" <<EOF
{
    "backup_name": "${BACKUP_NAME}",
    "backup_date": "$(date -u +%Y-%m-%dT%H:%M:%SZ)",
    "hostname": "$(hostname)",
    "coolify_available": ${COOLIFY_AVAILABLE},
    "postgres_container": "${PG_CONTAINER:-none}",
    "app_container": "${APP_CONTAINER:-none}"
}
EOF

# ============================================================
# 8. Create archive
# ============================================================
log "--- Creating final archive ---"

OUTPUT_DIR="/root/qr-menu-backups"
mkdir -p "$OUTPUT_DIR"

cd /tmp
tar czf "${OUTPUT_DIR}/${BACKUP_NAME}.tar.gz" "$BACKUP_NAME"
rm -rf "$BACKUP_DIR"

BACKUP_SIZE=$(du -sh "${OUTPUT_DIR}/${BACKUP_NAME}.tar.gz" | cut -f1)

log "=== Backup Complete ==="
log "Archive: ${OUTPUT_DIR}/${BACKUP_NAME}.tar.gz"
log "Size: ${BACKUP_SIZE}"
log ""
log "Transfer to new VPS:"
log "  scp ${OUTPUT_DIR}/${BACKUP_NAME}.tar.gz user@new-vps:/root/"
log ""
log "On new VPS run:"
log "  bash restore.sh ${BACKUP_NAME}.tar.gz"
