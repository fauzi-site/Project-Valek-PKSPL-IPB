# Panduan AI Coding Assistant

## Konteks proyek

Proyek ini menggunakan Laravel 13 dan menyediakan REST API di `src/routes/api.php`. Domain utama memakai Eloquent dengan primary key serta nama tabel kustom. Ikuti pola `Controller → Form Request → Model → API Resource` yang telah ada.

## Aturan wajib

- Gunakan Eloquent Relationship; jangan membuat query relasional mentah bila relasi model sudah tersedia.
- Gunakan Form Request untuk validasi dan API Resource untuk response API.
- Untuk CRUD resource standar, gunakan atau panggil `App\Http\Controllers\Api\V1\ApiResourceController` (`src/app/Http/Controllers/Api/V1/ApiResourceController.php`) sebagai parent controller. Manfaatkan helper `indexResource`, `showResource`, `storeResource`, `updateResource`, dan `destroyResource`; buat alur CRUD khusus hanya bila kebutuhan bisnis memang berbeda.
- Jangan tempatkan business logic di Controller. Letakkan orkestrasi/perhitungan baru pada service yang jelas, dengan transaksi bila melibatkan beberapa penulisan data.
- Ikuti struktur proyek yang ada. Jangan membuat file baru bila komponen sejenis sudah tersedia dan dapat diperluas dengan aman.
- Jangan mengubah migration yang sudah ada; buat migration baru hanya bila perubahan skema secara eksplisit diminta.
- Jangan mengubah URI, metode, atau kontrak endpoint tanpa permintaan eksplisit.
- Gunakan clean architecture secara proporsional: controller tipis, model untuk persistence/relationship, request untuk validasi, resource untuk representasi HTTP, dan service untuk aturan bisnis.
- Ikuti PSR-12, clean code, serta prinsip SOLID.
- Pertahankan route-model binding dengan primary key kustom (`id_proyek`, `id_area`, dan seterusnya).
- Hormati lifecycle yang saat ini dibatasi: `analisis-ai` dan `histori` hanya memiliki index/store/show.

## Kondisi implementasi saat ini

- Seluruh Form Request saat ini mengembalikan `authorize(): true`; autentikasi, policy, dan middleware role belum diterapkan.
- `ApiResourceController` menyediakan pagination (`per_page` 1–100), CRUD umum, response Resource, `201` saat create, dan `204` saat delete.
- Nilai jasa ekosistem dan `hasil_valuasi.tev` adalah input tervalidasi, bukan hasil formula otomatis. Jangan mengasumsikan rumus tanpa persetujuan produk.
- `Role` merupakan master data baca-saja di API dan seedernya memuat `admin`, `analyst`, `peneliti`, serta `guest`.

Lihat `docs/` sebelum mengubah domain, database, atau API.
