# Standar coding

## PHP dan Laravel

- Ikuti PSR-12, gunakan deklarasi tipe dan return type bila dapat dinyatakan jelas.
- Gunakan nama kelas PascalCase dan nama file sama dengan kelas: `Proyek`, `ProyekController`, `ProyekRequest`, `ProyekResource`.
- Gunakan namespace sesuai struktur `App\\Models`, `App\\Http\\Controllers\\Api\\V1`, `App\\Http\\Requests`, dan `App\\Http\\Resources`.
- Pertahankan nama tabel, kolom, primary key, foreign key, dan route key kustom yang telah ada. Jangan mengandalkan konvensi `id` secara implisit untuk model domain ini.

## Input dan output API

- Gunakan Form Request; `POST` memakai field wajib, `PUT/PATCH` memakai `sometimes` sebagaimana pola sekarang.
- Gunakan API Resource untuk seluruh response model. Jangan mengembalikan model mentah atau mengekspos password, remember token, atau Google ID.
- Pakai status REST: 200 untuk baca/perbarui, 201 untuk create, 204 untuk delete, 404 untuk binding gagal, dan 422 untuk validasi Laravel gagal.
- Collection endpoint mendukung `per_page` 1–100 dan default 15; jangan mengubah kontrak ini tanpa permintaan.

## Desain kode

- Controller harus tipis dan tidak memuat formula, query kompleks, atau aturan lintas entitas.
- Untuk endpoint CRUD standar, controller API v1 harus mewarisi `ApiResourceController` dan memakai helper CRUD yang tersedia. Tetapkan `$model` dan `$resource`, lalu teruskan request tervalidasi ke helper; jangan menduplikasi implementasi CRUD.
- Gunakan relationship Eloquent yang ada, termasuk nama relasi `areaTerdampak`, `hasilValuasi`, dan `validasiAnalyst`.
- Buat service untuk aturan bisnis baru, perhitungan, transaksi, atau integrasi eksternal; jangan menaruhnya pada model event atau controller.
- Terapkan single responsibility, dependency inversion, dan interface bila abstraksi memiliki kebutuhan nyata. Hindari repository/service kosong yang sekadar membungkus `Model::query()`.
- Gunakan `$fillable`, cast decimal/datetime, dan validasi `exists`/`unique` untuk menjaga integritas input.

## Error handling dan perubahan skema

- Biarkan exception API mengikuti renderer JSON Laravel untuk URL `api/*`; tambahkan error handling spesifik hanya bila kontrak response ditetapkan.
- Jangan mengubah migration lama. Buat migration baru yang reversibel bila skema baru disetujui.
- Jangan mengubah endpoint atau menambah akses tulis pada role, histori, atau analisis AI tanpa persetujuan eksplisit.
- Tambahkan test feature untuk endpoint dan test unit untuk perhitungan/service baru sebelum atau bersamaan dengan perubahan perilaku.
