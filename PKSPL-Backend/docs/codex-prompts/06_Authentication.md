# 06 — Authentication and Authorization

Implement authentication for the existing Laravel 12 PKSPL API according to `00_Architecture.md`. First inspect the users/roles schema, the selected JWT and OAuth package documentation, existing API response/error format, and Laravel 12 middleware registration.

## Required capabilities

- JWT register, login, refresh-token, logout, and authenticated `GET /api/v1/auth/me` endpoints.
- Google OAuth login flow using Laravel Socialite and configuration only from environment variables.
- Forgot-password and reset-password endpoints using Laravel's password broker.
- Email verification using Laravel's verification mechanism, only after confirming the `users` table contains the schema Laravel requires. If extra fields/migrations are required, stop and ask approval rather than silently changing the schema.
- Role-based middleware/policies based only on `users.id_role` and `roles`. Implement ownership checks where the schema supports ownership (for example, a project belongs to a user).

## Constraints

- The supplied schema has no permissions tables and no role/action matrix. Do not invent granular permissions, seed roles, or decide which role is allowed to do what. Ask for the matrix before enforcing role names.
- The supplied schema also has no standard `email_verified_at`, reset-token table, or remembered-token field. Use framework-required tables only after explicit schema approval; do not pretend these features work without their storage requirements.
- Never return password hashes, JWT secrets, Google tokens, or raw provider responses in API Resources/logs.
- Reject non-active users only if `users.status = 'Nonaktif'` is intended as an access restriction; request confirmation before making that business rule.
- Use correct HTTP statuses and the shared response/error convention.

## Required tests

Add feature tests for login success/failure, protected endpoint rejection, refresh/logout behavior, `me`, and ownership/policy behavior that is actually defined. Mock Google/provider interactions; do not call external OAuth during tests.
