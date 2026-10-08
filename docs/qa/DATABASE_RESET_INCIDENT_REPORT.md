# DATABASE RESET INCIDENT REPORT

**Tanggal Incident**: 8 Oktober 2026  
**Status**: Investigasi Selesai (Read-Only Mode) — Menunggu Instruksi Recovery User  
**Aplikasi**: PKSPL IPB University (Valuasi Ekonomi Ekosistem Pesisir)  
**Lingkungan**: Development (Docker PostgreSQL Container `pkspl-postgres`)  

---

## 1. Kondisi Sebelum Incident

Sebelum kejadian reset terjadi, database PostgreSQL `pkspl` berisi data operasional dan master data lengkap yang mencakup:
- **Akun Pengguna**: Super Admin (`admin@gmail.com`), Peneliti (`peneliti@gmail.com`), Peneliti PT Antam, Tamu, dan peneliti demo lainnya.
- **Master Data & Wilayah**: Data Provinsi, Kabupaten/Kota, Kecamatan, Desa/Kelurahan, serta Batas Administratif (Spatial GeoJSON/PostGIS).
- **Modul Valuasi**: Ekosistem pesisir, Metode Valuasi (TCM, CVM, HQ, EOP, DUV, CE, HPM, dll.), Jasa Ekosistem (Provisioning, Regulating, Cultural, Supporting).
- **Data Proyek & Analisis**: Proyek penelitian valuasi, data tutupan lahan, hasil kalkulasi TEV, histori analisis AI, serta percakapan/pesan tim.

---

## 2. Kondisi Sekarang (Audit Database Snapshot)

Berdasarkan audit *read-only* langsung terhadap schema PostgreSQL `public` pada tanggal **8 Oktober 2026 21:09 WIB**:

- **Total Tabel**: 63 tabel
- **Tabel `migrations`**: 52 rows (Seluruh 52 berkas migrasi terdaftar)
- **Tabel `users`**: 1 row (ID 28, Created: `2026-10-08 14:05:00 UTC`)
- **Tabel `roles`**: 1 row (ID 2, Created: `2026-10-08 14:05:00 UTC`)
- **Tabel `proyek`**: 1 row (ID 15, Created: `2026-10-08 14:05:00 UTC`)
- **Tabel `sessions`**: 1 row
- **Seluruh 58 Tabel Data Lainnya**: **0 rows** (Kosong total)

*Seluruh data lama terhapus dan digantikan oleh 1 baris sisa data transient bertimestamp `14:05:00 UTC`.*

---

## 3. Database Aktif

Hasil verifikasi koneksi backend secara langsung:
- **DB_CONNECTION**: `pgsql`
- **DB_HOST**: `postgres` (Host internal Docker container `pkspl-postgres`)
- **DB_PORT**: `5432` (Internal Docker) / `5433` (Host Port Mapping)
- **DB_DATABASE**: `pkspl`
- **DB_USERNAME**: `pkspl`
- **Schema**: `public`
- **Database Size**: `23,671,267 bytes` (~23.6 MB)

Database yang digunakan aplikasi saat ini **SAMA** dengan database utama PostgreSQL sebelum insiden. Tidak ada perpindahan nama database atau pergeseran host.

---

## 4. Evidence Reset & Timestamp Analysis

1. **Kesesuaian Timestamp**:
   - Seluruh baris data tersisa pada tabel `users` (ID 28), `roles` (ID 2), dan `proyek` (ID 15) memiliki timestamp persis:  
     `created_at = 2026-10-08 14:05:00 UTC`
2. **Kemunculan Nama Random ("Rusty Bogisich", "nia16@example.net")**:
   - Nama-nama seperti *"Rusty Bogisich"* atau *"nia16@example.net"* merupakan data dummy acak yang dihasilkan oleh library `fakerphp/faker` saat metode `User::factory()->create()` dipanggil oleh berkas unit/feature test Laravel.

---

## 5. Root Cause (Akar Masalah)

Akar masalah ter-resetnya database adalah **eksekusi pengujian otomatis PHPUnit (`php artisan test`) di dalam kontainer Docker `pkspl-app`**.

**Detail Kronologi**:
1. Berkas-berkas pengujian pada backend (seperti `GoogleOAuthTest.php`, `ProyekApiTest.php`, `ReviewCrudTest.php`, `UserManagementAccessTest.php`, `ReviewCommentTest.php`, `BoundaryLookupTest.php`, dll.) mengimpor trait Laravel:
   ```php
   use Illuminate\Foundation\Testing\RefreshDatabase;
   ```
2. Saat command `docker exec pkspl-app php artisan test` dijalankan di dalam kontainer `pkspl-app`, environment yang dibaca oleh Laravel di dalam kontainer tetap terhubung ke PostgreSQL utama (`DB_CONNECTION=pgsql`, `DB_DATABASE=pkspl`).
3. Trait `RefreshDatabase` secara otomatis mengeksekusi `migrate:fresh` terhadap koneksi PostgreSQL `pkspl`.
4. Command `migrate:fresh` tersebut menghapus (*drop*) seluruh tabel pada schema PostgreSQL `public` dan merekonstruksi ulang tabel dari berkas-berkas migration dari nol, kemudian menjalankan tes yang meninggalkan sisa data transient.

---

## 6. Trigger (Command / Script Pemicu)

- **Command Pemicu**: `docker exec pkspl-app php artisan test`
- **Eksekutor**: Pengujian unit/feature test otomatis pada kontainer backend.
- **Mekanisme**: Trait `RefreshDatabase` mengeksekusi `php artisan migrate:fresh` pada koneksi database aktif (`pkspl`).

---

## 7. Affected Tables (Daftar Tabel Terdampak)

Seluruh 63 tabel pada schema `public` terdampak (di-drop dan di-recreate), antara lain:
- `users` (Data user lama terhapus)
- `roles` (Terdampak)
- `proyek` (Data proyek terhapus)
- `administrative_boundaries` (Data spasial terhapus)
- `provinsi`, `kabupaten_kota`, `kecamatan`, `desa_kelurahan` (Data wilayah terhapus)
- `ekosistem`, `jasa_ekosistem`, `metode_valuasi` (Data master valuasi terhapus)
- `hasil_valuasi`, `valuasi_ekosistems`, `valuasi_kategori_jasas`, `valuasi_item_valuasis` (Data kalkulasi TEV terhapus)
- `conversations`, `messages`, `review_comments`, `reviews` (Data diskusi terhapus)
- `activity_logs`, `histori`, `analisis_ai` (Data riwayat terhapus)

---

## 8. Data yang Masih Bisa Dipulihkan / Sumber Pemulihan

Seluruh struktur schema database dan berkas pemulihan seeder **TERSEDIA LENGKAP DAN UTUH 100%** di dalam repository codebase:

1. **Master Seeders Resmi**:
   - `DatabaseSeeder.php`: Memanggil seluruh rantai seeder resmi aplikasi.
   - `KotaBogorAndGlobalMasterSeeder.php`: Berisi data master lengkap 9-step valuasi, batas wilayah Kota Bogor, dan proyek contoh.
   - `UserSeeder.php`: Berisi akun resmi `admin@gmail.com`, `peneliti@gmail.com`, `peneliti.antam@pkspl.ipb.ac.id`, `guest@gmail.com`, dll.
   - `AdministrativeBoundarySeeder.php`: Berisi data spasial GeoJSON batas wilayah level 1, 2, 3.
   - `MetodeValuasiSeeder.php`, `JasaEkosistemSeeder.php`, `EkosistemSeeder.php`, `ValuationSeeder.php`, `ChatSeeder.php`.

2. **File PostGIS Dump**:
   - `PKSPL-Backend/docker/postgres/initdb/01-postgis.sql` (Inisialisasi ekstensi PostGIS).

---

## 9. Recovery Plan (Rencana Pemulihan Paling Aman)

Apabila disetujui oleh User, pemulihan database dapat dilakukan secara bersih dan lengkap melalui langkah berikut:

1. **Jalankan Seeder Lengkap**:
   ```bash
   docker exec pkspl-app php artisan db:seed
   ```
   *Atau jika diperlukan seeding spesifik:*
   ```bash
   docker exec pkspl-app php artisan db:seed --class=KotaBogorAndGlobalMasterSeeder
   ```
2. **Verifikasi Data**:
   Memastikan akun `admin@gmail.com` (Super Admin) dan `peneliti@gmail.com` (Peneliti) beserta seluruh data 9-step valuasi dan wilayah terisi kembali.

---

## 10. Prevention (Pencegahan Agar Tidak Terulang)

1. **Isolasi Database Testing**:
   Mengonfigurasi `phpunit.xml` atau `.env.testing` agar pengujian `php artisan test` **WAJIB** menggunakan database terpisah (SQLite memory `:memory:` atau PostgreSQL khusus test `pkspl_testing`), sehingga `RefreshDatabase` tidak akan pernah menyentuh database development/produksi `pkspl`.
2. **Safety Guard pada `TestCase.php`**:
   Menambahkan proteksi di `tests/TestCase.php` yang akan membatalkan pengujian (*throw exception*) jika `DB_DATABASE` yang terdeteksi adalah `pkspl`.

---

> [!IMPORTANT]
> **Status Saat Ini**: Sesuai instruksi, **TIDAK ADA** perubahan data, restore, atau command mutasi yang dijalankan. Sistem berada dalam kondisi *Read-Only*. Antigravity menunggu instruksi/persetujuan dari USER sebelum melakukan langkah pemulihan (Recovery).
