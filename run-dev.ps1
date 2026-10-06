# PKSPL Development Runner Script (PowerShell for Windows)
$ProjectRoot = $PSScriptRoot
$BackendDir = Join-Path $ProjectRoot "PKSPL-Backend"
$FrontendDir = Join-Path $ProjectRoot "PKSPL-Project-Frontend"

Write-Host "===========================================" -ForegroundColor Cyan
Write-Host "   Starting PKSPL IPB System (Local)...    " -ForegroundColor Cyan
Write-Host "===========================================" -ForegroundColor Cyan

# 1. Start Docker Backend
Write-Host "[1/2] Memastikan Backend Services (Docker) aktif..." -ForegroundColor Blue
Push-Location $BackendDir
docker compose up -d
Pop-Location

# 2. Information
Write-Host "`n-------------------------------------------" -ForegroundColor DarkGray
Write-Host "  URL Akses Sistem:                        " -ForegroundColor White
Write-Host "  - Frontend (Dev Mode): http://localhost:5173" -ForegroundColor Green
Write-Host "  - Nginx (Full-stack):  http://localhost:8000" -ForegroundColor Green
Write-Host "  - Adminer (Database):  http://localhost:8081" -ForegroundColor Green
Write-Host "  - Mailpit (Email):     http://localhost:8025" -ForegroundColor Green
Write-Host "-------------------------------------------" -ForegroundColor DarkGray
Write-Host "Tekan Ctrl+C untuk menghentikan server Vite." -ForegroundColor Yellow
Write-Host "Untuk mematikan container backend, jalankan: .\stop.ps1" -ForegroundColor DarkGray
Write-Host ""

# 3. Start Frontend Dev Server
Push-Location $FrontendDir
npm run dev -- --host
Pop-Location
