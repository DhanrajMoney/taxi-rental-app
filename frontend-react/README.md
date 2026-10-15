# Rent A Ride Desk Frontend — React (Vite)

React/Vite operations dashboard for taxis, drivers, bookings, maintenance, and overview metrics, wired to the Laravel API in `../backend-laravel`.

## Setup

```bash
npm install
npm run dev
```

Opens at http://localhost:5173. It calls the API at `http://127.0.0.1:8000/api` by default — start the Laravel
backend first (see `../backend-laravel/README.md`). To point at a different API URL, create a `.env` file:

```
VITE_API_BASE_URL=http://127.0.0.1:8000/api
```

On Windows PowerShell, use the `.cmd` wrapper if script execution policy blocks `npm`:

```powershell
npm.cmd install
npm.cmd run dev
```

## What's included
- `src/App.jsx` — authentication, role-based navigation, and dashboard shell
- `src/pages/DashboardOverview.jsx` — fleet, driver, booking, maintenance, document-alert, and recent-activity summary
- `src/pages/Taxis.jsx` / `Drivers.jsx` — list views with search, status filter, add/edit/delete
- `src/pages/Bookings.jsx` — booking search, status filtering, creation, editing, and cancellation
- `src/pages/Maintenance.jsx` — maintenance history, taxi filter, record management, costs, and due-soon alerts
- `src/components/DocumentsPanel.jsx` — document-center prototype with sample records and local-only upload state
- `src/components/TaxiForm.jsx` / `DriverForm.jsx` / `BookingForm.jsx` — add and edit forms
- `src/api/client.js` — Axios calls to the Laravel REST endpoints
- `src/utils/formatDate.js` — consistent calendar-date formatting for API dates
- `src/styles/` — separated base, dashboard, form, and authentication styles

## Roles

- Admin and staff can manage taxis, drivers, and bookings.
- Drivers are directed to the bookings workspace, but API booking results are not yet scoped to their assignments. Do not use driver accounts with production data until this access-control gap is fixed.
- Password reset is available from the login screen. Notifications, reports/exports, user administration, and office/location workflows are not implemented.
- Dashboard document expiry alerts use API data. The Documents panel is a prototype and does not persist its sample records or uploads; insurance expiry is not exposed in the driver form.

The local development accounts are documented in the root `README.md` and `../backend-laravel/README.md`.

## Build

Create a production build with:

```bash
npm run build
```

The frontend does not currently include a test framework. Validate API behavior with the Laravel test suite in
`../backend-laravel`.
