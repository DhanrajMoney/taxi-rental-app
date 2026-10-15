# RideDesk - cPanel Shared Hosting Deployment Guide

Yes, **RideDesk can be deployed smoothly on standard Shared Hosting with cPanel**. 

Because RideDesk comes with a pre-compiled React production build inside `backend-laravel/public/`, **you do NOT need Node.js or root/VPS access on your shared hosting server**.

---

## Prerequisites on cPanel
1. **PHP Version:** Set to **PHP 8.3** via cPanel > **Select PHP Version** or **MultiPHP Manager**.
2. **PHP Extensions:** Enable `pdo_mysql`, `mbstring`, `fileinfo`, `openssl`, `curl`, `zip`, `bcmath`.
3. **Database:** Create a MySQL database and user via cPanel > **MySQL® Database Wizard**.

---

## Deployment Option A: Subdomain / Addon Domain (Recommended & Easiest)

Modern cPanel allows you to choose any directory as the Document Root when adding a domain or subdomain.

### 1. Upload the Release ZIP
1. Open cPanel > **File Manager**.
2. Upload `ridedesk-v1.1.3-release.zip` into your user home directory (e.g., `/home/username/ridedesk/`).
3. Extract the ZIP.

### 2. Set Document Root
1. In cPanel, go to **Domains** (or **Subdomains** / **Addon Domains**).
2. Create your domain (e.g., `rental.yourdomain.com`).
3. Set the **Document Root** field to:
   ```text
   /home/username/ridedesk/backend-laravel/public
   ```
4. Save changes.

---

## Deployment Option B: Primary Domain (`public_html`)

If deploying to your main domain where cPanel locks the web root to `public_html`:

### 1. Upload Application Core Outside `public_html` (Secure Method)
1. In cPanel **File Manager**, create a folder named `ridedesk_core` directly in `/home/username/` (at the same level as `public_html`, **NOT** inside it).
2. Upload and extract the application files into `/home/username/ridedesk_core/`.
3. Move the contents of `/home/username/ridedesk_core/backend-laravel/public/` directly into `/home/username/public_html/`.

### 2. Update `public_html/index.php`
Open `/home/username/public_html/index.php` in the cPanel Code Editor and update the paths to point to `ridedesk_core`:

```php
// Change these two lines:
require __DIR__.'/../ridedesk_core/backend-laravel/vendor/autoload.php';

$app = require_once __DIR__.'/../ridedesk_core/backend-laravel/bootstrap/app.php';
```

---

## 3. Configure Database & `.env`

1. Open `/home/username/.../backend-laravel/` in File Manager.
2. Ensure hidden files are visible in File Manager (Settings > Show Hidden Files).
3. Copy `installation/env.production.example` to `.env`.
4. Edit `.env` with your domain and cPanel MySQL credentials:
   ```env
   APP_NAME="RideDesk"
   APP_ENV=production
   APP_DEBUG=false
   APP_URL=https://yourdomain.com
   FRONTEND_URL=https://yourdomain.com

   DB_CONNECTION=mysql
   DB_HOST=localhost
   DB_PORT=3306
   DB_DATABASE=cpaneluser_ridedesk
   DB_USERNAME=cpaneluser_dbuser
   DB_PASSWORD=your_database_password
   ```

---

## 4. Run Migrations

### Method 1: Via cPanel Terminal (If Enabled)
If your cPanel plan has **Terminal** access:
```bash
cd /home/username/ridedesk/backend-laravel
php artisan key:generate
php artisan migrate --force
php artisan db:seed --force
php artisan storage:link
php artisan optimize
```

### Method 2: Without Terminal (Via phpMyAdmin)
If your shared host does not provide SSH/Terminal access:
1. Export the database schema from your local environment or run migrations locally connected to the remote database.
2. Open cPanel > **phpMyAdmin**, select your database, and click **Import** to upload the `.sql` schema.

---

## 5. Storage Symlink on Shared Hosting

To ensure driver document uploads and vehicle files display properly:

### If Terminal is available:
```bash
php artisan storage:link
```

### If Terminal is NOT available:
In cPanel **Cron Jobs**, add this one-time task and delete it after running once:
```bash
ln -s /home/username/ridedesk/backend-laravel/storage/app/public /home/username/ridedesk/backend-laravel/public/storage
```
*(Or create a temporary PHP script `symlink.php` inside `public/` that runs `symlink('../storage/app/public', 'storage');` and delete it after visiting it once in your browser).*

---

## 6. Setup Automated Cron Job in cPanel

To automatically check document expiries and maintenance reminders:
1. Open cPanel > **Cron Jobs**.
2. Select **Once Per Minute** (`* * * * *`).
3. Set the command to:
   ```bash
   /usr/local/bin/php /home/username/ridedesk/backend-laravel/artisan schedule:run >> /dev/null 2>&1
   ```
   *(Note: Path to PHP binary on cPanel is typically `/usr/local/bin/php` or `/usr/bin/php` depending on your host).*

---

## 7. Login & Go Live

Visit your site in the browser: `https://yourdomain.com`

* **Default Admin Email:** `admin@ridedesk.test`
* **Default Password:** `password`
* Go to **Profile > Security** immediately to change your password and configure your company in **Settings**.

