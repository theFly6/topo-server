# MetaX 平台（metax-17 / mx17）部署

> 集群内网 `192.168.162.0/24`，SSH 端口 **14735**。本地联调步骤见 [docs/local-dev.md](../../docs/local-dev.md)。

## 远端服务

| 项 | 值 |
|----|-----|
| 路径 | `/home/yaowenxuan/topo-server` |
| 监听 | `192.168.162.17:4000` |
| 启动 | `./run.sh start \| stop \| status` |

## 从 Windows 同步代码（经本机代理）

mx17 **不能直连 GitHub**，须映射本机 Clash **7892**：

```powershell
powershell -ExecutionPolicy Bypass -File deploy/sync-topo-server-mx17.ps1
```

脚本流程：`ssh -R 7892:127.0.0.1:7892` → 远端 `socks5h://127.0.0.1:7892` git fetch → 应用 metax 配置 → 重启。

## 手动配置

```bash
cp deploy/platforms/metax/env.topo-server .env
cp deploy/platforms/metax/workers.conf ./workers.conf
./run.sh stop && ./run.sh start
```

## 与 tj-24 的区别

| 项 | metax-17 | tj-24 |
|----|----------|-------|
| 路径 | `/home/yaowenxuan/topo-server` | `/private/yaowenxuan/topo` |
| SSH 端口 | 14735 | 22 |
| 子网扫描 | nmap 可用 | 回退 workers.conf |
| 同步方式 | git + 代理 | tar scp |

tj 部署文档：[deploy/tj/README.md](../../tj/README.md)

## 常见问题

**API 空回复**：用 `192.168.162.17:4000`，不要用远端 `127.0.0.1:4000`。

**git fetch 超时**：确认本机 7892 已监听，且 ssh 带 `-R 7892:127.0.0.1:7892`。
