# 天津平台部署说明

## 目录结构（tj-24: `/private/yaowenxuan/topo`）

```
topo/
├── node/                 # 离线 Node.js linux-x64
├── topo-server/
├── express/
├── deploy/tj/start.sh
├── deploy/tj/stop.sh
├── logs/
└── pid/
```

## 与 MetaX 老平台并存

| 平台 | 路径 | SSH 端口 | workers |
|------|------|----------|---------|
| metax | `/home/yaowenxuan/topo-server` | 14735 | `deploy/platforms/metax/workers.conf` |
| tj | `/private/yaowenxuan/topo/topo-server` | 22 | `deploy/platforms/tj/workers.conf` |

老平台 **无需改动**；新平台通过环境变量 `PLATFORM` / `SSH_PORT` / `WORKERS_CONF` 区分。

## 从 Windows 部署（推荐：轻量 + 代理）

```powershell
# 确保本机 Clash 监听 7892
powershell -ExecutionPolicy Bypass -File deploy/sync-tj24.ps1
```

脚本流程：
1. 仅 scp **源码**（~几 MB，不含 node_modules）
2. `ssh -R 7892:127.0.0.1:7892` 映射本机代理到 tj-24
3. 远端 `remote-install.sh` 经 **socks5h://127.0.0.1:7892** 下载 Node + `npm ci`

**勿用**旧版整包 scp（含 node_modules，体积大、极慢）。

## 手动启动

```bash
ssh -R 7892:127.0.0.1:7892 tj-24
bash /private/yaowenxuan/topo/deploy/tj/remote-install.sh
```

## 本地前端联调

### tj-24（express 在远端，本机只跑前端）

```
VITE_API_BASE=http://localhost:3000
ssh -L 3000:127.0.0.1:3000 tj-24
```

### 切换回 MetaX mx17

express 需跑在本机，见 [deploy/platforms/metax/README.md](../platforms/metax/README.md)

## 限制（tj 初版）

- 无 Docker：带宽探测自动检测 docker，不可用时回退原生 iperf3（先运行 `deploy/tj/install-iperf3.sh`）
- 无 nmap：子网扫描 `/network/nodes` 自动回退到 `workers.conf` 节点列表 + SSH 探测
- 无 Neo4j：express 设 `NEO4J_ENABLED=false`，跳过图数据入库
- 节点内拓扑感知：需 `topo-profiler` Python 源码 + numpy（metax ARM 二进制不可用），见 `deploy/tj/install-topo-profiler.sh`
