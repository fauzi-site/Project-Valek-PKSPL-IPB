#!/bin/bash
# ========================================================
# PKSPL Development Runner Script
# Menjalankan Backend (Docker) dan Frontend (Vite)
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

# --------------------------------------------------------
# Cek apakah file .env sudah ada. Jika belum, panggil setup-env.sh
# --------------------------------------------------------
if [ ! -f "$BACKEND_DIR/src/.env" ] || [ ! -f "$FRONTEND_DIR/.env" ]; then
    echo -e "${CLR_YELLOW}==========================================================${CLR_RESET}"
    echo -e "${CLR_BOLD}${CLR_YELLOW}[!] File .env belum ditemukan. Memanggil setup-env.sh...${CLR_RESET}"
    echo -e "${CLR_YELLOW}==========================================================${CLR_RESET}"
    "$PROJECT_ROOT/setup-env.sh"
fi

echo -e "${CLR_CYAN}===========================================${CLR_RESET}"
echo -e "${CLR_BOLD}${CLR_CYAN}  Starting PKSPL IPB System (Rework)...    ${CLR_RESET}"
echo -e "${CLR_CYAN}===========================================${CLR_RESET}"

# 1. Menjalankan Docker Backend
echo -e "${CLR_BLUE}[1/2] Memastikan Backend Services (Docker) aktif...${CLR_RESET}"
cd "$BACKEND_DIR"
docker compose up -d

# 2. Menjalankan Frontend Dev Server (Vite)
echo ""
echo -e "${CLR_BLUE}[2/2] Menjalankan Frontend Dev Server (Vite)...${CLR_RESET}"
cd "$FRONTEND_DIR"

echo -e "${CLR_DIM}-------------------------------------------${CLR_RESET}"
echo -e "${CLR_BOLD}  URL Akses Sistem:                        ${CLR_RESET}"
echo -e "  - ${CLR_CYAN}Frontend (Dev Mode)${CLR_RESET}: ${CLR_BOLD}${CLR_GREEN}http://localhost:5173${CLR_RESET}"
echo -e "  - ${CLR_CYAN}Nginx (Full-stack)${CLR_RESET}:  ${CLR_BOLD}${CLR_GREEN}http://localhost:8000${CLR_RESET}"
echo -e "  - ${CLR_CYAN}Adminer (Database)${CLR_RESET}:  ${CLR_BOLD}${CLR_GREEN}http://localhost:8081${CLR_RESET}"
echo -e "  - ${CLR_CYAN}Mailpit (Email)${CLR_RESET}:     ${CLR_BOLD}${CLR_GREEN}http://localhost:8025${CLR_RESET}"
echo -e "${CLR_DIM}-------------------------------------------${CLR_RESET}"
echo -e "${CLR_YELLOW}Tekan Ctrl+C untuk menghentikan server Vite.${CLR_RESET}"
echo -e "${CLR_DIM}Untuk mematikan container backend, jalankan: ./stop.sh${CLR_RESET}"
echo ""

npm run dev -- --host
