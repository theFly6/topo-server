#!/bin/bash
# 在 tj-24 上为 workers.conf 中的节点安装原生 iperf3（无 docker 时使用）
# 通过解压 deb 到 tools 目录，避免 apt 依赖冲突
# 前提：ssh -R 7892:127.0.0.1:7892 tj-24  且本机 Clash 监听 7892
set -euo pipefail

ROOT="/private/yaowenxuan/topo"
PROXY="${PROXY:-socks5h://127.0.0.1:7892}"
MIRROR="http://mirrors.aliyun.com/ubuntu/pool/universe/i/iperf3"
VER="3.9-1build1"
WORKERS="${ROOT}/topo-server/workers.conf"
TOOL_ROOT="${ROOT}/tools/iperf3-root"
BIN_LINK="/usr/local/bin/iperf3"
TMP=$(mktemp -d)

cleanup() { rm -rf "$TMP"; }
trap cleanup EXIT

echo "[iperf3] 通过代理下载 deb 包 ..."
curl -fsSL --proxy "$PROXY" -o "$TMP/libiperf0_${VER}_amd64.deb" \
  "${MIRROR}/libiperf0_${VER}_amd64.deb"
curl -fsSL --proxy "$PROXY" -o "$TMP/iperf3_${VER}_amd64.deb" \
  "${MIRROR}/iperf3_${VER}_amd64.deb"
curl -fsSL --proxy "$PROXY" -o "$TMP/libsctp1_1.0.19+dfsg-1build1_amd64.deb" \
  "http://mirrors.aliyun.com/ubuntu/pool/main/l/lksctp-tools/libsctp1_1.0.19+dfsg-1build1_amd64.deb"

install_extracted() {
  local target_root=$1
  rm -rf "$target_root"
  mkdir -p "$target_root"
  dpkg-deb -x "$TMP/libsctp1_1.0.19+dfsg-1build1_amd64.deb" "$target_root"
  dpkg-deb -x "$TMP/libiperf0_${VER}_amd64.deb" "$target_root"
  dpkg-deb -x "$TMP/iperf3_${VER}_amd64.deb" "$target_root"
  local libdir="$target_root/usr/lib/x86_64-linux-gnu"
  local bindir="$target_root/usr/bin/iperf3"
  cat > "$BIN_LINK" << EOF
#!/bin/bash
export LD_LIBRARY_PATH="${libdir}:\${LD_LIBRARY_PATH:-}"
exec "${bindir}" "\$@"
EOF
  chmod +x "$BIN_LINK" "$bindir"
  iperf3 --version | head -1
}

install_remote() {
  local ip=$1
  if ssh -o BatchMode=yes -o ConnectTimeout=5 -p 22 "$ip" "command -v iperf3" >/dev/null 2>&1; then
    echo "[iperf3] $ip 已有 iperf3，跳过"
    return
  fi
  echo "[iperf3] 安装到 $ip ..."
  local remote_root="/private/yaowenxuan/topo/tools/iperf3-root"
  scp -P 22 "$TMP"/*.deb "${ip}:/tmp/"
  ssh -p 22 "$ip" "set -e
    rm -rf '$remote_root'
    mkdir -p '$remote_root'
    dpkg-deb -x /tmp/libsctp1_1.0.19+dfsg-1build1_amd64.deb '$remote_root'
    dpkg-deb -x /tmp/libiperf0_${VER}_amd64.deb '$remote_root'
    dpkg-deb -x /tmp/iperf3_${VER}_amd64.deb '$remote_root'
    cat > /usr/local/bin/iperf3 << 'WRAPPER'
#!/bin/bash
export LD_LIBRARY_PATH=\"/private/yaowenxuan/topo/tools/iperf3-root/usr/lib/x86_64-linux-gnu:\${LD_LIBRARY_PATH:-}\"
exec /private/yaowenxuan/topo/tools/iperf3-root/usr/bin/iperf3 \"\$@\"
WRAPPER
    chmod +x /usr/local/bin/iperf3
    rm -f /tmp/libiperf0_*.deb /tmp/iperf3_*.deb
    iperf3 --version | head -1"
}

echo "[iperf3] 本机解压安装 ..."
install_extracted "$TOOL_ROOT"

while read -r line; do
  line="${line%%#*}"
  line=$(echo "$line" | xargs)
  [[ -z "$line" ]] && continue
  read -r hostname ip port <<< "$line"
  [[ "$hostname" == "Overall" || "$hostname" == "Subnet" ]] && continue
  ip="${ip%%/*}"
  [[ "$ip" == "177.177.190.145" ]] && continue
  install_remote "$ip"
done < "$WORKERS"

echo "[done] iperf3 安装完成"
