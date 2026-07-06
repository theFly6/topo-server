#!/bin/bash
# 启动 /private/yaowenxuan/topo 下的 topo-server + express
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
NODE="$ROOT/node/bin/node"
export PATH="$ROOT/node/bin:$PATH"

TOPO_DIR="$ROOT/topo-server"
EXP_DIR="$ROOT/express"
TSNODE="$TOPO_DIR/node_modules/ts-node/dist/bin.js"
PID_DIR="$ROOT/pid"
LOG_DIR="$ROOT/logs"
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

stop_one topo-server
stop_one express

echo "[topo-server] starting..."
cd "$TOPO_DIR"
set -a; source "$TOPO_DIR/.env"; set +a
nohup "$NODE" "$TSNODE" ./src/server.ts \
  >> "$LOG_DIR/topo-server.log" 2>&1 &
echo $! > "$PID_DIR/topo-server.pid"

sleep 2
echo "[express] starting..."
cd "$EXP_DIR"
set -a; source "$EXP_DIR/.env"; set +a
nohup "$NODE" "$TSNODE" ./src/server.ts \
  >> "$LOG_DIR/express.log" 2>&1 &
echo $! > "$PID_DIR/express.pid"

echo "started topo-server pid=$(cat "$PID_DIR/topo-server.pid") express pid=$(cat "$PID_DIR/express.pid")"
ss -lntp | grep -E ':3000|:4000' || true
