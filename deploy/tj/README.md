# 天津平台（tj-24）部署

> 路径 `/private/yaowenxuan/topo`。本地联调见 [docs/local-dev.md](../../docs/local-dev.md)。

## 目录结构

```
topo/
├── node/           # 离线 Node.js
├── topo-server/
├── express/        # 可选；本机联调不必启动
├── deploy/tj/
├── logs/
└── pid/
```

## 从 Windows 部署 topo-server

```powershell
powershell -ExecutionPolicy Bypass -File deploy/sync-topo-server-tj24.ps1
```

流程：源码 tar scp（~几 MB）→ 应用 tj 配置 → 重启 topo-server。

全栈安装（含 Node/npm ci）用 `deploy/sync-tj24.ps1`，需 `ssh -R 7892:127.0.0.1:7892` 映射代理。

## 远端启动

```bash
bash /private/yaowenxuan/topo/deploy/tj/start.sh topo-server   # 默认仅 topo-server
bash /private/yaowenxuan/topo/deploy/tj/start.sh all           # 同机 express + topo-server
```

## 平台限制

- 无 Docker：带宽用原生 iperf3（`deploy/tj/install-iperf3.sh`）
- 无 nmap：子网扫描回退 `workers.conf`
- 节点内感知：需 `deploy/tj/install-topo-profiler.sh`

## 与 mx17 并存

| 平台 | 路径 | SSH |
|------|------|-----|
| metax | `/home/yaowenxuan/topo-server` | 14735 |
| tj | `/private/yaowenxuan/topo` | 22 |

mx17 文档：[deploy/platforms/metax/README.md](../platforms/metax/README.md)
