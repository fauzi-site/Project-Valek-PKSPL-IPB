# PKSPL Project Backend

Backend REST API untuk pencatatan proyek, area terdampak, jasa ekosistem, hasil valuasi, data referensi/AI, validasi, dan histori pada PKSPL. Implementasi saat ini berfokus pada penyimpanan dan pengelolaan data melalui Laravel API v1.

## Tujuan

Menyediakan fondasi API terstruktur bagi proses valuasi jasa ekosistem dan Total Economic Value (TEV): proyek memiliki area terdampak, area memiliki catatan jasa ekosistem, dan hasil valuasi dapat divalidasi serta dicatat historinya.

## Teknologi

- PHP ^8.3 dan Laravel ^13.8 (v13.21.1)
- Eloquent ORM, Form Request, dan API Resource
- PostgreSQL 16 + PostGIS melalui Docker Compose (konfigurasi aplikasi tetap dapat diarahkan dengan `.env`)
- Laravel Reverb (WebSocket realtime server)
- Vite, Tailwind CSS 4, dan PHPUnit

## Struktur Utama

```text
.
├── docker/                  # Dockerfile PHP dan konfigurasi Nginx
├── docker-compose.yml       # App, Nginx, PostgreSQL/PostGIS, Reverb, Queue, Adminer, Mailpit
├── docs/                    # Dokumentasi proyek dan prompt historis
└── src/                     # Aplikasi Laravel
    ├── app/Http/            # Controller API, Form Request, API Resource
    ├── app/Models/          # Model dan relasi Eloquent
    ├── database/            # Migration, factory, seeder
    ├── routes/api.php       # Endpoint /api/v1
    └── tests/               # Test PHPUnit
```

## Instalasi dan Menjalankan

Instruksi lengkap tersedia di [docs/installation.md](docs/installation.md).

### Menjalankan Menggunakan Docker
Jalankan dari direktori `PKSPL-Backend/`:
```bash
docker compose up -d --build
```
- Nginx API tersedia pada: `http://localhost:8000`
- Reverb WebSocket pada: `http://localhost:8085`
- Adminer (Database UI) pada: `http://localhost:8081`
- Mailpit Web UI pada: `http://localhost:8025`
- PostgreSQL host port: `localhost:5433`

### Menjalankan Manual (Native)
Dari direktori `src/`:
```bash
composer install
cp .env.example .env
php artisan key:generate
php artisan migrate --seed
php artisan serve
```

## Dokumentasi Teknis

- [Arsitektur](docs/architecture.md)
- [Aturan Bisnis](docs/business-rules.md)
- [Database dan ERD](docs/database.md)
- [Workflow](docs/workflow.md)
- [API](docs/api.md)
- [Instalasi](docs/installation.md)
- [Standar Coding](docs/coding-standard.md)

## Lisensi & Kepemilikan

PKSPL IPB University.
