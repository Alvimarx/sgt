#!/usr/bin/env bash
# Respaldo comprimido de las dos bases, con rotación por días.
#   bash scripts/backup_mysql.sh            # -> ./backups/sgt-YYYYmmdd-HHMM.sql.gz
#   RETENTION_DAYS=14 bash scripts/backup_mysql.sh
# Cron sugerido (3:15 AM):
#   15 3 * * * cd /opt/sgt && bash scripts/backup_mysql.sh >> /var/log/sgt-backup.log 2>&1
set -euo pipefail

cd "$(dirname "$0")/.."
set -a; . ./.env.hetzner; set +a
DEST="${BACKUP_DIR:-./backups}"
RETENTION_DAYS="${RETENTION_DAYS:-7}"
mkdir -p "$DEST"
FILE="$DEST/sgt-$(date +%Y%m%d-%H%M).sql.gz"

docker compose -f docker-compose.hetzner.yml --env-file .env.hetzner exec -T mysql \
  mysqldump -uroot -p"$MYSQL_ROOT_PASSWORD" \
    --single-transaction --routines --triggers --events \
    --databases gestionturnos innhosp 2>/dev/null | gzip -9 > "$FILE"

# Un dump que falla a mitad deja un .gz truncado: verificarlo antes de rotar.
gzip -t "$FILE" || { echo "ERROR: respaldo corrupto, se conserva y NO se rota: $FILE"; exit 1; }
SIZE=$(du -h "$FILE" | cut -f1)
echo "$(date '+%F %T') OK $FILE ($SIZE)"

find "$DEST" -name 'sgt-*.sql.gz' -type f -mtime "+$RETENTION_DAYS" -print -delete
