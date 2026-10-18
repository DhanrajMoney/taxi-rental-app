# RideDesk Taxi Rental Operations Software
## Production Installation & Deployment Guide

> **Application Version:** 1.1.3  
> **Target Audience:** System Administrators, Hosting Providers, and Technical Buyers.  
> **Related Documentation:**  
> - [cPanel Shared Hosting Deployment Guide](file:///c:/xampp/htdocs/RideDesk_TaxiDriver_Module/taxi-rental-app/installation/CPANEL_DEPLOYMENT_GUIDE.md)  
> - [Database Setup & Configuration Guide](file:///c:/xampp/htdocs/RideDesk_TaxiDriver_Module/taxi-rental-app/installation/DATABASE_SETUP.md)  
> - [Nginx Configuration Example](file:///c:/xampp/htdocs/RideDesk_TaxiDriver_Module/taxi-rental-app/installation/nginx.conf.example)  
> - [Apache .htaccess Example](file:///c:/xampp/htdocs/RideDesk_TaxiDriver_Module/taxi-rental-app/installation/apache.htaccess.example)  

---

## 1. System Requirements

Before deploying RideDesk, verify that your server environment meets the following specifications:

| Component | Minimum Requirement | Recommended |
|---|---|---|
| **PHP** | 8.3 or higher | 8.3 |
| **Database** | MySQL 8.0+ or MariaDB 10.5+ | MySQL 8.0+ / MariaDB 10.6+ |
| **Web Server** | Apache 2.4+ (with `mod_rewrite`) or Nginx 1.20+ | Nginx or Apache with cPanel |
| **PHP Extensions** | `bcmath`, `ctype`, `curl`, `dom`, `fileinfo`, `filter`, `hash`, `json`, `mbstring`, `openssl`, `pcre`, `pdo`, `pdo_mysql`, `session`, `tokenizer`, `xml`, `zip` | All enabled |
| **Composer** | Composer 2.x | Required for CLI installs |
| **Node.js** | 18+ & npm | *Only needed if compiling React from source; pre-built release package does NOT require Node.js* |

---

## 2. Choosing Your Deployment Method

Select the option that matches your server setup:

* **Method A: Fast-Track Production Release ZIP (Recommended for Subdomains & Shared Hosting)**  
  Best for domains like `taxi.yourdomain.com`, cPanel shared hosting, or VPS where you want a clean, pre-built deployment without needing Node.js or compilation on the server.
* **Method B: Source Code / Git Deployment**  
  Best for CI/CD pipelines, Docker, or development environments where you build frontend and backend from source repositories.

---

## 3. Method A: Fast-Track Deployment (Pre-Built Package)

### Step 1: Package the Application Locally (If Not Already Packaged)
If you have the source codebase locally, build the distribution ZIP:
- **On Windows:**
  ```powershell
  powershell -ExecutionPolicy Bypass -File .\installation\package-release.ps1
  ```
- **On Linux / macOS:**
  ```bash
  chmod +x ./installation/package-release.sh
  ./installation/package-release.sh
  ```
This generates `ridedesk-v1.1.3-release.zip` containing the pre-compiled React frontend inside `backend-laravel/public/`.

### Step 2: Clean the Target Directory
> [!IMPORTANT]
> If your domain or subdomain (e.g., `taxi.adnextt.com`) previously hosted WordPress or default hosting placeholder files, **delete or backup and remove those files first**. Having leftover WordPress files (such as `wp-admin`, `wp-includes`, `index.php`) in the directory will cause WordPress to intercept requests instead of RideDesk.

### Step 3: Upload & Extract Files
1. Upload `ridedesk-v1.1.3-release.zip` to your server.
2. Extract the archive into your project directory (e.g., `/home/username/ridedesk` or `/var/www/ridedesk`).

### Step 4: Configure the Web Server Document Root
Set your domain or subdomain's **Document Root** directly to the Laravel `public` directory:
```text
/path/to/ridedesk/backend-laravel/public
```

> [!CAUTION]
> **Never** point the web root to the parent folder of `backend-laravel`. The web root **MUST** point to `backend-laravel/public` so that `.env`, config files, and core application code remain inaccessible and secure from public web browsers.

For cPanel setups where the primary domain is locked to `public_html`, see [CPANEL_DEPLOYMENT_GUIDE.md](file:///c:/xampp/htdocs/RideDesk_TaxiDriver_Module/taxi-rental-app/installation/CPANEL_DEPLOYMENT_GUIDE.md#L36-L56).

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
   ```

### Step 6: Initialize Application & Database
Run the following commands in `backend-laravel/`:
```bash
# 1. Generate encryption key
php artisan key:generate --force

# 2. Run migrations
php artisan migrate --force

# 3. Create storage symlink for uploaded files & documents
php artisan storage:link

# 4. Optional: Seed initial admin & demo data
php artisan db:seed --force

# 5. Optimize configurations and route cache
php artisan optimize
```

---

## 4. Method B: Deployment from Source (Developers & VPS)

If you are deploying directly from Git:

### Step 1: Install Backend Dependencies
```bash
cd backend-laravel
composer install --no-dev --optimize-autoloader
cp ../installation/env.production.example .env
php artisan key:generate
```

### Step 2: Build & Publish React Frontend
```bash
cd ../frontend-react
npm install
npm run build

# Copy compiled assets into Laravel public folder
# On Linux:
cp -r dist/* ../backend-laravel/public/
# On Windows PowerShell:
Copy-Item -Path "dist\*" -Destination "..\backend-laravel\public" -Recurse -Force
```

### Step 3: Run Database Migrations
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
Ensure the web server user (`www-data`, `nginx`, or `apache`) has read access to the application and write access to `storage` and `bootstrap/cache`:
```bash
sudo chown -R www-data:www-data /var/www/ridedesk
sudo find /var/www/ridedesk -type f -exec chmod 644 {} \;
sudo find /var/www/ridedesk -type d -exec chmod 755 {} \;
sudo chmod -R 775 /var/www/ridedesk/backend-laravel/storage
sudo chmod -R 775 /var/www/ridedesk/backend-laravel/bootstrap/cache
```

### Nginx Configuration
Refer to `installation/nginx.conf.example`. Ensure your `try_files` directive directs non-static traffic to `index.php`:
```nginx
location / {
    try_files $uri $uri/ /index.php?$query_string;
}
```

### Apache Configuration
Ensure `mod_rewrite` is enabled. A production-ready `.htaccess` is located in `backend-laravel/public/.htaccess` and also documented in `installation/apache.htaccess.example`.

---

## 6. Background Scheduled Tasks (Cron Jobs)

RideDesk features automated background processing for driver document expirations, vehicle maintenance alerts, overdue rental notices, and queue handling.

Add this single cron job entry to your server crontab (or cPanel > **Cron Jobs**):
```bash
* * * * * cd /path/to/ridedesk/backend-laravel && php artisan schedule:run >> /dev/null 2>&1
```

If using queue workers for background emails:
```bash
php artisan queue:work --stop-when-empty
```

---

## 7. Default Accounts & First-Time Setup

If you seeded default demo accounts (`php artisan db:seed`), use the following credentials:

| Email | Default Password | Role | Permissions |
|---|---|---|---|
| `admin@ridedesk.test` | `password` | Super Admin | Complete access to taxis, drivers, bookings, settings, reports, users |
| `staff@ridedesk.test` | `password` | Staff / Branch Manager | Daily operations: bookings, taxi status, driver assignments |
| `driver@ridedesk.test` | `password` | Driver | Driver portal: assigned trips, documents, payment history |

> [!WARNING]
> **Essential Security Checklist After Login:**
> 1. Log in immediately and navigate to **Profile > Security** to change the default admin password.
> 2. Open **Settings** from the sidebar to configure:
>    - **Company Profile:** Name, support email, contact phone, branch addresses.
>    - **Currency & Taxation:** Currency symbol (`$`, `€`, `₹`, `£`), default tax rate percentage.
>    - **Alert Thresholds:** Document expiration warning period (default: 30 days) and vehicle maintenance threshold (default: 14 days).
>    - **Legal:** Terms & Conditions and customer rental agreement template.

---

## 8. Troubleshooting Common Issues

| Issue | Root Cause | Solution |
|---|---|---|
| **Domain shows WordPress or Default Host Page (e.g., `taxi.domain.com`)** | Leftover WordPress installation files in directory, or Document Root is pointing to the wrong folder. | 1. Remove all old WordPress files (`wp-admin`, `wp-includes`, `index.php`).<br>2. Set the domain's **Document Root** in cPanel/Nginx to `backend-laravel/public`. |
| **HTTP 500 Internal Server Error** | Missing `.env`, missing application key, or incorrect PHP version. | 1. Check PHP version is **8.3+**.<br>2. Verify `.env` exists in `backend-laravel/`.<br>3. Run `php artisan key:generate`.<br>4. Check `backend-laravel/storage/logs/laravel.log`. |
| **White Screen / 404 on Refreshing URLs** | Single Page Application (SPA) routing fallback missing. | Ensure Nginx has `try_files $uri $uri/ /index.php?$query_string;` or Apache has `RewriteRule ^ index.php [L]` in `.htaccess`. |
| **Permission Denied on File Uploads** | Web server cannot write to `storage` directory. | Run `chmod -R 775 storage bootstrap/cache` and ensure ownership belongs to web server user (`chown -R www-data:www-data`). |
| **Uploaded Photos / Licenses return 404** | Laravel public storage symlink not created. | Run `php artisan storage:link` inside `backend-laravel/`. |
| **CORS Errors When Frontend & API are on Different Domains** | `CORS_ALLOWED_ORIGINS` does not match the frontend URL. | In `.env`, set `CORS_ALLOWED_ORIGINS="https://yourfrontend.com"` or use the Unified Single-Origin setup. |
| **Database Connection Refused / Access Denied** | Incorrect credentials or MySQL user privileges. | Confirm credentials in `.env`, verify MySQL service is running, and refer to [DATABASE_SETUP.md](file:///c:/xampp/htdocs/RideDesk_TaxiDriver_Module/taxi-rental-app/installation/DATABASE_SETUP.md). |
