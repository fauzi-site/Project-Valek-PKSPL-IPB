# 01 — Laravel Project Setup

Implement the Laravel application foundation for the PKSPL backend according to `00_Architecture.md`. Docker infrastructure must already exist from `02_Docker_Setup.md`; use only Docker commands for Composer, Artisan, Pint, PHPStan, and tests.

## Goal

Create a Laravel 12 application in `src/` if one does not exist. If Laravel already exists, inspect it and make only the missing, compatible setup changes. Do not overwrite an existing application or generated configuration blindly.

## Requirements

- Use PHP 8.3 and Laravel 12.
- Configure the project as an API-only application. API routes must be versioned under `/api/v1`.
- Install and configure only the packages required by the approved architecture: JWT authentication, Google OAuth via Laravel Socialite, Swagger/OpenAPI, Pint, PHPStan/Larastan, and PHPUnit support. Before installing each package, verify current Laravel 12/PHP 8.3 compatibility in official package documentation.
- Do not configure a second authentication mechanism such as Sanctum unless it is required by a selected package or explicitly approved.
- Add the folder structure described in `00_Architecture.md` only as concrete classes are created; do not commit empty placeholder directories.
- Configure `.env.example` with non-secret Docker service hostnames (`DB_HOST=postgres`, etc.) and placeholder OAuth/JWT values. Never commit real secrets.
- Add a short README section covering prerequisites, first-time install, container commands, and the API base URL. Docker-specific detail belongs to `02_Docker_Setup.md`.
- Configure Pint and PHPStan at a strictness level that passes the project without suppressing real errors. Do not add blanket ignore rules.

## Required verification

Run the smallest relevant Docker commands, for example:

```bash
docker compose up -d --build
docker compose exec app composer install
docker compose exec app php artisan about
docker compose exec app php artisan route:list
```

Report commands that could not be run and why. Do not claim that migrations, authentication, Swagger, or tests are complete at this stage.
