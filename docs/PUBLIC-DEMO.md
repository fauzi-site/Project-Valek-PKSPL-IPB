# Panduan Publikasi Demo Public via Cloudflare Tunnel (Tanpa Hosting)

Dokumen ini memuat panduan lengkap untuk menjalankan **Sistem Valuasi Ekonomi Ekosistem Pesisir & Laut — PKSPL IPB** di komputer lokal dan mempublikasikannya ke internet secara aman menggunakan **Cloudflare Tunnel (Quick Tunnel)** tanpa menyewa VPS/hosting, tanpa memindahkan database, dan tanpa mengekspos port database ke internet.

---

## Daftar Isi

1. [Arsitektur Sistem](#1-arsitektur-sistem)
2. [Prasyarat Sistem](#2-prasyarat-sistem)
3. [Langkah Cepat Mempublikasikan Demo Public (Rekomendasi)](#3-langkah-cepat-mempublikasikan-demo-public-rekomendasi)
4. [Mendapatkan & Mengecek URL Public](#4-mendapatkan--mengecek-url-public)
5. [Cara Menghentikan Tunnel](#5-cara-menghentikan-tunnel)
6. [Opsi Alternatif: Menggunakan Binary cloudflared Standalone (CLI)](#6-opsi-alternatif-menggunakan-binary-cloudflared-standalone-cli)
7. [Perbedaan Mode Local vs Mode Public](#7-perbedaan-mode-local-vs-mode-public)
8. [Akun Pengujian Demo (Seeding)](#8-akun-pengujian-demo-seeding)
9. [Keamanan & Isolasi Database](#9-keamanan--isolasi-database)
10. [Troubleshooting & Solusi Masalah](#10-troubleshooting--solusi-masalah)

---

## 1. Arsitektur Sistem

Aplikasi menggunakan pendekatan **Single Origin Reverse Proxy** melalui Nginx. Seluruh antarmuka frontend, endpoint API backend, berkas unggahan, dan koneksi WebSocket disajikan di bawah satu domain/URL yang sama:

```text
                     INTERNET / PENGGUNA DEMO
                                │
                                ▼ (HTTPS)
                     Cloudflare Quick Tunnel
               (https://xxxxx.trycloudflare.com)
                                │
                                ▼ (HTTP)
                       pkspl-nginx (Port 80)
                                │
        ┌───────────────────────┼───────────────────────┬───────────────────────┐
        │                       │                       │                       │
        ▼                       ▼                       ▼                       ▼
    Frontend SPA           Backend API            Storage/Uploads        Reverb WebSocket
 (dist/ HTML/CSS/JS)   (PHP-FPM app:9000)      (storage/app/public)       (reverb:8080)
    Path: /                 Path: /api/*            Path: /storage/*        Path: /app/*
                                │
                                ▼
                        PostgreSQL Docker
                        (Internal Network)
                      [TIDAK TERBUKA KE LUAR]
```

### Keunggulan Arsitektur Ini:
- **Bebas Masalah CORS**: Karena frontend dan backend berada dalam origin yang sama (`/` dan `/api`), browser tidak pernah memblokir request karena kebijakan Cross-Origin.
- **Bebas Mixed Content**: Seluruh aset dan API dipanggil melalui HTTPS Cloudflare.
- **Satu URL Sederhana**: Anda hanya perlu membagikan satu URL kepada penguji, pembimbing, atau dosen.

---

## 2. Prasyarat Sistem

Sebelum memulai, pastikan perangkat lokal Anda telah terpasang:

1. **Docker Desktop**: Berjalan normal dengan dukungan Docker Compose.
2. **Node.js**: Versi 18+ (disarankan Node.js v20 atau v24).
3. **Koneksi Internet**: Untuk menghubungkan Quick Tunnel ke jaringan Cloudflare.

---

## 3. Langkah Cepat Mempublikasikan Demo Public (Rekomendasi)

Cukup ikuti 3 langkah praktis berikut dari terminal root repository `Project-PKSPL-IPB/`:

### Langkah 1: Build Frontend untuk Produksi
Masuk ke direktori frontend dan jalankan build:

```bash
cd PKSPL-Project-Frontend
npm run build
cd ..
```
*Hasil build siap saji akan disimpan pada `PKSPL-Project-Frontend/dist/` dan langsung dibaca oleh Nginx.*

### Langkah 2: Jalankan Docker Services
Nyalakan backend Laravel, database PostgreSQL, queue worker, WebSocket Reverb, dan web server Nginx:

```bash
cd PKSPL-Backend
docker compose up -d
```

### Langkah 3: Aktifkan Cloudflare Tunnel
Aktifkan container tunnel Cloudflare:

```bash
docker compose up -d tunnel
```
*(Atau Anda dapat menyalakan semuanya sekaligus dengan perintah: `docker compose --profile tunnel up -d`)*

---

## 4. Mendapatkan & Mengecek URL Public

Setelah container `pkspl-tunnel` aktif, periksa URL acak yang diberikan Cloudflare dengan perintah:

```bash
docker logs pkspl-tunnel
```

Di dalam output terminal, cari blok seperti contoh berikut:

```text
+--------------------------------------------------------------------------------------------+
|  Your quick Tunnel has been created! Visit it at (it may take some time to be reachable):  |
|  https://ports-pichunter-clause-profiles.trycloudflare.com                                 |
+--------------------------------------------------------------------------------------------+
```

Salin URL `https://xxxxx.trycloudflare.com` tersebut dan buka di browser peramban laptop lain atau ponsel Anda. Aplikasi PKSPL langsung aktif dan dapat digunakan secara utuh!

---

## 5. Cara Menghentikan Tunnel

Jika sesi demo telah selesai dan Anda ingin menutup akses dari internet:

```bash
cd PKSPL-Backend
docker compose stop tunnel
```

Untuk menyalakan kembali sewaktu-waktu:
```bash
docker compose start tunnel
docker logs pkspl-tunnel
```
*(Catatan: Setiap kali Quick Tunnel dibuat ulang, Cloudflare akan memberikan subdomain acak baru demi keamanan).*

Jika ingin mematikan seluruh container:
```bash
docker compose down
```

---

## 6. Opsi Alternatif: Menggunakan Binary cloudflared Standalone (CLI)

Jika Anda lebih memilih menjalankan Cloudflare Tunnel langsung melalui command prompt / PowerShell tanpa container Docker:

1. Pasang `cloudflared` di Windows via winget:
   ```powershell
   winget install --id Cloudflare.cloudflared
   ```
2. Buka terminal baru dan jalankan:
   ```powershell
   cloudflared tunnel --url http://localhost:8000
   ```
3. URL public akan langsung ditampilkan pada terminal Anda. Tekan `Ctrl + C` untuk menghentikan.

---

## 7. Perbedaan Mode Local vs Mode Public

Sistem dirancang agar Anda **tidak perlu mengutak-atik kode** saat beralih antara pengembangan lokal dan demo publik:

| Fitur | Mode Local Development | Mode Public Demo (Cloudflare Tunnel) |
|---|---|---|
| **Perintah Frontend** | `npm run dev` di `PKSPL-Project-Frontend` | `npm run build` sekali di awal |
| **URL Akses** | `http://localhost:5173` | `https://xxxxx.trycloudflare.com` (atau `http://localhost:8000`) |
| **Penyaji Antarmuka** | Vite Dev Server (Hot Module Replacement aktif) | Nginx menyajikan berkas `dist/` |
| **Penanganan API** | Vite Dev Proxy meneruskan `/api` ke `localhost:8000` | Nginx meneruskan `/api` langsung ke PHP-FPM |
| **WebSocket / Reverb** | `ws://localhost:8085` | `wss://xxxxx.trycloudflare.com:443/app` via proxy Nginx |
| **Kebutuhan Internet** | Offline / Tanpa internet | Memerlukan koneksi internet |

---

## 8. Akun Pengujian Demo (Seeding)

Gunakan akun resmi yang telah diisi ke dalam database (`UserSeeder`):

| Peran (*Role*) | Identitas (Email) | Kata Sandi (*Password*) | Lingkup Akses & Pengujian |
|---|---|---|---|
| **Super Admin** | `admin@gmail.com` | `password` | Akses Dashboard Admin, Manajemen Master Data, Log Aktivitas, Manajemen Pengguna |
| **Peneliti** | `peneliti@gmail.com` | `password` | Akses 9-Step Valuasi, Peta Spasial GIS, Input Spreadsheet Nilai Ekonomi, Chat Tim |

---

## 9. Keamanan & Isolasi Database

Sesuai standar operasional keamanan:

1. **Database PostgreSQL Tertutup Rapat**:
   - Port 5432 database hanya terikat pada Docker network internal (`pkspl-network`).
   - Cloudflare Tunnel hanya meneruskan trafik port 80 (Nginx). Internet sama sekali tidak dapat melakukan koneksi langsung ke PostgreSQL.
2. **Proteksi Berkas Sensitif**:
   - Nginx telah dikonfigurasi untuk menolak dengan kode HTTP `403 Forbidden` terhadap semua percobaan akses file konfigurasi seperti `.env`, `.git`, atau direktori sensitif.
3. **Batas Ukuran Upload Aman**:
   - Nginx membatasi ukuran request body hingga `50M` (`client_max_body_size 50M`), aman untuk unggahan Shapefile GIS (`.zip`) dan laporan spreadsheet Excel (`.xlsx`).
4. **Header Trusted Proxy**:
   - Laravel telah dikonfigurasi mempercayai proxy Cloudflare (`$middleware->trustProxies(at: '*')`) sehingga protokol HTTPS terdeteksi dengan tepat tanpa terjadi *infinite redirect loop*.

---

## 10. Troubleshooting & Solusi Masalah

### 1. URL Cloudflare menampilkan "Bad Gateway" (Error 502)
- **Penyebab**: Container Nginx atau Backend belum siap saat tunnel mencoba meneruskan trafik.
- **Solusi**: Pastikan container Nginx berjalan:
  ```bash
  docker compose ps
  docker compose logs nginx
  ```

### 2. Tampilan Frontend Putih Kosong (*Blank Page*)
- **Penyebab**: Folder `dist/` belum di-build sebelum menjalankan Nginx.
- **Solusi**: Jalankan build frontend:
  ```bash
  cd PKSPL-Project-Frontend
  npm run build
  cd ../PKSPL-Backend
  docker compose restart nginx
  ```

### 3. Login Gagal / "Kombinasi email dan password salah"
- **Penyebab**: Database belum di-seed atau menggunakan email yang keliru.
- **Solusi**: Pastikan menggunakan `admin@gmail.com` / `password` atau `peneliti@gmail.com` / `password`. Jika database kosong, jalankan:
  ```bash
  docker compose exec app php artisan migrate --seed
  ```

### 4. WebSocket / Chat Realtime Tidak Terhubung di Mode Public
- **Penyebab**: Pengaturan browser memblokir websocket tidak aman.
- **Solusi**: Konfigurasi `echo.ts` telah otomatis mendeteksi protokol HTTPS dan beralih ke port secure `443` (`wss://`) melalui proxy `/app/` Nginx. Pastikan container `pkspl-reverb` berstatus `Up`.
