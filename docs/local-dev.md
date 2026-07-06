# 本地联调（mx17 / tj-24 统一模式）

**express 与 vue3 始终在本机**，topo-server 在远端集群。

```
vue3 (:5173)  →  express (:3000, 本机)  →  topo-server (:4000, 远端)
```

| 组件 | 本机配置 |
|------|----------|
| vue3 | `VITE_API_BASE=http://localhost:3000` |
| express | `SERVER_URL_BASE=127.0.0.1:4000`，`NEO4J_ENABLED=false`（默认，无需本机 Neo4j） |
| 隧道 | 将远端 `:4000` 映射到本机 `127.0.0.1:4000` |

## MetaX mx17

| 步骤 | 命令 |
|------|------|
| 远端 topo-server | `cd /home/yaowenxuan/topo-server && ./run.sh start` |
| 本机隧道 | `ssh -L 4000:192.168.162.17:4000 -p 14735 yaowenxuan@metax-17-jump` |
| 本机 express | `cd cytoscape-express && npx ts-node ./src/server.ts` |
| 本机 vue3 | `cd cytoscape-vue3 && npm run dev` |

mx17 API 验证用 **`192.168.162.17:4000`**（非 `127.0.0.1:4000`）。

平台部署与 git 同步：[deploy/platforms/metax/README.md](../deploy/platforms/metax/README.md)

## 天津 tj-24

| 步骤 | 命令 |
|------|------|
| 远端 topo-server | `bash /private/yaowenxuan/topo/deploy/tj/start.sh topo-server` |
| 本机隧道 | `ssh -L 4000:177.177.190.145:4000 tj-24` |
| 本机 express | 同上 |
| 本机 vue3 | 同上 |

平台部署：[deploy/tj/README.md](../deploy/tj/README.md)

## 三仓 GitHub

- https://github.com/theFly6/cytoscape-vue3
- https://github.com/theFly6/cytoscape-express
- https://github.com/theFly6/topo-server
