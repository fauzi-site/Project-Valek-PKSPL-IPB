# Authentication Integration

## 1. Tujuan

Menghubungkan frontend React+Vite (PKSPL-Project-Frontend) dengan backend Laravel (PKSPL-Backend) untuk autentikasi pengguna menggunakan Google OAuth dan login konvensional (email/password), dengan otorisasi berbasis role untuk modul Valuasi.

## 2. Architecture

```
React (localhost:5173)
    ↓ HTTP Request (axios)
Laravel REST API (localhost:8000/api/v1)
    ↓ Sanctum Bearer Token
Authentication Guard
    ↓ Eloquent
PostgreSQL Database (users, personal_access_tokens, roles)
```

**Mekanisme:** Sanctum API Token (Bearer Token)
- Frontend mengirim `Authorization: Bearer {token}` di setiap request
- Backend memvalidasi token via tabel `personal_access_tokens`
- Tidak menggunakan cookie/session/CSRF untuk autentikasi API

## 3. Authentication Flow

### Google OAuth Flow

```
Landing Page
→ User klik "Daftar / Masuk" atau "Valuasi"
→ /login
→ User klik "Sign in with Google"
→ Frontend GET /api/v1/auth/google/redirect
→ Frontend terima { redirect_url }
→ window.location.href = redirect_url (ke Google)
→ User login di Google
→ Google redirect ke backend: /api/v1/auth/google/callback?code=...
→ Backend exchange code → access_token → userinfo
→ Backend create/update user + generate Sanctum token
→ Backend redirect ke: http://localhost:5173/auth/callback?token=...
→ Frontend GoogleCallbackPage extract token dari URL
→ Frontend simpan token di localStorage
→ Frontend GET /api/v1/auth/me (dengan Bearer token)
→ Frontend terima user data + role
→ Frontend set AuthContext state
→ Redirect ke intended destination
```

### Login Konvensional Flow

```
/login
→ User masukkan identity (email/nama) + password
→ Frontend POST /api/v1/auth/login
→ Backend validasi credentials
→ Backend return { user, access_token, token_type }
→ Frontend simpan access_token di localStorage
→ Frontend set user state
→ Redirect ke intended destination
```

## 4. Login Entry Points

### A. Daftar / Masuk (dari Navbar)

- Tombol di Navbar mengarahkan ke `/login`
- Setelah login berhasil, redirect ke `/` (home) atau intended destination jika ada

### B. Valuasi (dari Navbar link)

- Link "Valuasi" di Navbar mengarah ke `/valuasi/projects`
- Route `/valuasi/*` dilindungi oleh `ProtectedRoute`
- Jika belum login → redirect ke `/login` dengan `state.from` = lokasi yang dituju
- Setelah login berhasil → redirect kembali ke `/valuasi/projects`

## 5. API Endpoints

| Method | Endpoint | Fungsi | Authentication |
|--------|----------|--------|----------------|
| GET | /api/v1/auth/google/redirect | Mendapatkan Google OAuth URL | No |
| GET | /api/v1/auth/google/callback | Menerima callback dari Google | No |
| POST | /api/v1/auth/login | Login dengan email/nama + password | No |
| POST | /api/v1/auth/register | Registrasi akun baru | No |
| GET | /api/v1/auth/me | Mendapatkan data user yang sedang login | Yes (Bearer Token) |
| POST | /api/v1/auth/logout | Logout dan revoke token | Yes (Bearer Token) |

## 6. Role Authorization

| Role | Akses Valuasi | Status |
|------|--------------|--------|
| Administrator (Admin) | Diizinkan | Aktif |
| Peneliti | Diizinkan | Aktif |
| Analyst | Ditolak | Belum digunakan |
| Guest | Ditolak | Belum digunakan |

Role berasal dari backend melalui endpoint `/auth/me`. Frontend TIDAK menentukan role sendiri.

## 7. Frontend Files

| File | Status | Perubahan | Alasan |
|------|--------|-----------|--------|
| `src/services/api.js` | NEW | Axios instance + auth interceptor | Centralized API client |
| `src/services/authService.js` | NEW | Auth API calls | Auth service layer |
| `src/contexts/AuthContext.jsx` | NEW | Global auth state + actions | Single source of truth |
| `src/components/ProtectedRoute.jsx` | NEW | Route guard component | Route protection |
| `src/pages/GoogleCallbackPage.jsx` | NEW | Google OAuth callback handler | Token extraction |
| `.env` | NEW | VITE_API_URL | Environment config |
| `src/pages/LoginPage.jsx` | MODIFIED | API integration, field mapping | Backend connection |
| `src/pages/RegisterPage.jsx` | MODIFIED | API integration, field mapping | Backend connection |
| `src/App.jsx` | MODIFIED | AuthProvider, ProtectedRoute, routes | Auth integration |
| `src/components/Navbar.jsx` | MODIFIED | Auth-aware UI | UX improvement |
| `package.json` | MODIFIED | axios dependency | HTTP client |

## 8. Backend Files

| File | Perubahan | Alasan |
|------|-----------|--------|
| `AuthController.php` googleCallback() | Return redirect instead of JSON | SPA compatibility |
| `UserResource.php` | Added role field | Frontend needs role data |
| `.env` | Added FRONTEND_URL | Google callback redirect target |
| `.env.example` | Fixed merge conflict, added vars | Documentation |

## 9. Environment Variables

### Frontend (.env)
```
VITE_API_URL=http://localhost:8000/api/v1
```

### Backend — auth-related vars
```
GOOGLE_CLIENT_ID=<dari Google Console>
GOOGLE_CLIENT_SECRET=<RAHASIA - hanya di backend>
GOOGLE_REDIRECT_URI=http://localhost:8000/api/v1/auth/google/callback
FRONTEND_URL=http://localhost:5173
```

## 10. Authentication State

**Storage:** localStorage key `auth_token`
**Redirect intent:** sessionStorage key `auth_redirect`

**AuthContext provides:**
- `user` — null or user object with role
- `loading` — true during initial auth check
- `isAuthenticated` — derived from user !== null
- `login()`, `register()`, `loginWithGoogle()`, `handleAuthCallback()`, `logout()`, `hasRole()`

## 11. Protected Routes

| Route | Guard | Allowed Roles |
|-------|-------|---------------|
| `/valuasi/*` | ProtectedRoute | Admin, Peneliti |
| `/admin/*` | None (belum) | — |
| `/login`, `/register`, `/auth/callback`, `/` | Public | — |

## 12. Error Handling

| Scenario | Handling |
|----------|----------|
| 401 Unauthorized | Clear token, redirect to /login |
| 403 Forbidden | "Akses Ditolak" page |
| Google OAuth failure | Redirect to /login with error message |
| Backend unavailable | Network error displayed in form |
| Invalid credentials | Error message in form |
| Loading state | Spinner / disabled button |

## 13. Testing

| # | Test | Result |
|---|------|--------|
| 1 | Landing Page loads | Manual verification required |
| 2 | Daftar/Masuk → /login | Manual verification required |
| 3 | Valuasi (not logged in) → /login | Manual verification required |
| 4 | Google Login initiates | Manual verification required |
| 5 | Google callback works | Manual verification required |
| 6 | /auth/me returns user+role | Manual verification required |
| 7 | Admin role → Valuasi access | Manual verification required |
| 8 | Peneliti role → Valuasi access | Manual verification required |
| 9 | Other roles → Access Denied | Manual verification required |
| 10 | Logout works | Manual verification required |
| 11 | Post-logout /valuasi → login | Manual verification required |
| 12 | No Google Secret in FE | PASS |
| 13 | No duplicate auth | PASS |

## 14. Known Issues

1. **Password Double-Hashing:** Backend register() calls Hash::make() but User model has 'hashed' cast. Needs verification.
2. **Token No Expiry:** Sanctum token expiration = null. Set for production.
3. **Admin Routes Unprotected:** /admin/* not yet guarded. Implement when admin module is ready.
4. **Google OAuth Manual Setup:** Google Cloud Console must have correct redirect URI and authorized origins.
