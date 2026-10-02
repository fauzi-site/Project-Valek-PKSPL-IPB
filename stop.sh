#!/bin/bash
# ========================================================
# PKSPL Stop Script
# Menghentikan Backend (Docker) dan Frontend Dev Server
# ========================================================

PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
BACKEND_DIR="$PROJECT_ROOT/PKSPL-Backend"

echo "Menghentikan Frontend Dev Server (jika berjalan di background)..."
pkill -f "vite --host" || true

echo "Menghentikan Backend Docker Containers..."
cd "$BACKEND_DIR"
docker compose down

echo "Semua layanan PKSPL telah dihentikan."
