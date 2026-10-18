# RideDesk - cPanel Shared Hosting Deployment Guide

This guide provides step-by-step instructions for deploying RideDesk on standard Shared Hosting with **cPanel**.

Because RideDesk comes with a pre-compiled React production build inside `backend-laravel/public/`, **you do NOT need Node.js, npm, or root/VPS access on your shared hosting server**.

---

## 1. Prerequisites on cPanel

Before uploading, ensure your hosting environment meets the following requirements:

1. **PHP Version:** Set to **PHP 8.3**
   - Go to cPanel > **MultiPHP Manager** (or **Select PHP Version**).
   - Select your domain (e.g. `taxi.yourdomain.com`) and change the PHP version to **PHP 8.3**.
2. **PHP Extensions:** Enable the following in **Select PHP Version > Extensions**:
   - `pdo_mysql`, `mbstring`, `fileinfo`, `openssl`, `curl`, `zip`, `bcmath`, `xml`, `ctype`, `tokenizer`.
3. **Database:**
   - Create a MySQL database and user via cPanel > **MySQL® Database Wizard** (see [Section 4](#4-create-database--configure-env)).

---

## 2. Preparing the Release Package

If you have the source files on your local machine, build the production ZIP:
* **Windows (PowerShell):**
  ```powershell
  powershell -ExecutionPolicy Bypass -File .\installation\package-release.ps1
  ```
* **Linux / Mac (Terminal):**
  ```bash
  chmod +x ./installation/package-release.sh
  ./installation/package-release.sh
  ```
This generates `ridedesk-v1.1.3-release.zip` containing the pre-compiled frontend assets already published into `backend-laravel/public/`.

---

## 3. Deployment Architecture Options

Choose the deployment method that fits your domain structure:

### Option A: Subdomain or Addon Domain (Recommended & Easiest)
*(Example: `taxi.adnextt.com` or `rental.yourdomain.com`)*

Modern cPanel allows you to specify any folder as the **Document Root** for a domain or subdomain:

#### 1. Clear Existing or Conflicting Files
> [!IMPORTANT]
> If the subdomain previously had WordPress or placeholder files installed (or was set up via Softaculous), delete them first. Leftover WordPress files (`wp-admin`, `wp-includes`, `index.php`) will cause the browser to show the WordPress installation wizard instead of RideDesk.

1. Open cPanel > **File Manager**.
2. Navigate to your subdomain folder (e.g. `/home/username/taxi.adnextt.com/`).
3. Select and delete any leftover WordPress or placeholder files.

#### 2. Upload and Extract
1. In File Manager, upload `ridedesk-v1.1.3-release.zip` into `/home/username/` (or your chosen subdomain folder).
2. Right-click the ZIP and click **Extract**.
3. You will have a folder structure like `/home/username/ridedesk/backend-laravel/`.

#### 3. Set the Document Root to `public`
1. In cPanel, navigate to **Domains** (or **Subdomains** / **Addon Domains**).
2. Locate your domain (e.g., `taxi.adnextt.com`) and click **Manage** (or Edit Document Root).
3. Set the **Document Root** path to the Laravel `public` directory:
   ```text
   /home/username/ridedesk/backend-laravel/public
   ```
4. Click **Update** / **Save**.

---

### Option B: Primary Domain (`public_html`)

If deploying to your account's primary domain where cPanel fixes the web root to `/home/username/public_html/`:

#### 1. Place Core Code Outside `public_html` (Secure Setup)
1. In cPanel **File Manager**, create a folder named `ridedesk_core` directly in `/home/username/` (at the same level as `public_html`, **NOT** inside it).
2. Upload and extract the release ZIP inside `/home/username/ridedesk_core/`.
3. Move all files and folders from `/home/username/ridedesk_core/backend-laravel/public/` directly into `/home/username/public_html/`.

#### 2. Update `public_html/index.php`
Open `/home/username/public_html/index.php` in the cPanel Code Editor and update the paths to point to `ridedesk_core`:

```php
// Change these two lines:
require __DIR__.'/../ridedesk_core/backend-laravel/vendor/autoload.php';

$app = require_once __DIR__.'/../ridedesk_core/backend-laravel/bootstrap/app.php';
```

---

## 4. Create Database & Configure `.env`

### Step 1: Create Database in cPanel
1. In cPanel, click **MySQL® Database Wizard**.
2. **Step 1:** Enter a database name (e.g. `taxi_db` → full name will be `cpaneluser_taxi_db`).
3. **Step 2:** Create a user (e.g. `taxi_user` → full name `cpaneluser_taxi_user`) and generate a strong password. Save this password.
4. **Step 3:** Check **ALL PRIVILEGES** and click **Make Changes**.

### Step 2: Configure `.env` File
1. In cPanel File Manager, open the `backend-laravel/` directory.
2. Click **Settings** (top right) and ensure **Show Hidden Files (dotfiles)** is checked.
3. If `.env` does not exist, copy `installation/env.production.example` to `.env`.
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
   ```
5. Save changes.

---

## 5. Run Migrations & Key Generation

### Method 1: Using cPanel Terminal (Fastest)
If your cPanel package includes **Terminal** access:

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
1. On your local machine, export your initialized database schema to a `.sql` file, or use the pre-built schema file.
2. In cPanel, open **phpMyAdmin**.
3. Select your database (`cpaneluser_taxi_db`) from the left sidebar.
4. Click the **Import** tab, choose the `.sql` file, and click **Import**.

#### 2. Generate APP_KEY
Generate an app key locally using `php artisan key:generate --show` and paste the generated string into your remote `.env` under `APP_KEY=base64:...`.

#### 3. Storage Symlink Workaround
To create the public storage link without terminal:
1. Create a file named `symlink.php` inside `backend-laravel/public/` with:
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
2. Visit `https://taxi.yourdomain.com/symlink.php` in your browser.
3. **Immediately delete `symlink.php`** from `public/` for security.

---

## 6. Setup Automated Cron Job in cPanel

RideDesk automatically checks driver license expirations, vehicle inspection deadlines, and maintenance schedules.

1. Open cPanel > **Cron Jobs**.
2. Under **Common Settings**, select **Once Per Minute** (`* * * * *`).
3. In the **Command** field, enter:
   ```bash
   /usr/local/bin/php /home/username/ridedesk/backend-laravel/artisan schedule:run >> /dev/null 2>&1
   ```
   *(Note: Verify the PHP path with your host; commonly `/usr/local/bin/php` or `/usr/bin/php`).*
4. Click **Add New Cron Job**.

---

## 7. Enable SSL / HTTPS

1. Go to cPanel > **SSL/TLS Status** (or **Let's Encrypt™ SSL**).
2. Select your domain (`taxi.yourdomain.com`).
3. Click **Run AutoSSL** to install a free SSL certificate.
4. Ensure your `.env` uses `https://`:
   ```env
   APP_URL=https://taxi.yourdomain.com
   FRONTEND_URL=https://taxi.yourdomain.com
   ```

---

## 8. Default Credentials & First Login

Visit your domain in the web browser (e.g. `https://taxi.adnextt.com`):

* **Admin Email:** `admin@ridedesk.test`
* **Default Password:** `password`

### Initial Post-Install Configuration:
1. Go to **Profile > Security** and immediately change the administrator password.
2. Go to **Settings** to customize:
   - Company Branding (Logo, Name, Support Email, Phone)
   - Currency Symbol (`$`, `€`, `₹`, `£`) and Tax Rate %
   - Document Expiry Warning Threshold (default: 30 days)
   - Maintenance Warning Threshold (default: 14 days)
   - Terms and Rental Agreement text

---

## 9. cPanel Troubleshooting Guide

| Issue | Cause | Solution |
|---|---|---|
| **Domain loads WordPress installer instead of RideDesk** | Leftover WordPress installation files in directory, or Document Root is pointing to the wrong folder. | 1. Remove all WordPress files (`wp-admin`, `wp-includes`, `index.php`).<br>2. Set the domain's **Document Root** in cPanel > Domains to `backend-laravel/public`. |
| **HTTP 500 Internal Server Error** | Missing `.env`, missing `APP_KEY`, or unsupported PHP version. | 1. Ensure PHP version is set to **8.3** in cPanel > MultiPHP Manager.<br>2. Verify `backend-laravel/.env` exists and contains a valid `APP_KEY`.<br>3. Check cPanel > **Errors** or `backend-laravel/storage/logs/laravel.log`. |
| **HTTP 403 Forbidden** | Document Root points to a folder without `index.php` or directory indexing is disabled. | Make sure Document Root points directly to `backend-laravel/public/`, which contains `index.php`. |
| **Uploaded driver licenses or photos return 404** | Storage symlink not created. | Run `php artisan storage:link` or run the `symlink.php` workaround described in [Section 5](#3-storage-symlink-workaround). |
| **White page or 404 on page refresh** | `.htaccess` is missing or `mod_rewrite` is not routing SPA requests. | Ensure `.htaccess` exists in `backend-laravel/public/` (from [installation/apache.htaccess.example](file:///c:/xampp/htdocs/RideDesk_TaxiDriver_Module/taxi-rental-app/installation/apache.htaccess.example)). |
| **Database error `SQLSTATE[HY000] [1045] Access denied`** | Incorrect database name, user, or password in `.env`. | Note that cPanel prefixes databases and users with your cPanel username (e.g., `cpaneluser_taxi_db`). Double-check `.env`. |

---

## 9. cPanel Troubleshooting Guide

| Issue | Cause | Solution |
|---|---|---|
| **Domain loads WordPress installer instead of RideDesk** | Leftover WordPress installation files in directory, or Document Root is pointing to the wrong folder. | 1. Remove all WordPress files (`wp-admin`, `wp-includes`, `index.php`).<br>2. Set the domain's **Document Root** in cPanel > Domains to `backend-laravel/public`. |
| **HTTP 500 Internal Server Error** | Missing `.env`, missing `APP_KEY`, or unsupported PHP version. | 1. Ensure PHP version is set to **8.3** in cPanel > MultiPHP Manager.<br>2. Verify `backend-laravel/.env` exists and contains a valid `APP_KEY`.<br>3. Check cPanel > **Errors** or `backend-laravel/storage/logs/laravel.log`. |
| **HTTP 403 Forbidden** | Document Root points to a folder without `index.php` or directory indexing is disabled. | Make sure Document Root points directly to `backend-laravel/public/`, which contains `index.php`. |
| **Uploaded driver licenses or photos return 404** | Storage symlink not created. | Run `php artisan storage:link` or run the `symlink.php` workaround described in [Section 5](#3-storage-symlink-workaround). |
| **White page or 404 on page refresh** | `.htaccess` is missing or `mod_rewrite` is not routing SPA requests. | Ensure `.htaccess` exists in `backend-laravel/public/` (from [installation/apache.htaccess.example](file:///c:/xampp/htdocs/RideDesk_TaxiDriver_Module/taxi-rental-app/installation/apache.htaccess.example)). |
| **Database error `SQLSTATE[HY000] [1045] Access denied`** | Incorrect database name, user, or password in `.env`. | Note that cPanel prefixes databases and users with your cPanel username (e.g., `cpaneluser_taxi_db`). Double-check `.env`. |

