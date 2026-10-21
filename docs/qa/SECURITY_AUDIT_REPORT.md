# LAPORAN UJI KEAMANAN SISTEM (SECURITY AUDIT & PENETRATION TESTING REPORT)
## PKSPL IPB University — Sistem Valuasi Ekonomi Sumber Daya Pesisir & Laut

**Tanggal Audit:** 19 Oktober 2026  
**Klasifikasi:** Rahasia / Internal Development Team  
**Standar Pengujian:** OWASP Top 10 (2021) & OWASP API Security Top 10 (2023)  
**Lingkup Audit:** Backend API (Laravel 11, Sanctum, Reverb), Frontend SPA (React Vite), Database (PostgreSQL/PostGIS), & Infrastruktur Nginx Docker  

---

## 1. RINGKASAN EKSEKUTIF (EXECUTIVE SUMMARY)

Telah dilakukan audit keamanan menyeluruh (*Comprehensive Security Assessment*) terhadap arsitektur, kode sumber, logika bisnis, dan konfigurasi infrastruktur aplikasi PKSPL IPB Rework. Audit ini berfokus pada mitigasi celah eksploitasi, perlindungan data sensitif riset kelautan, integritas valuasi ekonomi, dan ketahanan terhadap serangan siber.

### Skor Postur Keamanan: **74 / 100** (Kategori: **FAIR / PERLU HARDENING**)

```
       [DISTRIBUSI TEMUAN KEAMANAN]
   ┌───────────────┬───────┬────────────────────────┐
   │ Tingkat Risiko│ Jumlah│ Kategori Utama         │
   ├───────────────┼───────┼────────────────────────┤
   │ CRITICAL      │   1   │ Broken Access (BOLA)   │
   │ HIGH          │   1   │ Rate Limiting / DoS    │
   │ MEDIUM        │   3   │ Token Leak, Enum, XSS  │
   │ LOW           │   2   │ Headers, Token Expiry  │
   │ INFORMATIONAL │   1   │ Permissive Proxies     │
   └───────────────┴───────┴────────────────────────┘
```

**Kesimpulan Utama:**
1. **Fondasi Pertahanan Sangat Baik pada Perimeter Utama:** Sistem memiliki kontrol kriptografi yang kuat (Bcrypt 12 rounds), kebal terhadap SQL Injection (100% kueri berparameter aman), proteksi berkas spasial/SHP yang ketat, dan alur state-machine proyek yang kebal dari manipulasi status langsung.
2. **Celah Kritis pada Tingkat Objek Sub-Resource (IDOR/BOLA):** Sementara proyek utama (`/proyek/{id}`) diproteksi kepemilikannya dengan sangat baik, sub-resource turunannya (`indexes`, `jenis-tutupan-lahan`, dan `valuation/rows`) belum mengimplementasikan validasi relasi kepemilikan. Pengguna terautentikasi dapat membaca atau memanipulasi data peneliti lain jika mengetahui ID sumber daya.
3. **Ketiadaan Rate Limiting pada Rute Autentikasi:** Endpoint login, register, dan forgot password belum dipasangi pembatasan laju (*rate limiting*), membuka celah serangan *credential stuffing* dan *brute force*.

---

## 2. MATRIKS TEMUAN KEAMANAN (VULNERABILITY MATRIX)

| ID | Kategori OWASP | Kerentanan | Keparahan | Status |
| :--- | :--- | :--- | :---: | :---: |
| **SEC-01** | OWASP API1:2023 / A01:2021 | Insecure Direct Object Reference (IDOR) pada Sub-Resource Proyek | **CRITICAL** | Teridentifikasi |
| **SEC-02** | OWASP API4:2023 / A04:2021 | Ketiadaan Rate Limiting pada Endpoint Autentikasi Publik | **HIGH** | Teridentifikasi |
| **SEC-03** | OWASP API2:2023 / A02:2021 | Pengiriman Bearer Token via URL Query String pada Callback OAuth | **MEDIUM** | Teridentifikasi |
| **SEC-04** | OWASP A07:2021 | User Enumeration pada Endpoint Kirim Ulang Verifikasi Email | **MEDIUM** | Teridentifikasi |
| **SEC-05** | OWASP A03:2021 | Potensi Stored XSS pada Popup Marker Peta Spasial (Leaflet) | **MEDIUM** | Teridentifikasi |
| **SEC-06** | OWASP A05:2021 | Ketiadaan Security Headers Standar pada Nginx Web Server | **LOW** | Teridentifikasi |
| **SEC-07** | OWASP A07:2021 | Masa Berlaku Token Sanctum Tidak Dibatasi (No Expiration) | **LOW** | Teridentifikasi |
| **SEC-08** | OWASP A05:2021 | Konfigurasi Trust Proxies Terlalu Permisif (`*`) | **INFO** | Teridentifikasi |

---

## 3. ANALISIS DETAIL TEMUAN KEAMANAN (VULNERABILITY DETAILS)

### SEC-01 [CRITICAL]: Insecure Direct Object Reference (IDOR / BOLA) pada Sub-Resource Proyek
- **Kategori:** OWASP API1:2023 — Broken Object Level Authorization & OWASP A01:2021 — Broken Access Control
- **Lokasi Kode:**
  - `PKSPL-Backend/src/app/Http/Controllers/Api/V1/Project/IndexController.php` (`show`, `update`, `destroy`)
  - `PKSPL-Backend/src/app/Http/Controllers/Api/V1/Project/JenisTutupanLahanController.php` (`show`, `update`, `destroy`)
  - `PKSPL-Backend/src/app/Http/Controllers/Api/V1/Valuation/ValuationDataController.php` (`getConfigs`, `upsertConfigs`, `getRows`, `addRow`, `updateRow`, `deleteRow`, `getCustomColumns`, dll.)
  - `PKSPL-Backend/src/app/Http/Controllers/Api/V1/Ecosystem/*` (`ProvisioningServiceController`, dll.)
- **Deskripsi Masalah:**
  Pada tingkat controller proyek utama (`ProyekController`), sistem melakukan pengecekan otorisasi yang sangat ketat:
  ```php
  if ($roleName === Role::PENELITI && (int) $proyek->id_user !== (int) $user->id_user) {
      return response()->json(['message' => 'Anda tidak memiliki akses...'], 403);
  }
  ```
  Namun, pada sub-resource controller (`IndexController`, `JenisTutupanLahanController`, dan `ValuationDataController`) yang mewarisi `ApiResourceController`, sistem hanya mengandalkan Route Model Binding atau pencarian ID primer tanpa memeriksa apakah entitas tersebut berada di bawah proyek milik user yang login.
- **Skenario Eksploitasi:**
  1. Peneliti A (ID User 2) membuat Index dan Tutupan Lahan pada Proyek miliknya (`id_jenis_tutupan_lahan: 45`).
  2. Peneliti B (ID User 5) login ke sistem dan mengirim request:
     `DELETE /api/v1/jenis-tutupan-lahan/45`
  3. Sistem langsung mengeksekusi penghapusan cascading pada database tanpa memvalidasi kepemilikan. Seluruh data baris valuasi, konfigurasi jasa, dan tutupan lahan Peneliti A terhapus permanen oleh Peneliti B.
- **Rekomendasi Perbaikan:**
  Buat dan daftarkan Laravel Policy untuk `Index`, `JenisTutupanLahan`, dan tambahkan middleware kepemilikan atau validasi relasi sebelum eksekusi mutasi:
  ```php
  // Contoh validasi relasi pada ValuationDataController:
  private function authorizeLandCoverAccess(JenisTutupanLahan $landCover, $user): void
  {
      $proyek = $landCover->index?->proyek;
      $role = Role::normalize($user->role->nama_role ?? '');
      if ($role !== Role::SUPER_ADMIN && (!$proyek || (int)$proyek->id_user !== (int)$user->id_user)) {
          abort(403, 'Anda tidak memiliki wewenang atas data tutupan lahan proyek ini.');
      }
  }
  ```

---

### SEC-02 [HIGH]: Ketiadaan Rate Limiting pada Rute Autentikasi Publik
- **Kategori:** OWASP API4:2023 — Unrestricted Resource Consumption & OWASP A04:2021 — Insecure Design
- **Lokasi Kode:** `PKSPL-Backend/src/routes/api.php` (baris 91–98)
- **Deskripsi Masalah:**
  Endpoint publik yang menangani autentikasi didaftarkan tanpa middleware throttling:
  ```php
  Route::post('auth/register', [AuthController::class, 'register']);
  Route::post('auth/login', [AuthController::class, 'login'])->name('login');
  Route::post('auth/email/resend', [AuthController::class, 'resendVerificationEmail']);
  Route::post('auth/forgot-password', [AuthController::class, 'forgotPassword']);
  Route::post('auth/reset-password', [AuthController::class, 'resetPassword']);
  ```
  Pada Laravel 11, `bootstrap/app.php` tidak secara default mengaktifkan batasan laju global jika tidak didefinisikan secara eksplisit.
- **Dampak Serangan:**
  - Penyerang dapat melakukan *brute force password* atau *credential stuffing* terhadap akun peneliti atau admin tanpa pembatasan frekuensi request.
  - Penyerang dapat membanjiri antrean surat/Mailpit melalui pemanggilan berulang `auth/register` dan `auth/email/resend`.
- **Rekomendasi Perbaikan:**
  Terapkan middleware `throttle` bawaan Laravel dengan kuota ketat pada grup rute autentikasi:
  ```php
  Route::middleware('throttle:5,1')->group(function () {
      Route::post('auth/login', [AuthController::class, 'login'])->name('login');
      Route::post('auth/forgot-password', [AuthController::class, 'forgotPassword']);
  });
  Route::middleware('throttle:10,1')->group(function () {
      Route::post('auth/register', [AuthController::class, 'register']);
      Route::post('auth/email/resend', [AuthController::class, 'resendVerificationEmail']);
  });
  ```

---

### SEC-03 [MEDIUM]: Pengiriman Bearer Token Melalui URL Query String pada Alur OAuth
- **Kategori:** OWASP API2:2023 — Broken Authentication & OWASP A02:2021 — Cryptographic Failures
- **Lokasi Kode:** `PKSPL-Backend/src/app/Http/Controllers/Api/V1/Auth/AuthController.php` (baris 174–178)
- **Deskripsi Masalah:**
  Setelah callback Google OAuth berhasil diverifikasi, backend mengarahkan pengguna kembali ke aplikasi frontend menggunakan URL redirect dengan token terlampir dalam query parameter:
  ```php
  return redirect()->away($frontendUrl . '/auth/callback?' . http_build_query([
      'token' => $token,
      'role' => $user->role->nama_role ?? '',
      'account_created' => $accountCreated ? '1' : '0',
  ]));
  ```
- **Dampak Serangan:**
  1. **Browser History Logging:** Token akses tersimpan permanen dalam riwayat penjelajahan browser pengguna.
  2. **Referer Header Leakage:** Jika halaman callback memuat aset pihak ketiga (CDN eksternal, font, analytics), header HTTP `Referer` dapat membocorkan token tersebut ke server pihak ketiga.
  3. **Web Server / Proxy Logs:** Token tercatat dalam log akses Nginx/Cloudflare dalam bentuk teks polos.
- **Rekomendasi Perbaikan:**
  - Gunakan pola *Authorization Code Exchange* sementara (backend menghasilkan kode satu kali pakai berdurasi 60 detik yang ditukar oleh frontend melalui POST API request), atau
  - Kirimkan token melalui `Set-Cookie` dengan atribut `HttpOnly`, `Secure`, `SameSite=Lax`.

---

### SEC-04 [MEDIUM]: User Enumeration pada Endpoint Resend Email Verification
- **Kategori:** OWASP A07:2021 — Identification and Authentication Failures
- **Lokasi Kode:** `PKSPL-Backend/src/app/Http/Controllers/Api/V1/Auth/AuthController.php` (baris 315–320)
- **Deskripsi Masalah:**
  Pada fitur `forgotPassword`, developer telah menerapkan respons generik yang sangat baik untuk mencegah *user enumeration*. Namun, pada method `resendVerificationEmail`, sistem masih membedakan respons HTTP ketika email tidak terdaftar:
  ```php
  $user = User::query()->whereRaw('LOWER(email) = ?', [$email])->first();

  if (! $user) {
      return response()->json(['message' => 'Email tidak ditemukan.'], Response::HTTP_NOT_FOUND);
  }
  ```
- **Dampak Serangan:**
  Penyerang dapat membuat skrip otomatis untuk menguji daftar alamat email dan mengetahui email mana saja yang telah terdaftar sebagai pengguna sistem PKSPL.
- **Rekomendasi Perbaikan:**
  Ubah respons menjadi pesan generik independen dari keberadaan akun:
  ```php
  if (! $user) {
      return response()->json([
          'message' => 'Jika email Anda terdaftar dan belum diverifikasi, link verifikasi baru telah dikirimkan.'
      ], Response::HTTP_OK);
  }
  ```

---

### SEC-05 [MEDIUM]: Potensi Stored XSS pada Popup Marker Peta Spasial (Leaflet)
- **Kategori:** OWASP A03:2021 — Injection (Cross-Site Scripting)
- **Lokasi Kode:** `PKSPL-Project-Frontend/src/components/map/ProjectLocationMap.jsx` (baris 338)
- **Deskripsi Masalah:**
  Pustaka Leaflet GIS secara bawaan memperlakukan input string pada method `.bindPopup()` sebagai raw HTML markup.
  ```javascript
  overlayRef.current = L.marker(center).addTo(map).bindPopup(label);
  ```
  Jika variabel `label` atau `nama_proyek` mengandung karakter payload XSS (misal: `<img src=x onerror=alert(document.cookie)>`), browser akan mengeksekusi skrip tersebut saat pengguna mengklik marker pada peta.
- **Rekomendasi Perbaikan:**
  Sanitasi string teks sebelum diteruskan ke Leaflet, atau gunakan DOM Node / Text Node aman:
  ```javascript
  const safeLabel = document.createTextNode(label || '').textContent;
  overlayRef.current = L.marker(center).addTo(map).bindPopup(safeLabel);
  ```

---

### SEC-06 [LOW]: Ketiadaan Security Headers Standar pada Nginx Web Server
- **Kategori:** OWASP A05:2021 — Security Misconfiguration
- **Lokasi Kode:** `PKSPL-Backend/docker/nginx/default.conf`
- **Deskripsi Masalah:**
  Konfigurasi Nginx saat ini belum menyertakan header proteksi browser modern seperti `X-Frame-Options`, `X-Content-Type-Options`, dan `Referrer-Policy`.
- **Dampak Serangan:**
  - Aplikasi rentan disematkan ke dalam iframe situs jahat (*Clickjacking attack*).
  - Browser dapat melakukan *MIME type sniffing* yang berisiko pada file unggahan statis.
- **Rekomendasi Perbaikan:**
  Tambahkan blok header keamanan pada `default.conf`:
  ```nginx
  add_header X-Frame-Options "SAMEORIGIN" always;
  add_header X-Content-Type-Options "nosniff" always;
  add_header Referrer-Policy "strict-origin-when-cross-origin" always;
  add_header Permissions-Policy "camera=(), microphone=(), geolocation=(self)" always;
  ```

---

### SEC-07 [LOW]: Masa Berlaku Token Sanctum Tidak Dibatasi (No Token Expiration)
- **Kategori:** OWASP A07:2021 — Identification and Authentication Failures
- **Lokasi Kode:** `PKSPL-Backend/src/config/sanctum.php`
- **Deskripsi Masalah:**
  Konfigurasi Sanctum menggunakan nilai bawaan di mana `'expiration' => null`. Akibatnya, token yang telah di-generate saat login akan tetap aktif di tabel `personal_access_tokens` selamanya sampai user secara manual menekan tombol Logout.
- **Dampak Serangan:**
  Jika token dicuri (misal dari cache lokal atau proxy), penyerang memiliki jendela akses tanpa batas waktu.
- **Rekomendasi Perbaikan:**
  Publikasikan `config/sanctum.php` dan atur masa aktif token yang wajar (misal: 1440 menit / 24 jam atau 7 hari):
  ```php
  'expiration' => 1440, // 24 jam
  ```

---

### SEC-08 [INFORMATIONAL]: Konfigurasi Trust Proxies Terlalu Permisif (`*`)
- **Kategori:** OWASP A05:2021 — Security Misconfiguration
- **Lokasi Kode:** `PKSPL-Backend/src/bootstrap/app.php` (baris 17)
- **Deskripsi Masalah:**
  Pengaturan `$middleware->trustProxies(at: '*');` mempercayai seluruh IP proxy tanpa filter. Jika aplikasi dihubungkan langsung ke publik tanpa reverse proxy tepercaya (misal tanpa Cloudflare terverifikasi), header `X-Forwarded-For` dapat dipalsukan (*spoofed*) oleh penyerang untuk memanipulasi log audit atau mengakali IP throttling.
- **Rekomendasi:**
  Tentukan subnet IP proxy tepercaya yang valid (misal rentang IP Docker internal atau rentang CIDR Cloudflare).

---

## 4. ANALISIS KONTROL KEAMANAN YANG SUDAH KUAT (SECURITY STRENGTHS)

Pengujian mengidentifikasi sejumlah praktik keamanan tingkat tinggi yang telah diimplementasikan dengan sangat baik pada kode sumber:

1. **Kebal 100% Terhadap SQL Injection (SQLi):**
   - Seluruh 50 penggunaan kueri mentah (`whereRaw`, `selectRaw`, `DB::raw`) di seluruh repositori menggunakan *Prepared Statements* dengan penanda parameter `?` dan array binding.
   - Tidak ditemukan satu pun konkatenasi string SQL dinamis langsung dari input request (`$_GET`/`$_POST`).
2. **Kriptografi & Manajemen Kredensial:**
   - Password di-hash menggunakan algoritma Bcrypt dengan 12 putaran kerja (`BCRYPT_ROUNDS=12`).
   - Model `User` mengimplementasikan cast `'password' => 'hashed'` otomatis.
   - Perubahan kata sandi (`ProfileController::updatePassword`) mewajibkan verifikasi kata sandi lama via `Hash::check()`.
   - Atribut sensitif (`password`, `remember_token`, `google_id`) disembunyikan secara baku dari serialisasi JSON (`$hidden`).
3. **Validasi File Upload & Isolasi Storage:**
   - Unggahan berkas spasial divalidasi ketat terhadap ekstensi aman (`.shp`, `.shx`, `.dbf`, `.prj`, `.zip`).
   - Berkas avatar profil divalidasi tipe MIME gambar (`jpeg, jpg, png, webp`) dengan batas ukuran 2MB.
   - Lampiran review divalidasi ekstensi dokumen dan dibatasi maksimal 20MB.
   - Berkas disimpan dalam direktori terisolasi (`proyek/{id}/shapefile`) menggunakan nama acak hash untuk mencegah *Directory Traversal* dan *File Overwrite*.
4. **Resistensi Terhadap Manipulasi Status (State Machine Tampering):**
   - Kolom `status` proyek dan `id_user` tidak dapat dimanipulasi melalui endpoint `PUT /api/v1/proyek/{id}` karena difilter secara ketat melalui `ProyekRequest` dan `attributesWithoutFiles`.
   - Transisi status hanya dapat dipicu melalui alur sah: pengajuan review (`DatasetSubmissionController`) dan telaah admin (`ReviewController`).
5. **Multi-layer Anti-IDOR pada Modul Chat:**
   - Endpoint pengunduhan lampiran obrolan (`ChatMessageController::downloadAttachment`) menerapkan 3 lapis validasi berjenjang: verifikasi partisipan percakapan, verifikasi keterikatan pesan ke percakapan, dan verifikasi kepemilikan lampiran terhadap pesan.
6. **Proteksi Role-Based Access Control (RBAC):**
   - Seluruh rute administratif (`/admin/activity-logs`, `/admin/master-data`, `/users`, `/roles`, dan mutasi wilayah) diproteksi secara ganda oleh Sanctum dan middleware peran `role:Super Admin`.
   - Pengecekan peran menggunakan pencocokan terstandardisasi `Role::normalize()` yang kebal terhadap inkonsistensi huruf kapital.

---

## 5. PANDUAN PERBAIKAN & PATCH TEKNIS (ACTIONABLE REMEDIATION)

### Langkah 1: Pasang Throttling pada Rute Autentikasi (`routes/api.php`)
```php
// Bungkus rute sensitif autentikasi dengan throttle
Route::prefix('auth')->group(function () {
    Route::middleware('throttle:6,1')->group(function () {
        Route::post('login', [AuthController::class, 'login'])->name('login');
        Route::post('forgot-password', [AuthController::class, 'forgotPassword']);
        Route::post('reset-password', [AuthController::class, 'resetPassword']);
    });

    Route::middleware('throttle:10,1')->group(function () {
        Route::post('register', [AuthController::class, 'register']);
        Route::post('email/resend', [AuthController::class, 'resendVerificationEmail']);
    });
});
```

### Langkah 2: Tambahkan Pengecekan Otorisasi pada `ValuationDataController`
```php
private function findLandCover(int $landCoverId): JenisTutupanLahan
{
    $landCover = JenisTutupanLahan::with('index.proyek')
        ->where('id_jenis_tutupan_lahan', $landCoverId)
        ->firstOrFail();

    $user = auth('sanctum')->user();
    if ($user) {
        $roleName = $user->role ? Role::normalize($user->role->nama_role) : null;
        if ($roleName === Role::PENELITI) {
            $ownerId = $landCover->index?->proyek?->id_user;
            if ($ownerId && (int)$ownerId !== (int)$user->id_user) {
                abort(403, 'Anda tidak memiliki hak akses terhadap lembar kerja valuasi proyek ini.');
            }
        }
    }

    return $landCover;
}
```

### Langkah 3: Tambahkan Security Headers pada Nginx (`default.conf`)
```nginx
server {
    listen 80;
    client_max_body_size 50M;

    # HTTP Security Headers
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header Referrer-Policy "strict-origin-when-cross-origin" always;
...
```

---

## 6. KESIMPULAN & TAHAPAN SELANJUTNYA

Aplikasi PKSPL IPB Rework telah dibangun dengan arsitektur backend dan frontend yang sangat rapi dan memperhatikan kaidah modernisasi perangkat lunak. Celah keamanan yang ditemukan didominasi oleh masalah **cakupan otorisasi pada sub-resource turunan (IDOR)** dan **konfigurasi rate limiting**, yang merupakan temuan umum pada fase transisi pengembangan menuju *production-ready*.

Dengan menerapkan 3 rekomendasi prioritas utama (Perbaikan otorisasi sub-resource, penambahan rate limiting autentikasi, dan pengamanan callback token), sistem ini akan mencapai tingkat kepatuhan keamanan enterprise-grade yang siap dideploy secara aman ke server produksi IPB University.
