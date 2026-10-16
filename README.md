# RideDesk Taxi Rental App

> **Current Version:** `v1.5.0` | **Architecture:** Laravel 11 API + React 18 / Vite 5 SPA

RideDesk is a complete taxi rental operations management system split into two independently runnable applications:

- `backend-laravel/` - Laravel API, authentication, operational models, migrations, security validation, and feature tests.
- `frontend-react/` - Modern React/Vite command-center dashboard for managing fleet taxis, drivers, bookings, offices, data imports, maintenance, documents, and settings.

---

## Project Structure

- `backend-laravel/app/` contains API controllers, FormRequests, policies, and Eloquent models.
- `backend-laravel/routes/api.php` defines the REST API endpoints.
- `backend-laravel/database/` contains database migrations, seeders, and indexes.
- `backend-laravel/tests/` contains backend unit and feature tests (**60 tests, 298 assertions**).
- `frontend-react/src/pages/` contains the dashboard workspace pages.
- `frontend-react/src/components/` contains reusable UI modals, drawers, and form components.
- `frontend-react/src/api/` contains the Axios API client layer with interceptors.
- `frontend-react/src/styles/` contains modular, scoped CSS matching the command-center design system.

---

## Quick Start

Run the backend and frontend in separate terminals. Start the backend first so the dashboard can authenticate and load data.

### Backend Setup

```bash
cd backend-laravel
composer install
cp .env.example .env
php artisan key:generate
php artisan migrate --seed
php artisan serve
```

The API will be available at `http://127.0.0.1:8000/api`.

Running `php artisan migrate` applies all operational tables, including `offices`, `customers`, `taxis`, `drivers`, `driver_documents`, `taxi_documents`, `bookings`, `notifications`, `login_activities`, `import_logs`, `settings`, `maintenance_records`, and performance indexes.

### Development Login Accounts

The database seeder creates these default accounts (password: `password`):

| Email | Password | Role | Permissions |
|---|---|---|---|
| `admin@ridedesk.test` | `password` | Admin | Full operations & administration: taxis, drivers, bookings, offices, data imports, settings, users, reports |
| `staff@ridedesk.test` | `password` | Staff | View and manage branch taxis, drivers, bookings, maintenance, and customers |
| `driver@ridedesk.test` | `password` | Driver | View assigned taxi, bookings, and personal trip details |

> *Note: These credentials are for local development only. Change or remove them before deploying to production.*

### Frontend Setup

```bash
cd frontend-react
npm install
npm run dev
```

The dashboard will be available at `http://localhost:5173`.

On Windows PowerShell, use `npm.cmd` if system execution policies restrict PowerShell scripts:

```powershell
cd frontend-react
npm.cmd install
npm.cmd run dev
```

---

## Key Capabilities & Modules

- **Operations Command Hub (`DashboardOverview.jsx`):** Live telemetry indicator, calendar date pill, multi-office branch selector, and 4 hero KPI metric cards with real-time fleet utilization progress bars. Includes upcoming dispatches feed, urgent action alerts for expiring documents, and 1-click dispatch shortcuts.
- **Rental Bookings Workspace (`Bookings.jsx`):** Interactive status KPI strip, multi-filter toolbar (search, status, office, date ranges), and a slide-in **Booking Detail Drawer** (440px wide, zero horizontal overflow) with 1-click clipboard copy of the Booking ID, structured tabbed views (Ride Details, Customer, Vehicle & Driver Assignment, Pricing Breakdown), and safe cancellation modal.
- **Taxi Fleet Management (`Taxis.jsx`, `taxis.css`, `TaxiForm.jsx`):** Interactive dual view toggle (Vehicle Cards Grid & Structured Data Table), top live metric summary strip (Total, Available, On Rent, In Workshop, Inactive), and slide-in **Taxi Detail Drawer** with prominent Registration Hero, vehicle specs, assigned driver, compliance document manager, and 56% streamlined CSS.
- **Driver Fleet Management (`Drivers.jsx`, `drivers.css`, `DriverForm.jsx`):** Real-time KPI summary strip (Total Fleet, Active, On Trip, On Leave, Doc Alerts), dual view modes with colorful hash-based avatar initials, eager loaded taxi assignments, slide-in **Driver Detail Drawer** with 1-click quick actions (Call, Email, Copy License), and rebuilt `DriverForm.jsx` with custom-styled "Choose File" upload button and live avatar preview.
- **Security Hardening & Document Compliance:** Resolved arbitrary file upload vulnerabilities in `DriverDocumentController.php` with strict MIME type validation (`mimes:pdf,jpg,jpeg,png`) and 10MB constraints. Full document tracking for licenses, insurance, and municipal permits with automated 30-day alert indicators.
- **Taxi Maintenance Desk (`Maintenance.jsx`):** Executive fleet upkeep header with dynamic KPI cards, overdue inspection warnings with 1-click vehicle filtering chips, and service work order modal with automated odometer pre-fills and invoice receipt uploads (PDF/JPG/PNG).
- **Executive Operational Reports (`Reports.jsx`):** Financial P&L summary (Realized Revenue vs Maintenance Spend = Net Operating Margin), visual monthly dual-bar charts, fleet utilization gauges, driver activity metrics, and CSV / print-to-PDF exports.
- **Multi-Location Office Setup (`Offices.jsx`):** Branch location management with staff scoping, enabling independent branch-level fleet management while maintaining cross-office visibility for admins.
- **Excel & CSV Data Import (`ImportData.jsx`):** Downloadable sample templates and dependency-ordered import pipeline (customers $\rightarrow$ taxis $\rightarrow$ drivers $\rightarrow$ bookings) with pre-validation previews, error reporting, and audit logs.
- **Account Profile Hub (`ProfileModal.jsx`, `profile-modal.css`):** Command-center profile view with initials avatar, role badge, assigned branch office, editable personal details (Name & Email), password update with confirmation check, and security audit log of past login sessions.
- **Ride & Trip Operational Expense Management (`BookingExpensesTab.jsx`, `ExpenseModal.jsx`, `expenses.css`):** Comprehensive trip-level operational expense recording across 6 categories (Fuel, Tolls & FASTag, Parking, Driver Allowance, Border Permits, Incidentals), billable vs company-absorbed classification, driver reimbursement lifecycle (Pending Approval -> Approved -> Reimbursed / Rejected), secure receipt file uploads with strict MIME and 10MB checks, real-time Trip P&L summary hero cards, and synchronization with Executive Financial Reports.
- **Admin System Settings (`Settings.jsx`):** Centralized business configuration for company profile, currency symbols/codes, tax rates, warning day thresholds, and terms & conditions.

---

## Testing & Quality Assurance

### Backend Tests (PHPUnit)

Run all feature and unit tests from `backend-laravel`:

```bash
php artisan test
```

*Result: **60 tests passing**, 298 assertions.*

### Frontend Production Build (Vite)

Compile and bundle the React production distribution:

```bash
cd frontend-react
npm run build
```

*Build output: Zero lint/compilation errors, clean asset chunks generated in `frontend-react/dist/`.*

---

## Production Deployment & Packaging

Comprehensive deployment documentation is provided in the `installation/` directory:

- [INSTALLATION_GUIDE.md](file:///c:/xampp/htdocs/RideDesk_TaxiDriver_Module/taxi-rental-app/installation/INSTALLATION_GUIDE.md) - Full production deployment guide for VPS, cPanel, Nginx, and Apache.
- [CPANEL_DEPLOYMENT_GUIDE.md](file:///c:/xampp/htdocs/RideDesk_TaxiDriver_Module/taxi-rental-app/installation/CPANEL_DEPLOYMENT_GUIDE.md) - Step-by-step shared hosting deployment without Node.js on the server.
- [DATABASE_SETUP.md](file:///c:/xampp/htdocs/RideDesk_TaxiDriver_Module/taxi-rental-app/installation/DATABASE_SETUP.md) - MySQL / MariaDB collation, performance indexes, and configuration.
- [env.production.example](file:///c:/xampp/htdocs/RideDesk_TaxiDriver_Module/taxi-rental-app/installation/env.production.example) - Production environment template.
- [nginx.conf.example](file:///c:/xampp/htdocs/RideDesk_TaxiDriver_Module/taxi-rental-app/installation/nginx.conf.example) & [apache.htaccess.example](file:///c:/xampp/htdocs/RideDesk_TaxiDriver_Module/taxi-rental-app/installation/apache.htaccess.example) - Web server configurations.

### Automated Release Packaging

To build and package a distribution-ready release ZIP:

- **Windows PowerShell:**
  ```powershell
  powershell.exe -ExecutionPolicy Bypass -File .\installation\package-release.ps1
  ```
- **Linux / macOS:**
  ```bash
  chmod +x ./installation/package-release.sh
  ./installation/package-release.sh
  ```