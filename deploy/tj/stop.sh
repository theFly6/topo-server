#!/bin/bash
# 停止 tj-24 上的服务
# 用法: stop.sh [topo-server|express|all]   默认 all
ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
PID_DIR="$ROOT/pid"
MODE="${1:-all}"

stop_one() {
  local name=$1
  local file="$PID_DIR/$name.pid"
  if [[ -f "$file" ]]; then
    local pid
    pid=$(cat "$file")
    kill "$pid" 2>/dev/null || true
    rm -f "$file"
    echo "stopped $name ($pid)"
  fi
}

case "$MODE" in
  topo-server|topo) stop_one topo-server ;;
  express) stop_one express ;;
  all)
    stop_one topo-server
    stop_one express
    ;;
  *)
    echo "用法: $0 [topo-server|express|all]"
    exit 1
    ;;
esac
