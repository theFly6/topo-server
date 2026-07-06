# topo-server

集群拓扑探测服务：节点清单、单节点拓扑、节点间时延/带宽（iperf3）、节点内 topo-profiler 感知。

| 组件 | GitHub |
|------|--------|
| 前端 | https://github.com/theFly6/cytoscape-vue3 |
| BFF | https://github.com/theFly6/cytoscape-express |
| 探测层（本仓） | https://github.com/theFly6/topo-server |

## 当前里程碑

**Tag：`release-20250706-tj`** — 详见 [docs/release-20250706-tj.md](docs/release-20250706-tj.md)。

**本地联调**（统一模式）：[docs/local-dev.md](docs/local-dev.md)

## 快速开始

```bash
npm install
cp deploy/platforms/tj/env.topo-server .env   # 或 metax 平台配置
npm start
```

## 部署

| 平台 | 文档 |
|------|------|
| MetaX mx17 | [deploy/platforms/metax/README.md](deploy/platforms/metax/README.md) |
| 天津 tj-24 | [deploy/tj/README.md](deploy/tj/README.md) |

## 主要 API

| 路径 | 功能 |
|------|------|
| `POST /info/nodes` | 节点清单 |
| `GET /info/node` | 单节点拓扑 |
| `GET /info/node/detail` | 节点内感知 |
| `GET /network/latency` | 节点间时延 |
| `GET /network/bandwidth` | 节点间带宽 |

BFF 路由说明见 [cytoscape-express/API.md](https://github.com/theFly6/cytoscape-express/blob/main/API.md)。

## License

MIT
