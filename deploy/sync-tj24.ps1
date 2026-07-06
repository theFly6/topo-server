# 轻量部署 tj-24（源码 scp + 远端 npm ci 走 SSH 反向代理）
# 用法: powershell -ExecutionPolicy Bypass -File deploy/sync-tj24.ps1
#
# 原理：ssh -R 7892:127.0.0.1:7892 将本机 Clash:7892 映射到 tj-24 的 127.0.0.1:7892
#       远端用 socks5h://127.0.0.1:7892 拉 Node / npm，避免上传巨型 node_modules 包

$ErrorActionPreference = "Stop"

$MainRoot = "D:\School\Doc1_1\QY\main"
$TopoRepo = Join-Path $MainRoot "topo-server-git"
$ExpressRepo = Join-Path $MainRoot "cytoscape-express"
$CacheRoot = "D:\ClaudeSessions\topo\deploy-cache"
$Stage = Join-Path $CacheRoot "tj24-src"
$Bundle = Join-Path $CacheRoot "topo-tj24-src.tgz"
$RemoteHost = "tj-24"
$RemoteDir = "/private/yaowenxuan/topo"
$LocalProxyPort = 7892

if (-not (Get-NetTCPConnection -LocalPort $LocalProxyPort -State Listen -ErrorAction SilentlyContinue)) {
    Write-Host "本机 ${LocalProxyPort} 代理未监听，请先启动 Clash" -ForegroundColor Red
    exit 1
}

Write-Host "[1/4] 打包源码（不含 node_modules）..." -ForegroundColor Cyan
if (Test-Path $Stage) { Remove-Item -Recurse -Force $Stage }
New-Item -ItemType Directory -Force -Path $Stage | Out-Null

robocopy $TopoRepo (Join-Path $Stage "topo-server") /E /XD .git node_modules logs pid /XF .env /NFL /NDL /NJH /NJS /nc /ns /np | Out-Null
robocopy $ExpressRepo (Join-Path $Stage "express") /E /XD .git node_modules /XF .env /NFL /NDL /NJH /NJS /nc /ns /np | Out-Null
Copy-Item -Recurse (Join-Path $TopoRepo "deploy") (Join-Path $Stage "deploy")
Copy-Item (Join-Path $TopoRepo "deploy\platforms\tj\env.topo-server") (Join-Path $Stage "topo-server\.env")
Copy-Item (Join-Path $TopoRepo "deploy\platforms\tj\workers.conf") (Join-Path $Stage "topo-server\workers.conf")
Copy-Item (Join-Path $TopoRepo "deploy\platforms\tj\env.express") (Join-Path $Stage "express\.env")

if (Test-Path $Bundle) { Remove-Item $Bundle -Force }
tar -czf $Bundle -C $Stage .
$sizeMb = [math]::Round((Get-Item $Bundle).Length / 1MB, 1)
Write-Host "      包大小约 ${sizeMb} MB" -ForegroundColor Gray

Write-Host "[2/4] 上传源码到 ${RemoteHost}:${RemoteDir} ..." -ForegroundColor Cyan
ssh $RemoteHost "mkdir -p $RemoteDir"
scp $Bundle "${RemoteHost}:${RemoteDir}/topo-tj24-src.tgz"

Write-Host "[3/4] 解压 + 代理隧道 npm ci（-R ${LocalProxyPort}）..." -ForegroundColor Cyan
$remoteCmd = @"
set -e
cd $RemoteDir
tar xzf topo-tj24-src.tgz
chmod +x deploy/tj/*.sh
bash deploy/tj/remote-install.sh
"@

ssh -R "${LocalProxyPort}:127.0.0.1:${LocalProxyPort}" $RemoteHost $remoteCmd

Write-Host "[4/4] 完成。本地联调可: ssh -L 3000:127.0.0.1:3000 -L 4000:127.0.0.1:4000 $RemoteHost" -ForegroundColor Green
