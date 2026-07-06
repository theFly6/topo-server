#!/bin/bash
# 从 tj-24 控制节点将 topo-profiler 环境同步到 workers.conf 中的其它节点
set -euo pipefail

ROOT="/private/yaowenxuan/topo"
WORKERS="${ROOT}/topo-server/workers.conf"
PROFILER_HOME="/root/Topo-profiler"
WHEELS="/tmp/py-wheels"
LOCAL_IP=$(hostname -I | awk '{print $1}')

install_on_node() {
  local ip=$1
  echo "[sync] >>> $ip"

  ssh -o BatchMode=yes -o ConnectTimeout=10 -p 22 "$ip" "mkdir -p /root/Topo-profiler /tmp/py-wheels"
  scp -r -P 22 "$PROFILER_HOME"/* "${ip}:/root/Topo-profiler/"
  scp -P 22 /tmp/get-pip.py "${ip}:/tmp/" 2>/dev/null || true
  scp -P 22 "$WHEELS"/*.whl "${ip}:/tmp/py-wheels/"

  ssh -p 22 "$ip" 'set -e
    if ! python3 -c "import numpy" 2>/dev/null; then
      python3 /tmp/get-pip.py --no-index --find-links=/tmp/py-wheels -q
      python3 -m pip install --no-index --find-links=/tmp/py-wheels numpy -q
    fi
    python3 -c "import numpy; print(\"numpy\", numpy.__version__)"
    test -f /root/Topo-profiler/main.py
    echo "[ok] profiler ready"
  '
}

# 本机
if ! python3 -c "import numpy" 2>/dev/null; then
  echo "[sync] 本机缺少 numpy，请先运行 install-topo-profiler.sh"
  exit 1
fi

while read -r line; do
  line="${line%%#*}"
  line=$(echo "$line" | xargs)
  [[ -z "$line" ]] && continue
  read -r hostname ip port <<< "$line"
  [[ "$hostname" == "Overall" || "$hostname" == "Subnet" ]] && continue
  ip="${ip%%/*}"
  [[ "$ip" == "$LOCAL_IP" || "$ip" == "177.177.190.145" ]] && continue
  install_on_node "$ip"
done < "$WORKERS"

echo "[done] workers profiler 环境已同步"
