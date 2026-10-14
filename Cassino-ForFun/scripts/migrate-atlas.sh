#!/usr/bin/env bash
# DBET — Migração do Mongo local (Docker) para MongoDB Atlas.
# Uso:
#   ./scripts/migrate-atlas.sh "mongodb+srv://<user>:<senha>@<cluster>.mongodb.net/dbet?retryWrites=true&w=majority"
set -euo pipefail

ATLAS_URI="${1:-}"
if [ -z "$ATLAS_URI" ]; then
  echo "Uso: $0 \"<MONGO_URI do Atlas>\"" >&2
  exit 1
fi

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
DUMP="$ROOT/mongo-backup/dbet"

if [ ! -d "$DUMP" ]; then
  echo "[1/4] Fazendo dump do banco local..."
  docker exec dbet-mongo mongodump --uri="mongodb://localhost:27017/dbet?replicaSet=rs0&directConnection=true" --out=/tmp/dbet-dump
  docker cp dbet-mongo:/tmp/dbet-dump "$ROOT/mongo-backup"
fi

echo "[2/4] Restaurando $DUMP no Atlas..."
docker run --rm -v "$ROOT/mongo-backup:/backup" mongo:7 \
  mongorestore --uri="$ATLAS_URI" --drop /backup/dbet

echo "[3/4] Apontando backend/.env para o Atlas..."
# node no lugar de sed: a URI contem '&' e quebraria o sed (expande para o match)
ATLAS_URI="$ATLAS_URI" node -e "
const fs = require('fs');
const p = '$ROOT/backend/.env';
const uri = process.env.ATLAS_URI;
const out = fs.readFileSync(p, 'utf8').split('\n').map(l => l.startsWith('MONGO_URI=') ? 'MONGO_URI=' + uri : l).join('\n');
fs.writeFileSync(p, out);
"

echo "[4/4] Reiniciando backend..."
cd "$ROOT" && docker compose up -d --force-recreate backend

sleep 6
curl -s -m 10 http://localhost:5000/health && echo && echo "✓ Migração concluída — backend agora usa o Atlas"
