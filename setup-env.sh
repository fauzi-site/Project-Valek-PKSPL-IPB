#!/bin/bash
# ========================================================
# PKSPL Setup Environment & Initializer Script
# Menyiapkan file .env, dependensi, database, dan seeder
# ========================================================

set -e
PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
BACKEND_DIR="$PROJECT_ROOT/PKSPL-Backend"
FRONTEND_DIR="$PROJECT_ROOT/PKSPL-Project-Frontend"

echo "==========================================="
echo "   PKSPL IPB - Setup Environment           "
echo "==========================================="

# --------------------------------------------------------
# 1. Setup Backend .env (src/.env & .env.docker)
# --------------------------------------------------------
NEED_APP_KEY=0
if [ ! -f "$BACKEND_DIR/src/.env" ]; then
    echo "[1/5] Setup Backend .env..."
    REFERENCE_ENV="/home/ipmad/vault/pkspl/PKSPL-Project-Backend/src/.env"
    if [ -f "$REFERENCE_ENV" ]; then
        echo "      -> Menyalin konfigurasi dari reference vault (.env)..."
        cp "$REFERENCE_ENV" "$BACKEND_DIR/src/.env"
    else
        echo "      -> Menyalin dari src/.env.example..."
        cp "$BACKEND_DIR/src/.env.example" "$BACKEND_DIR/src/.env"
        # Sesuaikan REVERB_HOST agar mengarah ke nama container reverb
        sed -i 's/REVERB_HOST=localhost/REVERB_HOST=reverb/g' "$BACKEND_DIR/src/.env" || true
        NEED_APP_KEY=1
    fi
else
    echo "[1/5] Backend src/.env sudah ada. Dilewati."
fi

# Pastikan symlink .env.docker tersedia
if [ ! -f "$BACKEND_DIR/.env.docker" ] && [ ! -L "$BACKEND_DIR/.env.docker" ]; then
    echo "      -> Membuat symlink .env.docker -> src/.env..."
    ln -sf src/.env "$BACKEND_DIR/.env.docker"
fi

# --------------------------------------------------------
# 2. Setup Frontend .env
# --------------------------------------------------------
if [ ! -f "$FRONTEND_DIR/.env" ]; then
    echo "[2/5] Setup Frontend .env..."
    REFERENCE_FE_ENV="/home/ipmad/vault/pkspl/PKSPL-Project-Frontend/.env"
    if [ -f "$REFERENCE_FE_ENV" ]; then
        echo "      -> Menyalin konfigurasi Frontend dari reference vault..."
        cp "$REFERENCE_FE_ENV" "$FRONTEND_DIR/.env"
    else
        echo "      -> Menyalin dari .env.example..."
        cp "$FRONTEND_DIR/.env.example" "$FRONTEND_DIR/.env"
    fi
else
    echo "[2/5] Frontend .env sudah ada. Dilewati."
fi

# --------------------------------------------------------
# 3. Frontend Node Dependencies
# --------------------------------------------------------
if [ ! -d "$FRONTEND_DIR/node_modules" ]; then
    echo "[3/5] Menginstal dependensi Frontend (npm install)..."
    (cd "$FRONTEND_DIR" && npm install)
else
    echo "[3/5] Frontend node_modules sudah terpasang. Dilewati."
fi

# --------------------------------------------------------
# 4. Pastikan Izin Eksekusi Entrypoint Container
# --------------------------------------------------------
chmod +x "$BACKEND_DIR/docker/php/entrypoint.sh" 2>/dev/null || true
if [ -f "$BACKEND_DIR/docker/queue/entrypoint.sh" ]; then
    chmod +x "$BACKEND_DIR/docker/queue/entrypoint.sh" 2>/dev/null || true
fi

# --------------------------------------------------------
# 5. Inisialisasi Kontainer & Database
# --------------------------------------------------------
echo "[4/5] Memastikan container backend aktif untuk inisialisasi..."
cd "$BACKEND_DIR"
docker compose up -d

echo "[5/5] Memeriksa APP_KEY, Storage Link, dan Database..."
CURRENT_KEY=$(grep "^APP_KEY=" "$BACKEND_DIR/src/.env" | cut -d '=' -f2- || true)
if [ -z "$CURRENT_KEY" ] || [ "$NEED_APP_KEY" -eq 1 ]; then
    echo "      -> Generate Laravel APP_KEY..."
    docker compose exec -T app php artisan key:generate --ansi
fi

if [ ! -L "$BACKEND_DIR/src/public/storage" ]; then
    echo "      -> Menghubungkan storage:link..."
    docker compose exec -T app php artisan storage:link || true
fi

echo "      -> Menjalankan migrasi database..."
docker compose exec -T app php artisan migrate --force

USER_COUNT=$(docker compose exec -T app php artisan tinker --execute="echo \App\Models\User::count();" 2>/dev/null | tr -d '\r\n ' || echo "0")
if [ "$USER_COUNT" = "0" ] || [ -z "$USER_COUNT" ]; then
    echo "      -> Database kosong. Menjalankan seeding master & demo data..."
    docker compose exec -T app php artisan db:seed --force
fi

echo ""
echo "==========================================="
echo "   Setup Selesai! Lingkungan siap dipakai. "
echo "==========================================="
echo ""
