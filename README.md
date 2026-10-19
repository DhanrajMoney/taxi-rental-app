# RideDesk Taxi Rental App

> **Current Version:** `v1.6.0` | **Architecture:** Laravel 11 API + React 18 / Vite 5 SPA

RideDesk is an enterprise-grade taxi rental operations management system split into two independently runnable applications:

- `backend-laravel/` - Laravel API, authentication, operational models, migrations, security validation, and feature tests (**71 tests, 371 assertions**).
- `frontend-react/` - Modern React/Vite command-center dashboard for managing fleet taxis, drivers, bookings, offices, user accounts, system configuration, data imports, maintenance, documents, trip expenses, and financial reports.

---

## Project Structure

- `backend-laravel/app/` contains API controllers, FormRequests, policies, and Eloquent models.
- `backend-laravel/routes/api.php` defines the REST API endpoints.
- `backend-laravel/database/migrations/` contains database migrations, including vehicle photography, ownership, company GST registration, and performance indexes.
- `backend-laravel/tests/` contains backend unit and feature tests (**71 tests, 371 assertions**).
- `frontend-react/src/pages/` contains the dashboard workspace pages (`DashboardOverview.jsx`, `Bookings.jsx`, `Taxis.jsx`, `Drivers.jsx`, `Offices.jsx`, `Users.jsx`, `Settings.jsx`, `Maintenance.jsx`, `Reports.jsx`, `ImportData.jsx`).
- `frontend-react/src/components/` contains reusable UI modals, drawers, and form components (`TaxiForm.jsx`, `DriverForm.jsx`, `UserForm.jsx`, `ExpenseModal.jsx`, `BookingExpensesTab.jsx`, `DocumentsPanel.jsx`, `ProfileModal.jsx`, `CancelBookingModal.jsx`, `NotificationDropdown.jsx`).
- `frontend-react/src/api/` contains the Axios API client layer with interceptors.
- `frontend-react/src/styles/` contains modular, scoped stylesheets matching the command-center design system (`taxis.css`, `taxi-form.css`, `bookings.css`, `booking-form.css`, `drivers.css`, `offices.css`, `users.css`, `settings.css`, `maintenance.css`, `reports.css`, `expenses.css`, etc.).

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
php artisan storage:link
php artisan serve
```

The API will be available at `http://127.0.0.1:8000/api`.

Running `php artisan migrate` applies all operational tables: `offices`, `customers`, `taxis` (including front/back photographs, ownership, and document attachments), `drivers`, `driver_documents`, `taxi_documents`, `bookings`, `booking_expenses`, `notifications`, `login_activities`, `import_logs`, `settings` (including company GST / tax identification number), `maintenance_records`, and performance indexes.

### Development Login Accounts

The database seeder creates these default accounts (password: `password`):

| Email | Password | Role | Permissions |
|---|---|---|---|
| `admin@ridedesk.test` | `password` | Admin | Full operations & administration: taxis, drivers, bookings, offices, users, system settings, data imports, and reports |
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

### 1. Taxi Fleet Management & Asset Records (`Taxis.jsx`, `taxis.css`, `TaxiForm.jsx`, `taxi-form.css`)
- **Dual View Modes**: Interactive toggle between **Vehicle Cards Grid** (visual fleet cards with status badges and model chips) and **Structured Data Table** (sortable columns with monospaced license plates).
- **Summary Metrics Strip**: Real-time counter pills showing Total Fleet, Available, On Rent, In Workshop, and Inactive vehicles.
- **Front & Rear Vehicle Photography**: High-resolution image capture for vehicle front view (grille & license plate) and rear view (boot & tailgate) with live thumbnail previews, zoom-on-click modals, and automatic disk cleanup on update/removal.
- **Vehicle Ownership Tracking**: Comprehensive ownership classification supporting `Company Owned`, `Driver Owned`, `Leased`, `Attached Fleet`, and `Third-Party Partner` with custom text entry and 1-click suggestion chips.
- **Rebuilt Add / Register Taxi Modal (`TaxiForm.jsx`)**:
  - **Live Form Completeness Checklist Bar**: Interactive top strip showing live badges for Registration, Model, Photos, Ownership, Rate, Status, and RC Document. Clicking any badge jumps straight to that section.
  - **Stepped Tab Navigation (Zero-Scroll Mode)**: 5 dedicated tabs:
    1. 🚗 *Identity*: Registration number with **live Indian License Plate visual box (`IND | UP 21 AB 1234`)**, model input with popular suggestions, interactive vehicle type cards (`Sedan`, `SUV`, `Hatchback`, `Mini Bus`), year dropdown, and passenger capacity chips.
    2. 📷 *Photographs*: Side-by-side front and rear upload cards with drag-and-drop, file drop feedback, replace/remove buttons, and zoom triggers.
    3. ⚙️ *Specs & Ownership*: Ownership presets, fuel type selector (Petrol, Diesel, CNG, EV), and odometer mileage.
    4. 💳 *Rates & Fleet*: Pricing model toggle (Daily Rental vs Per Kilometer), bold currency input with live billing helper text, operational status, branch office, and primary driver allocation.
    5. 📄 *Docs & Notes*: Registration Certificate (RC / permit) file attachment (PDF/JPG/PNG up to 4MB) with 1-click view link and vehicle remarks/insurance notes.
  - **"Show All Sections" Toggle**: Seamlessly switches between the focused step-by-step tab view and a continuous all-sections view.
  - **Smart Validation & Error Feedback**: Prevents advancing or saving if mandatory fields are missing, automatically highlighting and focusing the invalid field with an alert banner.
  - **Keyboard Shortcuts & Performance**: Quick submission with <kbd>Ctrl</kbd> + <kbd>Enter</kbd> / <kbd>Cmd</kbd> + <kbd>Enter</kbd>, <kbd>Esc</kbd> to dismiss, sanitized plate input, and memory leak prevention via automated blob URL revocation.
- **Slide-in Taxi Detail Drawer**: 440px wide slide-in panel featuring:
  - Prominent Registration Hero with 1-click clipboard copy.
  - Always-visible **Vehicle Photographs** gallery with full-resolution viewer and an empty-state card with a direct `+ Add Photos` trigger.
  - **Custom Smooth Scroller**: 6px styled scrollbar track and thumb for smooth navigation through technical specifications, driver details, rates, and audit timestamps.
- **Modular Stylesheet Architecture**: Split monolithic styling by creating dedicated [`taxi-form.css`](file:///c:/xampp/htdocs/RideDesk_TaxiDriver_Module/taxi-rental-app/frontend-react/src/styles/taxi-form.css) for modal components, reducing [`taxis.css`](file:///c:/xampp/htdocs/RideDesk_TaxiDriver_Module/taxi-rental-app/frontend-react/src/styles/taxis.css) from 1,878 lines down to 965 lines (~50% reduction).

### 2. Rental Bookings Workspace (`Bookings.jsx`, `booking-form.css`, `bookings.css`)
- Interactive status KPI strip, multi-filter toolbar (search, status, office, date ranges), and a slide-in **Booking Detail Drawer** (440px wide, zero horizontal overflow) with 1-click clipboard copy of the Booking ID, structured tabbed views (Ride Details, Customer, Vehicle & Driver Assignment, Pricing Breakdown, Trip Expenses), and safe cancellation modal.

### 3. Driver Fleet Management (`Drivers.jsx`, `drivers.css`, `DriverForm.jsx`)
- Real-time KPI summary strip (Total Fleet, Active, On Trip, On Leave, Doc Alerts), dual view modes with colorful hash-based avatar initials, eager loaded taxi assignments, slide-in **Driver Detail Drawer** with 1-click quick actions (Call, Email, Copy License), and rebuilt `DriverForm.jsx` with custom-styled upload button and live avatar preview.
- Refactored code structure and condensed CSS architecture in [`drivers.css`](file:///c:/xampp/htdocs/RideDesk_TaxiDriver_Module/taxi-rental-app/frontend-react/src/styles/drivers.css) for improved maintainability and faster rendering.

### 4. Operations Command Hub (`DashboardOverview.jsx`)
- Live telemetry indicator, calendar date pill, multi-office branch selector, and 4 hero KPI metric cards with real-time fleet utilization progress bars. Includes upcoming dispatches feed, urgent action alerts for expiring documents, and 1-click dispatch shortcuts.

### 5. Taxi Maintenance Desk (`Maintenance.jsx`, `maintenance.css`)
- Executive fleet upkeep header with dynamic KPI cards, overdue inspection warnings with 1-click vehicle filtering chips, and service work order modal with automated odometer pre-fills and invoice receipt uploads (PDF/JPG/PNG).

### 6. Ride & Trip Operational Expense Management (`BookingExpensesTab.jsx`, `ExpenseModal.jsx`, `expenses.css`)
- Trip-level operational expense recording across 6 categories (Fuel, Tolls & FASTag, Parking, Driver Allowance, Border Permits, Incidentals), billable vs company-absorbed classification, driver reimbursement lifecycle (Pending Approval -> Approved -> Reimbursed / Rejected), secure receipt file uploads with strict MIME and 10MB checks, real-time Trip P&L summary hero cards, and synchronization with Executive Financial Reports.

### 7. Executive Operational Reports (`Reports.jsx`, `reports.css`)
- Financial P&L summary (Realized Revenue vs Maintenance Spend = Net Operating Margin), visual monthly dual-bar charts, fleet utilization gauges, driver activity metrics, and CSV / print-to-PDF exports.

### 8. Multi-Location Office Setup & Branch Logistics (`Offices.jsx`, `offices.css`)
- **Executive Branch Overview**: Real-time summary metrics bar displaying Total Locations, Active Branches, Inactive Branches, Total Assigned Fleet, and Total Branch Staff.
- **Dual View Modes**: Interactive **Office Cards Grid** (showing manager tags, contact chips, physical addresses, and fleet/staff counters) and **Administrative Data Table**.
- **Interactive Quick-Action Chips**: Direct phone dialing (`tel:`), direct email dispatch (`mailto:`), and full address detail cards.
- **Rebuilt Office Modal Form**: Modern modal dialog with input validation for branch name, code, contact phone, manager email, and physical address, active/inactive toggle, and responsive error handling banners.
- **Branch Operational Scoping**: Staff members are scoped to their assigned office location, while administrators maintain global cross-office visibility.

### 9. User Management & Access Control (`Users.jsx`, `users.css`, `UserForm.jsx`)
- **Real-Time Summary Metrics**: Dynamic KPI counter pills tracking Total Users, Administrators, Operations Staff, and Chauffeurs/Drivers.
- **Multi-Filter Operations Toolbar**: Live debounced search by name/email, role filtering dropdown (`All Roles`, `Admin`, `Staff`, `Driver`), and branch office filter.
- **Paginated User Ledger**: Complete pagination controls with selectable page sizes (10, 25, 50 records per page), current page indicators, previous/next navigation buttons, and clear empty-state feedback.
- **Modern User Form Modal (`UserForm.jsx`, `users.css`)**:
  - Accessible modal dialog with focus management and keyboard shortcuts (<kbd>Esc</kbd> to close).
  - Role selection chips (`Admin`, `Staff`, `Driver`) with distinct visual role badges.
  - Branch office assignment dropdown for staff and driver scoping.
  - Password policy validation and edit mode password change protections.
  - Inline error alert banners with API feedback and instant toast notifications on save.
- **Security & Authorization**: Admin-only access with safeguards against self-deletion and unauthorized role escalations.

### 10. Admin System Settings & Financial Compliance (`Settings.jsx`, `settings.css`)
- **Comprehensive 5-Tab Configuration Workspace**:
  1. 🏢 *Company Profile*: Company name, support email, phone hotline, registered address, and **Company GST / Tax Identification Number (`company_gst_number`)** for legal invoicing and tax compliance.
  2. ⚙️ *Operational Rules*: Default initial booking status (`pending` vs `confirmed`), document expiry warning day thresholds, and fleet maintenance alert thresholds.
  3. 💳 *Pricing & Currency*: Currency symbol, currency code (ISO 4217), and standard tax percentage rate.
  4. 🔔 *Notifications*: Granular event toggles for document compliance alerts, maintenance due dates, and booking status updates.
  5. 🔒 *Security & Compliance*: Password strength rules, session timeout settings, and audit log policies.
- **Instant Toast Feedback**: Real-time save confirmation toast alerts and strict backend validation via `SettingController`.

### 11. Excel & CSV Data Import (`ImportData.jsx`)
- Downloadable sample templates and dependency-ordered import pipeline (customers $\rightarrow$ taxis $\rightarrow$ drivers $\rightarrow$ bookings) with pre-validation previews, error reporting, and audit logs.

### 12. Account Profile Hub (`ProfileModal.jsx`, `profile-modal.css`)
- Command-center profile view with initials avatar, role badge, assigned branch office, editable personal details (Name & Email), password update with confirmation check, and security audit log of past login sessions.

### 13. Security Hardening & Document Compliance
- Strict MIME type validation (`mimes:pdf,jpg,jpeg,png,webp`) and file size limits across driver documents, vehicle RC papers, taxi photos, and expense receipts. Automated 30-day expiration alerts for licenses and permits.

---

## Testing & Quality Assurance

### Backend Tests (PHPUnit)

Run all feature and unit tests from `backend-laravel`:

```bash
cd backend-laravel
php vendor/bin/phpunit -c phpunit.xml
```

*Result: **71 tests passing**, 371 assertions (100% pass rate).*

Test suites cover:
- Authentication & Profile Management (`AuthApiTest.php`, `ProfileApiTest.php`)
- Fleet Asset Records & Photography (`TaxiApiTest.php`, `TaxiPhotoAndOwnershipTest.php`)
- Driver Management & Compliance (`DriverApiTest.php`, `DriverDocumentUploadTest.php`)
- Rental Bookings & Lifecycle (`BookingTest.php`)
- Operational Trip Expenses & P&L (`BookingExpenseTest.php`)
- Office Management & Multi-Branch Scoping (`OfficeApiTest.php`)
- User Management & Permissions (`UserManagementTest.php`)
- System Settings & GST Configuration (`SettingsApiTest.php`)
- Data Import Pipeline (`ImportDataTest.php`)
- Fleet Maintenance & Reports (`MaintenanceTest.php`, `ReportApiTest.php`)

### Frontend Production Build (Vite)

Compile and bundle the React production distribution:

```bash
cd frontend-react
npm run build
```

*Build output: Zero lint/compilation errors, clean asset chunks generated in `frontend-react/dist/` in ~2.7s.*

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
  ```