# 离线同步到 tj-24:/private/yaowenxuan/topo
# 用法: powershell -ExecutionPolicy Bypass -File deploy/sync-tj24.ps1
$ErrorActionPreference = "Stop"

$MainRoot = "D:\School\Doc1_1\QY\main"
$TopoRepo = Join-Path $MainRoot "topo-server-git"
$ExpressRepo = Join-Path $MainRoot "cytoscape-express"
$CacheRoot = "D:\ClaudeSessions\topo\deploy-cache"
$NodeDir = Join-Path $CacheRoot "node-v20.19.0-linux-x64"
$Stage = Join-Path $CacheRoot "tj24-stage"
$Bundle = Join-Path $CacheRoot "topo-tj24-bundle.tgz"
$Remote = "tj-24:/private/yaowenxuan/topo"

if (-not (Test-Path (Join-Path $NodeDir "bin\node"))) {
    Write-Host "缺少 Node 离线包，请先下载 node-v20.19.0-linux-x64 到 $CacheRoot" -ForegroundColor Red
    exit 1
}

Write-Host "npm ci topo-server..." -ForegroundColor Cyan
Push-Location $TopoRepo
npm ci --quiet
Pop-Location

Write-Host "npm ci express..." -ForegroundColor Cyan
Push-Location $ExpressRepo
npm ci --quiet
Pop-Location

Write-Host "staging..." -ForegroundColor Cyan
if (Test-Path $Stage) { Remove-Item -Recurse -Force $Stage }
New-Item -ItemType Directory -Force -Path $Stage | Out-Null

Copy-Item -Recurse $NodeDir (Join-Path $Stage "node")
robocopy $TopoRepo (Join-Path $Stage "topo-server") /E /XD .git logs pid /XF .env /NFL /NDL /NJH /NJS /nc /ns /np | Out-Null
robocopy $ExpressRepo (Join-Path $Stage "express") /E /XD .git /XF .env /NFL /NDL /NJH /NJS /nc /ns /np | Out-Null
Copy-Item -Recurse (Join-Path $TopoRepo "deploy") (Join-Path $Stage "deploy")

Copy-Item (Join-Path $TopoRepo "deploy\platforms\tj\env.topo-server") (Join-Path $Stage "topo-server\.env")
Copy-Item (Join-Path $TopoRepo "deploy\platforms\tj\workers.conf") (Join-Path $Stage "topo-server\workers.conf")
Copy-Item (Join-Path $TopoRepo "deploy\platforms\tj\env.express") (Join-Path $Stage "express\.env")

New-Item -ItemType Directory -Force -Path (Join-Path $Stage "logs"), (Join-Path $Stage "pid") | Out-Null

Write-Host "packing $Bundle ..." -ForegroundColor Cyan
if (Test-Path $Bundle) { Remove-Item $Bundle -Force }
tar -czf $Bundle -C $Stage .

Write-Host "uploading to $Remote ..." -ForegroundColor Cyan
ssh tj-24 "mkdir -p /private/yaowenxuan/topo"
scp $Bundle "${Remote}/topo-tj24-bundle.tgz"
ssh tj-24 "cd /private/yaowenxuan/topo && tar xzf topo-tj24-bundle.tgz && chmod +x deploy/tj/*.sh && bash deploy/tj/stop.sh 2>/dev/null; bash deploy/tj/start.sh"

Write-Host "Done." -ForegroundColor Green
