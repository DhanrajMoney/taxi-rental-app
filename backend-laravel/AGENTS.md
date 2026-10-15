# Laravel Backend Guidelines

This directory contains the RideDesk Laravel 13 API. The React client is in the sibling `../frontend-react` directory.

## Verified prerequisites

Run these checks before backend work:

```powershell
php -v
composer -V
```

The project requires PHP `^8.3`; the current development environment uses PHP 8.4 and Composer 2.8.

## Backend workflow

Run commands from `backend-laravel/`:

```powershell
composer install
php artisan migrate
php artisan test
```

Start the API with:

```powershell
php artisan serve
```

The API is served at `http://127.0.0.1:8000/api`. The React development server runs separately at `http://localhost:5173`.

## Project conventions

- Keep API routes in `routes/api.php`.
- Keep API controllers, requests, and models under their existing `app/` namespaces.
- Protect authenticated endpoints with Sanctum and enforce role restrictions with the existing role middleware.
- Add migrations for schema changes; do not edit the live database manually.
- Add focused feature tests under `tests/Feature/` for endpoint behavior, validation, and permissions.
- Run `php artisan migrate:status` when diagnosing missing-table errors.
- Run `php artisan test` after backend changes.

## Current API areas

The backend supports authentication, taxis, drivers, bookings, maintenance records, and dashboard overview metrics. Maintenance CRUD routes are wired for admins and staff. The dashboard includes driver document expiry counts and alert details. Driver booking list/detail results are not yet restricted to the authenticated driver's assignments; treat this as an access-control gap.

Do not add Laravel Boost or other development dependencies unless the user explicitly requests the tooling change.
