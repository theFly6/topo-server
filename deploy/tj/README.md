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

## 从 Windows 部署

```powershell
powershell -ExecutionPolicy Bypass -File deploy/sync-tj24.ps1
ssh tj-24 "bash /private/yaowenxuan/topo/deploy/tj/start.sh"
```

## 本地前端联调

```
VITE_API_BASE=http://177.177.190.145:3000
```

（需本机可访问 tj-24 的 3000 端口；或通过 SSH 隧道 `-L 3000:127.0.0.1:3000 tj-24`）

## 限制（tj 初版）

- 无 Docker：iperf 带宽探测暂不可用
- 无 nmap：子网扫描 `/network/nodes` 需后续安装或改用手动节点列表
- 无 Neo4j：express 设 `NEO4J_ENABLED=false`，跳过图数据入库
