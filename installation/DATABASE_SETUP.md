# RideDesk - Database Configuration Guide

This guide explains how to set up the MySQL or MariaDB database for RideDesk in production or local environments.

---

## 1. Create the Database & User

### Using MySQL / MariaDB Command Line
Log in to your MySQL terminal as `root`:
```sql
mysql -u root -p
```

Run the following SQL commands to create a dedicated database and user with appropriate privileges:

```sql
-- Create database with full UTF-8 character support
CREATE DATABASE ridedesk_db CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- Create dedicated database user (replace 'your_secure_password' with a strong password)
CREATE USER 'ridedesk_user'@'localhost' IDENTIFIED BY 'your_secure_password';

-- Grant privileges on the RideDesk database
GRANT ALL PRIVILEGES ON ridedesk_db.* TO 'ridedesk_user'@'localhost';

-- Apply changes
FLUSH PRIVILEGES;
EXIT;
```

---

### Using phpMyAdmin / cPanel
1. Open **cPanel** > **MySQL® Database Wizard** (or **phpMyAdmin**).
2. Create a new database named `ridedesk_db`.
3. Create a new user named `ridedesk_user` and assign a strong password.
4. Add the user to the database and check **ALL PRIVILEGES**.

---

## 2. Configure Backend `.env`

In your `backend-laravel/` directory (or application root):
1. Copy `installation/env.production.example` to `.env`:
   ```bash
   cp installation/env.production.example backend-laravel/.env
   ```
2. Update the database section with your database credentials:
   ```env
   DB_CONNECTION=mysql
   DB_HOST=127.0.0.1
   DB_PORT=3306
   DB_DATABASE=ridedesk_db
   DB_USERNAME=ridedesk_user
   DB_PASSWORD=your_secure_password
   ```

---

## 3. Run Migrations & Seed Default Data

Run the following commands inside `backend-laravel/`:

```bash
# 1. Generate application encryption key (if not already set)
php artisan key:generate

# 2. Run all database tables and indexes
php artisan migrate --force

# 3. Create storage symlink for uploaded files & documents
php artisan storage:link

# 4. Optional: Seed initial default demo records (or seed clean admin)
php artisan db:seed --force
```

---

## 4. Default Seeded Accounts

If you run `php artisan db:seed`, the following accounts will be created:

| Email | Password | Role | Permissions |
|---|---|---|---|
| `admin@ridedesk.test` | `password` | Admin | Full control: taxis, drivers, bookings, offices, settings, reports, users |
| `staff@ridedesk.test` | `password` | Staff | Manage branch bookings, taxis, drivers, maintenance |
| `driver@ridedesk.test` | `password` | Driver | View assigned bookings & trips |

> **IMPORTANT:** In production, log in as `admin@ridedesk.test` immediately and update the password under **Profile > Security**, or update the user via `php artisan tinker`.

