# Taxi Rental App Feature Test Cases

This document was derived from the current plan in `plan.md` and is intended to be used with the feature-test-case-writer skill.

> Last reviewed: 2026-10-01. Baseline verification: 15 Laravel tests pass; the frontend production build succeeds. These notes track implementation status, not manual execution of every case.

## Execution status

- `Implemented`: covered by the current Laravel API and React dashboard.
- `Partial`: the underlying data or workflow exists, but part of the acceptance criteria is not implemented.
- `Planned`: no current application workflow is available to execute.

Record the test date, environment, actual result, and defect reference when executing a case.

## Phase 1: Rental Booking Management

### TC-01: Create a new booking
- Status: Implemented
- Priority: High
- Preconditions: Staff user is logged in; at least one available taxi and driver exist.
- Steps:
  1. Open the booking form.
  2. Enter customer details, pickup date, return date, pickup location, and notes.
  3. Select an available taxi and assigned driver.
  4. Save the booking.
- Expected result: Booking is created with a status of pending or confirmed, and the assigned taxi/driver are reserved for that date range.
- Edge cases: invalid date range, missing customer info, duplicate booking.

### TC-02: Prevent double-booking of taxi or driver
- Status: Implemented
- Priority: High
- Preconditions: One driver and one taxi are already assigned to a booking in the selected period.
- Steps:
  1. Attempt to create another booking overlapping the same dates.
  2. Choose the same taxi or driver.
- Expected result: Booking creation is blocked with a validation or availability error.
- Edge cases: same driver but different taxi; same taxi but different driver; partial overlap of dates.

### TC-03: Update booking details
- Status: Implemented
- Priority: High
- Preconditions: An existing booking exists.
- Steps:
  1. Open an existing booking.
  2. Update pickup location, notes, and date range.
  3. Save changes.
- Expected result: Booking updates successfully and availability is rechecked for the new dates.

### TC-04: Cancel booking
- Status: Implemented
- Priority: Medium
- Preconditions: A booking exists in active or pending state.
- Steps:
  1. Open the booking.
  2. Change the status to cancelled.
- Expected result: Booking is marked cancelled and no longer appears as active. 

### TC-05: Search and filter bookings
- Status: Partial
- Priority: Medium
- Preconditions: Several bookings with different dates and statuses exist.
- Steps:
  1. Use search by customer name, phone, or location.
  2. Apply a status filter.
- Expected result: Matching bookings are displayed correctly for customer, phone, location, and status. The API paginates results, but the dashboard has no page navigation and date-range filtering is unavailable.
- Actual result: ____________________

## Phase 2: Dashboard Overview

### TC-06: Dashboard shows operational summary
- Status: Implemented
- Priority: Medium
- Preconditions: System has taxis, drivers, and bookings in multiple states.
- Steps:
  1. Load the main dashboard.
- Expected result: Dashboard displays total taxis, total drivers, available taxis, active drivers, maintenance counts, upcoming bookings, and recent activity. Booking dates are shown as readable calendar dates rather than raw API timestamps.
- Actual result: ____________________

### TC-07: Dashboard reflects current state
- Status: Implemented
- Priority: Medium
- Preconditions: A booking is created or cancelled.
- Steps:
  1. Update booking status.
  2. Refresh the dashboard.
- Expected result: Totals and upcoming bookings reflect the latest data.
- Actual result: ____________________

### TC-07a: Dashboard handles no recent activity
- Status: Implemented
- Priority: Low
- Preconditions: The dashboard API returns an empty `recent_activity` list.
- Steps:
  1. Load or refresh the dashboard.
- Expected result: The recent activity table shows `No recent activity available.` and the page remains usable.
- Actual result: ____________________

## Phase 3: Driver Documents and Alerts

### TC-08: Track driver document expiry dates
- Status: Partial
- Priority: High
- Preconditions: Driver profile includes license, insurance, and required documents.
- Steps:
  1. Open a driver record.
  2. View document expiry information.
- Expected result: License, document, and required-document expiry fields can be entered on the driver form; dates are stored and displayed in readable formats. Insurance expiry is accepted by the API but has no driver-form input. The Documents panel is not connected to persisted driver records.
- Actual result: ____________________

### TC-09: Alert for expired or soon-to-expire documents
- Status: Partial
- Priority: High
- Preconditions: At least one document is expired and one is within 30 days of expiry.
- Steps:
  1. Load the staff dashboard or driver documents screen.
- Expected result: The dashboard lists expired and 30-day document alerts returned by the API. Alert delivery is not implemented, and the UI lacks an insurance expiry input.
- Actual result: The overview displays driver, document, status, and expiry date. The feature test verifies the alerting-driver count; add assertions for alert details and statuses when extending coverage.

## Phase 4: Taxi Maintenance Tracking

### TC-10: Create maintenance record
- Status: Implemented
- Priority: Medium
- Preconditions: A taxi exists.
- Steps:
  1. Open taxi maintenance form.
  2. Add service date, odometer reading, cost, description, and next service date.
  3. Save.
- Expected result: Maintenance record is saved and linked to the taxi.

### TC-11: View maintenance history by taxi
- Status: Implemented
- Priority: Medium
- Preconditions: Taxi has multiple maintenance records.
- Steps:
  1. Open taxi details.
  2. View maintenance history.
- Expected result: All records appear in chronological order with details and costs.

### TC-12: Upcoming maintenance alert
- Status: Implemented
- Priority: Medium
- Preconditions: A taxi has a next service date nearing the threshold.
- Steps:
  1. Load dashboard or alert panel.
- Expected result: The maintenance workspace shows service records, filters history by taxi, and displays next-service dates due within 30 days.

## Phase 5: Role-Based Workspaces

### TC-13: Admin access
- Status: Partial
- Priority: High
- Preconditions: Logged in as administrator.
- Steps:
  1. Open the admin dashboard.
- Expected result: Admin can access and manage taxis, drivers, and bookings. User management and reports are not currently available.
- Actual result: ____________________

### TC-14: Staff access
- Status: Implemented
- Priority: High
- Preconditions: Logged in as staff user.
- Steps:
  1. Open the operations workspace.
- Expected result: Staff can manage daily operations and bookings, but is limited from admin-only functions.
- Actual result: ____________________

### TC-15: Driver access
- Status: Partial
- Priority: High
- Preconditions: Logged in as driver.
- Steps:
  1. Open the driver workspace.
- Expected result: The React workspace directs drivers to bookings and hides management actions. The API must return only bookings assigned to the authenticated driver; it currently returns all bookings, so this case remains partial and the access-control gap must be fixed before release.
- Actual result: ____________________

## Phase 6: Reports and Exports

### TC-16: Booking revenue report
- Status: Planned
- Priority: Medium
- Preconditions: Completed bookings with revenue values exist.
- Steps:
  1. Open reports menu.
  2. Select booking revenue report.
- Expected result: Revenue totals and filtered results display correctly.

### TC-17: Taxi utilization report
- Status: Planned
- Priority: Medium
- Preconditions: Booking history exists for multiple taxis.
- Steps:
  1. Generate utilization report.
- Expected result: Utilization percentages or usage totals are calculated correctly to the selected filters.

### TC-18: Export filtered results to CSV and PDF
- Status: Planned
- Priority: Medium
- Preconditions: Report results are available.
- Steps:
  1. Apply filters.
  2. Choose CSV export and PDF export.
- Expected result: Export files are generated successfully with the filtered data.

## Phase 7: Notifications and Security

### TC-19: Booking confirmation notification
- Status: Planned
- Priority: Medium
- Preconditions: Booking is confirmed or created.
- Steps:
  1. Create or update a booking to confirmation status.
- Expected result: Notification is generated or visible to the relevant stakeholder.

### TC-20: Document expiry notification
- Status: Partial
- Priority: Medium
- Preconditions: A driver document is due to expire soon.
- Steps:
  1. Load the alert area or notification list.
- Expected result: The dashboard shows relevant document expiry alerts. Email, push, or in-app notification delivery outside the dashboard is not implemented.

### TC-21: Change password from profile area
- Status: Planned
- Priority: Medium
- Preconditions: User is logged in.
- Steps:
  1. Open profile.
  2. Change password.
  3. Log in again with the new password.
- Expected result: Password updates successfully and new login works.

### TC-22: Recent login activity visibility
- Status: Planned
- Priority: Low
- Preconditions: User has multiple login events.
- Steps:
  1. Open account management or profile area.
- Expected result: Recent login activity is displayed.

## General QA Checks
- Confirm all user roles see only authorized actions.
- Confirm unauthorized actions are blocked by validation or permission rules.
- Confirm date and booking conflicts are prevented.
- Confirm booking, license expiry, and dashboard dates are displayed as readable calendar dates.
- Confirm alerts and reports update after data changes.
- Confirm exports include filtered records and correct formatting.
- Record actual results and defect references for every executed test case.
