#!/bin/bash
# 在 tj-24 上执行：通过 SSH 反向映射的本地 socks5 代理安装依赖并启动
# 前提：ssh -R 7892:127.0.0.1:7892 tj-24
set -euo pipefail

ROOT="/private/yaowenxuan/topo"
PROXY="socks5h://127.0.0.1:7892"
NODE_VERSION="v20.19.0"
NODE_DIR="$ROOT/node"

export ALL_PROXY="$PROXY"
export HTTP_PROXY="$PROXY"
export HTTPS_PROXY="$PROXY"
npm_config_proxy="$PROXY"
npm_config_https_proxy="$PROXY"

mkdir -p "$ROOT/logs" "$ROOT/pid"

need_node=false
if [[ ! -x "$NODE_DIR/bin/node" ]]; then
  need_node=true
elif ! "$NODE_DIR/bin/npm" -v >/dev/null 2>&1; then
  echo "[install] 检测到损坏的 Node 安装，将重新下载 ..."
  need_node=true
fi

if [[ "$need_node" == true ]]; then
  echo "[install] 通过代理下载 Node.js ${NODE_VERSION} ..."
  tmp=$(mktemp -d)
  curl -fsSL --proxy "$PROXY" \
    "https://nodejs.org/dist/${NODE_VERSION}/node-${NODE_VERSION}-linux-x64.tar.xz" \
    -o "$tmp/node.tar.xz"
  tar -xJf "$tmp/node.tar.xz" -C "$tmp"
  rm -rf "$NODE_DIR"
  mv "$tmp/node-${NODE_VERSION}-linux-x64" "$NODE_DIR"
  rm -rf "$tmp"
fi

export PATH="$NODE_DIR/bin:$PATH"
echo "[node] $(node -v) $(npm -v)"

echo "[npm ci] topo-server ..."
cd "$ROOT/topo-server"
npm ci --quiet

echo "[npm ci] express ..."
cd "$ROOT/express"
npm ci --quiet

chmod +x "$ROOT/deploy/tj/"*.sh
bash "$ROOT/deploy/tj/stop.sh" 2>/dev/null || true
bash "$ROOT/deploy/tj/start.sh" topo-server

echo "[done] topo-server only (本机 express 联调时无需远端 :3000)"
ss -lntp | grep -E ':3000|:4000' || true
