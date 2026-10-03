#!/bin/bash
# ========================================================
# PKSPL Setup Environment & Initializer Script
# Menyiapkan file .env, dependensi, database, dan seeder
# ========================================================

set -e
PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
BACKEND_DIR="$PROJECT_ROOT/PKSPL-Backend"
FRONTEND_DIR="$PROJECT_ROOT/PKSPL-Project-Frontend"

# ANSI Color Codes
CLR_RESET="\033[0m"
CLR_BOLD="\033[1m"
CLR_DIM="\033[2m"
CLR_RED="\033[1;31m"
CLR_GREEN="\033[1;32m"
CLR_YELLOW="\033[1;33m"
CLR_BLUE="\033[1;34m"
CLR_MAGENTA="\033[1;35m"
CLR_CYAN="\033[1;36m"

echo -e "${CLR_CYAN}===========================================${CLR_RESET}"
echo -e "${CLR_BOLD}${CLR_CYAN}   PKSPL IPB - Setup Environment           ${CLR_RESET}"
echo -e "${CLR_CYAN}===========================================${CLR_RESET}"

# --------------------------------------------------------
# 1. Setup Backend .env (src/.env & .env.docker)
# --------------------------------------------------------
NEED_APP_KEY=0
if [ ! -f "$BACKEND_DIR/src/.env" ]; then
    echo -e "${CLR_YELLOW}[1/5] Setup Backend .env...${CLR_RESET}"
    REFERENCE_ENV="/home/ipmad/vault/pkspl/PKSPL-Project-Backend/src/.env"
    if [ -f "$REFERENCE_ENV" ]; then
        echo -e "      ${CLR_BLUE}->${CLR_RESET} Menyalin konfigurasi dari reference vault (.env)..."
        cp "$REFERENCE_ENV" "$BACKEND_DIR/src/.env"
    else
        echo -e "      ${CLR_BLUE}->${CLR_RESET} Menyalin dari src/.env.example..."
        cp "$BACKEND_DIR/src/.env.example" "$BACKEND_DIR/src/.env"
        sed -i 's/REVERB_HOST=localhost/REVERB_HOST=reverb/g' "$BACKEND_DIR/src/.env" || true
        NEED_APP_KEY=1
    fi
    echo -e "      ${CLR_GREEN}✔ Backend src/.env berhasil disiapkan.${CLR_RESET}"
else
    echo -e "${CLR_DIM}[1/5] Backend src/.env sudah ada. Dilewati.${CLR_RESET}"
fi

# Pastikan symlink .env.docker tersedia
if [ ! -f "$BACKEND_DIR/.env.docker" ] && [ ! -L "$BACKEND_DIR/.env.docker" ]; then
    echo -e "      ${CLR_BLUE}->${CLR_RESET} Membuat symlink .env.docker -> src/.env..."
    ln -sf src/.env "$BACKEND_DIR/.env.docker"
    echo -e "      ${CLR_GREEN}✔ Symlink .env.docker berhasil dibuat.${CLR_RESET}"
fi

# --------------------------------------------------------
# 2. Setup Frontend .env
# --------------------------------------------------------
if [ ! -f "$FRONTEND_DIR/.env" ]; then
    echo -e "${CLR_YELLOW}[2/5] Setup Frontend .env...${CLR_RESET}"
    REFERENCE_FE_ENV="/home/ipmad/vault/pkspl/PKSPL-Project-Frontend/.env"
    if [ -f "$REFERENCE_FE_ENV" ]; then
        echo -e "      ${CLR_BLUE}->${CLR_RESET} Menyalin konfigurasi Frontend dari reference vault..."
        cp "$REFERENCE_FE_ENV" "$FRONTEND_DIR/.env"
    else
        echo -e "      ${CLR_BLUE}->${CLR_RESET} Menyalin dari .env.example..."
        cp "$FRONTEND_DIR/.env.example" "$FRONTEND_DIR/.env"
    fi
    echo -e "      ${CLR_GREEN}✔ Frontend .env berhasil disiapkan.${CLR_RESET}"
else
    echo -e "${CLR_DIM}[2/5] Frontend .env sudah ada. Dilewati.${CLR_RESET}"
fi

# --------------------------------------------------------
# 3. Frontend Node Dependencies
# --------------------------------------------------------
if [ ! -d "$FRONTEND_DIR/node_modules" ]; then
    echo -e "${CLR_YELLOW}[3/5] Menginstal dependensi Frontend (npm install)...${CLR_RESET}"
    (cd "$FRONTEND_DIR" && npm install)
    echo -e "      ${CLR_GREEN}✔ Node modules frontend berhasil dipasang.${CLR_RESET}"
else
    echo -e "${CLR_DIM}[3/5] Frontend node_modules sudah terpasang. Dilewati.${CLR_RESET}"
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
echo -e "${CLR_BLUE}[4/5] Memastikan container backend aktif untuk inisialisasi...${CLR_RESET}"
cd "$BACKEND_DIR"
docker compose up -d

echo -e "${CLR_BLUE}[5/5] Memeriksa APP_KEY, Storage Link, dan Database...${CLR_RESET}"
CURRENT_KEY=$(grep "^APP_KEY=" "$BACKEND_DIR/src/.env" | cut -d '=' -f2- || true)
if [ -z "$CURRENT_KEY" ] || [ "$NEED_APP_KEY" -eq 1 ]; then
    echo -e "      ${CLR_YELLOW}-> Generate Laravel APP_KEY...${CLR_RESET}"
    docker compose exec -T app php artisan key:generate --ansi
    echo -e "      ${CLR_GREEN}✔ APP_KEY berhasil dibuat.${CLR_RESET}"
fi

if [ ! -L "$BACKEND_DIR/src/public/storage" ]; then
    echo -e "      ${CLR_BLUE}-> Menghubungkan storage:link...${CLR_RESET}"
    docker compose exec -T app php artisan storage:link || true
    echo -e "      ${CLR_GREEN}✔ Storage link terhubung.${CLR_RESET}"
fi

echo -e "      ${CLR_BLUE}-> Menjalankan migrasi database...${CLR_RESET}"
docker compose exec -T app php artisan migrate --force

USER_COUNT=$(docker compose exec -T app php artisan tinker --execute="echo \App\Models\User::count();" 2>/dev/null | tr -d '\r\n ' || echo "0")
if [ "$USER_COUNT" = "0" ] || [ -z "$USER_COUNT" ]; then
    echo -e "      ${CLR_YELLOW}-> Database kosong. Menjalankan seeding master & demo data...${CLR_RESET}"
    docker compose exec -T app php artisan db:seed --force
    echo -e "      ${CLR_GREEN}✔ Seeding data berhasil selesai.${CLR_RESET}"
fi

echo ""
echo -e "${CLR_GREEN}===========================================${CLR_RESET}"
echo -e "${CLR_BOLD}${CLR_GREEN}   ✔ Setup Selesai! Lingkungan siap dipakai. ${CLR_RESET}"
echo -e "${CLR_GREEN}===========================================${CLR_RESET}"
echo ""
