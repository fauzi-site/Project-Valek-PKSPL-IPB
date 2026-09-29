# Arsitektur

## Gambaran

`src/` adalah aplikasi Laravel 13. API didefinisikan dalam `routes/api.php` dengan prefix `/api/v1`; route web hanya menyediakan halaman welcome `/`. Tidak ada middleware API khusus yang didaftarkan di `bootstrap/app.php`; exception untuk URL `api/*` dipaksa menjadi JSON.

Pola yang berjalan adalah MVC tipis:

- **Model** (`app/Models`): konfigurasi tabel/primary key, `$fillable`, cast, route key, dan relasi Eloquent.
- **Controller** (`app/Http/Controllers/Api/V1`): controller domain mewarisi `ApiResourceController` dan meneruskan CRUD ke helper generik.
- **Request** (`app/Http/Requests`): validasi input dan otorisasi sementara selalu `true`.
- **Resource** (`app/Http/Resources`): kontrak JSON eksplisit untuk setiap model.
- **Database** (`database/migrations`): skema dan foreign key; `RoleSeeder` adalah satu-satunya seed data domain.

Tidak ada folder/kelas Service, Repository, DTO, Policy, atau middleware role yang digunakan oleh aplikasi saat ini.

## Struktur folder

```text
PKSPL-Project-Backend/
├── docker/                         Dockerfile PHP dan virtual host Nginx
├── docs/                           Dokumentasi proyek
├── docker-compose.yml              Environment PostgreSQL/PostGIS lokal
└── src/
    ├── app/Http/Controllers/Api/V1 API resource controller dan controller domain
    ├── app/Http/Requests           Validasi payload
    ├── app/Http/Resources          Serialisasi response
    ├── app/Models                  Entitas dan relasi Eloquent
    ├── bootstrap/app.php           Registrasi route/middleware/exception
    ├── database/migrations         Skema database
    ├── database/seeders            RoleSeeder dan DatabaseSeeder
    ├── routes/api.php              Resource route v1
    ├── routes/web.php              Route web minimal
    └── tests/                      Hanya example test bawaan
```

## Alur request

```mermaid
flowchart LR
    C[Client] --> R[/api/v1 route]
    R --> CT[Controller API v1]
    CT --> FR[Form Request\nvalidasi]
    FR --> AR[ApiResourceController]
    AR --> M[Eloquent Model]
    M --> DB[(PostgreSQL/PostGIS/database)]
    DB --> M
    M --> RES[API Resource]
    RES --> J[JSON response]
```

Untuk `GET` index, `ApiResourceController` memvalidasi `per_page` lalu menjalankan `Model::query()->paginate()` dengan default 15. Untuk `POST`, atribut tervalidasi dibuat dengan `create()` dan response berstatus 201. `PATCH/PUT` memperbarui model lalu mengembalikan model yang di-refresh; `DELETE` menghasilkan 204. Resource tidak eager-load relasi, sehingga response berisi foreign key, bukan objek relasi bersarang.

## Batas arsitektur saat ini

- Route tidak menggunakan `auth`, policy, atau middleware peran; semua request yang lolos validasi dapat mengakses endpoint menurut implementasi saat ini.
- Tidak terdapat perhitungan otomatis, transaction orchestration, audit otomatis, atau pemanggilan AI.
- `analisis_ai` dan `histori` hanya memiliki `created_at`, dan endpoint keduanya tidak menawarkan update/delete.
- Valuasi memakai hierarki `proyek → indexes → jenis_tutupan_lahan`. Service dan hasil valuasi terkait ke jenis tutupan lahan; agregasi dashboard dilakukan oleh `ProjectDashboardService` melalui calculation service.
- Batas geometri proyek, index, dan tutupan lahan dikirim sebagai GeoJSON pada kolom JSON. Komponen SHP/SHX/DBF/PRJ/ZIP disimpan oleh `ShapefileUploadService`; parsing belum diimplementasikan.
- Activity diagram TEV telah menetapkan alur bisnis yang diinginkan, tetapi formula, pemetaan empat jasa ekosistem ke lima komponen TEV, serta strategi penyimpanan TEV proyek masih menunggu persetujuan. Detail keputusan dicatat di `docs/workflow.md`.
