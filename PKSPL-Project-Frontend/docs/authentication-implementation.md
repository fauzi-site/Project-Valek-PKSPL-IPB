# Authentication Implementation Log

## 1. Kondisi Awal

### Frontend (PKSPL-Project-Frontend)
- React 18.2.0 + Vite 5.1.4
- Tailwind CSS 3.4.1
- react-router-dom 6.22.0
- **Tidak ada** API client (axios/fetch)
- **Tidak ada** authentication state management
- **Tidak ada** protected routes
- LoginPage: form with `console.log` only, no API call
- RegisterPage: form with `console.log` only, no API call
- Google Login button: visual only, no onClick handler
- Navbar: hardcoded "Daftar / Masuk" button

### Backend (PKSPL-Backend)
- Laravel 13.8 + Sanctum 4.3
- Google OAuth implemented manually (not using Socialite)
- `googleCallback()` returned JSON response (incompatible with SPA)
- `UserResource` did not include role data
- CORS default: `allowed_origins: *` (sufficient for token auth)

## 2. Hasil Audit

Full audit documented in research report. Key findings:
- Backend uses Sanctum Bearer Token (not cookie/session)
- Google OAuth callback incompatible with SPA (returns JSON instead of redirect)
- UserResource missing role field
- Field name mismatch: FE `email` vs BE `identity`, FE `fullName` vs BE `nama`
- No CORS issues for token-based auth

## 3. Keputusan Implementasi

1. **Bearer Token via localStorage** — chosen because backend already implements token-based auth
2. **AuthContext (React Context API)** — lightest solution, no new dependency (vs Redux/Zustand)
3. **axios** — added because project had no HTTP client; interceptors simplify auth header injection
4. **Google OAuth: backend redirect approach** — backend redirects to frontend with token in URL query param
5. **sessionStorage for redirect intent** — safe for single-tab, auto-cleared; for Google OAuth flow where location state is lost during page redirect
6. **location state for redirect intent** — for normal login flow within SPA (no page reload)

## 4. File yang Dibuat

| File | Fungsi |
|------|--------|
| `src/services/api.js` | Axios instance, baseURL dari VITE_API_URL, request interceptor (inject Bearer token), response interceptor (handle 401) |
| `src/services/authService.js` | Auth API calls: login, register, logout, getMe, getGoogleRedirectUrl |
| `src/contexts/AuthContext.jsx` | AuthProvider: user state, loading, isAuthenticated, login/register/logout/loginWithGoogle/handleAuthCallback/hasRole |
| `src/components/ProtectedRoute.jsx` | Route guard: loading spinner, auth redirect, role check, Access Denied page |
| `src/pages/GoogleCallbackPage.jsx` | Extract token from URL params, call handleAuthCallback, redirect to intended page |
| `.env` | VITE_API_URL=http://localhost:8000/api/v1 |
| `docs/authentication-integration.md` | Full documentation |
| `docs/authentication-implementation.md` | This file |
| `docs/CHANGELOG.md` | Change log |

## 5. File yang Diubah

| File | Perubahan |
|------|-----------|
| `src/pages/LoginPage.jsx` | Field `email` → `identity`, added useAuth/useLocation, handleSubmit calls login(), Google button onClick calls loginWithGoogle(), error display, loading state, reads error from location state |
| `src/pages/RegisterPage.jsx` | Field `fullName` → `nama`, added useAuth, handleSubmit calls register(), error display, loading state, redirect to / on success |
| `src/App.jsx` | Added AuthProvider wrapper, ProtectedRoute for /valuasi/*, /auth/callback route for GoogleCallbackPage |
| `src/components/Navbar.jsx` | Added useAuth, conditional rendering: "Daftar/Masuk" when not auth, user name + "Keluar" when auth, same for mobile menu |
| `package.json` | Added axios dependency |

### Backend Files Changed

| File | Perubahan |
|------|-----------|
| `app/Http/Controllers/Api/V1/AuthController.php` | `googleCallback()`: removed `: JsonResponse` return type, changed final return from JSON to `redirect()->away()` to frontend URL with token |
| `app/Http/Resources/UserResource.php` | Added `RoleResource` import, added `'role' => new RoleResource($this->whenLoaded('role'))` |
| `.env` | Added `FRONTEND_URL=http://localhost:5173` |
| `.env.example` | Resolved merge conflict, added GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, GOOGLE_REDIRECT_URI, FRONTEND_URL |

## 6. File yang Tidak Diubah

| File | Alasan |
|------|--------|
| `src/main.jsx` | Tidak perlu perubahan, AuthProvider di dalam App.jsx |
| `src/components/AdminLayout.jsx` | Admin auth belum diimplementasi |
| `src/components/Sidebar.jsx` | Admin auth belum diimplementasi |
| `routes/api.php` | Endpoint sudah lengkap |
| `config/auth.php` | Konfigurasi sudah benar |
| `config/services.php` | Google OAuth config sudah benar |
| `app/Models/User.php` | Model sudah memiliki HasApiTokens |
| `app/Models/Role.php` | Role constants sudah benar |

## 7. Endpoint Backend yang Digunakan

| Endpoint | Digunakan Oleh |
|----------|---------------|
| `GET /auth/google/redirect` | `authService.getGoogleRedirectUrl()` → `LoginPage` Google button |
| `GET /auth/google/callback` | Browser redirect dari Google (bukan AJAX) |
| `POST /auth/login` | `authService.login()` → `AuthContext.login()` → `LoginPage` |
| `POST /auth/register` | `authService.register()` → `AuthContext.register()` → `RegisterPage` |
| `GET /auth/me` | `authService.getMe()` → `AuthContext` init + callback |
| `POST /auth/logout` | `authService.logout()` → `AuthContext.logout()` → `Navbar` |

## 8. Flow Authentication

Lihat `docs/authentication-integration.md` bagian 3.

## 9. Role Authorization

- ProtectedRoute menerima `allowedRoles` prop
- Saat ini hanya `/valuasi/*` yang dilindungi dengan roles: `['Admin', 'Peneliti']`
- Role dibaca dari `user.role.nama_role` yang berasal dari `/auth/me`
- Backend Role model constants: Admin, Analyst, Peneliti, Guest

## 10. Testing

Manual verification required — memerlukan backend berjalan dan Google OAuth credentials valid.

## 11. Known Issues

1. Password double-hashing pada register (Hash::make + hashed cast)
2. Token tidak expire (Sanctum expiration = null)
3. Admin routes belum dilindungi
4. Google OAuth memerlukan konfigurasi manual di Google Cloud Console

## 12. Next Step

1. Jalankan backend dan frontend
2. Test Google OAuth end-to-end
3. Verifikasi role-based access
4. Implementasi auth di admin routes (jika diperlukan)
5. Set token expiration untuk production
6. Investigasi password double-hashing issue
