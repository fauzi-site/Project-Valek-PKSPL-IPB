# PKSPL Stop Script (PowerShell for Windows)
$ProjectRoot = $PSScriptRoot
$BackendDir = Join-Path $ProjectRoot "PKSPL-Backend"

Write-Host "Menghentikan Backend Docker Containers..." -ForegroundColor Yellow
Push-Location $BackendDir
docker compose down
Pop-Location

Write-Host "Menghentikan proses Node / Vite lokal (jika ada)..." -ForegroundColor Yellow
Get-Process -Name "node" -ErrorAction SilentlyContinue | Where-Object { $_.CommandLine -like "*vite*" } | Stop-Process -Force -ErrorAction SilentlyContinue

Write-Host "`n===========================================" -ForegroundColor Green
Write-Host "  ✔ Semua layanan PKSPL telah dihentikan.  " -ForegroundColor Green
Write-Host "===========================================" -ForegroundColor Green
