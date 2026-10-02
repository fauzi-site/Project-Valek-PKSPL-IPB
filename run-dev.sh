#!/bin/bash
# ========================================================
# PKSPL Development Runner Script
# Menjalankan Backend (Docker) dan Frontend (Vite)
# ========================================================

set -e
PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
BACKEND_DIR="$PROJECT_ROOT/PKSPL-Backend"
FRONTEND_DIR="$PROJECT_ROOT/PKSPL-Project-Frontend"

echo "==========================================="
echo "  Starting PKSPL IPB System (Rework)...    "
echo "==========================================="

# 1. Menjalankan Docker Backend
echo "[1/2] Menjalankan Backend Services (Docker)..."
cd "$BACKEND_DIR"
docker compose up -d

echo ""
echo "[2/2] Menjalankan Frontend Dev Server (Vite)..."
cd "$FRONTEND_DIR"

echo "-------------------------------------------"
echo "  URL Akses Sistem:                        "
echo "  - Frontend (Dev Mode): http://localhost:5173"
echo "  - Nginx (Full-stack):  http://localhost:8000"
echo "  - Adminer (Database):  http://localhost:8081"
echo "  - Mailpit (Email):     http://localhost:8025"
echo "-------------------------------------------"
echo "Tekan Ctrl+C untuk menghentikan server Vite."
echo ""

npm run dev -- --host
