# LAPORAN AUDIT KUALITAS PERANGKAT LUNAK (QA AUDIT REPORT)
## Sistem Valuasi Ekonomi Sumber Daya Pesisir dan Laut — PKSPL IPB University
**Versi Dokumen:** 1.0.0  
**Tanggal Audit:** 1 Oktober 2026  
**Auditor / Tim QA:** Senior QA Engineer & Software Quality Audit Team  
**Status Laporan:** Initial Baseline Quality Audit (Non-destructive, Pre-fix)  

---

## DAFTAR ISI
1. [Executive Summary](#1-executive-summary)
2. [Inventaris Modul dan Role](#2-inventaris-modul-dan-role)
3. [Daftar Temuan Bug (QA-XXX)](#3-daftar-temuan-bug-qa-xxx)
4. [Analisis Kekurangan Fitur (Feature Gap Matrix)](#4-analisis-kekurangan-fitur-feature-gap-matrix)
5. [Hasil Pengujian Otomatis dan Statis](#5-hasil-pengujian-otomatis-dan-statis)
6. [Audit Keamanan dan Ketahanan Sistem](#6-audit-keamanan-dan-ketahanan-sistem)
7. [Audit Skema Database dan Integrasi API](#7-audit-skema-database-dan-integrasi-api)
8. [Audit Khusus Perhitungan Valuasi Ekonomi](#8-audit-khusus-perhitungan-valuasi-ekonomi)
9. [Analisis Risiko Regresi (Regression Risk)](#9-analisis-risiko-regresi-regression-risk)
10. [Rencana Prioritas Perbaikan Bertahap (Remediation Roadmap)](#10-rencana-prioritas-perbaikan-bertahap-remediation-roadmap)
11. [Rencana Pengujian Regresi Berkelanjutan](#11-rencana-pengujian-regresi-berkelanjutan)
12. [Batasan Audit (Audit Limitations)](#12-batasan-audit-audit-limitations)

---

## 1. EXECUTIVE SUMMARY

Pusat Kajian Sumberdaya Pesisir dan Lautan Institut Pertanian Bogor (PKSPL IPB) mengembangkan Sistem Valuasi Ekonomi Sumber Daya Pesisir dan Laut sebagai platform terpadu untuk digitalisasi, standardisasi, dan otomatisasi valuasi ekonomi ekosistem pesisir (Total Economic Value / TEV, Benefit-Cost Ratio / BCR, Net Present Value / NPV).

Audit kualitas perangkat lunak ini dilakukan secara menyeluruh dan **tanpa mengubah kode (strictly read-only / evidence-based)** pada lingkungan pengujian aktif (Docker containerization: PHP 8.3-FPM, PostgreSQL 16 + PostGIS 3.4, Nginx, Laravel Reverb WebSocket, Node.js v24 / React 18 / Vite 5).

### Ringkasan Status Sistem:
| Komponen | Status Evaluasi | Catatan Kritis |
|---|---|---|
| **Frontend Build (Vite 5)** | **PASS** | Bundle sukses dibangun dalam 24.19s, namun menghasilkan bundle monolitik 2.71 MB JS (perlu code-splitting). |
| **Backend Test Suite (PHPUnit)** | **FAIL (CRITICAL)** | **42 test GAGAL**, 54 test LULUS dari total 96 test (tingkat kegagalan 43.75%). Disebabkan desinkronisasi skema migrasi terakhir terhadap test suite. |
| **Autentikasi & RBAC** | **CRITICAL RISK** | Terdapat **25+ endpoint API (termasuk audit log admin, master data global, dan modul valuasi) terbuka untuk publik tanpa autentikasi Sanctum**. |
| **Konsistensi Role Pengguna** | **DESYNCHRONIZED** | Migrasi `2026_09_29_000001` telah menghapus role `Analyst` dan kolom `proyek.status`, namun controller `ReviewService`, `ReviewPolicy`, dan test suite masih memanggil entitas tersebut. |
| **Integritas Data Valuasi** | **HIGH RISK** | Spreadsheet valuasi peneliti (Tahap 06) mengandalkan `localStorage` browser. Sinkronisasi dua arah ke backend tidak melakukan rehidrasi (data hilang jika ganti device/hapus cache). |
| **Akurasi Perhitungan Valuasi** | **MEDIUM RISK** | Terdapat disparitas metodologis: backend memodelkan TCM sebagai regresi surplus konsumen (Poisson/OLS), sedangkan frontend menghitungnya sebagai total belanja bruto pengunjung. Nilai TEV pada landing page dan statistik masih menggunakan *hardcoded match*. |
| **Database & Spasial** | **STABLE (SEED RESTORED)** | Tabel PostgreSQL + PostGIS aktif, 7.231 batas administratif (Provinsi, Kab/Kota, Kecamatan) terisi lengkap. |

---

## 2. INVENTARIS MODUL DAN ROLE

### 2.1 Matriks Role Pengguna
Berdasarkan pemeriksaan langsung pada tabel database `roles` dan model `Role.php`:
- **Role Terdaftar di Database Aktif:**
  1. `Super Admin` (id_role: 1) — Hak akses penuh terhadap modul administrasi, master data, monitoring proyek, dan komunikasi.
  2. `Peneliti` (id_role: 2) — Hak akses terhadap 9-tahap workflow valuasi proyek, pengelolaan peta, input data, dan ekspor laporan.
  3. `Guest` (id_role: 3) — Hak akses pengunjung untuk melihat landing page dan sebaran proyek publik.
- **Status Role `Analyst`:**
  Per migrasi `2026_09_29_000001_remove_analyst_role_and_project_status.php`, role `Analyst` telah **dihapus dari database**, tabel `validasi_analyst` di-drop, dan route frontend `/analyst/*` dialihkan ke `/login`. Namun sisa kode backend pada modul review masih menyisakan dependensi ke peran ini.

### 2.2 Inventaris Modul dan Status Implementasi

| No | Modul | Route Frontend | Endpoint Backend Utama | Status Implementasi | Catatan Kualitas & QA |
|---|---|---|---|---|---|
| **1** | Autentikasi & Sesi | `/login`, `/register`, `/forgot-password`, `/auth/callback` | `POST /api/v1/auth/login`, `POST /api/v1/auth/register`, `GET /api/v1/auth/google/callback` | **Tersedia & Berfungsi** | Mendukung Sanctum token dan Google OAuth. Password di-hash bcrypt. Kredensial Google OAuth tercantum di `.env`. |
| **2** | Profil & Presence | Modal Profil | `POST /api/v1/profile`, `POST /api/v1/profile/password`, `POST /api/v1/profile/presence` | **Tersedia & Berfungsi** | Heartbeat realtime tersambung ke WebSocket Reverb. |
| **3** | Admin Dashboard | `/admin/dashboard` | `GET /api/v1/admin/analytics/overview`, `GET /api/v1/statistics` | **Tersedia (Bypassed Auth)** | Menampilkan grafik tren valuasi. Endpoint analytics terbuka tanpa auth. |
| **4** | Admin Master Data | `/admin/master-data` | `GET/POST/PUT/DELETE /api/v1/admin/master-data` | **Tersedia (Bypassed Auth)** | CRUD data master global multi-wilayah. Endpoint tidak dilindungi token Sanctum (Broken Access Control). |
| **5** | Admin Manajemen User | `/admin/users` | `GET/POST/PUT/DELETE /api/v1/users` | **Tersedia & Berfungsi** | Dilindungi middleware `auth:sanctum` & `role:Super Admin`. Badge sidebar menampilkan nilai statis `'38'`. |
| **6** | Admin Manajemen Proyek | `/admin/projects` | `GET /api/v1/proyek` | **Tersedia & Berfungsi** | Super Admin dapat memantau seluruh portofolio proyek. Badge sidebar statis `'18'`. |
| **7** | Admin Riwayat Aktivitas | `/admin/activity` | `GET/POST /api/v1/admin/activity-logs` | **Tersedia (Data Leakage)** | Terbuka untuk umum tanpa login. Membocorkan email, nama, IP address, dan user agent ke publik. |
| **8** | Admin Verifikasi Data | `/admin/verifikasi-data` | *Tidak ada* | **FITUR BELUM SELESAI (BLANK)** | File `VerifikasiDataPage.jsx` hanya berisi stub kosong `<div id="verifikasi-data-page">`. |
| **9** | Admin Kebijakan | `/admin/kebijakan` | *Tidak ada* | **FITUR BELUM SELESAI (BLANK)** | File `KebijakanPage.jsx` hanya berisi stub kosong `<div id="kebijakan-page">`. |
| **10** | Admin Pusat Pesan | `/admin/messages` | `GET /api/v1/conversations`, WebSocket | **Tersedia & Berfungsi** | Komunikasi realtime dengan Peneliti berbasis WebSocket Reverb. |
| **11** | Peneliti: Proyek List | `/peneliti/projects` | `GET/POST /api/v1/proyek` | **Tersedia & Berfungsi** | Peneliti terisolasi hanya dapat melihat proyek miliknya (IDOR protection aktif). |
| **12** | Peneliti Tahap 01: Info | `/peneliti/projects/:id` | `GET/PUT /api/v1/proyek/{id}` | **Tersedia & Berfungsi** | Metadata lokasi, luas, koordinat, dan tahun riset tersimpan ke DB. |
| **13** | Peneliti Tahap 02: Peta GIS | `/peneliti/projects/:id/maps` | `GET /api/v1/boundary-lookup`, `PUT /api/v1/proyek/{id}` | **Tersedia & Berfungsi** | Integrasi Leaflet + shpjs. Poligon disimpan di IndexedDB lokal browser, centroid dikirim ke backend. |
| **14** | Peneliti Tahap 03: Indeks | `/peneliti/projects/:id/index` | `GET/POST /api/v1/indexes` | **Tersedia & Berfungsi** | Penghubungan poligon tutupan lahan dengan kode indeks lingkungan. |
| **15** | Peneliti Tahap 04: Data Master | `/peneliti/projects/:id/data-master` | `GET/POST /api/v1/proyek/{id}/data-master` | **Tersedia & Berfungsi** | Konfigurasi harga pasar komoditas berbasis wilayah kajian. |
| **16** | Peneliti Tahap 05: Jasa & Metode | `/peneliti/projects/:id/services-methods` | `GET/PUT /api/v1/jenis-tutupan-lahan/{id}/valuation/configs` | **Tersedia & Berfungsi** | Konfigurasi matriks 4 jasa ekosistem (Provisioning, Regulating, Supporting, Cultural). |
| **17** | Peneliti Tahap 06: Data Valuasi | `/peneliti/projects/:id/valuation-data` | `GET/POST/PUT/DELETE /api/v1/jenis-tutupan-lahan/{id}/valuation/rows` | **Tersedia (Storage Disconnect)** | UI spreadsheet dinamis sangat baik, tetapi data disimpan di `localStorage`. Fungsi rehidrasi backend tidak mengisi store lokal. |
| **18** | Peneliti Tahap 07: Kalkulasi | `/peneliti/projects/:id/calculation` | `GET /api/v1/proyek/{id}/economic-valuation` | **Tersedia & Berfungsi** | Kalkulasi matriks TEV, DUV, IUV, SUV, dan formula per baris. |
| **19** | Peneliti Tahap 08: Analitik | `/peneliti/projects/:id/analytics` | `GET /api/v1/proyek/{id}/valuation/analytics` | **Tersedia & Berfungsi** | Visualisasi Recharts (distribusi jasa, radar, pie chart). |
| **20** | Peneliti Tahap 09: Review & Laporan | `/peneliti/projects/:id/review` | `exportFullProjectWorkbook` (xlsx) | **Tersedia (Workflow Terpotong)** | Pratinjau laporan dan ekspor Excel bekerja. Alur kirim ke Analyst diganti tombol chat ke Super Admin. |
| **21** | Peneliti: Pusat Pesan | `/peneliti/projects/:id/messages` | `GET /api/v1/conversations`, WebSocket | **Tersedia & Berfungsi** | Ruang obrolan langsung dengan Super Admin terintegrasi. |
| **22** | Modul Publik: Landing & Map | `/` | `GET /api/v1/public/projects/map`, `GET /api/v1/statistics` | **Tersedia (Hardcoded values)** | Peta interaktif publik dan statistik nasional. Menggunakan nilai mock match hardcoded di controller. |
| **23** | Layanan AI Terpadu | *Internal Service* | `POST /api/v1/ai/generate`, `POST /api/v1/ai/health` | **Tersedia** | Integrasi Gemini AI SDK untuk bantuan interpretasi valuasi. |

---

## 3. DAFTAR TEMUAN BUG (QA-XXX)

---

### Bug QA-001
- **Judul:** Broken Access Control — Endpoint Master Data Global dan Log Aktivitas Admin Terbuka untuk Publik Tanpa Autentikasi
- **Modul:** Super Admin (Master Data & Activity Log) / Backend Routing
- **Role Terdampak:** Super Admin, Seluruh Pengguna Sistem
- **Severity:** **Critical**
- **Priority:** **P0**
- **Status:** **Confirmed**
- **Lingkungan:** Docker Local / Production Reverse Proxy (Port 8000)
- **Precondition:** Layanan backend aktif tanpa token autentikasi.
- **Langkah Reproduksi:**
  1. Buka terminal atau peramban tanpa login (unauthenticated).
  2. Jalankan request: `curl.exe -i http://localhost:8000/api/v1/admin/master-data`
  3. Jalankan request: `curl.exe -i http://localhost:8000/api/v1/admin/activity-logs`
  4. Jalankan request: `curl.exe -i http://localhost:8000/api/v1/admin/analytics/overview`
- **Expected Result:** Server menolak request dengan respons HTTP `401 Unauthorized`.
- **Actual Result:** Server mengembalikan HTTP `200 OK` dan membocorkan seluruh data master (301 data komoditas) serta log aktivitas lengkap termasuk alamat email peneliti, alamat IP, user agent, dan waktu sesi.
- **Bukti:**
  Response dari `GET /api/v1/admin/activity-logs`:
  ```json
  {"userName":"Bima Saputra","userEmail":"peneliti@gmail.com","ipAddress":"182.253.14.82","userAgent":"Chrome 128 (Windows 11)"}
  ```
- **Dugaan Penyebab:** Pada berkas `PKSPL-Backend/src/routes/api.php` baris 49–65, rute `admin/activity-logs`, `admin/analytics/overview`, dan `admin/master-data` ditempatkan di luar grup middleware `Route::middleware('auth:sanctum')`.
- **Dampak:** Ancaman keamanan privasi data (kebocoran PII), celah manipulasi data jika request `POST`/`PUT`/`DELETE` dieksekusi oleh pihak tidak berwenang.
- **Rekomendasi:** Pindahkan seluruh rute administratif ke dalam grup `Route::middleware(['auth:sanctum', 'role:Super Admin'])`.
- **Regression Test:** Jalankan request unauthenticated dan pastikan status `401`, kemudian request dengan token Peneliti dan pastikan status `403 Forbidden`, lalu request dengan token Super Admin dan pastikan `200 OK`.

---

### Bug QA-002
- **Judul:** Broken Access Control — Endpoint CRUD Master Wilayah, Jasa Ekosistem, dan Modul Valuasi Tanpa Proteksi Sanctum
- **Modul:** Geographic & Ecosystem Master Data / Backend Routing
- **Role Terdampak:** Seluruh Role
- **Severity:** **Critical**
- **Priority:** **P0**
- **Status:** **Confirmed**
- **Lingkungan:** Docker Local / Staging
- **Precondition:** Layanan backend aktif.
- **Langkah Reproduksi:**
  1. Kirim request tanpa token: `curl.exe -i -X POST http://localhost:8000/api/v1/roles -H "Content-Type: application/json" -d "{\"nama_role\":\"Test\"}"`
  2. Kirim request tanpa token: `curl.exe -i http://localhost:8000/api/v1/valuation-modules`
- **Expected Result:** Server menolak request dengan status HTTP `401 Unauthorized`.
- **Actual Result:** Server memproses request (mengembalikan `422 Unprocessable Content` karena validasi data, bukan `401 Unauthorized`), membuktikan bahwa lapisan keamanan autentikasi dilewati sepenuhnya. Untuk `valuation-modules`, server mengembalikan `200 OK` berisi daftar seluruh modul valuasi internal.
- **Bukti:** `PKSPL-Backend/src/routes/api.php` baris 131, 151, 157, 163, 169, 207, 230, 236, 242, 248, 254, 265, 271, dan `routes/api_valuation.php` baris 16–22 dideklarasikan langsung di bawah `Route::prefix('v1')`.
- **Dugaan Penyebab:** Deklarasi `Route::apiResource` tidak dibungkus oleh grup middleware autentikasi.
- **Dampak:** Pihak luar dapat mengubah, menambah, atau menghapus master data ekosistem, jenis tutupan lahan, metode valuasi, dan data benefit/cost proyek.
- **Rekomendasi:** Masukkan seluruh endpoint modifikasi (POST, PUT, PATCH, DELETE) ke dalam middleware `auth:sanctum` dengan restriksi peran yang sesuai.
- **Regression Test:** Uji seluruh endpoint `apiResource` dengan variasi status autentikasi.

---

### Bug QA-003
- **Judul:** Kegagalan Massal 42 Automated Feature & Unit Tests Akibat Desinkronisasi Skema Database dan UserFactory
- **Modul:** Testing Suite / Backend CI
- **Role Terdampak:** Pengembang, QA Automation, CI/CD Pipeline
- **Severity:** **High**
- **Priority:** **P1**
- **Status:** **Confirmed**
- **Lingkungan:** Docker Local (`php artisan test`)
- **Precondition:** Menjalankan `docker compose exec app php artisan test`.
- **Langkah Reproduksi:**
  1. Masuk ke root direktori proyek.
  2. Jalankan perintah test: `docker compose -f PKSPL-Backend/docker-compose.yml exec app php artisan test`
- **Expected Result:** Seluruh 96 automated tests lulus (`PASS`).
- **Actual Result:** 42 test GAGAL dengan pesan kesalahan QueryException:
  - `SQLSTATE[23502]: Not null violation: null value in column "id_role" of relation "users"`
  - `SQLSTATE[42703]: Undefined column: column "status" of relation "proyek" does not exist`
  - `ErrorException: Undefined variable $analyst at tests/Feature/Chat/ChatApiTest.php:278`
- **Bukti:** Output eksekusi test pada log `task-28`:
  ```text
  Tests: 42 failed, 54 passed (237 assertions)
  Duration: 41.67s
  ```
- **Dugaan Penyebab:**
  1. `UserFactory.php` tidak menyertakan `id_role` secara default, padahal kolom `users.id_role` memiliki constraint `NOT NULL`.
  2. `ProyekFactory.php` mencoba mengisi kolom `status`, yang sudah dihapus oleh migrasi `2026_09_29_000001`.
  3. Berkas `tests/Feature/Chat/ChatApiTest.php` pada baris 278 memanggil `$this->actingAs($analyst)`, di mana variabel `$analyst` belum didefinisikan.
- **Dampak:** Pipeline CI/CD tidak dapat memverifikasi keabsahan build, risiko regresi tidak terdeteksi secara otomatis.
- **Rekomendasi:** Perbarui `UserFactory`, `ProyekFactory`, dan test cases agar selaras dengan skema database terkini.
- **Regression Test:** Jalankan `php artisan test` dan pastikan 100% assertions lulus.

---

### Bug QA-004
- **Judul:** Crash HTTP 500 / QueryException pada Alur Review Proyek Akibat Akses Kolom `proyek.status` yang Telah Dihapus
- **Modul:** Review Module / ReviewService
- **Role Terdampak:** Peneliti, Super Admin
- **Severity:** **High**
- **Priority:** **P1**
- **Status:** **Confirmed**
- **Lingkungan:** Backend API
- **Precondition:** Peneliti mencoba mengajukan dataset melalui endpoint `POST /api/v1/proyek/{proyek}/submit`.
- **Langkah Reproduksi:**
  1. Login sebagai Peneliti.
  2. Buka proyek dan kirim permintaan POST ke `/api/v1/proyek/{id}/submit`.
- **Expected Result:** Dataset berstatus submitted dan tersimpan ke database.
- **Actual Result:** Terjadi `QueryException`: `SQLSTATE[42703]: Undefined column: 7 ERROR: column "status" of relation "proyek" does not exist`.
- **Bukti:** Ditemukan pada `PKSPL-Backend/src/app/Services/Review/ReviewService.php` baris 28:
  ```php
  $proyek->status = 'Submitted';
  $proyek->save();
  ```
  dan baris 49:
  ```php
  if ($proyek->status !== 'Submitted') { ... }
  ```
- **Dugaan Penyebab:** Migrasi `2026_09_29_000001_remove_analyst_role_and_project_status.php` menghapus kolom `status` dari tabel `proyek`, tetapi logika bisnis di `ReviewService.php` belum disesuaikan.
- **Dampak:** Alur pengajuan review proyek mengalami kegagalan total di tingkat database.
- **Rekomendasi:** Sesuaikan `ReviewService` untuk menyimpan status review langsung pada tabel `reviews` (bukan pada entitas `proyek`), atau komunikasikan dengan arsitek sistem apakah kolom status proyek perlu dikembalikan.
- **Regression Test:** Uji endpoint `submit` dan pastikan tidak ada eksekusi query ke kolom `proyek.status`.

---

### Bug QA-005
- **Judul:** Fatal Error / Reference to Undefined Class `App\Models\Review\Review` pada `ReviewPolicy.php`
- **Modul:** Authorization Policy / Review
- **Role Terdampak:** Super Admin, Peneliti
- **Severity:** **High**
- **Priority:** **P1**
- **Status:** **Confirmed**
- **Lingkungan:** Backend PHP 8.3
- **Precondition:** Route otorisasi memanggil `ReviewPolicy`.
- **Langkah Reproduksi:**
  1. Jalankan pengujian atau request yang memicu `authorize('view', $review)` pada `ReviewController`.
- **Expected Result:** Otorisasi mengevaluasi izin pengguna terhadap instance model `App\Models\Review`.
- **Actual Result:** PHP menghentikan eksekusi karena class `App\Models\Review\Review` tidak ditemukan.
- **Bukti:** Pada `PKSPL-Backend/src/app/Policies/Review/ReviewPolicy.php` baris 7 tertulis:
  ```php
  use App\Models\Review\Review;
  ```
  padahal lokasi model yang sesungguhnya berada di `App\Models\Review`.
- **Dugaan Penyebab:** Kesalahan penulisan namespace pada proses refaktorisasi modul review.
- **Dampak:** Gagalnya otorisasi pada seluruh aksi view, update, resolve, reopen, dan close review.
- **Rekomendasi:** Koreksi namespace import menjadi `use App\Models\Review;`.
- **Regression Test:** Jalankan `Tests\Unit\Policy\ReviewPolicyTest`.

---

### Bug QA-006
- **Judul:** Putusnya Rehidrasi Data Spreadsheet Valuasi (Tahap 06) Mengakibatkan Risiko Kehilangan Data Antar-Sesi
- **Modul:** Peneliti Workflow (Tahap 06 Data Valuasi & SpreadsheetContext)
- **Role Terdampak:** Peneliti
- **Severity:** **High**
- **Priority:** **P1**
- **Status:** **Confirmed**
- **Lingkungan:** Frontend React SPA
- **Precondition:** Peneliti mengisi data baris spreadsheet pada satu perangkat/browser.
- **Langkah Reproduksi:**
  1. Peneliti mengisi 10 baris data jasa penyediaan flora pada proyek baru.
  2. Buka aplikasi pada peramban lain, mode incognito, atau bersihkan `localStorage` browser.
  3. Buka kembali halaman Tahap 06 Data Valuasi pada proyek yang sama.
- **Expected Result:** Frontend mengambil dan merehidrasi baris-baris data dari tabel `valuation_rows` di backend database.
- **Actual Result:** Halaman spreadsheet kembali kosong (0 baris). Data yang telah diinput hilang dari pandangan pengguna.
- **Bukti:** Pada berkas `PKSPL-Project-Frontend/src/peneliti/context/SpreadsheetContext.tsx` baris 153–158:
  ```typescript
  const result = await getValuationRows(landCoverId, { service_id: serviceId, method_id: methodId, biota });
  // We don't overwrite local store completely to keep it simple, but we map the IDs if possible, 
  // or we just trust localStorage as primary for now in this offline-first setup.
  ```
  Respons dari API tidak pernah dimasukkan ke dalam state `store`, melainkan dibiarkan begitu saja.
- **Dugaan Penyebab:** Implementasi offline-first belum dilengkapi mekanisme rehidrasi sinkronisasi ke state React saat aplikasi dimuat.
- **Dampak:** Risiko kehilangan data penelitian yang bernilai tinggi, ketidakmampuan berkolaborasi lintas perangkat.
- **Rekomendasi:** Terapkan mekanisme penggabungan data (*rehydration merge strategy*) antara `localStorage` dan data resmi dari backend saat inisialisasi context.
- **Regression Test:** Uji pengisian data pada Browser A, verifikasi data muncul pada Browser B dengan akun yang sama.

---

### Bug QA-007
- **Judul:** Nilai Total Economic Value (TEV) pada Peta Publik dan Dashboard Statistik Menggunakan Nilai Match Hardcoded
- **Modul:** Public Landing Page & Statistics
- **Role Terdampak:** Publik, Tamu, Stakeholder PKSPL
- **Severity:** **Medium**
- **Priority:** **P2**
- **Status:** **Confirmed**
- **Lingkungan:** Backend API (`ProyekController` & `StatisticsController`)
- **Precondition:** Peneliti memperbarui nilai valuasi pada proyek ID 1 atau 4.
- **Langkah Reproduksi:**
  1. Lakukan perubahan nilai valuasi pada proyek tertentu di database.
  2. Buka landing page `/` atau panggil `GET /api/v1/public/projects/map`.
- **Expected Result:** Nilai TEV yang ditampilkan di peta dan kartu statistik mencerminkan hasil kalkulasi aktual dari database.
- **Actual Result:** Nilai TEV tetap tidak berubah karena diambil dari ekspresi `match ((int) $proyek->id_proyek)` yang di-hardcode di kode PHP.
- **Bukti:** Ditemukan pada `ProyekController.php` baris 129–141 dan `StatisticsController.php` baris 100–112:
  ```php
  $projTev = match ((int) $proyek->id_proyek) {
      1 => 58723271140,
      3 => 34200000000,
      4 => 48949677785,
      ...
      default => (int) round(((float) ($proyek->luas ?: 100)) * 38500000),
  };
  ```
- **Dugaan Penyebab:** Penggunaan nilai tiruan sementara untuk kebutuhan demo awal yang belum digantikan oleh query agregasi data valuasi riil.
- **Dampak:** Misinformasi data bagi publik dan pemangku kepentingan; perubahan data riset tidak terefleksi pada portal publik.
- **Rekomendasi:** Hubungkan kalkulasi TEV publik ke tabel agregasi valuasi (`valuasi_ekosistems` atau ringkasan hasil kalkulasi modul valuasi).
- **Regression Test:** Ubah data valuasi proyek dan pastikan angka di endpoint publik berubah secara dinamis.

---

### Bug QA-008
- **Judul:** Halaman Konsol Super Admin "Verifikasi Data" dan "Kebijakan" Berupa Komponen Kosong Tanpa Tampilan
- **Modul:** Super Admin Console
- **Role Terdampak:** Super Admin
- **Severity:** **Medium**
- **Priority:** **P2**
- **Status:** **Confirmed**
- **Lingkungan:** Frontend React SPA
- **Precondition:** Login sebagai Super Admin dan buka URL `/admin/verifikasi-data` atau `/admin/kebijakan`.
- **Langkah Reproduksi:**
  1. Masuk ke URL `http://localhost:5173/admin/verifikasi-data`.
  2. Masuk ke URL `http://localhost:5173/admin/kebijakan`.
- **Expected Result:** Halaman menampilkan antarmuka verifikasi laporan dan instrumen manajemen kebijakan.
- **Actual Result:** Layar putih kosong tanpa komponen visual atau pesan informatif.
- **Bukti:**
  - `PKSPL-Project-Frontend/src/admin/pages/VerifikasiDataPage.jsx`:
    ```jsx
    function VerifikasiDataPage() {
      return <div id="verifikasi-data-page" className="h-full">{/* Content will be added later */}</div>
    }
    ```
  - `PKSPL-Project-Frontend/src/admin/pages/KebijakanPage.jsx`:
    ```jsx
    function KebijakanPage() {
      return <div id="kebijakan-page" className="h-full">{/* Content will be added later */}</div>
    }
    ```
- **Dugaan Penyebab:** Halaman masih berstatus placeholder/stub yang belum diimplementasikan.
- **Dampak:** Fitur kendali mutu dan verifikasi data yang tercantum dalam dokumen kebutuhan belum dapat digunakan.
- **Rekomendasi:** Buat implementasi antarmuka verifikasi data atau tampilkan *empty state* / *under development state* yang jelas jika modul masih dalam tahap perancangan.
- **Regression Test:** Buka halaman dan pastikan rendering komponen berjalan normal dengan indikator status yang jelas.

---

### Bug QA-009
- **Judul:** Diskrepansi Matematis Senilai Rp 290.638 Antara Nilai Awal Mock dan Hasil Formula `calculateRow` pada Skema Flora
- **Modul:** Peneliti Workflow (Method Schema Flora)
- **Role Terdampak:** Peneliti
- **Severity:** **Medium**
- **Priority:** **P2**
- **Status:** **Confirmed**
- **Lingkungan:** Frontend React SPA
- **Precondition:** Peneliti membuka proyek template PRJ-004 pada Tahap 06 Data Valuasi.
- **Langkah Reproduksi:**
  1. Perhatikan baris 1 (Cemara Laut): Produktivitas = 33.18, Harga = Rp 3.231.311, Luas = 79.86 Ha.
  2. Nilai `totalNilai` awal tercatat: **Rp 8.562.456.960**.
  3. Lakukan double click lalu tekan Enter tanpa mengubah angka pada cell produktivitas atau harga.
- **Expected Result:** Nilai total tetap konsisten.
- **Actual Result:** Nilai total meloncat turun menjadi **Rp 8.562.166.322** (terjadi selisih Rp 290.638).
- **Bukti:**
  Perhitungan formula `calculateRow`:
  `vol = (33.18 * 79.86).toFixed(2) = 2649.75`
  `total = Math.round(2649.75 * 3231311) = 8.562.166.322`
  Namun `initialRows[0].totalNilai` di-hardcode ke `8562456960`.
- **Dugaan Penyebab:** Angka pada `initialRows` di-copy langsung dari draft dokumen laporan tanpa melalui evaluasi formula matematis sistem.
- **Dampak:** Nilai valuasi meloncat seketika saat baris diedit, menimbulkan kebingungan pada peneliti.
- **Rekomendasi:** Hitung ulang nilai awal `initialRows` menggunakan formula `calculateRow` agar seragam.
- **Regression Test:** Simulasikan edit baris tanpa perubahan nilai dan verifikasi stabilitas angka total.

---

### Bug QA-010
- **Judul:** Kredensial Nyata Google OAuth Client Secret dan Gemini API Key Tersimpan Plaintext di `.env`
- **Modul:** Environment & Secret Management
- **Role Terdampak:** Seluruh Sistem
- **Severity:** **Medium**
- **Priority:** **P1**
- **Status:** **Confirmed**
- **Lingkungan:** Backend Configuration
- **Precondition:** Memeriksa berkas `PKSPL-Backend/src/.env`.
- **Langkah Reproduksi:**
  1. Buka berkas `PKSPL-Backend/src/.env` baris 74 dan 80.
- **Expected Result:** Secret key dan token OAuth disimpan secara aman dalam secret manager atau environment deployment terisolasi, bukan plain text statis.
- **Actual Result:** Terdapat `GOOGLE_CLIENT_SECRET=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` dan `GEMINI_API_KEY=AQ.Ab8RN6J0B9...` dalam format plaintext.
- **Bukti:** Isi berkas `src/.env` baris 74 & 80.
- **Dampak:** Potensi penyalahgunaan kuota Google API atau Gemini API jika repositori dibagikan.
- **Rekomendasi:** Segera rotasi (*revoke & regenerate*) kredensial Google OAuth dan Gemini API Key, serta pastikan berkas `.env` masuk dalam `.gitignore`.
- **Regression Test:** Verifikasi autentikasi OAuth Google tetap berfungsi dengan kredensial baru.

---

### Bug QA-011
- **Judul:** Ukuran Bundle Frontend Monolitik Berukuran 2.71 MB JS Berpotensi Menurunkan Performa Awal (LCP/FCP)
- **Modul:** Frontend Build & Performance
- **Role Terdampak:** Seluruh Pengguna (khususnya koneksi mobile/lapangan)
- **Severity:** **Low**
- **Priority:** **P3**
- **Status:** **Confirmed**
- **Lingkungan:** Vite Production Build
- **Precondition:** Menjalankan `npm run build` pada folder `PKSPL-Project-Frontend`.
- **Langkah Reproduksi:**
  1. Jalankan `npm run build`.
- **Expected Result:** Bundle terpecah menjadi beberapa chunk modular (< 500 kB per chunk) menggunakan dynamic `import()`.
- **Actual Result:** Menghasilkan 1 file chunk raksasa: `dist/assets/index-B0xCosrD.js` berukuran **2.714 kB** (2.71 MB).
- **Bukti:** Peringatan Vite build:
  ```text
  dist/assets/index-B0xCosrD.js   2,714.04 kB │ gzip: 746.68 kB
  (!) Some chunks are larger than 500 kB after minification.
  ```
- **Dugaan Penyebab:** Seluruh halaman, pustaka pemetaan Leaflet, SheetJS (xlsx), Recharts, dan komponen admin di-import secara statis di `App.jsx` tanpa `React.lazy()`.
- **Dampak:** Waktu muat awal (*Initial Page Load*) menjadi lambat bagi pengguna dengan koneksi internet terbatas di wilayah pesisir.
- **Rekomendasi:** Terapkan `React.lazy()` dan `Suspense` untuk rute admin, modul peneliti, dan komponen spasial.
- **Regression Test:** Jalankan `npm run build` dan pastikan tidak ada chunk di atas 500 kB.

---

### Bug QA-012
- **Judul:** Hardcoded Badge Count pada Sidebar Super Admin Menampilkan Angka Palsu
- **Modul:** Super Admin Navigation (AdminSidebar)
- **Role Terdampak:** Super Admin
- **Severity:** **Low**
- **Priority:** **P3**
- **Status:** **Confirmed**
- **Lingkungan:** Frontend React SPA
- **Precondition:** Buka konsol Super Admin pada `/admin/dashboard`.
- **Langkah Reproduksi:**
  1. Perhatikan menu sidebar kiri pada item "Manajemen Pengguna" dan "Manajemen Proyek".
- **Expected Result:** Badge menampilkan jumlah riil user dan proyek dari database (misal: 10 pengguna, 11 proyek).
- **Actual Result:** Badge selalu menampilkan angka statis `'38'` untuk pengguna dan `'18'` untuk proyek.
- **Bukti:** Ditemukan pada `PKSPL-Project-Frontend/src/admin/components/AdminSidebar.jsx` baris 98 dan 104:
  ```jsx
  { title: 'Manajemen Pengguna', path: '/admin/users', badge: '38' },
  { title: 'Manajemen Proyek', path: '/admin/projects', badge: '18' },
  ```
- **Dugaan Penyebab:** Teks statis sisa fase prototyping UI.
- **Dampak:** Inkonsistensi data tampilan antarmuka dengan kondisi aktual sistem.
- **Rekomendasi:** Hubungkan properti badge dengan nilai count dinamis dari `userService` dan `projectService`.
- **Regression Test:** Verifikasi badge sidebar berubah dinamis sesuai jumlah record di database.

---

## 4. ANALISIS KEKURANGAN FITUR (FEATURE GAP MATRIX)

| Modul | Fitur yang Diharapkan | Kondisi Aktual | Kekurangan | Dampak | Prioritas |
|---|---|---|---|---|---|
| **Role & Workflow Analyst** | Validasi dan telaah dokumen oleh Analyst independen sebelum laporan diterbitkan. | Migrasi `2026_09_29_000001` telah menghapus peran Analyst, tabel `validasi_analyst`, dan kolom `proyek.status`. | Alur kerja review Analyst independen ditiadakan secara sistem; diganti dengan obrolan chat ke Super Admin. | Alur kendali mutu penelitian resmi tidak memiliki gerbang persetujuan formal terpisah. | **P1 (Perlu Konfirmasi Bisnis)** |
| **Super Admin Verifikasi** | Instrumen verifikasi metodologi dan validitas data valuasi oleh administrator. | File `VerifikasiDataPage.jsx` hanya berisi tag pembungkus kosong 10 baris. | Antarmuka dan backend verifikasi data belum diimplementasikan. | Super Admin tidak memiliki instrumen visual untuk memverifikasi keabsahan data laporan. | **P2** |
| **Super Admin Kebijakan** | Pengelolaan kebijakan ekonomi, batasan valuasi, dan regulasi pesisir. | File `KebijakanPage.jsx` hanya berisi tag pembungkus kosong 10 baris. | Antarmuka dan logika manajemen kebijakan belum diimplementasikan. | Fitur kebijakan tidak dapat diakses atau dioperasikan. | **P2** |
| **Spreadsheet Hydration** | Data valuasi baris spreadsheet (Tahap 06) tersimpan di cloud database dan tersinkronisasi saat login di perangkat apa pun. | Data baris spreadsheet hanya disimpan di `localStorage` peramban. API backend dipanggil tetapi hasilnya diabaikan. | Tidak ada mekanisme pemuatan data dari server ke antarmuka saat halaman dimuat. | Peneliti tidak dapat berganti laptop/perangkat kerja tanpa kehilangan data input spreadsheet. | **P1** |
| **Metode Valuasi TCM** | Perhitungan Consumer Surplus (CS) berbasis regresi ekonomi mikro ($CS = -1/\beta_1$). | Frontend menghitung TCM sebagai pengeluaran bruto ($Kunjungan \times Biaya$). Backend memiliki kalkulator regresi tersendiri. | Disparitas konsep ekonomi antara formula lembar kerja frontend dengan engine backend. | Nilai valuasi jasa budaya pariwisata memiliki deviasi metodologis signifikan antara frontend dan backend. | **P1** |
| **Manajemen Dokumen Laporan** | Pengarsipan versi laporan (*versioning*) dan penerbitan laporan bertanda tangan digital/QR Code. | Hanya tersedia pratinjau cetak browser (`ReportPrintView.tsx`) dan ekspor lembar kerja Excel (`xlsx`). | Belum ada generator PDF server-side, versioning dokumen, atau validasi tanda tangan elektronik. | Laporan akhir belum berformat dokumen resmi lembaga (PDF tersertifikasi). | **P2** |
| **Ekspor Data Agregat** | Ekspor rekapitulasi data valuasi tingkat provinsi/nasional untuk kebutuhan publikasi kebijakan. | Hanya tersedia ekspor per proyek individu. | Belum tersedia ekspor agregat portofolio nasional pada konsol Super Admin. | Super Admin harus mengekspor satu per satu proyek untuk analisis makro. | **P3** |

---

## 5. HASIL PENGUJIAN OTOMATIS DAN STATIS

### 5.1 Pengujian Backend (PHPUnit 12.5.12)
- **Waktu Eksekusi:** 1 Oktober 2026, 14:26 WIB
- **Total Test Cases:** 96 tests (237 assertions)
- **Status Akhir:** **FAIL (42 FAILED, 54 PASSED)**

#### Ringkasan per Kategori Pengujian:
| Test Suite | Total | Pass | Fail | Keterangan Masalah |
|---|---|---|---|---|
| `Tests\Unit\ExampleTest` | 1 | 1 | 0 | Baseline test |
| `Tests\Unit\GeminiResponseParserTest` | 10 | 10 | 0 | Parser JSON respon AI bekerja optimal |
| `Tests\Unit\Policy\ReviewPolicyTest` | 5 | 0 | 5 | Crash `Not null violation: id_role` pada UserFactory |
| `Tests\Unit\Review\AttachmentServiceTest` | 4 | 0 | 4 | Gagal membuat fixture User/Review |
| `Tests\Unit\Review\ReviewServiceTest` | 7 | 0 | 7 | Crash kolom `proyek.status` tidak ditemukan |
| `Tests\Unit\ServiceTevAndWilayahTest` | 2 | 1 | 1 | Validasi request field TEV & wilayah |
| `Tests\Unit\TevCalculatorTest` | 3 | 3 | 0 | **Formula kalkulasi TEV matematika lulus** |
| `Tests\Feature\Api\V1\BoundaryLookupTest` | 4 | 4 | 0 | **Lookup batas wilayah GeoJSON lulus** |
| `Tests\Feature\Api\V1\ProyekApiTest` | 6 | 6 | 0 | **CRUD proyek & unggah Shapefile zip lulus** |
| `Tests\Feature\Api\V1\PublicProjectsMapApiTest` | 3 | 2 | 1 | Kegagalan assertion pada public map |
| `Tests\Feature\Api\V1\StatisticsApiTest` | 1 | 1 | 0 | **Agregasi statistik landing page lulus** |
| `Tests\Feature\Auth\GoogleOAuthTest` | 3 | 1 | 2 | Assertion token redirect callback |
| `Tests\Feature\Chat\ChatApiTest` | 19 | 18 | 1 | Undefined variable `$analyst` pada baris 278 |
| `Tests\Feature\Review\DatasetSubmissionTest` | 3 | 0 | 3 | Crash kolom `proyek.status` tidak ditemukan |
| `Tests\Feature\Review\NotificationTest` | 5 | 3 | 2 | Crash dependensi review status |
| `Tests\Feature\Review\ReviewCommentTest` | 8 | 0 | 8 | Crash dependensi skema review |
| `Tests\Feature\Review\ReviewCrudTest` | 8 | 0 | 8 | Crash dependensi skema review |
| `Tests\Feature\User\UserManagementAccessTest` | 2 | 2 | 0 | **RBAC manajemen pengguna lulus** |
| `Tests\Feature\MasterWilayahControllerTest` | 1 | 1 | 0 | **Ketersediaan rute wilayah lulus** |
| `Tests\Feature\ExampleTest` | 1 | 1 | 0 | Baseline test |

---

### 5.2 Pengujian Frontend Build & Bundle
- **Tool:** Vite 5.4.21 / `@vitejs/plugin-react`
- **Hasil:** **PASS (Success)**
- **Waktu Build:** 24.19 detik
- **Output Artifacts:**
  - `dist/index.html`: 1.78 kB (gzip: 0.81 kB)
  - `dist/assets/index-ms1IMhUE.css`: 119.70 kB (gzip: 22.42 kB)
  - `dist/assets/index-B0xCosrD.js`: 2,714.04 kB (gzip: 746.68 kB)
- **Catatan Warning:** Ukuran chunk JavaScript melebihi ambang batas rekomendasi (500 kB).

---

## 6. AUDIT KEAMANAN DAN KETAHANAN SISTEM

### 6.1 Temuan Kerentanan Berdasarkan OWASP Top 10

1. **A01:2021 — Broken Access Control (Kritis)**
   - Sebanyak 25+ endpoint API v1 tidak memiliki middleware `auth:sanctum`.
   - Endpoint `GET/POST /api/v1/admin/activity-logs` dapat dibaca dan dimanipulasi oleh siapa saja di internet tanpa kredensial.
   - Endpoint `GET/POST/PUT/DELETE /api/v1/admin/master-data` dan `/api/v1/master-data` memungkinkan pihak luar mengubah katalog komoditas nasional.
   - Endpoint `apiResource` untuk `roles`, `provinsi`, `kabupaten-kota`, `kecamatan`, `desa-kelurahan`, `indexes`, `ekosistem`, dan modul valuasi terbuka tanpa autentikasi.

2. **A02:2021 — Cryptographic Failures & Information Exposure (Tinggi)**
   - Endpoint `/api/v1/admin/activity-logs` membocorkan data pribadi (PII): alamat email pengguna, alamat IP publik internal, dan detail peramban.
   - Kredensial sensitif `GOOGLE_CLIENT_SECRET` dan `GEMINI_API_KEY` tersimpan dalam file `.env` di direktori aplikasi.

3. **A04:2021 — Insecure Design (Sedang)**
   - Spreadsheet valuasi peneliti mengandalkan penyimpanan client-side (`localStorage`) tanpa validasi integritas kriptografis atau otorisasi server-side berkala. Jika pengguna memanipulasi nilai di `localStorage`, angka yang ditampilkan pada kalkulasi dan ekspor dapat berubah tanpa audit trail.

4. **A05:2021 — Security Misconfiguration (Sedang)**
   - `APP_DEBUG=true` aktif di file `.env` development. Bila terjadi error database, seluruh stack trace dan struktur query PostgreSQL ditampilkan ke klien.

5. **Proteksi IDOR yang Berfungsi Baik:**
   - Otorisasi IDOR pada proyek peneliti telah diimplementasikan dengan baik pada `ProyekController::index` dan `ProyekPolicy`, di mana Peneliti secara tegas hanya dapat melihat dan memperbarui proyek dengan `id_user` miliknya.

---

## 7. AUDIT SKEMA DATABASE DAN INTEGRASI API

### 7.1 Status Migrasi dan Relasi
- Terdapat **49 migrasi database**, seluruhnya berstatus `Ran` pada PostgreSQL 16.
- Ekstensi PostGIS (`postgis 3.4`) terpasang dan aktif untuk tipe spasial.
- Tabel relasional inti:
  - `roles` (3 records: Super Admin, Peneliti, Guest)
  - `users` (10 records: 1 Super Admin, 8 Peneliti, 1 Guest)
  - `administrative_boundaries` (7.231 records batas poligon)
  - `proyek` (11 records proyek riset)
  - `index` & `jenis_tutupan_lahan` (terkait hierarki spasial)
  - `valuasi_ekosistems`, `valuasi_kategori_jasas`, `valuasi_item_valuasis` (struktur TEV ekosistem)
  - `valuation_modules`, `eop_data`, `tcm_data`, `cvm_data` (struktur modul valuasi)

### 7.2 Masalah Desinkronisasi Skema
1. **Pelepasan Kolom `status` pada Tabel `proyek`:**
   Migrasi `2026_09_29_000001_remove_analyst_role_and_project_status` menghapus kolom `status` dengan statement:
   `ALTER TABLE proyek DROP CONSTRAINT IF EXISTS proyek_status_check;`
   dan men-drop kolom `status`. Akibatnya, pemanggilan Eloquent model yang mencoba mengakses atau mengisi `$proyek->status` (seperti pada seeder, factory, dan service review) menyebabkan crash database instan.
2. **Dualisme Tabel Valuasi:**
   Terdapat dua skema valuasi paralel dalam basis data:
   - Skema A: `valuasi_ekosistems` -> `valuasi_kategori_jasas` -> `valuasi_item_valuasis` (diisi oleh `EkosistemValuasiSeeder`, fokus pada TEV PT Antam).
   - Skema B: `valuation_modules` -> `valuation_rows` -> `valuation_custom_columns` (diisi oleh `ValuationSeeder`, fokus pada integrasi workflow peneliti).
   Kedua skema ini belum sepenuhnya terpadu pada tingkat analitik agregat.

---

## 8. AUDIT KHUSUS PERHITUNGAN VALUASI EKONOMI

Sistem PKSPL IPB menerapkan kerangka *Total Economic Value* (TEV) yang mencakup:
$$TEV = DUV + IUV + OV + EV$$
*(Direct Use Value, Indirect Use Value, Option Value, Existence Value)*

### 8.1 Temuan Validitas Rumus

#### A. Jasa Penyediaan (Provisioning Services) — Flora & Fauna
- **Formula Aktual:**
  $$Total = \text{Produktivitas (m}^3\text{/ha atau kg/ha)} \times \text{Luas (ha)} \times \text{Harga per Unit (Rp)}$$
- **Evaluasi QA:** Sesuai dengan kaidah valuasi ekonomi sumber daya alam pesisir (*Market Price Method*).
- **Catatan QA:** Perlu validasi batas nilai input: luas tidak boleh bernilai negatif atau nol, produktivitas harus memiliki batas toleransi biologis minimum/maksimum untuk mencegah input anomali.

#### B. Jasa Pengaturan (Regulating Services) — Karbon & Perlindungan Pantai
- **Formula Aktual:**
  $$Total = \text{Simpanan Karbon (ton C/ha)} \times \text{Luas (ha)} \times \text{Harga Karbon (Rp/ton)}$$
  $$Total = \text{Biaya Pembangunan Struktur Alternatif (Replacement Cost / Damage Avoided)}$$
- **Evaluasi QA:** Sesuai dengan literatur valuasi ekosistem mangrove IPB.

#### C. Jasa Pendukung (Supporting Services) — Habitat & Siklus Hara
- **Formula Aktual:**
  $$Total = \text{Luas (ha)} \times \text{Nilai Pengganti / Kontribusi per ha} \times \text{Efektivitas (\% / 100)}$$
- **Evaluasi QA:** Sesuai standar perhitungan nursery & spawning ground.

#### D. Jasa Budaya (Cultural Services) — Ekowisata & Penelitian
- **Disparitas Konsep Metodologis (Temuan Kritis):**
  - **Di Frontend (`methodSchemas.ts`):**
    $$Total = \text{Jumlah Kunjungan} \times (\text{Biaya Perjalanan} + \text{Tiket Masuk})$$
    *Kategori ini menghitung Pengeluaran Bruto (Gross Expenditure), bukan Nilai Surplus Konsumen.*
  - **Di Backend (`EconomicValuationCalculator.php`):**
    Menggunakan pendekatan ekonometrika mikro dengan regresi Poisson/OLS:
    $$CS_{\text{per visit}} = -\frac{1}{\beta_1}$$
    $$Total\ CS = \text{Total Kunjungan Tahunan} \times CS_{\text{per visit}}$$
  - **Dampak:** Terjadi perbedaan interpretasi yang substansial antara angka yang dihasilkan oleh lembar kerja frontend dengan estimasi model ekonometrika backend.
  - **Rekomendasi:** Berikan label yang jelas pada antarmuka: apakah nilai yang dihitung merupakan *Gross Expenditure (Dampak Ekonomi)* atau *Consumer Surplus (Nilai Ekonomi Bersih)*, dan komunikasikan dengan pakar valuasi PKSPL IPB.

---

## 9. ANALISIS RISIKO REGRESI (REGRESSION RISK)

Setiap tindakan perbaikan pada sistem ini memiliki potensi risiko regresi terhadap modul lain:

| Area Perubahan | Risiko Regresi | Modul Terdampak | Langkah Pencegahan |
|---|---|---|---|
| **Menambahkan `auth:sanctum` ke rute admin** | Frontend admin mungkin gagal memuat data jika token Sanctum belum terpasang di header Axios. | `AdminMasterDataPage`, `AdminActivityPage`, `AdminDashboardPage` | Pastikan `apiClient.ts` dan service admin selalu menyertakan header `Authorization: Bearer <token>`. |
| **Menghapus atau merefaktor `ReviewService`** | Modul notifikasi dan log aktivitas yang terikat pada event review dapat mengalami error. | `NotificationController`, `ActivityLogService` | Pisahkan dependency status review dari model `Proyek`. |
| **Memperbaiki `UserFactory` & `ProyekFactory`** | Test suite yang mengandalkan factory lama dapat menghasilkan struktur data yang berbeda. | Seluruh Feature Test di `tests/Feature` | Pastikan factory menyediakan nilai default yang valid untuk constraint database (`id_role` default Peneliti). |
| **Mengaktifkan Rehidrasi Backend Spreadsheet** | Data lokal di `localStorage` berpotensi tertimpa data kosong dari server jika belum pernah disimpan. | `SpreadsheetContext`, `DataValuationPage` | Gunakan strategi *two-way merge* dengan memprioritaskan timestamp terbaru. |
| **Mengganti Nilai Mock di Peta Publik** | Landing page dapat menampilkan nilai TEV 0 jika proyek belum memiliki data valuasi tersimpan. | `LandingPage`, `MapSection`, `StatsSection` | Sediakan nilai agregasi fallback cerdas yang menghitung estimasi berbasis luas kawasan jika modul spreadsheet belum diisi. |

---

## 10. RENCANA PRIORITAS PERBAIKAN BERTAHAP (REMEDIATION ROADMAP)

Berdasarkan tingkat risiko keamanan dan kestabilan sistem, berikut urutan perbaikan yang direkomendasikan:

### Fase 1: Perbaikan Keamanan Mendesak (P0 — Urgensi Tertinggi)
1. **Amankan Seluruh Endpoint Admin & Master Data:**
   Bungkus rute `admin/activity-logs`, `admin/analytics/overview`, `admin/master-data`, `roles`, dan master wilayah dengan middleware `auth:sanctum` dan `role:Super Admin`.
2. **Rotasi Kredensial Sensitif:**
   Cabut dan perbarui Google OAuth Client Secret dan Gemini API Key. Pastikan berkas konfigurasi lokal tidak bocor ke publik.

### Fase 2: Sinkronisasi Skema Database & Perbaikan Test Suite (P1)
1. **Perbaiki Factory Testing:**
   Perbarui `UserFactory.php` agar otomatis menetapkan `id_role` (default Peneliti).
   Perbarui `ProyekFactory.php` agar tidak menyisipkan kolom `status`.
2. **Perbaiki Variabel Dangling pada Test:**
   Definisikan variabel user pengganti `$analyst` pada `ChatApiTest.php` baris 278.
3. **Harmonisasi Modul Review:**
   Perbaiki import `App\Models\Review` pada `ReviewPolicy.php`.
   Sesuaikan `ReviewService.php` agar tidak mengakses kolom `status` pada tabel `proyek`.
4. **Verifikasi:** Jalankan `php artisan test` hingga mencapai **100% Pass**.

### Fase 3: Integritas Data & Rehidrasi Spreadsheet Peneliti (P1)
1. **Implementasi Rehidrasi Data Spreadsheet:**
   Perbarui `loadRowsFromBackend` pada `SpreadsheetContext.tsx` agar memetakan baris dari `valuation_rows` ke dalam store React ketika peneliti membuka proyek.
2. **Penyelarasan Nilai Awal Mock:**
   Koreksi angka `totalNilai` pada `methodSchemas.ts` baris 88 agar sesuai dengan hasil formula matematis ($33.18 \times 79.86 \times 3.231.311$).

### Fase 4: Integritas Data Publik & Penyelesaian Stub (P2)
1. **Dinamisasi TEV Landing Page:**
   Gantikan fungsi `match` statis pada `ProyekController::publicMap()` dan `StatisticsController::index()` dengan query agregasi database riil.
2. **Implementasi Komponen Verifikasi & Kebijakan:**
   Lengkapi antarmuka `VerifikasiDataPage.jsx` dan `KebijakanPage.jsx` dengan konten informatif atau status fitur dalam pengembangan.
3. **Sinkronisasi Badge Sidebar Admin:**
   Ganti nilai statis `'38'` dan `'18'` pada `AdminSidebar.jsx` dengan data dinamis.

### Fase 5: Optimasi Performa & Code Splitting (P3)
1. **Code-Splitting Frontend:**
   Terapkan `React.lazy()` pada `App.jsx` untuk memecah bundle 2.71 MB menjadi chunk terpisah per halaman/modul.

---

## 11. RENCANA PENGUJIAN REGRESI BERKELANJUTAN

Untuk menjamin kualitas sistem secara berkesinambungan setiap kali ada perubahan kode, prosedur QA berikut wajib dijalankan:

1. **Automated Unit & Feature Testing:**
   ```bash
   docker compose -f PKSPL-Backend/docker-compose.yml exec app php artisan test
   ```
   *Target: 96 tests passed, 0 failures.*
2. **Frontend Production Build Test:**
   ```bash
   cd PKSPL-Project-Frontend && npm run build
   ```
   *Target: Build sukses tanpa TypeScript/syntax error.*
3. **Endpoint Security Regression Checklist:**
   - Akses unauthenticated ke `/api/v1/admin/master-data` -> Wajib `401 Unauthorized`.
   - Akses unauthenticated ke `/api/v1/admin/activity-logs` -> Wajib `401 Unauthorized`.
   - Akses dengan token Peneliti ke `/api/v1/users` -> Wajib `403 Forbidden`.
   - Akses dengan token Peneliti ke `/api/v1/proyek/{id_milik_orang_lain}` -> Wajib `403 Forbidden` atau `404 Not Found`.
4. **Valuation Math Verification Script:**
   Uji independen pada formula baris spreadsheet untuk memastikan perkalian unit, produktivitas, dan luas menghasilkan integer Rupiah yang tepat tanpa pembulatan mengambang (*floating point drift*).

---

## 12. BATASAN AUDIT (AUDIT LIMITATIONS)

Laporan audit ini memiliki batasan ruang lingkup sebagai berikut:
1. **Audit Tanpa Perubahan Kode:** Tahap ini sepenuhnya berfokus pada inspeksi statis, pengujian dinamis non-destruktif, dan analisis arsitektur. Tidak ada kode aplikasi atau skema database yang diubah selama audit.
2. **Pengujian Email Real:** Server penangkap email lokal Mailpit (`localhost:8025`) aktif dan menangkap email pengujian. Pengiriman email ke penyedia SMTP publik riil (Gmail/IPB mail relay) tidak diuji untuk mencegah spam.
3. **Penyedia Peta Eksternal:** Peta Leaflet menggunakan tile provider OpenStreetMap standar. Performa unduhan tile bergantung pada konektivitas internet publik dan kebijakan batas akses (rate limiting) dari penyedia tile OSM.
4. **Kuota Gemini AI API:** Pengujian fungsionalitas AI generator dibatasi pada tes kesehatan konektivitas (*health check*) untuk mencegah konsumsi kuota API berlebih.

---
**Laporan ini disusun oleh Senior QA Engineer & Software Quality Auditor PKSPL IPB University.**  
*Dokumen tersimpan di `docs/qa/QA_AUDIT_REPORT_INITIAL.md`.*
