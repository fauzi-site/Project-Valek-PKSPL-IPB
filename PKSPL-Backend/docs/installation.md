# Instalasi

## Requirement

- PHP 8.3+
- Composer
- Node.js dan npm (untuk asset Vite)
<<<<<<< HEAD
- Driver database sesuai `.env` (PostgreSQL untuk Docker Compose; SQLite/PostgreSQL dapat dikonfigurasi Laravel)
=======
- Driver database sesuai `.env` (PostgreSQL/PostGIS untuk Docker Compose; SQLite/PostgreSQL dapat dikonfigurasi Laravel)
>>>>>>> ff7df9ec17581839afda962a0b1dc955b278fcac
- Ekstensi PHP Laravel umum, termasuk PDO dan driver database yang dipilih

## Instalasi lokal

Jalankan dari direktori `src/`.

```bash
composer install
cp .env.example .env
php artisan key:generate
```

Atur `DB_CONNECTION`, `DB_HOST`, `DB_PORT`, `DB_DATABASE`, `DB_USERNAME`, dan `DB_PASSWORD` pada `.env`, kemudian jalankan:

```bash
php artisan migrate --seed
npm install
npm run build
php artisan serve
```

Seeder hanya mengisi empat role. Tidak ada user contoh yang dibuat oleh `DatabaseSeeder` saat ini.

`composer run setup` melakukan install dependency, membuat `.env` jika belum ada, generate key, migration paksa, lalu `npm install` dan build. Periksa konfigurasi database sebelum menggunakannya.

## Docker

Dari root `PKSPL-Project-Backend/`:

```bash
docker compose up --build
```

<<<<<<< HEAD
Service yang dibawa compose: PHP app, Nginx (`localhost:8000`), PostgreSQL 15 (`localhost:5432`), dan pgAdmin (`localhost:8081`). Volume source mengarah ke `./src`; dependency PHP/konfigurasi aplikasi tetap perlu disiapkan sesuai langkah lokal bila image belum menyediakannya.
=======
Service yang dibawa compose: PHP app, Nginx (`localhost:8000`), PostgreSQL + PostGIS (`localhost:5433`), dan Adminer (`localhost:8081`). Volume source mengarah ke `./src`; dependency PHP/konfigurasi aplikasi tetap perlu disiapkan sesuai langkah lokal bila image belum menyediakannya.
>>>>>>> ff7df9ec17581839afda962a0b1dc955b278fcac

## Test

```bash
composer run test
# atau
php artisan test
```

Test yang ada saat dokumentasi ini dibuat hanya example unit/feature test Laravel; belum ada coverage domain/API.
