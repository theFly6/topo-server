# Release: release-20250706-tj

> 天津 tj-24 平台完整部署 · 2026-07-06（含后续感知与探测优化）

## 三仓 Tag

| 仓库 | Tag | GitHub |
|------|-----|--------|
| cytoscape-vue3 | `release-20250706-tj` | https://github.com/theFly6/cytoscape-vue3 |
| cytoscape-express | `release-20250706-tj` | https://github.com/theFly6/cytoscape-express |
| topo-server | `release-20250706-tj` | https://github.com/theFly6/topo-server |

## 部署环境（tj-24）

| 项 | 值 |
|----|-----|
| 控制节点 | tj-24（`ssh tj-24`） |
| 部署路径 | `/private/yaowenxuan/topo` |
| Pod IP | `177.177.190.145` |
| SSH 端口 | 22 |
| 可达节点 | tj24 `177.177.190.145`、tj23 `177.177.207.240` |
| express | `:3000` |
| topo-server | `177.177.190.145:4000` |

## 功能验收

| 功能 | 状态 |
|------|------|
| Feat-1～8 | ✅ |
| Overall 子网拓扑 | ✅ workers.conf 回退（无 nmap） |
| 单节点内拓扑 | ✅ ht-smi + 无 Neo4j 内存缓存 |
| 节点间时延 | ✅ curl TCP connect |
| 节点间带宽 | ✅ 原生 iperf3，1s×5 次中位数，双向并行 |
| 节点内拓扑感知 | ✅ topo-profiler Python + numpy |
| 加速卡类型 | ✅ MetaX Mars X203 |
| 探测按钮 UX | ✅ 完成后显示「重新进行节点间拓扑感知」 |

## 关键脚本

路径均相对于 [topo-server](https://github.com/theFly6/topo-server) 仓库根目录。

```powershell
# 轻量部署（源码 + 代理 npm ci）
powershell -ExecutionPolicy Bypass -File deploy/sync-tj24.ps1

# 安装 iperf3（tj 无 Docker）
ssh -R 7892:127.0.0.1:7892 tj-24 'PROXY=socks5h://127.0.0.1:7892 bash /private/yaowenxuan/topo/deploy/tj/install-iperf3.sh'

# topo-profiler（本机 + 同步到 workers 其它节点）
bash deploy/tj/install-topo-profiler.sh
bash deploy/tj/sync-profiler-workers.sh
```

## 本地联调

### MetaX mx17（express 本机 + topo-server 在 mx17）

```powershell
# 1. mx17 上：cd /home/yaowenxuan/topo-server && ./run.sh start
# 2. 本机隧道
ssh -L 4000:192.168.162.17:4000 -p 14735 yaowenxuan@metax-17-jump
# 3. 本机 express：SERVER_URL_BASE=127.0.0.1:4000  NEO4J_ENABLED=true
# 4. 本机 vue3：VITE_API_BASE=http://localhost:3000
```

详见 [deploy/platforms/metax/README.md](https://github.com/theFly6/topo-server/blob/main/deploy/platforms/metax/README.md)

### 天津 tj-24（express 本机 + topo-server 在 tj-24）

```powershell
# 1. tj-24：bash /private/yaowenxuan/topo/deploy/tj/start.sh
# 2. 本机隧道
ssh -L 4000:177.177.190.145:4000 tj-24
# 3. 本机 express：SERVER_URL_BASE=127.0.0.1:4000  NEO4J_ENABLED=false
# 4. 本机 vue3：VITE_API_BASE=http://localhost:3000
```

详见 [deploy/tj/README.md](https://github.com/theFly6/topo-server/blob/main/deploy/tj/README.md)

## 带宽探测参数（可环境变量覆盖）

| 变量 | 默认 | 说明 |
|------|------|------|
| `IPERF_DURATION_SEC` | 1 | 单次 iperf3 时长（秒） |
| `IPERF_REPEATS` | 5 | 采样次数，取中位数 |
| `IPERF_PARALLEL` | 1 | 并行流数 |

## 与 metax-17 并存

- metax-17：`/home/yaowenxuan/topo-server`，SSH 14735，Neo4j 可用
- tj-24：`/private/yaowenxuan/topo`，SSH 22，`NEO4J_ENABLED=false`
- 老平台 **无需改动**

## 已知限制

- tj15～tj21 等节点 SSH 未打通，未纳入 workers.conf
- tj22 与 tj24 同 Pod IP，workers 中统一为 **tj24**
- 子网扫描依赖 workers 清单，非 nmap 自动发现
