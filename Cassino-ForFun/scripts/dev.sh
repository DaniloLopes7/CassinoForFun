#!/usr/bin/env bash
# DBET — ambiente de desenvolvimento (backend + frontend)
ROOT="$(cd "$(dirname "$0")/.." && pwd)"

case "${1:-all}" in
  backend)
    pkill -f "dbet/backend" 2>/dev/null
    cd "$ROOT/backend" && exec node index.js
    ;;
  frontend)
    cd "$ROOT/frontend" && exec npm run dev
    ;;
  start-bg)
    mkdir -p /tmp/dbet
    cd "$ROOT/backend" && nohup node index.js > /tmp/dbet/backend.log 2>&1 &
    echo $! > /tmp/dbet/backend.pid
    echo "backend pid $(cat /tmp/dbet/backend.pid)"
    ;;
  stop)
    [ -f /tmp/dbet/backend.pid ] && kill "$(cat /tmp/dbet/backend.pid)" 2>/dev/null && rm /tmp/dbet/backend.pid
    ;;
  *)
    echo "uso: dev.sh [backend|frontend|start-bg|stop]"
    ;;
esac
