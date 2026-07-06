# 仅同步 topo-server 源码 + deploy 到 tj-24（不重建 express / 不全量 npm ci）
# 用法: powershell -ExecutionPolicy Bypass -File deploy/sync-topo-server-tj24.ps1
$ErrorActionPreference = "Stop"

$TopoRepo = "D:\School\Doc1_1\QY\main\topo-server-git"
$CacheRoot = "D:\ClaudeSessions\topo\deploy-cache"
$Stage = Join-Path $CacheRoot "topo-server-sync"
$Bundle = Join-Path $CacheRoot "topo-server-sync.tgz"
$RemoteHost = "tj-24"
$RemoteDir = "/private/yaowenxuan/topo"

Write-Host "[1/3] 打包 topo-server + deploy ..." -ForegroundColor Cyan
if (Test-Path $Stage) { Remove-Item -Recurse -Force $Stage }
New-Item -ItemType Directory -Force -Path $Stage | Out-Null
robocopy $TopoRepo (Join-Path $Stage "topo-server") /E /XD .git node_modules logs pid /XF .env /NFL /NDL /NJH /NJS /nc /ns /np | Out-Null
Copy-Item -Recurse (Join-Path $TopoRepo "deploy") (Join-Path $Stage "deploy")
if (Test-Path $Bundle) { Remove-Item $Bundle -Force }
tar -czf $Bundle -C $Stage .
Write-Host "      $( [math]::Round((Get-Item $Bundle).Length / 1MB, 1) ) MB" -ForegroundColor Gray

Write-Host "[2/3] 上传到 ${RemoteHost}:${RemoteDir} ..." -ForegroundColor Cyan
scp $Bundle "${RemoteHost}:${RemoteDir}/topo-server-sync.tgz"

Write-Host "[3/3] 解压 + 应用 tj 配置 + 重启 topo-server ..." -ForegroundColor Cyan
$remoteCmd = @"
set -e
cd $RemoteDir
tar xzf topo-server-sync.tgz
chmod +x deploy/tj/*.sh deploy/sync-mx17-topo-server.sh 2>/dev/null || true
cp deploy/platforms/tj/env.topo-server topo-server/.env
cp deploy/platforms/tj/workers.conf topo-server/workers.conf
bash deploy/tj/stop.sh express 2>/dev/null || true
bash deploy/tj/start.sh topo-server
curl -sS -m 5 -X POST http://127.0.0.1:4000/info/nodes 2>/dev/null | head -c 120 || curl -sS -m 5 -X POST http://177.177.190.145:4000/info/nodes | head -c 120
echo
echo "[tj-24] topo-server synced"
"@

ssh $RemoteHost $remoteCmd
Write-Host "[done] tj-24 topo-server 已与 Git main 对齐" -ForegroundColor Green
