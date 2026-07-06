# mx17 topo-server 与 GitHub main 同步（经本机 Clash 反向代理）
# 用法: powershell -ExecutionPolicy Bypass -File deploy/sync-topo-server-mx17.ps1
# 前提: 本机 Clash 监听 7892；ssh config 中 metax-17-jump 可用
$ErrorActionPreference = "Stop"

$TopoRepo = "D:\School\Doc1_1\QY\main\topo-server-git"
$RemoteHost = "metax-17-jump"
$RemoteRoot = "/home/yaowenxuan/topo-server"
$LocalProxyPort = 7892

if (-not (Get-NetTCPConnection -LocalPort $LocalProxyPort -State Listen -ErrorAction SilentlyContinue)) {
    Write-Host "本机 ${LocalProxyPort} 代理未监听，请先启动 Clash" -ForegroundColor Red
    exit 1
}

Write-Host "[1/2] 上传 sync 脚本 ..." -ForegroundColor Cyan
scp (Join-Path $TopoRepo "deploy\sync-mx17-topo-server.sh") "${RemoteHost}:${RemoteRoot}/deploy/sync-mx17-topo-server.sh"

Write-Host "[2/2] ssh -R ${LocalProxyPort} → git pull + 重启 (mx17) ..." -ForegroundColor Cyan
ssh -R "${LocalProxyPort}:127.0.0.1:${LocalProxyPort}" $RemoteHost "chmod +x ${RemoteRoot}/deploy/sync-mx17-topo-server.sh && bash ${RemoteRoot}/deploy/sync-mx17-topo-server.sh"

Write-Host "[done] mx17 topo-server 已与 GitHub main 对齐" -ForegroundColor Green
