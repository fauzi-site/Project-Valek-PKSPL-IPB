# PKSPL Setup Environment Script (PowerShell for Windows)
$ErrorActionPreference = "Stop"
$ProjectRoot = $PSScriptRoot
$BackendDir = Join-Path $ProjectRoot "PKSPL-Backend"
$FrontendDir = Join-Path $ProjectRoot "PKSPL-Project-Frontend"

Write-Host "===========================================" -ForegroundColor Cyan
Write-Host "   PKSPL IPB - Setup Environment           " -ForegroundColor Cyan
Write-Host "===========================================" -ForegroundColor Cyan

# 1. Setup Backend .env
$SrcEnv = Join-Path $BackendDir "src\.env"
$SrcEnvExample = Join-Path $BackendDir "src\.env.example"
$DockerEnv = Join-Path $BackendDir ".env.docker"

$NeedAppKey = $false
if (-not (Test-Path $SrcEnv)) {
    Write-Host "[1/5] Setup Backend .env..." -ForegroundColor Yellow
    $envContent = Get-Content $SrcEnvExample -Raw
    $envContent = $envContent -replace "REVERB_HOST=localhost", "REVERB_HOST=reverb"
    $envContent = $envContent -replace "APP_URL=http://localhost", "APP_URL=http://localhost:8000"
    [System.IO.File]::WriteAllText($SrcEnv, $envContent, [System.Text.UTF8Encoding]::new($false))
    $NeedAppKey = $true
    Write-Host "      ✔ Backend src/.env berhasil disiapkan." -ForegroundColor Green
} else {
    Write-Host "[1/5] Backend src/.env sudah ada. Dilewati." -ForegroundColor DarkGray
}

if (-not (Test-Path $DockerEnv)) {
    Copy-Item $SrcEnv $DockerEnv -Force
    Write-Host "      ✔ File .env.docker berhasil dibuat." -ForegroundColor Green
}

# 2. Setup Frontend .env
$FeEnv = Join-Path $FrontendDir ".env"
$FeEnvExample = Join-Path $FrontendDir ".env.example"
if (-not (Test-Path $FeEnv)) {
    Write-Host "[2/5] Setup Frontend .env..." -ForegroundColor Yellow
    Copy-Item $FeEnvExample $FeEnv -Force
    Write-Host "      ✔ Frontend .env berhasil disiapkan." -ForegroundColor Green
} else {
    Write-Host "[2/5] Frontend .env sudah ada. Dilewati." -ForegroundColor DarkGray
}

# 3. Frontend npm install
$FeNodeModules = Join-Path $FrontendDir "node_modules"
if (-not (Test-Path $FeNodeModules)) {
    Write-Host "[3/5] Menginstal dependensi Frontend (npm install)..." -ForegroundColor Yellow
    Push-Location $FrontendDir
    npm install
    Pop-Location
    Write-Host "      ✔ Node modules frontend berhasil dipasang." -ForegroundColor Green
} else {
    Write-Host "[3/5] Frontend node_modules sudah terpasang. Dilewati." -ForegroundColor DarkGray
}

# 4. Aktifkan Backend Containers
Write-Host "[4/5] Memastikan container backend aktif..." -ForegroundColor Blue
Push-Location $BackendDir
docker compose up -d
Pop-Location

# 5. Generate APP_KEY, storage:link, migrate, db:seed
Write-Host "[5/5] Memeriksa APP_KEY, Storage Link, dan Database..." -ForegroundColor Blue
Push-Location $BackendDir

$appKey = (Select-String -Path $SrcEnv -Pattern "^APP_KEY=(.+)").Matches.Value
if (-not $appKey -or $NeedAppKey) {
    Write-Host "      -> Generate Laravel APP_KEY..." -ForegroundColor Yellow
    docker compose exec -T app php artisan key:generate --ansi
    Copy-Item $SrcEnv $DockerEnv -Force
    docker compose up -d
    Write-Host "      ✔ APP_KEY berhasil dibuat." -ForegroundColor Green
}

docker compose exec -T app php artisan storage:link 2>$null
docker compose exec -T app php artisan migrate --force

$userCount = docker compose exec -T app php artisan tinker --execute="echo \App\Models\User::count();"
if ($userCount -match "0" -or -not $userCount) {
    Write-Host "      -> Database kosong. Menjalankan seeding master & demo data..." -ForegroundColor Yellow
    docker compose exec -T app php artisan db:seed --force
    Write-Host "      ✔ Seeding data berhasil selesai." -ForegroundColor Green
}
Pop-Location

Write-Host "`n===========================================" -ForegroundColor Green
Write-Host "   ✔ Setup Selesai! Lingkungan siap dipakai. " -ForegroundColor Green
Write-Host "===========================================`n" -ForegroundColor Green
