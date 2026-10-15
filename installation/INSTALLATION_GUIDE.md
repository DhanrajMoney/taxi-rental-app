# RideDesk Taxi Rental Operations Software
## Production Installation & Deployment Guide

> **Application Version:** 1.1.3  
> **Target Audience:** System Administrators, Hosting Providers, and Technical Buyers.

---

## 1. System Requirements

Before installing RideDesk, make sure your hosting server meets the following minimum requirements:

* **PHP:** Version 8.3 or higher
* **Required PHP Extensions:**
  * `BCMath`, `Ctype`, `cURL`, `DOM`, `Fileinfo`, `Filter`, `Hash`, `JSON`, `Mbstring`, `OpenSSL`, `PCRE`, `PDO`, `PDO_MySQL`, `Session`, `Tokenizer`, `XML`, `ZIP`
* **Database:** MySQL 8.0+, MariaDB 10.5+, or PostgreSQL 14+
* **Web Server:** Nginx (recommended) or Apache 2.4+
* **Dependency Managers:**
  * Composer 2.x
  * Node.js 18+ & npm (only required if building frontend from source; pre-compiled packages do not require Node.js)

---

## 2. Fast Track Deployment (Unified Single-Origin)

The easiest deployment architecture is the **Unified Single-Origin** setup: the React frontend is compiled into Laravel's `public/` directory, meaning your entire app runs on a single domain (e.g. `https://yourdomain.com`) with zero CORS configuration needed.

### Step 1: Upload & Extract Files
Upload the RideDesk release files to your web server (e.g., `/var/www/ridedesk` or `public_html`).

### Step 2: Configure Environment
1. In the `backend-laravel/` directory, copy `installation/env.production.example` to `.env`:
   ```bash
   cp installation/env.production.example backend-laravel/.env
   ```
2. Open `.env` and set:
   * `APP_NAME="RideDesk"`
   * `APP_ENV=production`
   * `APP_DEBUG=false`
   * `APP_URL=https://yourdomain.com`
   * Configure database credentials (`DB_DATABASE`, `DB_USERNAME`, `DB_PASSWORD`).

### Step 3: Install Backend Dependencies
Run in `backend-laravel/`:
```bash
composer install --no-dev --optimize-autoloader
php artisan key:generate
```

### Step 4: Run Migrations & Storage Symlink
```bash
php artisan migrate --force
php artisan storage:link
```

### Step 5: Build & Publish Frontend
In `frontend-react/`:
```bash
npm install
npm run build
```
Copy all files from `frontend-react/dist/*` into `backend-laravel/public/`:
* On Linux:
  ```bash
  cp -r frontend-react/dist/* backend-laravel/public/
  ```
* On Windows (PowerShell):
  ```powershell
  Copy-Item -Path "frontend-react\dist\*" -Destination "backend-laravel\public" -Recurse -Force
  ```

### Step 6: Optimize Laravel Cache
Run in `backend-laravel/`:
```bash
php artisan optimize
```

---

## 3. Web Server Configuration

### Web Root Setting
Set your web server's document root to:
```
/path/to/ridedesk/backend-laravel/public
```

> **CRITICAL SECURITY NOTE:** Never set your web root to the parent folder of `backend-laravel`. The web root MUST point directly to `public/` so that `.env` and application code remain inaccessible from the web.

### File Permissions (Linux)
Give ownership to the web server user (`www-data`, `nginx`, or `apache`):
```bash
sudo chown -R www-data:www-data /var/www/ridedesk
sudo find /var/www/ridedesk -type f -exec chmod 644 {} \;
sudo find /var/www/ridedesk -type d -exec chmod 755 {} \;
sudo chmod -R 775 /var/www/ridedesk/backend-laravel/storage
sudo chmod -R 775 /var/www/ridedesk/backend-laravel/bootstrap/cache
```

### Server Configuration Files
* For **Nginx**: Refer to `installation/nginx.conf.example`.
* For **Apache**: Refer to `installation/apache.htaccess.example`.

---

## 4. Background Scheduled Tasks (Cron Jobs)

RideDesk features automated alerts for driver document expirations, upcoming vehicle maintenance due dates, and queue processing.

Add this single cron entry to your server:
```bash
* * * * * cd /path/to/ridedesk/backend-laravel && php artisan schedule:run >> /dev/null 2>&1
```

If you use database queues, run a supervisor worker or cron runner:
```bash
php artisan queue:work --stop-when-empty
```

---

## 5. Default Accounts & First-Time Setup

If you seeded the database using `php artisan db:seed`, log in with:
* **URL:** `https://yourdomain.com`
* **Email:** `admin@ridedesk.test`
* **Password:** `password`

### Security Actions on First Login:
1. Navigate to **Profile (top-right avatar) > Security**.
2. Immediately change the Administrator password to a strong, private password.
3. Navigate to **Settings** on the left menu:
   * Update your **Company Name**, **Support Email**, and **Phone**.
   * Set your local **Currency Symbol** (e.g., `$`, `€`, `₹`, `£`) and **Tax %**.
   * Adjust **Document Expiry Warning Days** (default: 30 days) and **Maintenance Warning Days** (default: 14 days).
   * Review and save your company's **Rental Terms and Conditions**.

---

## 6. Troubleshooting Common Issues

| Issue | Cause | Solution |
|---|---|---|
| **500 Server Error** | Missing `.env` file or `APP_KEY` | Ensure `.env` exists and run `php artisan key:generate`. |
| **Permission Denied** | Storage permissions | Run `chmod -R 775 storage bootstrap/cache`. |
| **Document upload fails / broken links** | Storage symlink missing | Run `php artisan storage:link`. |
| **White screen on page refresh** | SPA fallback missing in web server | Ensure Nginx `try_files $uri $uri/ /index.php?$query_string;` or Apache `.htaccess` is enabled. |
| **CORS error on separate domains** | `CORS_ALLOWED_ORIGINS` mismatch | In `.env`, add your frontend domain: `CORS_ALLOWED_ORIGINS="https://app.yourdomain.com"`. |

