# MetaX 平台（metax-17 / mx17）部署与联调

> 集群内网 `192.168.162.0/24`，SSH 端口 **14735**，与 [tj-24 平台](../../tj/README.md) 并存、互不影响。

## 远端服务（mx17 节点上）

探测层部署在 mx17 本机：

| 项 | 值 |
|----|-----|
| 路径 | `/home/yaowenxuan/topo-server` |
| 监听 | `192.168.162.17:4000` |
| SSH | `-p 14735` |
| 启动脚本 | `./run.sh start \| stop \| status` |

### 更新并启动 topo-server

```bash
ssh -p 14735 yaowenxuan@192.168.162.17   # 或经 jump 主机
cd /home/yaowenxuan/topo-server
git pull origin main
git checkout release-20250706-tj        # 或 main

cp deploy/platforms/metax/env.topo-server .env
cp deploy/platforms/metax/workers.conf ./workers.conf

npm install                             # 依赖变更时
./run.sh stop && ./run.sh start
./run.sh status
```

环境变量要点（见 [env.topo-server](./env.topo-server)）：

- `PLATFORM=metax`
- `SSH_PORT=14735`
- `PORT=4000`

---

## 本地联调（Windows / 本机开发机）

典型架构：**前端 + express 在本机**，**topo-server 在 mx17 集群**。

```
cytoscape-vue3 (:5173)  →  express (:3000)  →  topo-server (mx17 :4000)
                                ↓
                           Neo4j（metax 默认开启）
```

### 步骤 1：SSH 隧道（本机 → mx17 topo-server）

若本机无法直连 `192.168.162.17:4000`，先建隧道（经 jump 时改主机名）：

```powershell
# 将 mx17 的 4000 映射到本机 4000
ssh -L 4000:192.168.162.17:4000 -p 14735 yaowenxuan@metax-17-jump
```

保持该窗口不关闭。若已在 MetaX 内网，可跳过隧道，express 直接填 `192.168.162.17:4000`。

### 步骤 2：启动 express（本机）

仓库：[cytoscape-express](https://github.com/theFly6/cytoscape-express)

```powershell
cd cytoscape-express
npm install
copy deploy\platforms\metax\env.express .env   # 从 topo-server 仓复制，或手动创建
```

`.env` 示例（走隧道时）：

```env
PORT=3000
SERVER_URL_BASE=127.0.0.1:4000
NEO4J_ENABLED=true
```

内网直连时改为 `SERVER_URL_BASE=192.168.162.17:4000`。

```powershell
npx ts-node ./src/server.ts
# 验证：curl http://localhost:3000/topology/info/nodes
```

> `env.express` 模板位于本仓库 `deploy/platforms/metax/env.express`。

### 步骤 3：启动前端（本机）

仓库：[cytoscape-vue3](https://github.com/theFly6/cytoscape-vue3)

```powershell
cd cytoscape-vue3
npm install
copy .env.example .env
```

`.env`：

```env
VITE_API_BASE=http://localhost:3000
```

```powershell
npm run dev
```

浏览器打开 Vite 提示的地址（通常 `http://localhost:5173`），侧边栏应能加载 mx17/mx18 等节点。

---

## 与 tj-24 的区别

| 项 | metax-17 | tj-24 |
|----|----------|-------|
| topo-server 位置 | mx17 本机 `/home/yaowenxuan/topo-server` | tj-24 `/private/yaowenxuan/topo` |
| SSH 端口 | 14735 | 22 |
| express 部署 | 通常本机联调 | 与 topo-server 同机部署 |
| Neo4j | 默认 `NEO4J_ENABLED=true` | `false` |
| 子网扫描 | nmap 可用 | 回退 workers.conf |
| 部署文档 | 本文 | [deploy/tj/README.md](../../tj/README.md) |

---

## 常见问题

**节点列表报「解析错误」**  
检查 mx17 上 `./run.sh status`，以及 express 的 `SERVER_URL_BASE` 是否可达。

**节点内感知失败**  
mx 节点需安装 topo-profiler（MetaX 二进制或 Python 版），SSH 免密与 `14735` 端口需通。

**切换回 tj 平台联调**  
express 改用 `deploy/platforms/tj/env.express`，前端隧道改为 `ssh -L 3000:127.0.0.1:3000 tj-24`。
