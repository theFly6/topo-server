# 天津平台部署说明

## 目录结构（tj-24: `/private/yaowenxuan/topo`）

```
topo/
├── node/                 # 离线 Node.js linux-x64
├── topo-server/
├── express/              # 可选：同机部署时使用；本机联调不必启动
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

---

## 本地联调（推荐：与 mx17 相同 — express 在本机）

```
cytoscape-vue3 (:5173)  →  express (:3000, 本机)  →  topo-server (tj-24 :4000)
```

### 步骤 1：tj-24 上仅启动 topo-server

```bash
ssh tj-24
bash /private/yaowenxuan/topo/deploy/tj/start.sh          # 默认仅 topo-server
# 或显式：bash .../start.sh topo-server
curl -s http://177.177.190.145:4000/topology/info/nodes | head
```

> `start.sh all` 才会同时启动远端 express（整栈部署时用）。**本机 express 联调时不要跑远端 :3000。**

### 步骤 2：本机 SSH 隧道（本机 → tj-24 topo-server）

```powershell
ssh -L 4000:177.177.190.145:4000 tj-24
```

保持窗口不关闭。

### 步骤 3：本机启动 express

仓库：[cytoscape-express](https://github.com/theFly6/cytoscape-express)

```powershell
cd cytoscape-express
npm install
copy deploy\platforms\tj\env.express.local .env
# 或手动：SERVER_URL_BASE=127.0.0.1:4000  NEO4J_ENABLED=false
npx ts-node ./src/server.ts
```

模板文件：[deploy/platforms/tj/env.express.local](../platforms/tj/env.express.local)

### 步骤 4：本机启动 vue3

```powershell
cd cytoscape-vue3
# VITE_API_BASE=http://localhost:3000
npm run dev
```

### 切换回 MetaX mx17

见 [deploy/platforms/metax/README.md](../platforms/metax/README.md)（同样是本机 express + 隧道）。

---

## 远端整栈部署（可选）

若需在 tj-24 **不依赖本机** 直接访问 UI/API（express 也在远端）：

```powershell
powershell -ExecutionPolicy Bypass -File deploy/sync-tj24.ps1
ssh tj-24 "bash /private/yaowenxuan/topo/deploy/tj/start.sh"
```

此时 express 使用同机配置 [env.express](../platforms/tj/env.express)（`SERVER_URL_BASE=177.177.190.145:4000`），前端可设 `VITE_API_BASE=http://177.177.190.145:3000`（需网络可达）。

**日常开发请优先使用上文「本机 express」方式。**

---

## 从 Windows 部署 topo-server（轻量 + 代理）

```powershell
powershell -ExecutionPolicy Bypass -File deploy/sync-tj24.ps1
```

脚本流程：
1. 仅 scp **源码**（~几 MB，不含 node_modules）
2. `ssh -R 7892:127.0.0.1:7892` 映射本机代理到 tj-24
3. 远端 `remote-install.sh` 经 **socks5h://127.0.0.1:7892** 下载 Node + `npm ci`

## 限制（tj 初版）

- 无 Docker：带宽探测自动检测 docker，不可用时回退原生 iperf3（先运行 `deploy/tj/install-iperf3.sh`）
- 无 nmap：子网扫描 `/network/nodes` 自动回退到 `workers.conf` 节点列表 + SSH 探测
- 无 Neo4j：express 设 `NEO4J_ENABLED=false`，跳过图数据入库
- 节点内拓扑感知：需 `topo-profiler` Python 源码 + numpy，见 `deploy/tj/install-topo-profiler.sh`
