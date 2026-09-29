# Frontend & Backend Auth Integration

Dokumen ini menjelaskan arsitektur autentikasi antara Frontend (React) dan Backend (Laravel).

## 1. Authentication Architecture
- **Metode**: Token-based Authentication menggunakan Laravel Sanctum.
- **Penyimpanan Frontend**: `localStorage` untuk menyimpan Bearer token.
- **Penyimpanan Sementara (Intent)**: `sessionStorage` untuk menyimpan URL awal yang ingin dikunjungi user sebelum terpotong proses login (terutama untuk OAuth callback yang membutuhkan page redirect).

## 2. Google OAuth Flow
1. User mengklik "Sign in with Google" di halaman Login Frontend.
2. Frontend memanggil `GET /api/v1/auth/google/redirect` untuk mendapatkan URL redirect Google dari backend.
3. Browser diarahkan ke server Google untuk proses consent.
4. Setelah disetujui, Google mengalihkan user ke endpoint backend `GET /api/v1/auth/google/callback`.
5. Backend membuat/mencari user, menghasilkan token Sanctum, lalu mengarahkan browser KEMBALI ke frontend: `http://localhost:5173/auth/callback?token=xxxx`.
6. `GoogleCallbackPage` di Frontend menangkap parameter token, menyimpannya di localStorage, dan memanggil `GET /api/v1/auth/me` untuk inisialisasi data profil & role.
7. User diarahkan ke modul spesifik berdasarkan rolenya.

## 3. Backend Endpoints Used
| Endpoint | Method | Fungsi |
|---|---|---|
| `/api/v1/auth/login` | POST | Login standar email & password |
| `/api/v1/auth/register` | POST | Registrasi akun baru |
| `/api/v1/auth/logout` | POST | Invalidate token dan keluar sesi |
| `/api/v1/auth/me` | GET | Mendapatkan profil aktif beserta relasi Role |
| `/api/v1/auth/google/redirect` | GET | Meminta URL tujuan persetujuan Google OAuth |
| `/api/v1/auth/google/callback` | GET | Webhook callback dari Google -> Redirect ke FE |

## 4. Frontend Routes & Protected Routes
Rute dilindungi menggunakan komponen `<ProtectedRoute allowedRoles={[...]}>`.
- **`/login`**: Halaman masuk (dilewati jika sudah login).
- **`/register`**: Halaman daftar.
- **`/auth/callback`**: Halaman tunggu ekstraksi token dari Google.
- **`/valuasi/*`**: Modul Valuasi. Hanya dapat diakses oleh **Admin**, **Administrator**, dan **Peneliti**.
- **`/admin/*`**: Dashboard Admin. Hanya dapat diakses oleh **Admin** dan **Administrator**.

## 5. Role Mapping & Redirect
Setelah login berhasil, router memverifikasi data role dari `user.role.nama_role`:
- **Admin / Administrator**: Diarahkan ke `/admin` (jika login secara langsung).
- **Peneliti**: Diarahkan ke modul Valuasi (`/valuasi/projects`).
Jika user sebelumnya meminta link tertentu (misal: `/valuasi/projects/1`), user akan dikembalikan tepat ke rute tersebut.

## 6. API Client (Axios)
Semua panggilan API dilakukan menggunakan instance Axios yang berada di `src/services/api.js`.
- Base URL diset dari `VITE_API_URL` (default: `http://localhost:8000/api/v1`).
- Interceptor me-nyematkan `Authorization: Bearer <token>` pada setiap _request_.
- Interceptor global menangkap 401 Unauthorized dan otomatis membersihkan token lalu mengembalikan user ke `/login`.

## 7. Notification (Toast) System
Menggunakan library `react-hot-toast`:
- Komponen top-level `<Toaster />` diletakkan di `App.jsx`.
- Notifikasi *"Login berhasil. Selamat datang, [Nama]!"* muncul seketika setelah data sesi direkapitulasi.
- Error penolakan login dimunculkan sebagai UI feedback, bukan sekadar _console error_.
- Logout mengeluarkan alert *"Anda berhasil keluar."*.

## 8. Error Handling
- **401 Unauthorized**: Diatasi oleh Interceptor Axios, langsung log-out otomatis.
- **403 Forbidden**: Akan dihadang oleh Protected Route, merender pesan UI _"Access Denied"_.
- **Network / 500**: Block logic `try...catch` pada page form akan menangkap error message default `err.response?.data?.message || 'Login gagal.'` untuk di-render di Toast.

## 9. Google Login Role Fix (2026-09-01)
### Bug yang ditemukan
- Seeder sebelumnya membuat user seperti `peneliti@gmail.com`, tetapi callback Google dan lookup auth masih mengacu ke `peneliti@pkspl.test` dan `analyst@pkspl.test`.
- Akun yang tidak terdaftar sebelumnya dibuat otomatis sebagai `Guest` di backend saat Google callback diproses.
- `UserResource` tidak selalu membawa relasi `role`, sehingga frontend dapat menerima `undefined` atau role kosong saat proses login dan /auth/me.
- `ProtectedRoute` menampilkan akses ditolak tanpa log yang jelas, sehingga bug role sulit didiagnosa.

### Perbaikan yang dilakukan
- Google callback hanya menerima pengguna yang sudah ada di database berdasarkan email Google yang login.
- Jika email tidak terdaftar, backend menolak login dan mengarahkan kembali ke /login dengan pesan jelas; tidak dibuat otomatis sebagai Guest / Peneliti / Admin.
- `AuthController::login()` dan `AuthController::me()` sekarang memuat relasi `role` dan membandingkan email dalam lowercase agar case-insensitive.
- `UserResource` mengembalikan `role` dari data backend yang sudah dimuat.
- `ProtectedRoute` menambahkan `console.warn` dengan detail user/allowedRoles untuk debug akses ditolak.
- `GoogleCallbackPage` memetakan role ke redirect yang benar: Admin -> /admin, Peneliti -> /valuasi/projects.
- Toast yang tampil sudah spesifik: "Anda berhasil login sebagai Peneliti." atau "Anda berhasil login sebagai Admin."

### Struktur response auth yang digunakan
```json
{
  "user": {
    "id_user": 3,
    "id_role": 3,
    "nama": "Bima Saputra",
    "email": "peneliti@gmail.com",
    "foto": null,
    "status": "Aktif",
    "role": {
      "id_role": 3,
      "nama_role": "Peneliti"
    }
  }
}
```

### Mapping role ke route
- Admin -> /admin
- Peneliti -> /valuasi/projects
- Analyst -> tetap mengikuti behavior existing yang sudah ada di frontend/backend
- Guest -> halaman terbatas / akses tidak diberikan ke endpoint protected
- User belum terdaftar -> tidak diberikan role otomatis

### Endpoint utama
- GET /api/v1/auth/google/redirect
- GET /api/v1/auth/google/callback
- POST /api/v1/auth/login
- GET /api/v1/auth/me
- POST /api/v1/auth/logout

### File yang diubah
- [PKSPL-Backend/src/app/Http/Controllers/Api/V1/AuthController.php](PKSPL-Backend/src/app/Http/Controllers/Api/V1/AuthController.php)
- [PKSPL-Backend/src/app/Http/Resources/UserResource.php](PKSPL-Backend/src/app/Http/Resources/UserResource.php)
- [PKSPL-Backend/src/database/seeders/UserSeeder.php](PKSPL-Backend/src/database/seeders/UserSeeder.php)
- [PKSPL-Backend/src/database/seeders/ProyekSeeder.php](PKSPL-Backend/src/database/seeders/ProyekSeeder.php)
- [PKSPL-Backend/src/database/seeders/ProsesAnalisisSeeder.php](PKSPL-Backend/src/database/seeders/ProsesAnalisisSeeder.php)
- [PKSPL-Project-Frontend/src/contexts/AuthContext.jsx](PKSPL-Project-Frontend/src/contexts/AuthContext.jsx)
- [PKSPL-Project-Frontend/src/components/ProtectedRoute.jsx](PKSPL-Project-Frontend/src/components/ProtectedRoute.jsx)
- [PKSPL-Project-Frontend/src/pages/GoogleCallbackPage.jsx](PKSPL-Project-Frontend/src/pages/GoogleCallbackPage.jsx)

### Hasil testing yang tercatat
1. `docker compose exec app php artisan db:seed` -> berhasil, exit code 0.
2. `npm run build` pada frontend -> berhasil, exit code 0.
3. Akses user Google terdaftar dengan email `peneliti@gmail.com` sekarang akan dibaca dari database dan role `Peneliti` dipakai secara benar.
4. User tidak terdaftar tidak otomatis diberikan role Admin/Peneliti.
5. Login Google dan refresh session tetap mengikuti flow token Sanctum yang sudah ada.

### Catatan pengujian otomatis
- PHPUnit yang ada di repo masih memiliki 1 test gagal yang bukan terkait auth, yaitu `AttachmentServiceTest` yang mengarah ke method undefined; ini bukan regresi dari perubahan auth ini.
- Frontend build sukses, namun suite backend existing belum sepenuhnya hijau karena issue unrelated di test attachment service.

---
_Dibuat pada: 2026-09-01_
