# Panduan Menjalankan PKSPL IPB (Backend & Frontend)

Panduan ini berisi cara menjalankan backend (BE) dan frontend (FE) pada proyek **`/home/ipmad/vault/pkspl rework`**.

---

## 🚀 Cara Cepat (Menggunakan Script Otomatis)

Telah disediakan script praktis di root direktori proyek:

1. **Menjalankan BE & FE sekaligus**:
   ```bash
   cd "/home/ipmad/vault/pkspl rework"
   ./run-dev.sh
   ```
   *Script ini otomatis mengaktifkan semua kontainer Docker Backend dan menyalakan Vite Dev Server Frontend.*

2. **Menghentikan Semua Layanan**:
   ```bash
   cd "/home/ipmad/vault/pkspl rework"
   ./stop.sh
   ```

---

## 🛠️ Cara Manual (Langkah per Langkah)

### 1. Menjalankan Backend (Docker)

Masuk ke folder backend dan jalankan Docker Compose:

```bash
cd "/home/ipmad/vault/pkspl rework/PKSPL-Backend"

# Menjalankan kontainer di background
docker compose up -d
```

#### Perintah Penting Backend:
- **Cek Status Kontainer**:
  ```bash
  docker compose ps
  ```
- **Lihat Log Backend**:
  ```bash
  docker compose logs -f app
  ```
- **Menjalankan Perintah Artisan**:
  ```bash
  docker compose exec app php artisan <perintah>
  # Contoh migrate & seed:
  docker compose exec app php artisan migrate --seed
  ```
- **Menghentikan Backend**:
  ```bash
  docker compose down
  ```

---

### 2. Menjalankan Frontend (React + Vite)

Buka terminal terpisah, lalu masuk ke folder frontend:

```bash
cd "/home/ipmad/vault/pkspl rework/PKSPL-Project-Frontend"

# Mode Pengembangan (Hot Reload / HMR aktif)
npm run dev
```

*Jika ingin memperbarui build production yang disajikan oleh Nginx:*
```bash
npm run build
```

---

## 🌐 Alamat & Port Layanan

| Layanan | URL / Port | Deskripsi |
|---|---|---|
| **Frontend (Dev Server)** | `http://localhost:5173` | Server development Vite (rekomendasi untuk koding) |
| **Nginx Reverse Proxy** | `http://localhost:8000` | Full-stack endpoint (`/` untuk frontend build, `/api/v1` untuk Laravel) |
| **Laravel Reverb (WebSocket)** | `http://localhost:8085` | Komunikasi realtime & notifikasi |
| **Database UI (Adminer)** | `http://localhost:8081` | Web GUI PostgreSQL |
| **Mailpit (Inbox Testing)** | `http://localhost:8025` | Web viewer email (SMTP di port 1025) |
| **PostgreSQL + PostGIS** | `localhost:5433` | Host port database (`pkspl` / `pkspl123`) |

---

## 🔑 Akun Demo Default

Kata sandi default untuk seluruh akun: **`password`**

- **Super Admin**: `admin@gmail.com`
- **Peneliti**: `peneliti@gmail.com`
- **Tamu / Guest**: `guest@gmail.com`
