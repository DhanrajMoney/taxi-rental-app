# RideDesk - cPanel Shared Hosting Deployment Guide

> **Application Version:** `v1.6.0`  
> **Target Audience:** System Administrators, cPanel Hosting Users, and Technical Buyers.  
> **Related Documentation:**  
> - [Complete Installation & Deployment Guide](file:///c:/xampp/htdocs/RideDesk_TaxiDriver_Module/taxi-rental-app/installation/INSTALLATION_GUIDE.md)  
> - [Database Setup & Configuration Guide](file:///c:/xampp/htdocs/RideDesk_TaxiDriver_Module/taxi-rental-app/installation/DATABASE_SETUP.md)  
> - [Application Feature Documentation](file:///c:/xampp/htdocs/RideDesk_TaxiDriver_Module/taxi-rental-app/feature.md)  

This guide provides step-by-step instructions for deploying RideDesk on standard Shared Hosting environments managed by **cPanel**.

Because RideDesk comes with a pre-compiled React 18 production build inside `backend-laravel/public/`, **you do NOT need Node.js, npm, or root/VPS access on your shared hosting server**.

---

## 1. Prerequisites on cPanel

Before uploading, ensure your cPanel hosting account meets the following requirements:

1. **PHP Version:** Set to **PHP 8.2 or PHP 8.3**
   - Go to cPanel > **MultiPHP Manager** (or **Select PHP Version**).
   - Select your domain or subdomain (e.g., `taxi.yourdomain.com`) and set the PHP version to **PHP 8.3** (or **PHP 8.2**).
2. **PHP Extensions:** Enable the following extensions in **Select PHP Version > Extensions** (or **PHP INI Editor**):
   - `pdo_mysql`, `mbstring`, `fileinfo`, `openssl`, `curl`, `zip`, `bcmath`, `xml`, `ctype`, `tokenizer`, `gd` (required for vehicle photos and receipt attachments).
3. **Database:**
   - Create a MySQL database and database user via cPanel > **MySQL® Database Wizard** (see [Section 4](#4-create-database--configure-env)).

---

## 2. Preparing the Release Package

If you have the source repository on your local computer, build the production release archive:

* **Windows (PowerShell):**
  ```powershell
  powershell -ExecutionPolicy Bypass -File .\installation\package-release.ps1
  ```
* **Linux / macOS (Terminal):**
  ```bash
  chmod +x ./installation/package-release.sh
  ./installation/package-release.sh
  ```

This packages `ridedesk-v1.6.0-release.zip`, which contains the pre-compiled frontend assets already published inside `backend-laravel/public/`.

---

## 3. Deployment Architecture Options

Choose the deployment method that fits your domain structure:

### Option A: Subdomain or Addon Domain (Recommended & Easiest)
*(Example: `taxi.yourdomain.com` or `rental.yourdomain.com`)*

Modern cPanel allows you to specify any folder as the **Document Root** for a subdomain or addon domain:

#### 1. Clear Existing or Conflicting Files
> [!IMPORTANT]
> If the subdomain previously had WordPress or placeholder hosting files installed (e.g. via Softaculous), **delete them first**. Leftover WordPress files (`wp-admin`, `wp-includes`, `index.php`, `.htaccess`) will cause the browser to show the WordPress installation wizard or 404 errors instead of RideDesk.

1. Open cPanel > **File Manager**.
2. Navigate to your subdomain folder (e.g. `/home/username/taxi.yourdomain.com/`).
3. Select and delete any leftover WordPress or default hosting files (`index.html`, `defaultwebpage.cgi`, `wp-*`).

#### 2. Upload and Extract
1. In cPanel File Manager, upload `ridedesk-v1.6.0-release.zip` into your user home directory `/home/username/` (or into your chosen subdomain directory).
2. Right-click the uploaded ZIP file and click **Extract**.
3. You will have a folder structure such as `/home/username/ridedesk/backend-laravel/`.

#### 3. Set the Document Root to `public`
1. In cPanel, navigate to **Domains** (or **Subdomains** / **Addon Domains**).
2. Locate your domain (e.g., `taxi.yourdomain.com`) and click **Manage** (or **Edit Document Root**).
3. Set the **Document Root** path directly to the Laravel `public` directory:
   ```text
   /home/username/ridedesk/backend-laravel/public
   ```
4. Click **Update** / **Save**.

---

### Option B: Primary Domain (`public_html`)

If deploying to your cPanel account's primary domain where the web root is locked to `/home/username/public_html/`:

#### 1. Place Core Application Files Outside `public_html` (Secure Architecture)
1. In cPanel **File Manager**, create a folder named `ridedesk_core` directly in `/home/username/` (at the same level as `public_html`, **NOT** inside it).
2. Upload and extract `ridedesk-v1.6.0-release.zip` inside `/home/username/ridedesk_core/`.
3. Move all files and folders from `/home/username/ridedesk_core/backend-laravel/public/` directly into `/home/username/public_html/`.

#### 2. Update `public_html/index.php`
Open `/home/username/public_html/index.php` in the cPanel Code Editor and adjust the paths to point to `ridedesk_core`:

```php
// Change these two path lines:
require __DIR__.'/../ridedesk_core/backend-laravel/vendor/autoload.php';

$app = require_once __DIR__.'/../ridedesk_core/backend-laravel/bootstrap/app.php';
```

---

## 4. Create Database & Configure `.env`

### Step 1: Create Database in cPanel
1. In cPanel, open **MySQL® Database Wizard**.
2. **Step 1:** Enter a database name (e.g. `taxi_db` → full name will be `cpaneluser_taxi_db`).
3. **Step 2:** Create a user (e.g. `taxi_user` → full name `cpaneluser_taxi_user`) and generate a strong password. Save this password.
4. **Step 3:** Check **ALL PRIVILEGES** and click **Make Changes**.

### Step 2: Configure `.env` File
1. In cPanel File Manager, open the `backend-laravel/` directory (or `ridedesk_core/backend-laravel/`).
2. Click **Settings** (top right) and ensure **Show Hidden Files (dotfiles)** is checked.
3. Copy `installation/env.production.example` to `.env`.
4. Right-click `.env` and select **Edit**:
   ```env
   APP_NAME="RideDesk"
   APP_ENV=production
   APP_KEY=
   APP_DEBUG=false
   APP_URL=https://taxi.yourdomain.com
   FRONTEND_URL=https://taxi.yourdomain.com

   DB_CONNECTION=mysql
   DB_HOST=localhost
   DB_PORT=3306
   DB_DATABASE=cpaneluser_taxi_db
   DB_USERNAME=cpaneluser_taxi_user
   DB_PASSWORD=your_actual_strong_password

   FILESYSTEM_DISK=public
   SESSION_DRIVER=database
   QUEUE_CONNECTION=database
   CACHE_STORE=database
   ```
5. Click **Save Changes**.

---

## 5. Run Migrations & Key Generation

### Method 1: Using cPanel Terminal (Recommended & Fastest)
If your cPanel hosting package includes **Terminal** access:

1. Open cPanel > **Terminal**.
2. Run the following commands:
   ```bash
   cd /home/username/ridedesk/backend-laravel
   php artisan key:generate --force
   php artisan migrate --force
   php artisan db:seed --force
   php artisan storage:link
   php artisan optimize
   ```

---

### Method 2: Without Terminal Access (No SSH)

If your shared hosting plan does not provide Terminal access:

#### 1. Import Database via phpMyAdmin
1. On your local machine, export your initialized database schema to a `.sql` file (or use an export from a seeded local setup).
2. In cPanel, open **phpMyAdmin**.
3. Select your database (`cpaneluser_taxi_db`) from the left sidebar.
4. Click the **Import** tab, choose the `.sql` file, and click **Import**.

#### 2. Generate APP_KEY
Generate an application key locally using `php artisan key:generate --show` and paste the generated string into your server `.env` under `APP_KEY=base64:...`.

#### 3. Storage Symlink Workaround
To create the public storage symlink for vehicle photos, driver documents, and receipts without terminal access:
1. Create a temporary file named `symlink.php` inside `backend-laravel/public/` (or `public_html/`) containing:
   ```php
   <?php
   $target = __DIR__ . '/../storage/app/public';
   $link = __DIR__ . '/storage';
   if (file_exists($link)) {
       echo "Link already exists.";
   } else {
       symlink($target, $link);
       echo "Storage symlink successfully created!";
   }
   ```
2. Visit `https://taxi.yourdomain.com/symlink.php` in your web browser.
3. **Immediately delete `symlink.php`** from `public/` for security.

---

## 6. Setup Automated Cron Job in cPanel

RideDesk automatically checks driver license expirations, vehicle inspection and maintenance schedules, and overdue rental bookings.

1. Open cPanel > **Cron Jobs**.
2. Under **Common Settings**, select **Once Per Minute** (`* * * * *`).
3. In the **Command** field, enter:
   ```bash
   /usr/local/bin/php /home/username/ridedesk/backend-laravel/artisan schedule:run >> /dev/null 2>&1
   ```
   *(Note: Confirm the exact PHP CLI path with your hosting provider; common paths include `/usr/local/bin/php`, `/usr/bin/php`, or `/opt/cpanel/ea-php83/root/usr/bin/php`).*
4. Click **Add New Cron Job**.

---

## 7. Enable SSL / HTTPS

1. Go to cPanel > **SSL/TLS Status** (or **Let's Encrypt™ SSL**).
2. Select your domain (`taxi.yourdomain.com`).
3. Click **Run AutoSSL** to generate and install a free SSL certificate.
4. Verify your `.env` has HTTPS configured:
   ```env
   APP_URL=https://taxi.yourdomain.com
   FRONTEND_URL=https://taxi.yourdomain.com
   ```

---

## 8. Default Credentials & First Login

Open your web browser and visit your deployed domain (e.g. `https://taxi.yourdomain.com`):

| Account | Default Email | Default Password | Role | Permissions |
|---|---|---|---|---|
| **Super Admin** | `admin@ridedesk.test` | `password` | Super Admin | Complete access across all branches: fleet, drivers, bookings, offices, users, settings, and reports |
| **Operations Staff** | `staff@ridedesk.test` | `password` | Staff | Branch operations: dispatching, bookings, maintenance, driver allocations, and trip expenses |
| **Driver Partner** | `driver@ridedesk.test` | `password` | Driver | Driver portal: assigned trips, route details, compliance records, and expense submissions |

### Initial Post-Install Configuration Checklist:
1. Log in as `admin@ridedesk.test` and navigate immediately to **Profile > Security** to set a strong custom password.
2. Go to **Settings** from the sidebar to configure:
   - **Company Profile:** Business Name, Support Email, Phone, Address, and **Company GST / Tax Identification Number (`GSTIN`)**.
   - **Pricing & Currency:** Currency Symbol (`₹`, `$`, `€`, `£`), ISO Code (`INR`, `USD`), and default tax rate percentage.
   - **Operational Alert Thresholds:** Document Expiry Warning (default: 30 days) and Maintenance Due Warning (default: 30 days).
   - **Branch Offices:** Set up branch offices under **Offices** to manage multi-location dispatching and vehicle allocation.
   - **Legal Terms:** Customize the Rental Terms and Agreement policy text.

---

## 9. cPanel Troubleshooting Guide

| Issue | Root Cause | Solution |
|---|---|---|
| **Domain loads WordPress installer instead of RideDesk** | Leftover WordPress installation files in directory, or Document Root is pointing to the wrong folder. | 1. In cPanel File Manager, delete all WordPress files (`wp-admin`, `wp-includes`, `index.php`, `.htaccess`).<br>2. In cPanel > Domains, ensure the **Document Root** is set directly to `backend-laravel/public`. |
| **HTTP 500 Internal Server Error** | Missing `.env`, missing `APP_KEY`, database connection failure, or unsupported PHP version. | 1. Ensure PHP version is set to **8.2 or 8.3** in cPanel > MultiPHP Manager.<br>2. Verify `backend-laravel/.env` exists and contains a valid `APP_KEY`.<br>3. Check cPanel > **Errors** or view `backend-laravel/storage/logs/laravel.log`. |
| **HTTP 403 Forbidden** | Document Root points to a folder without `index.php` or directory indexing is disabled. | Make sure Document Root points directly to `backend-laravel/public/`, which contains `index.php`. |
| **Uploaded driver licenses, vehicle photos, or receipts return 404** | Public storage symlink not created. | Run `php artisan storage:link` in Terminal or execute the `symlink.php` workaround described in [Section 5](#3-storage-symlink-workaround). |
| **White page or 404 on page refresh** | `.htaccess` is missing or Apache `mod_rewrite` is not routing SPA requests. | Ensure `.htaccess` exists in `backend-laravel/public/` (from [installation/apache.htaccess.example](file:///c:/xampp/htdocs/RideDesk_TaxiDriver_Module/taxi-rental-app/installation/apache.htaccess.example)). In cPanel File Manager, turn on "Show Hidden Files (dotfiles)" to verify `.htaccess` is present. |
| **Database error `SQLSTATE[HY000] [1045] Access denied`** | Incorrect database name, user, or password in `.env`. | Note that cPanel prefixes databases and users with your cPanel account username (e.g., `cpaneluser_taxi_db` and `cpaneluser_taxi_user`). Verify both match `.env`. |
| **File uploads fail or throw permission errors** | Web server cannot write to `storage` directory. | In cPanel File Manager, check permissions for `backend-laravel/storage` and `backend-laravel/bootstrap/cache` and set them to `775` or `755`. |
