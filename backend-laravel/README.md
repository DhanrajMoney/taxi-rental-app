# RideDesk Backend — Laravel + MySQL

The RideDesk Laravel API provides authentication and taxi, driver, booking, maintenance, and dashboard workflows.

## Setup

1. Enter the backend app (PHP 8.3+ and Composer are required; PHP 8.4 is available through Herd):
   ```bash
   cd backend-laravel
   ```

2. The module files are already installed in the matching folders:
   - `app/Models/Taxi.php`, `app/Models/Driver.php`
   - `app/Http/Controllers/Api/TaxiController.php`, `DriverController.php`, `BookingController.php`, `MaintenanceController.php`
   - `app/Http/Requests/StoreTaxiRequest.php`, `StoreDriverRequest.php`
   - `database/migrations/2026_07_26_000001_create_drivers_table.php`
   - `database/migrations/2026_07_26_000002_create_taxis_table.php`
   - `database/migrations/2026_09_27_000001_create_maintenance_records_table.php`
   - `database/migrations/2026_09_27_000002_optimize_query_indexes.php`
   - `routes/api.php`

3. Configure `.env` for MySQL if your local credentials differ:
   ```
   DB_CONNECTION=mysql
   DB_HOST=127.0.0.1
   DB_PORT=3306
   DB_DATABASE=ridedesk
   DB_USERNAME=root
   DB_PASSWORD=your_password
   ```

4. Create the database if needed, then run migrations and link storage:
   ```bash
   mysql -u root -p -e "CREATE DATABASE ridedesk"
   php artisan migrate
   php artisan storage:link
   ```

5. Enable CORS for the React dev server — add or configure `config/cors.php` with:
   ```php
   'paths' => ['api/*', 'storage/*'],
   'allowed_origins' => ['http://localhost:5173', 'http://127.0.0.1:5173'],
   ```

6. Run the API:
   ```bash
   php artisan serve
   # API base: http://127.0.0.1:8000/api
   ```

## Endpoints

| Method | Endpoint             | Purpose                          |
|--------|-----------------------|-----------------------------------|
| GET    | /api/taxis            | List taxis (search, status, type; paginated) |
| POST   | /api/taxis            | Add a taxi                        |
| GET    | /api/taxis/{id}       | View a taxi                       |
| PUT    | /api/taxis/{id}       | Update a taxi                     |
| DELETE | /api/taxis/{id}       | Soft-delete a taxi                |
| GET    | /api/drivers          | List drivers (search, status; paginated) |
| POST   | /api/drivers          | Add a driver                      |
| GET    | /api/drivers/{id}     | View a driver                     |
| PUT    | /api/drivers/{id}     | Update a driver                   |
| DELETE | /api/drivers/{id}     | Soft-delete a driver               |
| GET       | /api/bookings            | List bookings (search, status; paginated) |
| POST      | /api/bookings            | Create a booking (admin/staff) |
| GET       | /api/bookings/{id}       | View a booking |
| PUT/PATCH | /api/bookings/{id}       | Update a booking (admin/staff) |
| DELETE    | /api/bookings/{id}       | Cancel a booking (admin/staff) |
| GET       | /api/maintenance         | List maintenance records (optional `taxi_id` filter) |
| GET       | /api/maintenance/{id}    | View a maintenance record |
| POST      | /api/maintenance         | Create a maintenance record (admin/staff) |
| PUT/PATCH | /api/maintenance/{id}    | Update a maintenance record (admin/staff) |
| DELETE    | /api/maintenance/{id}    | Delete a maintenance record (admin/staff) |
| GET       | /api/dashboard/overview  | Operational metrics, document alerts, and recent activity |

Authentication endpoints:

| Method | Endpoint | Purpose |
|--------|----------|---------|
| POST | /api/auth/login | Return a Sanctum bearer token |
| POST | /api/auth/forgot-password | Send a password reset link |
| POST | /api/auth/reset-password | Reset a user password |
| GET | /api/auth/me | Return the authenticated user |
| POST | /api/auth/logout | Revoke the current token |

All protected endpoints require a valid Sanctum bearer token. On update requests, both `PUT` and `PATCH` are supported.

## Authentication
Authentication is implemented with Laravel Sanctum:
- `POST /api/auth/login` with `email` and `password` returns a bearer token.
- `GET /api/auth/me` returns the authenticated user and role.
- `POST /api/auth/logout` revokes the current token.
- Taxi and driver API routes require `Authorization: Bearer <token>`.

Role permissions:

| Role   | View operational data | Create, update, delete taxis/drivers/bookings |
|--------|-----------------------|-----------------------------------------------|
| Admin  | Yes                   | Yes                                           |
| Staff  | Yes                   | Yes                                           |
| Driver | Yes                   | No                                            |

Drivers can authenticate and the React workspace directs them to bookings. Important: booking list and detail API results are not scoped to the authenticated driver's assignments. Treat this as an access-control gap and do not expose driver accounts to production data until it is fixed.

Example login request:

```bash
curl -X POST http://127.0.0.1:8000/api/auth/login \
   -H "Content-Type: application/json" \
   -d '{"email":"admin@ridedesk.test","password":"password"}'
```

For local development, the seeder creates these accounts, all with password `password`:

| Email | Role | Permissions |
|-------|------|-------------|
| `admin@ridedesk.test` | Admin | View and manage taxis, drivers, and bookings |
| `staff@ridedesk.test` | Staff | View and manage taxis, drivers, and bookings |
| `driver@ridedesk.test` | Driver | Read operational data; frontend workspace is bookings-focused |

Change or remove these development accounts before deploying.

## Current implementation and limitations

- Maintenance CRUD, taxi filtering, service history, and due-within-30-days alerts are available in the API and React workspace.
- The dashboard overview returns driver document expiry counts and alert details. The driver form does not expose insurance expiry, and the React Documents panel currently uses sample data and local-only uploads rather than persistent document records.
- Forgot-password and reset-password API and login UI flows are implemented. Notifications, authenticated password changes, login activity, admin user management, reports/exports, and production user provisioning remain outstanding.
- Multi-office locations and location-based access control are not implemented.
- Driver booking results are not assignment-scoped; this must be addressed before production use with driver accounts.
