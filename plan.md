# Rent A Ride Desk Feature Plan

> Last reviewed: 2026-10-15

## Goal
Build a complete taxi rental operations dashboard for admins, staff, and drivers.

## Phase 1: Rental Booking Management
**Priority:** High

**Status:** Redesigned & Rebuilt into a modern Operations Workspace (`Bookings.jsx`, `bookings.css`, `BookingForm.jsx`, `CancelBookingModal.jsx`). Features an interactive top KPI strip (Total, Active, Confirmed, Pending, Completed, Cancelled), multi-filter controls (live search, status filter, branch office filter, and quick date ranges), and a slide-in **Booking Detail Drawer (Right Sidepanel)** with zero-overflow architecture, a prominent Booking ID Hero with 1-click clipboard copy, structured tabs (Ride Details, Customer Contact, Vehicle & Driver Assignment, and Transparent Pricing/Fare Breakdown), cancellation workflow modal with cascade protections, and optimized modular CSS.

- Add customers and customer contact details.
- Create bookings with pickup date, return date, pickup location, and notes.
- Assign an available taxi and driver.
- Add booking statuses: pending, confirmed, active, completed, cancelled.
- Prevent assigning taxis or drivers that are already booked.
- Show booking history and upcoming bookings with interactive drawer inspection.
- Streamlined and optimized modular CSS without bloat or layout clipping.

**Done when:** Staff can create, update, assign, search, filter, inspect via sidepanel drawer, and safely cancel bookings.

## Phase 2: Dashboard Overview

**Status:** Redesigned & Rebuilt into a modern Operations Command Hub (`DashboardOverview.jsx`, `dashboard.css`, `DashboardController.php`). Features an operations control bar with live system telemetry dot, calendar date pill, multi-office branch filter, background telemetry refresh button, and 1-click dispatch quick-action shortcuts (New Booking, Add Vehicle, Add Driver, Log Service, Analytics). The Executive KPI Ribbon displays 4 hero metric cards with live progress bars and interactive navigation: Available Fleet (with utilization rate %), Active Drivers (ready vs on trip vs on leave), Upcoming Trips (on road vs pending confirmation), and Month-to-Date Financial Revenue (with maintenance spend). Includes an Urgent Action Required Hub for compliance expiries, overdue maintenance, and unconfirmed bookings. The two-column operations grid presents an Upcoming Dispatches feed (with route points, vehicle/driver assignment badges, customer contact, and fare chip), a Recent Operational Log ledger, a Fleet Readiness segmented gauge, a Driver Workforce roster, and a Compliance Watchlist.

- Show total taxis, available fleet, and utilization percentage.
- Show active drivers, drivers on trip, and on leave.
- Show upcoming dispatches with route details and assignment chips.
- Show month-to-date revenue vs maintenance expenditures.
- Action Required banner for document expiries, maintenance checkups, and pending bookings.
- Filter operations by multi-location office branch.
- Instant 1-click navigation to operational workspaces.

**Done when:** Users can monitor, dispatch, filter, and act on all critical operations directly from the central command hub.

## Phase 3: Driver Documents and Alerts & Security Hardening

**Status:** Implemented and Security Hardened in the Laravel API (`DriverController`, `DriverDocumentController`) and React dashboard (`DocumentsPanel.jsx`, `Drivers.jsx`). Driver records support license, insurance, document, and required-document expiry dates with automated 30-day alert indicators. Hardened file upload security in `DriverDocumentController.php` with strict MIME type restrictions (`mimes:pdf,jpg,jpeg,png`) and 10MB file constraints.

- Track license expiry dates.
- Track insurance, general document, and required document expiry dates.
- Highlight expired and expiring-soon documents with real-time countdown badges.
- Arbitrary file upload vulnerability patched with strict MIME validation.
- Attached compliance records persist in database and file storage with instant preview/download.

**Done when:** Staff can identify document problems before they become operational issues, and driver documents are uploaded safely without arbitrary file execution risks.

## Phase 4: Taxi Maintenance Tracking

**Status:** Redesigned & Rebuilt in the authenticated API and React maintenance workspace (`Maintenance.jsx`, `maintenance.css`). Features an executive fleet health header with 4 dynamic KPI cards (Total Work Orders, Due in 30 Days, Overdue Checkups, Total Maintenance Spend), an attention alert banner with 1-click vehicle filtering chips, and a modern modal dialog for logging and editing work orders with automatic vehicle odometer pre-fill, quick service task chips, quick date calculation helpers (+3m, +6m, +1y), and invoice receipt dropzone. The work order ledger displays vehicle registration badges, model info, office branch tags, mileage pills, status pills (Overdue, Due Soon, Scheduled), direct bill downloads, and multi-branch/live-search filtering.

- Add maintenance records with garage work order details.
- Track service date, odometer, cost, and description.
- Store next scheduled service date with automated urgency detection.
- Show maintenance history per taxi with branch office scoping.
- Add upcoming maintenance alerts and overdue warning banners.
- Attach and download invoice bill receipts (PDF, JPG, PNG).

**Done when:** Staff can see the complete maintenance history of every taxi and proactively manage upkeep.

## Phase 5: Role-Based Workspaces

**Status:** Implemented in the authenticated API and React dashboard. Admins can manage users through the admin-only API and Users workspace. Role-based navigation and write permissions are in place, and driver booking lists and details are restricted to bookings assigned to matching driver records.

- Admin: manage users, taxis, drivers, bookings, reports, offices, data imports, and settings.
- Staff: manage daily operations and bookings.
- Driver: view assigned taxi, bookings, and trip details.
- Hide actions that a role is not allowed to use.

**Done when:** Each role sees only the features and actions it needs.

## Phase 6: Reports and Exports

**Status:** Redesigned & Rebuilt in the Laravel API and React dashboard (`Reports.jsx`, `reports.css`). The workspace features an Executive Financial & P&L view (Realized Booking Revenue vs Maintenance Expenses = Net Operating Margin & Profit %, plus unfinalized quote pipeline), an interactive monthly revenue vs maintenance trajectory visual dual-bar chart, a Fleet Utilization report with color-coded gauge progress bars (🟢 >70%, 🟡 30-70%, 🔴 <30%), a Driver Activity & Fulfillment report with completion rates and revenue contribution, and a Fleet Maintenance Cost report. Includes custom date range pickers (From/To dates) alongside quick presets (7d, 30d, 90d, 365d, all), multi-branch office filtering, real-time table search, dynamic system currency formatting, CSV exports, and browser print-to-PDF styles.

- Executive Financial & P&L report (Revenue vs Maintenance Spend vs Net Profit Margin).
- Booking revenue report with finalized vs estimated fare breakdown.
- Taxi fleet utilization report with visual occupancy gauges.
- Driver performance and trip fulfillment activity report.
- Fleet maintenance expenditure ledger.
- Export filtered results to CSV and print-optimized executive PDF.

**Done when:** Admin and staff can export useful operational reports and analyze business profitability.

## Phase 7: Notifications, Security & Account Profile

**Status:** Redesigned & Rebuilt in the Laravel API (`ProfileController`, `PUT /api/profile`) and React dashboard (`ProfileModal.jsx`, `profile-modal.css`). The Account Profile modal has been modernized into a sleek command-center profile hub featuring a hero profile header with initials avatar, role badge (`Admin`, `Staff`, `Driver`), assigned office branch badge, structured tabbed views (Personal Details with real-time name/email update, Security & Password change, and an audited Login Activity history ledger with IP addresses and session badges).

- Profile Hero with dynamic avatar initials, account role pill, and office affiliation.
- Update personal profile details (Name and Email) with live top-bar synchronization.
- Change password securely with current password verification and confirmation validation.
- Audit log of recent login activities with IP address, device/agent, and active session pills.
- Top-bar in-app notification bell with real-time operational alerts for bookings, maintenance, and compliance expiries.
- Add account management for admins.

**Done when:** Users can inspect their account credentials, edit personal details, change passwords, review security logs, and receive critical fleet notifications.

## Phase 8: Multi-Location Office Setup
**Priority:** High

**Status:** Implemented in the Laravel API and React workspace (`Offices.jsx`). Admins can create, update, view, and deactivate office locations. Taxis, drivers, users, and bookings are associated with an office location, and staff operational scoping is enforced based on branch assignment.

- Allow admins to create, update, view, and deactivate office locations with a name, address, contact details, and status.
- Assign staff users to one or more office locations and let admins manage those assignments.
- Associate taxis, drivers, and bookings with an office location so daily operations can be managed by branch.
- Let staff view and manage records for their assigned location(s); admins can view and manage all locations.
- Add an office/location filter to relevant lists and dashboard summaries, with a clear all-locations view for admins.
- Validate that new bookings and assigned resources belong to a permitted location, while preserving cross-location visibility for admins.

**Done when:** Admins can set up and manage multiple offices, and users see or manage operational records according to their location access.

## Phase 9: Excel and CSV Data Import
**Priority:** High

**Status:** Implemented in the Laravel API (`ImportController`) and React workspace (`ImportData.jsx`). Downloadable CSV templates are provided for customers, taxis, drivers, and bookings. Imports run in dependency order (customers -> taxis -> drivers -> bookings), validating required fields, duplicate records, and stable identifiers before writing to the database within a transaction. An import audit history log is maintained.

- Provide downloadable Excel/CSV templates for customers, taxis, drivers, and bookings.
- Dedicated `customers` table created and synced with customer details.
- Import records in dependency order: customers, taxis, drivers, then bookings.
- Match booking taxi and driver values to existing records using stable identifiers such as registration number and license number, not display names alone.
- Validate required fields, dates, statuses, duplicate records, missing relationships, and invalid taxi/driver assignments before writing data.
- Show a preview with created, updated, skipped, and failed rows, including row-level error messages.
- Allow administrators to confirm or cancel an import and keep an import summary for audit purposes.
- Prevent duplicate imports using unique customer, taxi, driver, and booking identifiers where available.
- Add focused API tests for valid imports, malformed rows, duplicate handling, relationship matching, permissions, and rollback behavior.

**Done when:** An administrator can safely upload the provided spreadsheet files, review validation results, import valid existing records, and verify that historical bookings display with the correct customer, taxi, and driver relationships.

## Phase 10: Taxi Fare Models and Booking Charges
**Priority:** High

**Status:** Implemented in the Laravel API and React dashboard. Taxis support daily or per-kilometer rates; bookings store a rate snapshot and estimated fare, then calculate final charges from inclusive daily dates or actual odometer distance. Automated model `saving` hooks on `Booking.php` and self-healing rate defaults on `Taxi.php` guarantee that estimated fares auto-calculate reliably on booking creation, updates, and database seeding.

- Configure each taxi with either a daily rate or a per-kilometer rate.
- Preserve existing daily rates when migrating taxi records.
- Show estimated booking charges and capture odometer readings when trips start and finish.
- Calculate final charges on the backend and update the taxi odometer on trip completion.
- Preserve the booked rate when taxi pricing is edited later.
- Auto-calculate estimated fare from vehicle rates and trip dates via model lifecycle hooks.
- Use finalized booking fares in revenue reports and show estimates separately.

**Done when:** Staff can create daily- and per-km-priced taxis, quote bookings, and finalize charges accurately when trips complete.

## Phase 11: Admin System Settings

**Status:** Implemented in the Laravel API (`SettingController`) and React dashboard (`Settings.jsx`). Admins can view and update system configurations including company details, currency formats, tax percentages, document and maintenance alert day thresholds, and rental terms & conditions.

- Company Name, Support Email, and Support Phone configuration.
- Currency Symbol, Currency Code, and Tax Percentage.
- Document Expiry and Maintenance Alert Warning Day Thresholds.
- Default Initial Booking Status.
- Rental Terms and Conditions Policy Text.

**Done when:** Admins can customize application defaults, thresholds, and company details directly from the dashboard settings area.

## Phase 12: Production Deployment & Packaging Automation
**Priority:** High

**Status:** Implemented with complete production guides and automated packaging scripts in `installation/`. Supports single-origin unified deployment (cPanel, shared hosting, Apache, Nginx) as well as decoupled multi-domain setups.

- Created `installation/INSTALLATION_GUIDE.md` covering system requirements, permissions, and server setup.
- Created `installation/CPANEL_DEPLOYMENT_GUIDE.md` for shared hosting cPanel installations without requiring Node.js or VPS access.
- Created `installation/DATABASE_SETUP.md` for MySQL / MariaDB utf8mb4 collation and migrations.
- Provided production config templates: `env.production.example`, `nginx.conf.example`, and `apache.htaccess.example`.
- Automated release build pipelines: `package-release.ps1` (Windows) and `package-release.sh` (Linux/macOS) to verify test suites, compile production Vite bundles, publish to Laravel web root, and package clean release archives.

**Done when:** The application can be installed and deployed seamlessly on shared hosting or VPS environments.

## Phase 13: Sidebar Navigation Reordering & Visual Alignment
**Priority:** Medium

**Status:** Completed in React frontend (`App.jsx` and `dashboard.css`). Navigation items are logically structured into two clean operational sections ("Fleet Operations" and "Administration"), replacing mixed unicode/emoji characters with pixel-perfect, consistent vector SVG icons and unified vertical/horizontal alignment.

- Reordered menu hierarchy into logical ERP workflow:
  - **Fleet Operations:** Overview, Bookings, Taxis, Drivers, Maintenance, Documents, Reports.
  - **Administration:** Offices, Users, Data Import, Settings.
- Replaced mismatched Unicode symbols and Segoe UI multi-color emojis with uniform Feather/Lucide-style SVG vector icons rendered in dedicated icon containers (`NavIcon`).
- Enhanced sidebar CSS (`dashboard.css`): increased width from 226px to 242px for label breathing room, fixed sticky viewport positioning with thin scrollbar support, added clean section headers, and eliminated baseline jumps.
- Maintained strict role-based scoping (drivers see only assigned operational items without empty admin groups; staff see operational items plus assigned offices; admins see all management controls).
- Responsive mobile compatibility preserved with `display: contents` grid preservation under 680px.

**Done when:** The sidebar menu is logically sequenced, icons and text labels align symmetrically, and navigation is responsive and accessible across all user roles.

## Phase 14: Taxi Fleet Management Redesign & Rebuild
**Priority:** High

**Status:** Completed in React frontend (`Taxis.jsx`, `taxis.css`, `TaxiForm.jsx`). The workspace provides interactive dual view modes (Vehicle Cards Grid & Structured Data Table), a top live KPI metric summary strip (Total Fleet, Available, On Rent, In Workshop, Inactive), debounced multi-filters (make/model, registration, vehicle type, status), and a slide-in **Taxi Detail Drawer (Right Sidepanel)** with prominent Registration Hero, 1-click clipboard copy, vehicle specs, assigned driver, compliance document manager, and billing rate tags. Restructured and optimized `taxis.css` by over 56% to eliminate bloat while preserving 100% of the UI design system.

- Real-time KPI summary counters for instant fleet status inspection.
- Dual view toggle (Interactive Cards Grid vs Administrative Data Table).
- Live debounced search by registration number, make, and model.
- Slide-in Taxi Detail Drawer (440px wide, zero horizontal overflow, blur backdrop, Esc key support).
- Rebuilt `TaxiForm.jsx` modal dialog with office branch selection, rate models, and vehicle type options.
- Compact, performance-optimized CSS (`taxis.css`).

**Done when:** Fleet administrators and staff can monitor, inspect, filter, edit, and manage vehicles through both grid and table interfaces with seamless detail drawer integration.

## Phase 15: Driver Fleet Management Redesign & Rebuild
**Priority:** High

**Status:** Completed in React frontend (`Drivers.jsx`, `drivers.css`, `DriverForm.jsx`) and backend (`DriverController.php`). Modernized driver management with live top metric cards (Total Fleet, Active, On Trip, On Leave, Doc Alerts), dual view modes (Driver Cards Grid & Structured Data Table), debounced multi-criteria search, eager loaded taxi assignment, and a slide-in **Driver Detail Drawer (Right Sidepanel)**. Rebuilt `DriverForm.jsx` modal dialog with accessible keyboard controls, custom-styled "Choose File" photo upload button with live avatar preview, filename feedback, clear controls, and comprehensive compliance dates.

- Real-time KPI summary strip with 1-click status filtering.
- Dual view toggle: Driver Cards Grid with vibrant avatars & initials vs Data Table.
- Eager loaded taxi relationship displaying vehicle plates and make/model directly on driver cards.
- Slide-in Driver Detail Drawer with driver avatar hero, quick actions (Call, Email, Copy License), assigned taxi details, compliance countdowns, and attached document records.
- Modern `DriverForm.jsx` modal dialog with custom-styled upload button (`.drv-file-btn`), image preview, and filename feedback.
- Restructured and consolidated `drivers.css` matching the command-center design system.

**Done when:** Fleet managers can inspect driver duty status, track compliance health, view assigned vehicles, and register/edit drivers with modern file upload and profile workflows.

## Phase 16: Booking Detail Drawer & Command Center Rebuild
**Priority:** High

**Status:** Completed in React frontend (`Bookings.jsx`, `bookings.css`). Rebuilt the slide-in detail side panel drawer into a modern operations command-center interface with structured tabs, visual journey tracking, direct contact actions, and zero-overflow layout architecture.

- **Hero Header & Quick Actions:**
  - Dynamic status badge pill with color coding, status icon, and trip duration indicator (e.g. `⏳ 3 days`).
  - Booking Reference Hero (`#BK-00042`) with 1-click clipboard copy button and animated `Copied!` confirmation.
  - Quick Customer Action Bar: 📞 Direct Call (`tel:`), ✉️ Direct Email (`mailto:`), and 📤 Share Summary (copies full structured dispatch details formatted for WhatsApp/SMS/Slack).
  - Smooth backdrop overlay with `Esc` key shortcut for dismissal.
- **Segmented Navigation Tabs:**
  - 🧭 **Journey:** Interactive Visual Route Progress Timeline featuring a green pickup node with scheduled date/time, dotted connector with duration & planned km badges (`🛣️ 150 km planned`), destination drop-off node with return date/time, dispatching office branch info, trip notes, and cancellation warning banner with stated reason.
  - 👤 **Passenger:** Customer Profile Hero card with dynamic gradient avatar initials (`getAvatarColor`), customer name, and contact rows (Phone with 1-click call and copy, Email with 1-click mailto and copy, and registered street address).
  - 🚕 **Fleet & Crew:** Assigned Fleet Taxi card with Indian license plate badge (`IND MH-02-CB-1234`), make & model, vehicle class, seating capacity, and fuel type. Assigned Chauffeur card with driver avatar initials, name, 1-click call button, and commercial license badge. Informative empty state cards with 1-click "Assign Now" shortcuts when unassigned.
  - 💰 **Billing:** Fare Hero card (Final Billed Fare vs Estimated Fare Quote), rate structure matrix (per-km vs daily rental), start/end odometer mileage tracking, and system audit trail (Created On, Last Modified).
- **Sticky Footer & Permissions:**
  - Sticky bottom action footer with "Edit Booking" and "Cancel Booking" buttons (gated by `canManage`).
- **Zero-Overflow & Responsive Styling:**
  - Complete zero-overflow protection (`word-break: break-word`, `overflow-wrap: anywhere`, `min-width: 0`, and slim custom scrollbars).
  - Mobile responsive drawer ($\le 600\text{px}$) expanding to `100vw` with stacked actions and scrollable tabs.

**Done when:** Dispatchers and staff can inspect all booking parameters, customer contacts, assigned vehicles, drivers, route progress, and fare breakdowns inside a modern, responsive slide-in side panel.

## Phase 17: Multi-Channel Email & WhatsApp Automated Notification System
**Priority:** High

**Status:** Planned. Design and implement an enterprise-grade automated notification pipeline across Email and WhatsApp for passenger booking receipts, driver trip assignments, operational dispatch alerts, and fleet compliance warnings.

- **1. Event-Driven Notification Triggers:**
  - **Customer Notifications:**
    - **Booking Confirmation & Itinerary:** Instant WhatsApp template message and branded HTML email containing Booking Reference (`#BK-00042`), scheduled pickup date/time, pickup/drop locations, assigned vehicle & chauffeur, estimated fare quote, and support hotline.
    - **Driver Assignment & Vehicle Dispatch:** Real-time alert dispatched when a chauffeur or taxi is assigned or reassigned, providing driver full name, contact phone number, vehicle make/model, and Indian registration plate.
    - **Trip Commencement (Pickup Alert):** Alert notifying customer that the trip has started with starting odometer confirmation.
    - **Trip Completion & Digital Invoice Receipt:** Final fare receipt breakdown (base rate, actual distance/days, applicable tax, extra charges) with PDF invoice download link and WhatsApp summary.
    - **Cancellation Notice:** Immediate notice if a reservation is cancelled, stating cancellation reason and contact assistance.
  - **Driver Chauffeur Notifications:**
    - **New Trip Assignment Dispatch:** Instant WhatsApp & Email with passenger name, direct call shortcut, pickup time, exact pickup address/Google Maps link, and scheduled drop point.
    - **Schedule Modification / Cancellation:** Instant alert if passenger cancels or reschedules pickup time.
    - **Compliance Reminders:** Automated WhatsApp/Email alerts 30 days, 15 days, and 7 days prior to driver commercial license or vehicle insurance expiry.
  - **Admin & Dispatch Staff Alerts:**
    - **New Inbound Booking Alert:** Notification to operations staff when new inquiries or online bookings are logged.
    - **Fleet Compliance & Overdue Maintenance Alert:** Automated daily digest of upcoming vehicle fitness/tax expiries and overdue servicing.

- **2. Backend Architecture (Laravel 11):**
  - **Queued Notification Pipeline:** Implement Laravel Notification classes (`Illuminate\Notifications\Notification`) utilizing asynchronous background queues (`ShouldQueue`) so notification delivery never impacts API latency.
  - **Email Service Provider (ESP) Integration:**
    - SMTP / Amazon SES / Postmark / Mailgun / Resend integration configured in `config/mail.php`.
    - Modern, responsive HTML email templates with company branding, header logo, structured reservation summary card, route map visualization, and CTA buttons.
  - **WhatsApp Business API Gateway Integration:**
    - Modular gateway driver supporting Twilio WhatsApp API, Meta Cloud API, or Gupshup/Infobip.
    - Standardized WhatsApp template messages (HSM) with parameter substitution for 24-hour conversational window compliance.
    - Webhook receiver (`POST /api/webhooks/whatsapp`) for tracking delivery status (`sent`, `delivered`, `read`, `failed`).
  - **Admin Notification Settings & Gateway Configuration:**
    - Manageable via database settings: SMTP host/port/credentials, WhatsApp API keys (Twilio SID/Auth Token/Sender or Meta Cloud Token/Phone ID).
    - Granular event toggles: independently enable/disable Email and WhatsApp for customer confirmation, driver assignment, trip completion, and compliance alerts.
    - "Send Test Message" diagnostic utility in Settings to verify gateway connectivity before going live.
  - **Audit Logging & Delivery Ledger:**
    - `notification_logs` database migration to track recipient phone/email, event type, channel (`email`, `whatsapp`), status, external message ID, and delivery error payload.
    - Manual 1-click resend capability from backend API (`POST /api/bookings/{id}/notifications/resend`).

- **3. Frontend Dashboard Integration (React):**
  - **Settings Workspace (`Settings.jsx`):**
    - New "Notification Gateways" settings tab for configuring SMTP mail settings and WhatsApp Business API credentials with live connection test buttons.
    - Event matrix toggles allowing administrators to turn Email or WhatsApp alerts ON/OFF per lifecycle stage.
  - **Booking Command Center Drawer (`Bookings.jsx`):**
    - Notification history badge indicator in the Booking Drawer displaying delivery status (e.g., `✉️ Email Sent`, `💬 WhatsApp Delivered`).
    - Dedicated "Resend Notification" quick action button in the customer action bar.
    - Direct "Send via WhatsApp Web" fallback button allowing staff to open WhatsApp Web with a pre-filled booking summary if the automated gateway is disabled.

- **4. Quality Assurance & Automated Testing:**
  - Feature tests covering notification dispatch on booking creation, chauffeur assignment, and trip completion using `Notification::fake()` and `Mail::fake()`.
  - Unit tests for WhatsApp message payload formatting and template parameter mapping.
  - Webhook callback tests for status updates and error handling.

**Done when:** Customers and drivers receive automated, formatted WhatsApp and Email confirmations for booking reservations, chauffeur assignments, and trip completion receipts, while admins can configure gateway credentials and monitor notification delivery logs directly from the dashboard.

## Technical Checklist

- Current UI app version: `1.4.0`.
- Whenever a feature is implemented, increment `APP_VERSION` in `frontend-react/src/App.jsx` and update this version here.
- Add Laravel migrations, models, requests, policies, and API resources for each feature.
- Add focused API tests for permissions and validation.
- Add React pages and reusable form/table components.
- Add office/location assignment and access controls consistently across the API and dashboard.
- Keep frontend API calls in `src/api/`.
- Keep CSS separated by responsibility in `src/styles/`.
- Update the root README after each completed phase.
- Keep date formatting consistent across all React tables with the shared formatter in `frontend-react/src/utils/formatDate.js`.
- Run `php artisan test` and `npm run build` before releasing changes.
- Database optimized: applied performance index migration (`2026_10_11_000001_optimize_performance_indexes.php`) and executed `OPTIMIZE TABLE` & `ANALYZE TABLE` across all MySQL tables.
- Latest verification on 2026-10-15: all 54 Laravel tests pass with 247 assertions and the Vite production build succeeds cleanly.
