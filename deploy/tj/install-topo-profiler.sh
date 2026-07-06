#!/bin/bash
# tj 平台安装 topo-profiler（Python 源码模式，适配 x86_64）
# metax 的 ARM 二进制无法在 tj 运行，需使用 Python 源码 + numpy
#
# 用法 A（推荐，在本机执行，需能 ssh metax-17-jump 和 tj-24）:
#   powershell -File deploy/sync-topo-profiler-tj24.ps1
#
# 用法 B（在 tj-24 上，已有源码包和 py-wheels）:
#   bash deploy/tj/install-topo-profiler.sh
set -euo pipefail

ROOT="/private/yaowenxuan/topo"
PROFILER_HOME="/root/Topo-profiler"
WHEELS="/tmp/py-wheels"

if [[ ! -f "${PROFILER_HOME}/main.py" ]]; then
  echo "缺少 ${PROFILER_HOME}/main.py，请先同步 Topo-profiler 源码"
  exit 1
fi

if ! python3 -c "import numpy" 2>/dev/null; then
  if [[ -d "$WHEELS" && -f /tmp/get-pip.py ]]; then
    python3 /tmp/get-pip.py --no-index --find-links="$WHEELS" -q
    python3 -m pip install --no-index --find-links="$WHEELS" numpy -q
  else
    echo "numpy 未安装且缺少离线 wheel，请先上传 /tmp/py-wheels"
    exit 1
  fi
fi

python3 -c "import numpy; print('[ok] numpy', numpy.__version__)"
echo "[done] topo-profiler Python 环境就绪: ${PROFILER_HOME}"
