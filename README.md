# Sistem Valuasi Ekonomi Ekosistem Pesisir & Laut — PKSPL IPB

Repository terpadu ini memuat seluruh kode sumber (**Backend** dan **Frontend**) untuk **Sistem Valuasi Ekonomi Ekosistem Pesisir dan Laut**, yang dikembangkan untuk Pusat Kajian Sumberdaya Pesisir dan Lautan, Institut Pertanian Bogor (PKSPL IPB).

Sistem ini dirancang untuk mendigitalkan, menstandardisasi, dan mengotomatisasi proses valuasi ekonomi sumber daya alam pesisir dan laut di Indonesia. Platform ini memfasilitasi peneliti dalam memetakan area terdampak, mengidentifikasi tutupan lahan dan 4 kategori jasa ekosistem, melakukan perhitungan nilai ekonomi terpadu (*Total Economic Value* / TEV, *Benefit-Cost Ratio* / BCR, dan *Net Present Value* / NPV), berkolaborasi melalui ruang diskusi dan notifikasi *real-time*, hingga menerbitkan laporan analisis dan menyajikan visualisasi data kepada publik.

---

## Daftar Isi

1. [Fitur Utama Sistem](#fitur-utama-sistem)
2. [Teknologi yang Digunakan](#teknologi-yang-digunakan)
   - [Backend](#backend)
   - [Frontend](#frontend)
3. [Struktur Repository](#struktur-repository)
4. [Persyaratan Sistem](#persyaratan-sistem)
5. [Panduan Instalasi & Menjalankan Backend](#panduan-instalasi--menjalankan-backend)
   - [Opsi A: Menjalankan Menggunakan Docker (Direkomendasikan)](#opsi-a-menjalankan-menggunakan-docker-direkomendasikan)
   - [Opsi B: Menjalankan Manual / Native di Lingkungan Lokal](#opsi-b-menjalankan-manual--native-di-lingkungan-lokal)
6. [Panduan Instalasi & Menjalankan Frontend](#panduan-instalasi--menjalankan-frontend)
7. [Menjalankan Demo Public (Cloudflare Tunnel)](#menjalankan-demo-public-cloudflare-tunnel)
8. [Daftar Port & Layanan](#daftar-port--layanan)
9. [Akun Default & Seeding](#akun-default--seeding)
10. [Pengujian (Testing)](#pengujian-testing)
11. [Lisensi & Kepemilikan](#lisensi--kepemilikan)

---

## Fitur Utama Sistem

### 1. Modul Peneliti (Researcher 9-Step Workflow)
- **Pemetaan Spasial Interaktif**: Integrasi peta Leaflet dengan dukungan unggah berkas Shapefile (`.zip`) dan *boundary lookup* poligon wilayah administratif (Provinsi, Kabupaten/Kota, Kecamatan, Desa/Kelurahan).
- **Indeks Ekonomi**: Konfigurasi parameter makro seperti tingkat inflasi tahunan, suku bunga diskonto (*discount rate*), dan koefisien valuasi.
- **Data Master Proyek**: Pengelolaan harga pasar komoditas dan koefisien lingkungan berbasis wilayah kajian.
- **Identifikasi Jasa & Metode Ekosistem**: Pemetaan tutupan lahan ke 4 klasifikasi jasa ekosistem:
  - *Provisioning Services* (Jasa Penyediaan)
  - *Regulating Services* (Jasa Pengaturan)
  - *Supporting Services* (Jasa Pendukung)
  - *Cultural Services* (Jasa Budaya / Pariwisata)
- **Spreadsheet Valuasi Terintegrasi**: Input data dinamis baris-demi-baris dengan kolom kustom per unit tutupan lahan.
- **Kalkulasi Otomatis TEV, BCR, & NPV**: Otomasi perhitungan nilai manfaat (*benefits*), biaya (*costs*), dan kelayakan ekonomi ekosistem.
- **Dashboard Analitik**: Visualisasi grafik distribusi nilai manfaat per kategori jasa dan tren riset menggunakan Recharts.
- **Review Laporan & Ekspor**: Pratinjau cetak laporan valuasi komprehensif, pelacakan revisi, dan ekspor dokumen.
- **Komunikasi & Chat Real-Time**: Fitur percakapan interaktif berbasis WebSocket (Laravel Reverb) dengan status kehadiran (*presence heartbeat*) dan indikator pengetikan (*typing indicator*).

### 2. Modul Super Admin
- **Dashboard Eksekutif**: Statistik agregat valuasi nasional, sebaran proyek, dan tren aktivitas riset.
- **Manajemen Master Data Global**: Pengelolaan referensi harga pasar komoditas, koefisien, dan standar wilayah nasional.
- **Manajemen Pengguna (RBAC)**: Kontrol akses berbasis peran (*Super Admin*, *Peneliti*, *Guest*).
- **Monitoring Proyek & Audit Trail**: Pencatatan riwayat perubahan (*activity logs*) untuk setiap aksi pengguna.
- **Verifikasi Data & Manajemen Kebijakan**: Instrumen kendali mutu dan verifikasi laporan valuasi.

### 3. Modul Publik
- **Landing Page & Peta Sebaran Proyek**: Peta interaktif sebaran riset valuasi ekonomi pesisir di seluruh Indonesia.
- **Dashboard Publik**: Transparansi statistik valuasi dan ringkasan ekosistem yang dapat diakses oleh pemangku kepentingan.

---

## Teknologi yang Digunakan

### Backend

- **Runtime & Bahasa**: PHP ^8.3 (Docker image `php:8.3-fpm`)
- **Framework Utama**: [Laravel 13](https://laravel.com) (`v13.21.1`)
- **Database**: [PostgreSQL 16](https://www.postgresql.org) dengan ekstensi geospasial [PostGIS 3.4](https://postgis.net) (`postgis/postgis:16-3.4`)
- **Autentikasi & Keamanan**:
  - [Laravel Sanctum](https://laravel.com/docs/sanctum) (`^4.3`) — Autentikasi API berbasis token
  - [Laravel Socialite](https://laravel.com/docs/socialite) (`^5.29`) — Integrasi OAuth Google SSO
- **Realtime WebSocket Server**: [Laravel Reverb](https://reverb.laravel.com) (`^1.11.1`)
- **Job & Queue Worker**: Laravel Database Queue Worker
- **Web Server & Reverse Proxy**: [Nginx](https://nginx.org)
- **Dev & Tooling Services**:
  - [Mailpit](https://github.com/axllent/mailpit) (`axllent/mailpit:latest`) — Server penangkap email pengujian lokal
  - [Adminer](https://www.adminer.org) (`adminer:latest`) — Antarmuka web pengelola basis data PostgreSQL
  - [Composer](https://getcomposer.org) — Dependency manager PHP
  - [Laravel Pint](https://laravel.com/docs/pint) (`^1.27`) & [Laravel Pail](https://github.com/laravel/pail) (`^1.2.5`)
  - [PHPUnit](https://phpunit.de) (`^12.5.12`) — Framework pengujian unit dan fitur

### Frontend

- **Runtime & Bahasa**: JavaScript (ES modules) & TypeScript
- **Framework & UI Library**: [React 18](https://react.dev) (`^18.2.0`) & [React DOM](https://react.dev) (`^18.2.0`)
- **Build Tool & Bundler**: [Vite 5](https://vitejs.dev) (`^5.1.4`) dengan `@vitejs/plugin-react` (`^4.2.1`)
- **Styling**: [Tailwind CSS 3](https://tailwindcss.com) (`^3.4.1`), [PostCSS](https://postcss.org) (`^8.4.35`), [Autoprefixer](https://github.com/postcss/autoprefixer) (`^10.4.18`)
- **Routing**: [React Router DOM 6](https://reactrouter.com) (`^6.22.0`)
- **Peta & Geospasial**:
  - [Leaflet](https://leafletjs.com) (`^1.9.4`) & [React Leaflet](https://react-leaflet.js.org) (`^4.2.1`)
  - [shpjs](https://github.com/calvinmetcalf/shapefile-js) (`^6.2.0`) — Parser berkas Shapefile langsung di peramban
- **Visualisasi & Diagram**: [Recharts](https://recharts.org) (`^2.15.4`)
- **Koneksi Realtime WebSocket**: [Laravel Echo](https://laravel.com/docs/broadcasting) (`^2.5.0`) & [Pusher JS](https://github.com/pusher/pusher-js) (`^8.6.0`)
- **Pengolahan Berkas & Spreadsheet**: [xlsx / SheetJS](https://sheetjs.com) (`^0.18.5`)
- **Internasionalisasi (i18n)**: [i18next](https://www.i18next.com) (`^26.4.2`) & [react-i18next](https://react.i18next.com) (`^17.0.13`)
- **Notifikasi & Ikon**: [react-hot-toast](https://react-hot-toast.com) (`^2.6.0`) & [Lucide React](https://lucide.dev) (`^0.344.0`)
- **Package Manager**: npm

---

## Struktur Repository

```text
Project-Valek-PKSPL-IPB/
├── PKSPL-Backend/
│   ├── docker/                         # Konfigurasi containerization
│   │   ├── nginx/                      # Konfigurasi virtual host Nginx
│   │   ├── php/                        # Dockerfile PHP 8.3-fpm & script entrypoint
│   │   └── postgres/                   # Script inisialisasi PostGIS initdb
│   ├── docs/                           # Dokumentasi teknis, API, dan arsitektur backend
│   ├── src/                            # Aplikasi Laravel 13
│   │   ├── app/
│   │   │   ├── Http/Controllers/Api/V1/# Controller REST API modular (Auth, Project, Valuation, Chat, AI)
│   │   │   ├── Http/Requests/          # Form request validation
│   │   │   ├── Http/Resources/         # API transformers (JSON responses)
│   │   │   ├── Models/                 # Model Eloquent & relasi database
│   │   │   └── Policies/               # Otorisasi peran (RBAC)
│   │   ├── database/
│   │   │   ├── migrations/             # Skema tabel relasional & geospasial
│   │   │   └── seeders/                # Data awal peran, pengguna, wilayah, dan proyek
│   │   ├── routes/
│   │   │   ├── api.php                 # Rute utama API v1
│   │   │   ├── api_chat.php            # Rute modul perpesanan & percakapan
│   │   │   ├── api_review.php          # Rute modul review & notifikasi
│   │   │   └── api_valuation.php       # Rute modul valuasi ekonomi & spreadsheet
│   │   ├── storage/                    # Storage lokal Laravel (cache, upload publik)
│   │   ├── tests/                      # Pengujian unit & fitur (Feature & Unit tests)
│   │   ├── .env.example                # Template konfigurasi lokal Laravel
│   │   └── composer.json               # Dependensi paket PHP
│   ├── .env.docker.example             # Template konfigurasi Docker Compose
│   └── docker-compose.yml              # Definisi multi-container services
│
├── PKSPL-Project-Frontend/
│   ├── public/                         # Aset publik statis
│   ├── src/
│   │   ├── admin/                      # Modul & halaman Super Admin (Dashboard, Master Data, Users, Activity)
│   │   ├── components/                 # Komponen umum, Navbar, Footer, Landing Section, ProtectedRoute
│   │   ├── contexts/                   # Global context (AuthContext)
│   │   ├── i18n/                       # Konfigurasi kamus lokalisasi bahasa (ID / EN)
│   │   ├── lib/                        # Inisialisasi library pihak ketiga (Laravel Echo, Reverb, Axios)
│   │   ├── pages/                      # Halaman autentikasi (Login, Register, Forgot Password, OAuth Callback)
│   │   ├── peneliti/                   # Modul 9 langkah Peneliti (Maps, Index, Master Data, Valuation, Analytics, Report, Chat)
│   │   ├── services/                   # Service API client komunikasi HTTP ke Backend
│   │   ├── App.jsx                     # Rute utama React Router DOM
│   │   └── main.jsx                    # Entry point aplikasi React
│   ├── .env.example                    # Template konfigurasi variabel lingkungan Frontend
│   ├── index.html                      # Template HTML utama
│   ├── package.json                    # Dependensi paket Node.js
│   ├── tailwind.config.js              # Konfigurasi Tailwind CSS
│   └── vite.config.js                  # Konfigurasi bundler Vite
│
├── .gitignore                          # Aturan pengabaian berkas sensitif terpadu
└── README.md                           # Dokumentasi utama repository
```

---

## Persyaratan Sistem

Sebelum menjalankan aplikasi, pastikan komputer/server Anda telah terpasang:

### Backend
- **Direkomendasikan**: **Docker Desktop** (versi terbaru) atau Docker Engine dengan Docker Compose v2.
- **Alternatif Native (tanpa Docker)**:
  - PHP >= 8.3 dengan ekstensi: `pdo`, `pdo_pgsql`, `mbstring`, `zip`, `intl`, `bcmath`, `pcntl`, `gd`, `xml`, `curl`
  - Composer >= 2.6
  - PostgreSQL >= 16 dengan ekstensi PostGIS aktif
  - Nginx atau Apache (opsional, dapat menggunakan `php artisan serve`)

### Frontend
- **Node.js** >= 18.x (direkomendasikan Node.js 20 LTS)
- **npm** >= 9.x (atau pnpm / yarn)

---

## Panduan Instalasi & Menjalankan Backend

### Opsi A: Menjalankan Menggunakan Docker (Direkomendasikan)

Penggunaan Docker memastikan seluruh dependensi (PHP 8.3, Nginx, PostgreSQL + PostGIS, Laravel Reverb, Mailpit, Adminer) terisolasi dan langsung siap pakai tanpa perlu instalasi database manual di komputer lokal.

1. **Masuk ke direktori Backend**:
   ```bash
   cd PKSPL-Backend
   ```

2. **Salin file environment Docker**:
   ```bash
   cp .env.docker.example .env.docker
   ```

3. **Salin file environment Laravel**:
   ```bash
   cp src/.env.example src/.env
   ```

4. **Jalankan seluruh service dengan Docker Compose**:
   ```bash
   docker compose up -d --build
   ```

5. **Generate Application Key**:
   ```bash
   docker compose exec app php artisan key:generate
   ```

6. **Jalankan migrasi database dan isi data awal (seeding)**:
   ```bash
   docker compose exec app php artisan migrate --seed
   ```

7. **Buat symbolic link untuk penyimpanan berkas publik**:
   ```bash
   docker compose exec app php artisan storage:link
   ```

Setelah langkah di atas selesai, backend API dapat diakses melalui `http://localhost:8000`.

---

### Opsi B: Menjalankan Manual / Native di Lingkungan Lokal

Jika Anda memilih menjalankan PHP secara langsung tanpa Docker:

1. **Masuk ke folder sumber Laravel**:
   ```bash
   cd PKSPL-Backend/src
   ```

2. **Instal dependensi Composer**:
   ```bash
   composer install
   ```

3. **Siapkan konfigurasi `.env`**:
   ```bash
   cp .env.example .env
   php artisan key:generate
   ```
   *Buka berkas `src/.env` lalu sesuaikan konfigurasi koneksi database PostgreSQL (`DB_HOST`, `DB_PORT`, `DB_DATABASE`, `DB_USERNAME`, `DB_PASSWORD`).*

4. **Jalankan migrasi dan seeder**:
   ```bash
   php artisan migrate --seed
   ```

5. **Jalankan server aplikasi Laravel**:
   ```bash
   php artisan serve --port=8000
   ```

6. **Jalankan server WebSocket Laravel Reverb** (pada terminal terpisah):
   ```bash
   php artisan reverb:start --port=8080
   ```

7. **Jalankan queue worker** (pada terminal terpisah):
   ```bash
   php artisan queue:work
   ```

---

## Panduan Instalasi & Menjalankan Frontend

1. **Buka terminal baru dan masuk ke direktori Frontend**:
   ```bash
   cd PKSPL-Project-Frontend
   ```

2. **Salin file konfigurasi lingkungan**:
   ```bash
   cp .env.example .env
   ```
   *Pastikan nilai `VITE_API_URL` mengarah ke endpoint Backend (`http://localhost:8000/api/v1`) dan `VITE_REVERB_PORT` mengarah ke port WebSocket (`8085` jika menggunakan Docker, atau `8080` jika native).*

3. **Instal dependensi Node.js**:
   ```bash
   npm install
   ```

4. **Jalankan server pengembangan (development mode)**:
   ```bash
   npm run dev
   ```

Aplikasi frontend akan aktif dan dapat diakses di peramban melalui alamat:
`http://localhost:5173`

5. **Membangun versi produksi (production build)**:
   ```bash
   npm run build
   ```
   Hasil build siap saji akan disimpan pada direktori `dist/`.

---

## Menjalankan Demo Public (Cloudflare Tunnel)

Aplikasi dapat dipublikasikan sementara ke internet untuk kebutuhan demonstrasi, presentasi, atau pengujian oleh tim PKSPL/dosen tanpa perlu melakukan deployment ke VPS/cloud hosting. Fitur ini menggunakan arsitektur **Single Origin Reverse Proxy Nginx** dan **Cloudflare Quick Tunnel**.

### Cara Menjalankan:
1. **Bangun bundle frontend**:
   ```bash
   cd PKSPL-Project-Frontend
   npm run build
   cd ../PKSPL-Backend
   ```
2. **Jalankan container backend & aktifkan Cloudflare Tunnel**:
   ```bash
   docker compose up -d
   docker compose up -d tunnel
   ```
3. **Dapatkan URL public dari logs**:
   ```bash
   docker logs pkspl-tunnel
   ```
   Buka URL `https://xxxxx.trycloudflare.com` yang tercantum di terminal. Aplikasi langsung siap didemokan dari laptop/ponsel mana pun di internet!

Untuk panduan lengkap mengenai konfigurasi, keamanan, isolasi database, dan troubleshooting, silakan baca dokumentasi resmi di:
👉 **[Panduan Lengkap Public Demo (docs/PUBLIC-DEMO.md)](docs/PUBLIC-DEMO.md)**

---

## Daftar Port & Layanan

Ketika dijalankan menggunakan konfigurasi standar Docker:

| Layanan | Protokol / Port Host | Keterangan |
|---|---|---|
| **Frontend Web (Vite Dev)** | `http://localhost:5173` | Antarmuka Pengguna React (Dev Server) |
| **Unified Web & API (Nginx)** | `http://localhost:8000` | Frontend SPA (`/`) & REST API Laravel (`/api`) |
| **Laravel Reverb (WebSocket)** | `http://localhost:8085` | Komunikasi perpesanan realtime |
| **Adminer Database Manager** | `http://localhost:8081` | Web UI administrasi database PostgreSQL |
| **Mailpit Web UI** | `http://localhost:8025` | Inspeksi email lokal (reset password / verifikasi) |
| **Mailpit SMTP** | `localhost:1025` | Port relay pengiriman email |
| **PostgreSQL + PostGIS** | `localhost:5433` | Akses langsung ke database dari host (Internal) |

---

## Akun Default & Seeding

Setelah menjalankan `php artisan migrate --seed`, database akan terisi dengan akun awal:

| Peran (*Role*) | Alamat Email | Password Standar | Akses |
|---|---|---|---|
| **Super Admin** | `admin@gmail.com` | `password` | Akses penuh ke seluruh menu konsol admin & pengaturan sistem |
| **Peneliti (*Researcher*)** | `peneliti@gmail.com` | `password` | Akses ke seluruh 9 alur kerja valuasi proyek, peta, dan data master |

> [!WARNING]
> Segera ganti seluruh kredensial dan kata sandi default pada lingkungan produksi (*production*) demi menjaga keamanan sistem.

---

## Pengujian (Testing)

Untuk menjalankan seluruh test suite otomatis pada backend:

- **Menggunakan Docker**:
  ```bash
  docker compose -f PKSPL-Backend/docker-compose.yml exec app php artisan test
  ```
- **Secara Native**:
  ```bash
  cd PKSPL-Backend/src
  php artisan test
  ```

---

## Lisensi & Kepemilikan

Proyek ini dikembangkan oleh dan merupakan hak milik **Pusat Kajian Sumberdaya Pesisir dan Lautan (PKSPL), Institut Pertanian Bogor (IPB University)**.

Seluruh hak cipta dilindungi undang-undang.
