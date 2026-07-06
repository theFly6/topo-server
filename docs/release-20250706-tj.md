# Release: release-20250706-tj

> 双平台（mx17 + tj-24）拓扑探测与 UI 联调 · 2026-07-06 更新

## 三仓 Tag（指向当前 main HEAD）

| 仓库 | Tag | 当前 commit |
|------|-----|-------------|
| [cytoscape-vue3](https://github.com/theFly6/cytoscape-vue3) | `release-20250706-tj` | `78d8aa7` |
| [cytoscape-express](https://github.com/theFly6/cytoscape-express) | `release-20250706-tj` | `3453658` |
| [topo-server](https://github.com/theFly6/topo-server) | `release-20250706-tj` | `598ef92` |

## 本版相对旧 tag 的增量

| 领域 | 变更 |
|------|------|
| 本地联调 | 两平台统一「本机 express + 隧道」；文档收敛至 [local-dev.md](./local-dev.md) |
| Neo4j | express 默认 `NEO4J_ENABLED=false`，仅显式开启才连图库 |
| tj 部署 | `start.sh` 默认只起 topo-server；远端 express 停用以避免与本机 BFF 冲突 |
| mx17 同步 | `deploy/sync-topo-server-mx17.ps1` + `ssh -R 7892` + socks5h git fetch |
| tj 同步 | `deploy/sync-topo-server-tj24.ps1` 轻量 tar 更新 topo-server |
| 探测 | iperf3 1s×5 中位数、双向并行；探测按钮 UX 与缓存修复 |

## 部署环境

### tj-24

| 项 | 值 |
|----|-----|
| 控制节点 | `ssh tj-24` |
| 路径 | `/private/yaowenxuan/topo` |
| Pod IP | `177.177.190.145` |
| SSH | 22 |

### mx17

| 项 | 值 |
|----|-----|
| 路径 | `/home/yaowenxuan/topo-server` |
| Pod IP | `192.168.162.17:4000` |
| SSH | 14735 |

## 功能验收

| 功能 | 状态 |
|------|------|
| Feat-1～8 | ✅ |
| Overall 子网拓扑 | ✅ workers.conf 回退（无 nmap） |
| 节点间时延 / 带宽 | ✅ curl + iperf3 双向并行 |
| 节点内拓扑感知 | ✅ topo-profiler |
| 双平台本机联调 | ✅ 见 [local-dev.md](./local-dev.md) |

## 同步脚本（Windows 本机执行）

```powershell
# tj-24 topo-server
powershell -ExecutionPolicy Bypass -File deploy/sync-topo-server-tj24.ps1

# mx17 topo-server（需本机 Clash 7892）
powershell -ExecutionPolicy Bypass -File deploy/sync-topo-server-mx17.ps1
```

## 历史 Tag

| Tag | 说明 |
|-----|------|
| `baseline-20250706` | 三仓最初基线 |
| `release-20250706-ui` | UI 美化 |
| `release-20250707` | Feat-7 + 平台配置初版 |
| **`release-20250706-tj`** | **双平台完整部署（当前）** |
