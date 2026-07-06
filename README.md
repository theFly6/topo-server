# topo-server

集群拓扑探测服务：节点清单、单节点拓扑、节点间时延/带宽（iperf3）、节点内 topo-profiler 感知。

与 [cytoscape-express](https://github.com/theFly6/cytoscape-express)（BFF）和 [cytoscape-vue3](https://github.com/theFly6/cytoscape-vue3)（前端）组成完整拓扑可视化方案。

## 仓库

| 组件 | GitHub |
|------|--------|
| 前端 | https://github.com/theFly6/cytoscape-vue3 |
| BFF | https://github.com/theFly6/cytoscape-express |
| 探测层（本仓） | https://github.com/theFly6/topo-server |

## 当前里程碑

**Tag：`release-20250706-tj`** — 天津 tj-24 平台完整部署（含节点间/节点内拓扑感知）。

详见 [docs/release-20250706-tj.md](docs/release-20250706-tj.md)。

## 快速开始

```bash
npm install
cp deploy/platforms/tj/env.topo-server .env   # 或 metax 平台配置
npm start   # 或 ts-node ./src/server.ts
```

## 部署

| 平台 | 说明 |
|------|------|
| MetaX（mx17） | [deploy/platforms/metax/README.md](deploy/platforms/metax/README.md) — 远端 `./run.sh`，本机 express 联调 |
| 天津（tj-24） | [deploy/tj/README.md](deploy/tj/README.md) — 轻量 scp + 同机 express/topo-server |

tj-24 轻量部署（Windows → 远端 npm ci）：

```powershell
powershell -ExecutionPolicy Bypass -File deploy/sync-tj24.ps1
```

### 本地联调速查

| 平台 | 本机需要 | 隧道 / 配置 |
|------|----------|-------------|
| **mx17** | express + vue3 | `ssh -L 4000:192.168.162.17:4000 -p 14735 …` → express `SERVER_URL_BASE=127.0.0.1:4000` |
| **tj-24** | 仅 vue3 | `ssh -L 3000:127.0.0.1:3000 tj-24` → `VITE_API_BASE=http://localhost:3000` |

## 主要 API

| 路径 | 功能 |
|------|------|
| `POST /info/nodes` | 节点清单（workers.conf） |
| `GET /info/node` | 单节点拓扑 |
| `GET /info/node/detail` | 节点内感知（topo-profiler） |
| `GET /network/nodes` | 子网 SSH 可达节点 |
| `GET /network/latency` | 节点间时延 |
| `GET /network/bandwidth` | 节点间带宽（iperf3） |

完整说明见 [API.md](API.md)。

## License

MIT
