# RideDesk Taxi Rental Operations Software
## Production Installation & Deployment Guide

> **Application Version:** `v1.6.0`  
> **Target Audience:** System Administrators, Hosting Providers, DevOps Engineers, and Fleet Operators.  
> **Architecture:** Laravel 11 RESTful API + React 18 / Vite 5 SPA (Unified Single-Origin or Decoupled)  
> **Related Documentation:**  
> - [cPanel Shared Hosting Deployment Guide](file:///c:/xampp/htdocs/RideDesk_TaxiDriver_Module/taxi-rental-app/installation/CPANEL_DEPLOYMENT_GUIDE.md)  
> - [Database Setup & Configuration Guide](file:///c:/xampp/htdocs/RideDesk_TaxiDriver_Module/taxi-rental-app/installation/DATABASE_SETUP.md)  
> - [Application Feature Documentation](file:///c:/xampp/htdocs/RideDesk_TaxiDriver_Module/taxi-rental-app/feature.md)  
> - [Nginx Configuration Example](file:///c:/xampp/htdocs/RideDesk_TaxiDriver_Module/taxi-rental-app/installation/nginx.conf.example)  
> - [Apache .htaccess Example](file:///c:/xampp/htdocs/RideDesk_TaxiDriver_Module/taxi-rental-app/installation/apache.htaccess.example)  

---

## 1. System Requirements

Before deploying RideDesk, verify that your server environment meets the following minimum and recommended specifications:

| Component | Minimum Requirement | Recommended | Notes |
|---|---|---|---|
| **PHP** | 8.2 or higher | 8.3 | Required for Laravel 11 framework core |
| **Database** | MySQL 8.0+ or MariaDB 10.5+ | MySQL 8.0+ / MariaDB 10.6+ | Full UTF-8 (`utf8mb4_unicode_ci`) character set |
| **Web Server** | Apache 2.4+ (with `mod_rewrite`) or Nginx 1.20+ | Nginx or Apache (cPanel / LiteSpeed) | Must support URL rewriting for SPA routing |
| **PHP Extensions** | `bcmath`, `ctype`, `curl`, `dom`, `fileinfo`, `filter`, `gd` or `imagick`, `hash`, `json`, `mbstring`, `openssl`, `pcre`, `pdo`, `pdo_mysql`, `session`, `tokenizer`, `xml`, `zip` | All enabled | `fileinfo` and `gd` are essential for vehicle photos and expense receipts |
| **Composer** | Composer 2.x | Latest Composer 2 | Required for CLI / Git source installations |
| **Node.js** | Node.js 18+ & npm | Node.js 20 LTS | *Only needed if building React frontend from source; the pre-built release package does NOT require Node.js on the server.* |

---

## 2. Choosing Your Deployment Method

Select the deployment workflow suited to your hosting environment:

* **Method A: Fast-Track Production Release ZIP (Recommended for Subdomains, cPanel & Shared Hosting)**  
  Best for domains like `taxi.yourdomain.com`, cPanel shared hosting, or standard Linux VPS environments where you want a clean, pre-built deployment without installing Node.js, npm, or compiling frontend assets on the server.
* **Method B: Source Code / Git Deployment (Developers & CI/CD Pipelines)**  
  Best for VPS (Ubuntu, Debian, AlmaLinux), Docker containers, or automated CI/CD pipelines where you build frontend and backend directly from Git repositories.

---

## 3. Method A: Fast-Track Deployment (Pre-Built Package)

### Step 1: Package the Application Locally (If Building from Local Source)
If you are preparing the distribution ZIP from your local development repository:
- **On Windows (PowerShell):**
  ```powershell
  powershell -ExecutionPolicy Bypass -File .\installation\package-release.ps1
  ```
- **On Linux / macOS (Terminal):**
  ```bash
  chmod +x ./installation/package-release.sh
  ./installation/package-release.sh
  ```
This executes automated testing, builds the optimized React 18 production bundle, and packages `ridedesk-v1.6.0-release.zip` with frontend assets pre-compiled inside `backend-laravel/public/`.

### Step 2: Clean the Target Directory
> [!IMPORTANT]
> If your domain or subdomain (e.g., `taxi.yourdomain.com`) previously hosted WordPress or default hosting placeholder files (such as `index.html`, `defaultwebpage.cgi`), **delete or back up and remove those files first**. Leftover WordPress files (`wp-admin`, `wp-includes`, `index.php`, `.htaccess`) will intercept web requests and prevent RideDesk from running.

### Step 3: Upload & Extract Files
1. Upload `ridedesk-v1.6.0-release.zip` to your hosting server via cPanel File Manager, SFTP, or SCP.
2. Extract the archive into your chosen project directory:
   - For Subdomains / VPS: `/home/username/ridedesk/` or `/var/www/ridedesk/`.
   - For primary cPanel domain using `public_html`: see [cPanel Deployment Guide](file:///c:/xampp/htdocs/RideDesk_TaxiDriver_Module/taxi-rental-app/installation/CPANEL_DEPLOYMENT_GUIDE.md#option-b-primary-domain-public_html).

### Step 4: Configure the Web Server Document Root
Set your domain or subdomain's **Document Root** directly to the Laravel `public` directory:
```text
/path/to/ridedesk/backend-laravel/public
```

> [!CAUTION]
> **Never** point the web server root to the parent folder of `backend-laravel`. The web root **MUST** point to `backend-laravel/public` so that `.env`, application source code, and configuration files remain completely inaccessible and protected from public web browsers.

### Step 5: Configure `.env`
1. Copy `installation/env.production.example` to `backend-laravel/.env`:
   ```bash
   cp installation/env.production.example backend-laravel/.env
   ```
2. Edit `.env` to match your domain and database credentials:
   ```env
   APP_NAME="RideDesk"
   APP_ENV=production
   APP_DEBUG=false
   APP_URL=https://taxi.yourdomain.com
   FRONTEND_URL=https://taxi.yourdomain.com

   DB_CONNECTION=mysql
   DB_HOST=127.0.0.1
   DB_PORT=3306
   DB_DATABASE=your_database_name
   DB_USERNAME=your_database_user
   DB_PASSWORD=your_database_password

   FILESYSTEM_DISK=public
   SESSION_DRIVER=database
   QUEUE_CONNECTION=database
   CACHE_STORE=database
   ```

### Step 6: Initialize Application & Database
Navigate into `backend-laravel/` on your server terminal (or SSH):
```bash
# 1. Generate unique application encryption key
php artisan key:generate --force

# 2. Execute database migrations (tables, foreign keys, indexes)
php artisan migrate --force

# 3. Create storage symlink for uploaded vehicle photos, driver documents, and receipts
php artisan storage:link

# 4. Seed initial default demo records and accounts
php artisan db:seed --force

# 5. Optimize configuration, route, and view caching for production speed
php artisan optimize
```

---

## 4. Method B: Deployment from Source (Developers & VPS)

If you are deploying directly from a Git repository or setting up a custom VPS environment:

### Step 1: Install Backend Dependencies & Configure Environment
```bash
cd backend-laravel
composer install --no-dev --optimize-autoloader
cp ../installation/env.production.example .env
php artisan key:generate --force
```

### Step 2: Build & Publish React Frontend
```bash
cd ../frontend-react
npm install
npm run build

# Publish compiled assets into Laravel public web root
# On Linux / macOS:
cp -r dist/* ../backend-laravel/public/
# On Windows PowerShell:
Copy-Item -Path "dist\*" -Destination "..\backend-laravel\public" -Recurse -Force
```

### Step 3: Run Database Migrations & Cache Optimization
```bash
cd ../backend-laravel
php artisan migrate --force
php artisan storage:link
php artisan db:seed --force
php artisan optimize
```

---

## 5. Web Server Configuration

### File Permissions (Linux / Unix)
Ensure the web server user (`www-data`, `nginx`, or `apache`) has read access to the application and write permissions to `storage` and `bootstrap/cache`:
```bash
sudo chown -R www-data:www-data /var/www/ridedesk
sudo find /var/www/ridedesk -type f -exec chmod 644 {} \;
sudo find /var/www/ridedesk -type d -exec chmod 755 {} \;
sudo chmod -R 775 /var/www/ridedesk/backend-laravel/storage
sudo chmod -R 775 /var/www/ridedesk/backend-laravel/bootstrap/cache
```

### Nginx Configuration
Refer to `installation/nginx.conf.example`. Ensure your `try_files` directive routes all non-static requests to `index.php`:
```nginx
server {
    listen 80;
    listen [::]:80;
    server_name taxi.yourdomain.com;
    root /var/www/ridedesk/backend-laravel/public;

    index index.php index.html;
    charset utf-8;

    client_max_body_size 25M;

    location / {
        try_files $uri $uri/ /index.php?$query_string;
    }

    location = /favicon.ico { access_log off; log_not_found off; }
    location = /robots.txt  { access_log off; log_not_found off; }

    error_page 404 /index.php;

    location ~ \.php$ {
        fastcgi_pass unix:/var/run/php/php8.3-fpm.sock;
        fastcgi_param SCRIPT_FILENAME $realpath_root$fastcgi_script_name;
        include fastcgi_params;
    }

    location ~ /\.(?!well-known).* {
        deny all;
    }
}
```

### Apache Configuration
Ensure `mod_rewrite` is enabled. A production-ready `.htaccess` file is pre-configured in `backend-laravel/public/.htaccess` and documented in `installation/apache.htaccess.example`.

---

## 6. Background Scheduled Tasks (Cron Jobs)

RideDesk features automated background monitoring for driver license expirations, vehicle inspection and maintenance due dates, overdue rental alerts, and background job processing.

Add this single cron job entry to your server crontab (or cPanel > **Cron Jobs**):
```bash
* * * * * cd /path/to/ridedesk/backend-laravel && php artisan schedule:run >> /dev/null 2>&1
```

If utilizing queue workers for asynchronous background emails or notifications:
```bash
php artisan queue:work --stop-when-empty
```
*(On dedicated VPS servers, run `queue:work` under `supervisor` or a systemd service).*

---

## 7. Default Accounts & First-Time Setup

When you seed initial demo data (`php artisan db:seed`), the following user accounts are provisioned:

| Email | Default Password | Role | Permissions & Access Scope |
|---|---|---|---|
| `admin@ridedesk.test` | `password` | Super Admin | Complete global access: taxis, drivers, bookings, offices, settings, reports, users, data imports, and expense approvals |
| `staff@ridedesk.test` | `password` | Operations Staff | Branch-scoped operations: bookings, taxi availability, driver assignments, maintenance logs, and trip expenses |
| `driver@ridedesk.test` | `password` | Driver Partner | Driver portal: assigned trips, route details, compliance document records, and en-route expense submissions |

> [!WARNING]
> **Essential Security & Configuration Checklist After First Login:**
> 1. Log in immediately as `admin@ridedesk.test` and navigate to **Profile > Security** to change the default admin password.
> 2. Open **Settings** from the sidebar to configure:
>    - **Company Profile:** Business legal name, customer support email, contact phone, branch physical addresses, and **Company GST / Tax Identification Number (`GSTIN`)**.
>    - **Pricing & Currency:** Currency symbol (`₹`, `$`, `€`, `£`), ISO currency code (`INR`, `USD`, `EUR`), and standard tax percentage rate.
>    - **Operational Alert Thresholds:** Document expiration warning period (default: 30 days) and upcoming vehicle maintenance alert threshold (default: 30 days).
>    - **Offices:** Configure your branch locations under **Offices** to scope staff members and assign fleet vehicles.
>    - **Legal & Compliance:** Rental Terms & Conditions template embedded into customer booking receipts.

---

## 8. Verification & Test Suite

RideDesk includes a comprehensive automated test suite verifying all core API contracts, role permissions, and workflows.

To run the full test suite locally or on your CI server:
```bash
cd backend-laravel
php artisan test
```
**Test Coverage:** 71 feature tests passing (371 assertions) covering Authentication, User Management, Office Management, Fleet Asset Records, Vehicle Photography & Ownership, Driver Compliance, Rental Bookings, Trip Expenses & P&L Engine, System Settings & GST, and Data Imports.

---

## 9. Troubleshooting Common Issues

| Issue | Root Cause | Solution |
|---|---|---|
| **Domain loads WordPress or Default Host Page (e.g. `taxi.domain.com`)** | Leftover WordPress installation files in directory, or Document Root points to parent directory. | 1. Remove all old WordPress files (`wp-admin`, `wp-includes`, `index.php`, `.htaccess`).<br>2. Set the domain's **Document Root** in cPanel/Nginx to `backend-laravel/public`. |
| **HTTP 500 Internal Server Error** | Missing `.env`, missing `APP_KEY`, incorrect database credentials, or unsupported PHP version. | 1. Ensure PHP version is **8.2+ or 8.3**.<br>2. Verify `.env` exists in `backend-laravel/`.<br>3. Run `php artisan key:generate --force`.<br>4. Inspect `backend-laravel/storage/logs/laravel.log`. |
| **White Screen / 404 on Refreshing Page URLs** | Single Page Application (SPA) fallback routing missing in web server configuration. | Ensure Nginx has `try_files $uri $uri/ /index.php?$query_string;` or Apache has `RewriteRule ^ index.php [L]` in `.htaccess`. |
| **Permission Denied on Uploads / Cache Write Error** | Web server user cannot write to `storage` or `bootstrap/cache`. | Run `chmod -R 775 storage bootstrap/cache` and ensure ownership belongs to web server user (`chown -R www-data:www-data`). |
| **Uploaded Vehicle Photos, Documents, or Receipts Return 404** | Laravel public storage symlink not created. | Run `php artisan storage:link` inside `backend-laravel/` (or use the web symlink script documented in the [cPanel Guide](file:///c:/xampp/htdocs/RideDesk_TaxiDriver_Module/taxi-rental-app/installation/CPANEL_DEPLOYMENT_GUIDE.md#3-storage-symlink-workaround)). |
| **Database Connection Refused / Access Denied** | Incorrect credentials or MySQL user privileges. | Confirm credentials in `.env`, verify MySQL service is running, and refer to [DATABASE_SETUP.md](file:///c:/xampp/htdocs/RideDesk_TaxiDriver_Module/taxi-rental-app/installation/DATABASE_SETUP.md). Note that cPanel prefixes database names and usernames with your cPanel account username (e.g. `cpaneluser_ridedesk`). |
| **CORS Errors When Frontend & API are on Different Domains** | `CORS_ALLOWED_ORIGINS` does not match the frontend URL. | In `.env`, set `CORS_ALLOWED_ORIGINS="https://taxi.yourdomain.com"` or use the Unified Single-Origin setup where both are served from the same domain. |
| **Stale Configurations or Route Changes Not Reflecting** | Cached configuration or routes need refreshing. | Run `php artisan optimize:clear` followed by `php artisan optimize`. |
