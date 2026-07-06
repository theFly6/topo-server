#!/usr/bin/env bash
# mx17：经 SSH 反向代理 (本机 Clash 7892) git pull，与 GitHub main 对齐
# 本机执行: ssh -R 7892:127.0.0.1:7892 metax-17-jump 'bash /home/yaowenxuan/topo-server/deploy/sync-mx17-topo-server.sh'
set -euo pipefail

ROOT="${TOPO_ROOT:-/home/yaowenxuan/topo-server}"
PROXY="${SYNC_PROXY:-socks5h://127.0.0.1:7892}"
cd "$ROOT"

export ALL_PROXY="$PROXY" HTTP_PROXY="$PROXY" HTTPS_PROXY="$PROXY"
export GIT_CONFIG_COUNT=2
export GIT_CONFIG_KEY_0=http.proxy
export GIT_CONFIG_VALUE_0="$PROXY"
export GIT_CONFIG_KEY_1=https.proxy
export GIT_CONFIG_VALUE_1="$PROXY"

echo "[mx17] fetch & reset to origin/main via proxy $PROXY ..."
git fetch origin
git checkout main
git reset --hard origin/main
git clean -fd \
  --exclude=node_modules --exclude=logs --exclude=pid \
  --exclude=deploy/sync-mx17-topo-server.sh || git clean -fd

TARGET="$(git rev-parse HEAD)"
echo "[mx17] HEAD=$TARGET $(git log -1 --oneline)"

echo "[mx17] apply metax platform config ..."
cp deploy/platforms/metax/env.topo-server .env
cp deploy/platforms/metax/workers.conf ./workers.conf

if git diff HEAD@{1} HEAD --name-only 2>/dev/null | grep -qE '^package(-lock)?\.json$'; then
  echo "[mx17] npm ci (package.json changed) ..."
  npm_config_proxy="$PROXY" npm_config_https_proxy="$PROXY" npm ci --quiet
fi

chmod +x run.sh deploy/tj/*.sh deploy/sync-mx17-topo-server.sh 2>/dev/null || true

echo "[mx17] restart topo-server ..."
bash ./run.sh stop || true
bash ./run.sh start
bash ./run.sh status | tail -6

echo "[mx17] verify ..."
curl -sS -m 5 -X POST "http://127.0.0.1:4000/info/nodes" | head -c 150
echo
md5sum src/controller/networkController.ts
echo "[mx17] done."
