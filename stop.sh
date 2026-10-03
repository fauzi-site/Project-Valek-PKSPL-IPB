#!/bin/bash
# ========================================================
# PKSPL Stop Script
# Menghentikan Backend (Docker) dan Frontend Dev Server
# ========================================================

PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
BACKEND_DIR="$PROJECT_ROOT/PKSPL-Backend"

# ANSI Color Codes
CLR_RESET="\033[0m"
CLR_BOLD="\033[1m"
CLR_DIM="\033[2m"
CLR_RED="\033[1;31m"
CLR_GREEN="\033[1;32m"
CLR_YELLOW="\033[1;33m"
CLR_BLUE="\033[1;34m"
CLR_CYAN="\033[1;36m"

echo -e "${CLR_YELLOW}Menghentikan Frontend Dev Server (jika berjalan di background)...${CLR_RESET}"
pkill -f "vite --host" || true

echo -e "${CLR_YELLOW}Menghentikan Backend Docker Containers...${CLR_RESET}"
cd "$BACKEND_DIR"
docker compose down

echo ""
echo -e "${CLR_GREEN}===========================================${CLR_RESET}"
echo -e "${CLR_BOLD}${CLR_GREEN}  ✔ Semua layanan PKSPL telah dihentikan.  ${CLR_RESET}"
echo -e "${CLR_GREEN}===========================================${CLR_RESET}"
