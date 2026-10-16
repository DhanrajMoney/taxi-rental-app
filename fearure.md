# RideDesk — Complete Web Application Feature Documentation

> **Note:** This document is mirrored from [`feature.md`](file:///c:/xampp/htdocs/RideDesk_TaxiDriver_Module/taxi-rental-app/feature.md).  
> **Application Version:** `v1.4.0`  
> **Tech Stack:** Laravel 11 RESTful API + React 18 / Vite 5 SPA  

---

## Table of Contents

1. [Executive Summary & Architecture](#1-executive-summary--architecture)
2. [User Roles & Access Control](#2-user-roles--access-control)
3. [Operations Command Hub (Dashboard)](#3-operations-command-hub-dashboard)
4. [Rental Booking Management](#4-rental-booking-management)
5. [Taxi Fleet Management](#5-taxi-fleet-management)
6. [Driver Fleet Management](#6-driver-fleet-management)
7. [Compliance & Document Center](#7-compliance--document-center)
8. [Fleet Maintenance Desk](#8-fleet-maintenance-desk)
9. [Executive Operational Reports & Analytics](#9-executive-operational-reports--analytics)
10. [Multi-Location Office Management](#10-multi-location-office-management)
11. [Data Import & Historical Migration Engine](#11-data-import--historical-migration-engine)
12. [User Management](#12-user-management)
13. [Account Profile & Security Hub](#13-account-profile--security-hub)
14. [Admin System Settings](#14-admin-system-settings)
15. [Security & Performance Hardening](#15-security--performance-hardening)
16. [Deployment & Release Packaging](#16-deployment--release-packaging)

---

## 1. Executive Summary & Architecture

RideDesk is an end-to-end taxi fleet rental and operations enterprise application. It bridges reservations, fleet availability, driver compliance, garage maintenance, branch logistics, and financial P&L reporting into a centralized command center.

### Core Architectural Pillars
- **Decoupled / Single-Origin Support:** Designed to run either as a unified single-origin deployment (e.g. cPanel, Apache, Nginx serving the compiled React build directly through Laravel's public directory) or as a decoupled client-server architecture.
- **RESTful API Layer:** Strict request validation via dedicated `FormRequest` classes, Eloquent model relationships, eager loading to prevent $N+1$ query overhead, database indexing, and transactional integrity.
- **Modern Responsive React SPA:** Component-driven frontend built with Vite 5, featuring slide-in detail drawers (460px wide, zero horizontal overflow), modal popovers, real-time KPI ribbons, and persistent authentication across page refreshes.
- **Unified Design System:** Deep navy/teal palette (`#153d4a`, `#102f3a`), warm gold/amber accents (`#c9933b`), rounded card elevations, and custom-styled form controls.

---

## 2. User Roles & Access Control

The platform enforces three distinct user access tiers:

| Role | Target Persona | Scope of Access | Key Capabilities |
|---|---|---|---|
| **Administrator** (`admin`) | Fleet Owners & General Managers | Global (All Branches) | Full read/write access: taxis, drivers, bookings, offices, data imports, system settings, user management, and financial P&L reports. |
| **Operations Staff** (`staff`) | Dispatchers & Branch Managers | Branch-Scoped (Assigned Office) | Create & manage bookings, dispatch taxis & drivers, log maintenance work orders, upload documents, and view branch fleet metrics. |
| **Driver Partner** (`driver`) | Vehicle Drivers | Personal (Assigned Records) | View assigned fleet vehicle, personal trip roster, pickup/drop route details, and compliance document records. Restricted from administrative modules. |

---

## 3. Operations Command Hub (Dashboard)

The central operational dashboard provides real-time situational awareness across the entire fleet.

- **System Telemetry Indicator:** Live pulsing heartbeat dot displaying real-time operational status.
- **Calendar Date Pill & Branch Office Filter:** Filter the entire dashboard telemetry by specific branch office or view aggregated metrics across all locations.
- **1-Click Dispatch Action Bar:** Instant action buttons to launch:
  - `+ New Booking` (Opens Booking Creation Modal)
  - `+ Add Vehicle` (Opens Taxi Registration Modal)
  - `+ Add Driver` (Opens Driver Registration Modal)
  - `🛠️ Log Service` (Opens Maintenance Work Order Dialog)
  - `📊 Analytics` (Navigates to Financial Reports)
- **Executive KPI Ribbon (4 Hero Cards with Progress Bars):**
  1. **Available Fleet:** Current ready vehicles vs total fleet with dynamic utilization percentage gauge.
  2. **Active Drivers:** Real-time workforce status (Available / On Trip / On Leave).
  3. **Upcoming Trips:** Active trips on the road vs pending bookings awaiting dispatch.
  4. **Financial Revenue (MTD):** Month-to-date realized booking revenue vs maintenance expenses.
- **Urgent Action Required Watchlist:** Proactive banner surfacing critical operational bottlenecks:
  - Documents expiring within threshold days or already overdue.
  - Taxis with overdue maintenance service dates.
  - Pending bookings requiring dispatch confirmation.
- **Upcoming Dispatches Feed:** Real-time ledger of upcoming rides displaying route pickup/drop points, passenger contact info, assigned vehicle plate, driver name, and fare chips.
- **Fleet Readiness Gauge & Workforce Roster:** Visual breakdown of fleet and driver distribution.

---

## 4. Rental Booking Management

Comprehensive lifecycle management of vehicle reservations from initial quotation to trip completion.

- **Booking Status Lifecycle:**
  - `pending` $\rightarrow$ Initial booking inquiry awaiting vehicle/driver confirmation.
  - `confirmed` $\rightarrow$ Vehicle and driver assigned and reserved.
  - `active` $\rightarrow$ Passenger picked up; trip actively in progress.
  - `completed` $\rightarrow$ Trip ended; final odometer recorded and billing finalized.
  - `cancelled` $\rightarrow$ Reservation cancelled with required cancellation reason.
- **Real-Time KPI Status Strip:** Interactive top metric cards (Total Bookings, Active Trips, Confirmed, Pending, Completed, Cancelled). Clicking any card instantly filters the table.
- **Multi-Field Live Search:** Search bookings by customer name, contact phone, pickup location, drop-off destination, numeric booking ID, or assigned taxi registration plate.
- **Quick Date Filters:** Filter bookings by `All Time`, `Today`, `Tomorrow`, `Next 7 Days`, and `Next 30 Days`.
- **Slide-in Booking Command Center Drawer (Right Sidepanel):**
  - **Hero Header & Quick Actions:**
    - Live status badge pill with dynamic color styling, status icon, and trip duration indicator (`⏳ 3 days`).
    - Booking Reference ID Hero (`#BK-00042`) with 1-click clipboard copy button and animated `Copied!` confirmation.
    - Quick Customer Action Bar: 📞 Direct Call (`tel:`), ✉️ Direct Email (`mailto:`), and 📤 Share Summary (copies full structured dispatch details formatted for WhatsApp/SMS/Slack).
    - Blur backdrop overlay and keyboard `Esc` shortcut for instant dismissal.
  - **Segmented 4-Tab Navigation:**
    - 🧭 **Journey:**
      - **Visual Route Progress Timeline:** Green pickup node with scheduled date/time, dotted connector with duration & planned km badges (`🛣️ 150 km planned`), and drop-off destination node with return date/time.
      - **Dispatching Branch:** Office location, contact phone, and address.
      - **Trip Remarks & Special Requests:** Special instructions and customer notes.
      - **Cancellation Warning:** High-visibility alert banner highlighting cancellation reason if reservation is cancelled.
    - 👤 **Passenger:**
      - Customer Profile Hero card with dynamic gradient avatar initials (`getAvatarColor`), customer full name, and passenger role tag.
      - Direct contact rows with 1-click phone call & copy button, email compose & copy button, and registered residential/corporate address.
    - 🚕 **Fleet & Crew:**
      - **Assigned Fleet Vehicle:** Indian vehicle registration plate badge (`IND MH-02-CB-1234`), make & model, vehicle class (Sedan, SUV, Hatchback), passenger seating capacity, and fuel type.
      - **Assigned Chauffeur:** Driver profile with avatar initials, name, 1-click phone call button, and commercial license number badge.
      - **Unassigned State:** Helpful empty state cards with 1-click "Assign Now" shortcuts.
    - 💰 **Billing:**
      - **Fare Hero Card:** Prominent fare display with status tag (`Final Billed` vs `Estimated Quote`).
      - **Rate Structure:** Pricing model (Per-km vs Daily Rental) and unit rate breakdown.
      - **Odometer & Mileage:** Start/end odometer readings and actual distance tracked.
      - **Audit Records:** Creation and last modification timestamps.
  - **Sticky Bottom Action Footer:** Prominent "Edit Booking" and "Cancel Booking" buttons (gated by `canManage`).
  - **Zero-Overflow & Responsive Styling:** Complete zero-overflow protection (`word-break: break-word`, `overflow-wrap: anywhere`, `min-width: 0`, and custom slim scrollbars). Full mobile responsiveness ($\le 600\text{px}$) with full-width drawer and stacked action buttons.
- **Cancellation Protection Modal:** Dedicated modal preventing accidental deletion, capturing structured cancellation reasons, and gracefully freeing assigned taxi and driver records.

---

## 5. Taxi Fleet Management

Enterprise asset tracking for vehicles across multiple branches.

- **Dual View Modes:**
  - **Interactive Cards Grid View:** Elevated vehicle cards displaying category icons (Sedan, SUV, Hatchback, Mini Bus), registration number plate badges, assigned driver, office branch, and daily/per-km pricing tags.
  - **High-Density Table View:** Compact administrative table for rapid sorting, mass scanning, and quick-action access.
- **Live Fleet KPI Summary Strip:** Real-time counters showing Total Fleet, Available, On Rent, In Workshop, and Inactive vehicles.
- **Multi-Criteria Debounced Filtering:** Filter by vehicle make/model, registration plate, vehicle type, and current status.
- **Slide-in Taxi Detail Drawer:**
  - Prominent Registration Number Hero with **1-click Copy Registration** button.
  - Vehicle Specifications: Make, model, year, passenger capacity, fuel type, current odometer reading.
  - Assigned Driver profile with direct phone link.
  - Rates & Billing Policy: Daily rental rate or per-kilometer rate structure.
  - Branch location affiliation.
  - Compliance Documents list attached to the vehicle.
- **Rebuilt Taxi Form Modal:** Responsive dialog with office dropdown, vehicle category selector, pricing model toggle, and validation rules.

---

## 6. Driver Fleet Management

Complete workforce management and driver lifecycle tracking.

- **Interactive Metric KPI Strip:** Summary counts for Total Fleet Drivers, Active & Ready, On Trip, On Leave, and Document Compliance Alerts.
- **Dual View Modes:**
  - **Driver Cards Grid View:** Profile cards featuring driver avatars (custom uploaded photo or colorful deterministic hash-based initials), status indicators, click-to-call phone links, assigned vehicle badges (`UP21 AB 1234 • Maruti Dzire` or `Unassigned`), base office location, license number, and compliance health badges.
  - **Data Table View:** Structured tabular layout for high-density workforce oversight.
- **Eager-Loaded Fleet Vehicle Assignment:** Instantly shows which taxi is assigned to each driver without redundant network calls.
- **Slide-in Driver Detail Drawer:**
  - Large Hero Avatar, Full Name, Duty Status badge, Join Date, and internal Driver ID.
  - **Quick Action Bar:** 1-click **📞 Call Driver**, **✉️ Email Driver**, and **🪪 Copy License Number**.
  - Technical sections: Assigned Fleet Vehicle specs, Licensing & Compliance Health countdowns, Contact Info, Residential Address, and Employment Notes.
- **Driver Form Modal with Custom File Picker:**
  - Custom-styled **"Choose File"** upload button (`.drv-file-btn`) replacing raw browser inputs.
  - Live photo thumbnail preview for newly selected and existing on-file photos.
  - File name display with ellipsis text protection and instant "✕" clear button.
  - Full tracking for license number, license expiry date, insurance expiry, general doc expiry, and mandatory clearance.

---

## 7. Compliance & Document Center

Centralized repository for persistent regulatory compliance records.

- **Supported Document Categories:**
  - **Vehicle Documents:** RC (Registration Certificate), Commercial Vehicle Insurance, Pollution Under Control (PUC), Fitness Certificate, State/National Route Permits.
  - **Driver Documents:** Commercial Driving License, Personal & Passenger Liability Insurance, Police Background Verification, Medical Fitness Certificate, Defensive Driving Training Badges.
- **Automated Health & Expiry Engine:**
  - `Expired` (Red Badge): Overdue compliance documents requiring immediate vehicle grounding or driver suspension.
  - `Expiring Soon` (Amber Badge): Documents expiring within the configured threshold (default 30 days) with countdown badges (e.g. `Expires in 12 days`).
  - `Compliant / Valid` (Green Badge): Active and verified records.
- **Security Validation:** Hardened file uploads enforcing strict MIME types (`pdf,jpg,jpeg,png`) and 10MB constraints to prevent arbitrary file upload vulnerabilities.
- **Document Actions:** Direct browser file downloads and deletion with cascade cleanup.

---

## 8. Fleet Maintenance Desk

Full garage repair ledger and proactive maintenance scheduling.

- **Executive Fleet Health Header:** Dynamic KPI cards tracking Total Work Orders, Services Due in 30 Days, Overdue Service Checkups, and Cumulative Maintenance Expenditures.
- **Overdue Attention Alert Banner:** Prominent warning banner with **1-click vehicle filtering chips** to immediately isolate vehicles operating past their scheduled service interval.
- **Work Order Modal:**
  - Automatic vehicle odometer pre-fill based on latest trip mileage.
  - Quick service task chips (Oil Change, Brake Inspection, Tire Rotation, Battery Replacement, AC Service).
  - Quick date calculation helpers (`+3 months`, `+6 months`, `+1 year`).
  - Invoice bill attachment dropzone (PDF, JPG, PNG).
- **Service History Ledger:** Shows vehicle registration, service date, garage description, cost, next scheduled checkup date, and direct invoice download links.

---

## 9. Executive Operational Reports & Analytics

Decision-support reporting engine for executive management and financial oversight.

- **Executive Financial & P&L Statement:**
  - Realized Booking Revenue vs Maintenance Expenses = **Net Operating Margin** & **Profit Margin %**.
  - Pipeline analysis comparing realized completed revenue vs estimated unfinalized bookings.
- **Monthly Trajectory Dual-Bar Chart:** Visual dual-bar chart comparing month-by-month revenue inflow against maintenance upkeep costs.
- **Fleet Utilization Report:** Individual vehicle utilization rates with color-coded gauge progress bars (🟢 $>70\%$, 🟡 $30\% - 70\%$, 🔴 $<30\%$).
- **Driver Performance & Fulfillment Report:** Tracks completed trips, cancelled rides, fulfillment rate %, and total revenue generated per driver.
- **Maintenance Cost Analysis:** Breakdowns of garage expenses by vehicle, category, and date.
- **Exporting & Printing:** Export filtered tables to CSV spreadsheets or print-optimized executive PDF styling.

---

## 10. Multi-Location Office Management

Branch logistics architecture for regional or multi-city rental businesses.

- **Branch Operations Management:** Create, edit, and deactivate office locations with address, city, phone, and operational status.
- **Staff Access Scoping:** Associate staff users with specific branch locations. Staff members only view and manage bookings, vehicles, and drivers belonging to their assigned branch.
- **Administrative Global Oversight:** Administrators retain complete cross-office visibility with 1-click branch switching or "All Offices" views.

---

## 11. Data Import & Historical Migration Engine

Safe bulk migration system for importing legacy spreadsheet records.

- **Downloadable Sample Templates:** Pre-formatted CSV templates for Customers, Taxis, Drivers, and Bookings.
- **Strict Dependency-Ordered Pipeline:** Executes imports sequentially (`Customers` $\rightarrow$ `Taxis` $\rightarrow$ `Drivers` $\rightarrow$ `Bookings`) to ensure valid relational foreign keys.
- **Pre-Validation Preview Screen:** Parses uploaded spreadsheets in memory, auditing required fields, date formats, duplicate identifiers, and relationship matching. Displays created, updated, skipped, and invalid rows with row-level error tooltips.
- **Transactional Rollback:** Database writes are wrapped in transactional blocks, ensuring corrupt data is rejected cleanly without partial writes.
- **Import Audit History:** Complete audit ledger of all historical uploads with user, timestamp, row counts, and status.

---

## 12. User Management

Role and credential administration for internal operators.

- **User Accounts Ledger:** Searchable directory of all platform administrators, operations staff, and driver login accounts.
- **Account Provisioning:** Create user accounts with secure password assignment, role selection, and optional office branch linking.
- **Account Updates & Deactivation:** Update user credentials, modify role permissions, or revoke account access.

---

## 13. Account Profile & Security Hub

Modern command-center profile modal accessible directly from the top-bar header (`👤 [User Name]`).

- **Hero Profile Header:**
  - Gradient avatar circle with uppercase user initials.
  - User name, email, and internal Account ID (`USR-#0001`).
  - Distinct role badges (`👑 Administrator`, `💼 Operations Staff`, `🚗 Driver Partner`) and branch location badge.
- **Personal Details Tab:**
  - Account summary cards: Role & permissions, Assigned Office, Member Since date, Account ID.
  - Editable form for **Full Name** and **Email Address** with live synchronization across the application header.
- **Security & Password Tab:**
  - Verified password update requiring current password validation.
  - Enforced 8+ character minimum and confirmation match verification.
  - Success and error feedback banners.
- **Login Activity Audit Tab:**
  - Audit log table displaying recent user sessions with timestamp, client IP address (`127.0.0.1`), browser/client environment, and `🟢 Current Session` indicator.

---

## 14. Admin System Settings

Centralized configuration panel for global operational rules.

- **Company Profile:** Company legal name, customer support email, and operational phone number.
- **Currency & Taxation:** Currency symbol (e.g. `₹`, `$`, `€`), ISO currency code (e.g. `INR`, `USD`), and standard tax percentage.
- **Alert Day Thresholds:** Document Expiry Warning Days (default 30 days) and Maintenance Upcoming Warning Days (default 30 days).
- **Default Booking Status:** Configure default state for newly created reservations (`pending` vs `confirmed`).
- **Rental Terms & Policy:** Editable rich-text policy terms appended to customer booking receipts.

---

## 15. Security & Performance Hardening

Production-grade engineering optimizations implemented across the stack:

- **Arbitrary File Upload Mitigation:** Validation rules in `DriverDocumentController.php` enforce strict MIME type whitelisting (`pdf,jpg,jpeg,png`) and 10MB file limits.
- **Session Persistence:** Auth token stored in `localStorage` under `ridedesk_auth_token` with automatic session re-hydration upon page reload, eliminating accidental session drops.
- **Batched Dashboard Settings Query:** Replaced individual sequential queries in `DashboardController.php` with a single batch `whereIn` query, saving multiple database roundtrips on every page view.
- **Enhanced Multi-Field Search:** Search builder matches customer name, phone, pickup, drop-off, numeric Booking IDs, and vehicle plate numbers.
- **DRY Utility Centralization:** Consolidated currency, date/time, clipboard, and avatar helpers into [`format.js`](file:///c:/xampp/htdocs/RideDesk_TaxiDriver_Module/taxi-rental-app/frontend-react/src/utils/format.js), reducing bundle sizes across all page chunks.
- **CSS Optimization:** Restructured [`taxis.css`](file:///c:/xampp/htdocs/RideDesk_TaxiDriver_Module/taxi-rental-app/frontend-react/src/styles/taxis.css) from 1,109 lines down to 486 lines ($>56\%$ reduction) while preserving full visual fidelity.
- **Comprehensive Automated Test Suite:** **53 PHPUnit feature tests passing** with 234 assertions covering permissions, validation, calculations, imports, and security.

---

## 16. Deployment & Release Packaging

Built for effortless deployment on cPanel shared hosting, Apache, Nginx, or VPS:

- **Single-Origin Deployment:** The React Vite production bundle (`frontend-react/dist/`) compiles directly into Laravel's public web root (`backend-laravel/public/`), allowing the entire app to run on a single domain/port without Node.js on the server.
- **Automated Packaging Pipelines:**
  - **Windows PowerShell:** `powershell.exe -ExecutionPolicy Bypass -File .\installation\package-release.ps1`
  - **Linux / macOS:** `./installation/package-release.sh`
  - *Automates testing, Vite compilation, asset copying, and creates a clean production-ready `.zip` release archive.*
- **Step-by-Step Guides:** Complete guides available in `installation/`:
  - `INSTALLATION_GUIDE.md`
  - `CPANEL_DEPLOYMENT_GUIDE.md`
  - `DATABASE_SETUP.md`
  - Production configurations: `env.production.example`, `nginx.conf.example`, `apache.htaccess.example`.

---

## 17. Ride & Trip Operational Expense Management (Phase 18)

Comprehensive trip-level operational expense recording, driver reimbursement lifecycle, and real-time net ride profitability engine.

- **Expense Categories:**
  - ⛽ **Fuel & Energy:** Diesel, petrol, CNG, EV charging payments.
  - 🛣️ **Tolls & FASTag:** Highway and toll plaza deductions.
  - 🅿️ **Parking Charges:** Airport, railway station, municipal, and hotel parking fees.
  - 🍽️ **Driver Allowance (Bata / DA):** Daily food allowance and outstation stay allowances.
  - 🛂 **State Border & Interstate Permits:** Passenger entry taxes and interstate commercial permits.
  - 🧹 **Incidentals & Repairs:** Puncture fixes, wash, and minor en-route consumables.
- **Billing & Settlement Model:**
  - **Billable vs Company-Absorbed:** Toggle whether an expense is added to the customer invoice at actuals or absorbed by company operations.
  - **Payment Methods & Payer:** Driver Cash, Driver UPI, Corporate Card, FASTag, Customer Direct.
- **Driver Reimbursement Workflow:**
  - Statuses: `pending_approval` $\rightarrow$ `approved` $\rightarrow$ `reimbursed` / `rejected`.
  - Drivers can log expenses and attach bill slips directly from mobile view.
  - Staff and Admin review, approve, and reimburse claims.
- **Receipt Attachments:**
  - Strict upload validation (PDF, JPG, PNG up to 10MB) with secure local storage and private download endpoints.
- **Real-Time Trip P&L & Profitability Engine:**
  - Real-time calculation on bookings:
    $$\text{Gross Total} = \text{Base Fare} + \text{Billable Add-ons}$$
    $$\text{Total Expenses} = \sum \text{expenses (excluding rejected)}$$
    $$\text{Net Profit} = \text{Gross Total} - \text{Total Expenses}$$
    $$\text{Profit Margin \%} = \frac{\text{Net Profit}}{\text{Gross Total}} \times 100$$
- **Slide-in Command Drawer Integration:**
  - Dedicated **"💸 Expenses"** 5th tab in the slide-in booking drawer with live Trip P&L hero cards, filtering chips, receipt preview links, and approval action buttons.
- **Executive Reporting Synchronization:**
  - Reports workspace incorporates trip expenses alongside garage maintenance for true operational net margin calculations.

