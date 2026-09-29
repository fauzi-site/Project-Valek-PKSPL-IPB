# Changelog

## 2026-09-01 — Authentication Refinement (Continuation)

### Added
- `react-hot-toast` npm dependency for notification system.
- `<Toaster>` component to `App.jsx` for global toast notifications.

### Modified
- `src/App.jsx` — Wrapped `/admin/*` routes inside `<ProtectedRoute allowedRoles={['Admin', 'Administrator']}>`.
- `src/contexts/AuthContext.jsx` — Updated `login`, `register`, and `handleAuthCallback` to return the `user` object immediately.
- `src/pages/LoginPage.jsx` — Integrated `toast` for success/error notifications. Implemented automatic role-based redirect (`/admin` vs `/valuasi/projects`) when no explicit `from` state is provided.
- `src/pages/GoogleCallbackPage.jsx` — Integrated `toast` notifications. Added the same role-based redirect logic for Google OAuth success flow.
- `src/components/Navbar.jsx` — Added success toast upon logout. Updated the "Valuasi" nav link to intelligently direct Admin users to `/admin` instead of the hardcoded `/valuasi/projects`.

### Unchanged
- `src/services/api.js` — Core Axios configuration remains unchanged.
- Backend Controllers, Models, and APIs — Fully unchanged as per strict guidelines.

### Testing
- `npm run build` executed successfully (PASS).
- Manual browser verification pending.

## 2026-09-01 — Authentication Integration

### Added
- `src/services/api.js` — Centralized axios instance with auth interceptors
- `src/services/authService.js` — Authentication API service (login, register, logout, getMe, googleRedirect)
- `src/contexts/AuthContext.jsx` — Global authentication state management
- `src/components/ProtectedRoute.jsx` — Route guard with role-based access control
- `src/pages/GoogleCallbackPage.jsx` — Google OAuth callback handler page
- `.env` — Frontend environment configuration (VITE_API_URL)
- `docs/authentication-integration.md` — Authentication integration documentation
- `docs/authentication-implementation.md` — Implementation log
- `docs/CHANGELOG.md` — This changelog
- `axios` npm dependency for HTTP requests

### Modified
- `src/pages/LoginPage.jsx` — Connected to backend auth API, field `email` → `identity`, Google OAuth button handler, error/loading states
- `src/pages/RegisterPage.jsx` — Connected to backend auth API, field `fullName` → `nama`, error/loading states
- `src/App.jsx` — Added AuthProvider wrapper, ProtectedRoute for `/valuasi/*`, `/auth/callback` route
- `src/components/Navbar.jsx` — Auth-aware UI: conditional "Daftar/Masuk" vs user info + "Keluar" button
- `package.json` / `package-lock.json` — Added axios dependency

### Backend Modified
- `app/Http/Controllers/Api/V1/AuthController.php` — `googleCallback()` changed from JSON response to redirect to frontend URL with token
- `app/Http/Resources/UserResource.php` — Added `role` field via RoleResource
- `.env` — Added `FRONTEND_URL=http://localhost:5173`
- `.env.example` — Resolved merge conflict, added Google OAuth + FRONTEND_URL variables

### Removed
- Nothing removed

### Fixed
- Field name mismatch between frontend and backend (email→identity, fullName→nama)
- Google OAuth flow incompatibility with SPA (JSON response → redirect)
- Missing role data in /auth/me response

### Testing
- Build verification: pending (npm run dev)
- Manual integration testing required with running backend

### Notes
- Authentication uses Sanctum Bearer Token (not cookie/session)
- Google Client Secret remains exclusively on backend
- Admin routes (/admin/*) are not yet protected — to be done when admin module is ready
- Token expiration is currently unlimited (null) — should be configured for production
