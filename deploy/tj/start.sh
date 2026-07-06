#!/bin/bash
# 启动 /private/yaowenxuan/topo 下的服务
# 用法:
#   bash start.sh              # 默认仅 topo-server（本机 express 联调）
#   bash start.sh topo-server
#   bash start.sh all          # topo-server + express 同机部署
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
NODE="$ROOT/node/bin/node"
export PATH="$ROOT/node/bin:$PATH"

TOPO_DIR="$ROOT/topo-server"
EXP_DIR="$ROOT/express"
TSNODE="$TOPO_DIR/node_modules/ts-node/dist/bin.js"
PID_DIR="$ROOT/pid"
LOG_DIR="$ROOT/logs"
MODE="${1:-topo-server}"
mkdir -p "$PID_DIR" "$LOG_DIR"

if [[ ! -x "$NODE" ]]; then
  echo "Node 未安装: $NODE"
  exit 1
fi

stop_one() {
  local name=$1
  local file="$PID_DIR/$name.pid"
  if [[ -f "$file" ]]; then
    local pid
    pid=$(cat "$file")
    if kill -0 "$pid" 2>/dev/null; then kill "$pid" || true; fi
    rm -f "$file"
  fi
}

start_topo_server() {
  stop_one topo-server
  echo "[topo-server] starting..."
  cd "$TOPO_DIR"
  set -a; source "$TOPO_DIR/.env"; set +a
  nohup "$NODE" "$TSNODE" ./src/server.ts \
    >> "$LOG_DIR/topo-server.log" 2>&1 &
  echo $! > "$PID_DIR/topo-server.pid"
  echo "[topo-server] pid=$(cat "$PID_DIR/topo-server.pid")"
}

start_express() {
  stop_one express
  local exp_tsnode="$EXP_DIR/node_modules/ts-node/dist/bin.js"
  if [[ ! -f "$exp_tsnode" ]]; then
    exp_tsnode="$TSNODE"
  fi
  echo "[express] starting..."
  cd "$EXP_DIR"
  set -a; source "$EXP_DIR/.env"; set +a
  nohup "$NODE" "$exp_tsnode" ./src/server.ts \
    >> "$LOG_DIR/express.log" 2>&1 &
  echo $! > "$PID_DIR/express.pid"
  echo "[express] pid=$(cat "$PID_DIR/express.pid")"
}

case "$MODE" in
  topo-server|topo)
    start_topo_server
    ;;
  all)
    start_topo_server
    sleep 2
    start_express
    ;;
  express)
    start_express
    ;;
  *)
    echo "用法: $0 [topo-server|all|express]"
    exit 1
    ;;
esac

echo "[done] mode=$MODE"
ss -lntp | grep -E ':3000|:4000' || true
