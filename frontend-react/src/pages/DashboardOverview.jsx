import { useEffect, useState, useMemo } from "react";
import { DashboardAPI } from "../api/client.js";
import { formatDate } from "../utils/formatDate.js";

export default function DashboardOverview({ onNavigate, currentUser }) {
  const [overview, setOverview] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");
  const [selectedOffice, setSelectedOffice] = useState("");
  const [activeAlertTab, setActiveAlertTab] = useState("all");

  const isAdmin = currentUser?.role === "admin";
  const isStaff = currentUser?.role === "staff";

  async function loadOverview(officeId = selectedOffice, isBackground = false) {
    try {
      if (isBackground) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }
      const params = officeId ? { office_id: officeId } : {};
      const data = await DashboardAPI.overview(params);
      setOverview(data);
      setError("");
    } catch {
      setError("Could not load dashboard overview. Please check connection and try again.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }

  useEffect(() => {
    loadOverview(selectedOffice, false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedOffice]);

  const currencySymbol = overview?.financials?.currency_symbol || "₹";

  const formatCurrency = (val) => {
    const num = Number(val || 0);
    return `${currencySymbol}${num.toLocaleString("en-IN", {
      maximumFractionDigits: 0,
    })}`;
  };

  // Urgent Alert aggregations
  const documentAlerts = useMemo(() => {
    if (!overview?.document_alerts?.length) return [];
    return overview.document_alerts.flatMap((driver) =>
      driver.alerts.map((alert) => ({
        ...alert,
        driver_id: driver.driver_id,
        driver_name: driver.driver_name,
      }))
    );
  }, [overview]);

  const totalAlertsCount =
    (documentAlerts.length || 0) +
    (overview?.maintenance_alerts || 0) +
    (overview?.booking_breakdown?.pending || 0);

  const fleet = overview?.fleet_breakdown || {
    total: overview?.total_taxis || 0,
    available: overview?.available_taxis || 0,
    on_rent: 0,
    in_maintenance: overview?.taxis_in_maintenance || 0,
    inactive: 0,
    utilization_rate: 0,
  };

  const drivers = overview?.driver_breakdown || {
    total: overview?.total_drivers || 0,
    active: overview?.active_drivers || 0,
    on_trip: 0,
    on_leave: 0,
    inactive: 0,
  };

  const bookings = overview?.booking_breakdown || {
    pending: 0,
    active_trips: 0,
    upcoming: overview?.upcoming_bookings || 0,
    completed_month: 0,
  };

  const currentDateFormatted = new Intl.DateTimeFormat("en-GB", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(new Date());

  if (loading) {
    return (
      <div className="overview-loading-state" role="status">
        <div className="loading-spinner"></div>
        <p>Loading operations command center...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="overview-error-card" role="alert">
        <span className="error-icon">⚠️</span>
        <div>
          <h4>Failed to load dashboard</h4>
          <p>{error}</p>
        </div>
        <button
          type="button"
          className="btn-retry"
          onClick={() => loadOverview(selectedOffice, false)}
        >
          Try Again
        </button>
      </div>
    );
  }

  if (!overview) return null;

  return (
    <div className="overview-container">
      {/* 1. Header Toolbar with Operations Filter & Quick Actions */}
      <section className="overview-control-bar">
        <div className="overview-title-meta">
          <div className="meta-badge-row">
            <span className="live-status-pill">
              <span className="live-status-dot"></span> System Live
            </span>
            <span className="date-pill">📅 {currentDateFormatted}</span>
            {currentUser?.office && (
              <span className="office-pill">
                📍 {currentUser.office.name}
              </span>
            )}
          </div>
          <h2 className="overview-headline">Operations Command Hub</h2>
        </div>

        <div className="overview-actions-wrap">
          {isAdmin && overview.offices?.length > 0 && (
            <div className="office-filter-wrapper">
              <label htmlFor="overview-office-select" className="sr-only">
                Filter by Branch Office
              </label>
              <select
                id="overview-office-select"
                value={selectedOffice}
                onChange={(e) => setSelectedOffice(e.target.value)}
                className="overview-office-select"
              >
                <option value="">🏢 All Branch Locations</option>
                {overview.offices.map((off) => (
                  <option key={off.id} value={off.id}>
                    {off.name}
                  </option>
                ))}
              </select>
            </div>
          )}

          <button
            type="button"
            className="btn-overview-refresh"
            onClick={() => loadOverview(selectedOffice, true)}
            disabled={refreshing}
            title="Refresh latest telemetry"
          >
            <span className={`refresh-icon ${refreshing ? "spin" : ""}`}>↻</span>
            {refreshing ? "Updating..." : "Refresh"}
          </button>
        </div>
      </section>

      {/* 2. Dispatch Quick Actions Bar */}
      <section className="overview-quick-actions" aria-label="Quick Actions">
        <span className="quick-actions-label">Dispatch Shortcuts:</span>
        <div className="quick-actions-buttons">
          <button
            type="button"
            className="action-pill primary-pill"
            onClick={() => onNavigate && onNavigate("bookings")}
          >
            <span>➕</span> New Booking
          </button>
          <button
            type="button"
            className="action-pill"
            onClick={() => onNavigate && onNavigate("taxis")}
          >
            <span>🚕</span> Add Vehicle
          </button>
          <button
            type="button"
            className="action-pill"
            onClick={() => onNavigate && onNavigate("drivers")}
          >
            <span>👨‍✈️</span> Add Driver
          </button>
          <button
            type="button"
            className="action-pill"
            onClick={() => onNavigate && onNavigate("maintenance")}
          >
            <span>🔧</span> Log Service
          </button>
          <button
            type="button"
            className="action-pill"
            onClick={() => onNavigate && onNavigate("reports")}
          >
            <span>📊</span> Analytics
          </button>
        </div>
      </section>

      {/* 3. Hero Metric Cards (KPI Ribbon) */}
      <section className="overview-kpi-grid" aria-label="Key Performance Indicators">
        {/* Fleet KPI */}
        <div
          className="kpi-hero-card clickable"
          onClick={() => onNavigate && onNavigate("taxis")}
          title="Click to view fleet"
        >
          <div className="kpi-card-header">
            <span className="kpi-icon-box fleet">🚕</span>
            <span className="kpi-label">Available Fleet</span>
            <span className="kpi-badge fleet">{fleet.utilization_rate}% Active</span>
          </div>
          <div className="kpi-hero-number">
            <strong>{fleet.available}</strong>
            <span className="kpi-subtext">of {fleet.total} total vehicles</span>
          </div>
          <div className="kpi-progress-bar">
            <div
              className="kpi-progress-fill fleet"
              style={{ width: `${Math.min(100, fleet.utilization_rate || 0)}%` }}
            ></div>
          </div>
          <div className="kpi-card-footer">
            <span>{fleet.on_rent} on rent</span>
            <span>•</span>
            <span className={fleet.in_maintenance > 0 ? "alert-text" : ""}>
              {fleet.in_maintenance} in service
            </span>
          </div>
        </div>

        {/* Drivers KPI */}
        <div
          className="kpi-hero-card clickable"
          onClick={() => onNavigate && onNavigate("drivers")}
          title="Click to view drivers"
        >
          <div className="kpi-card-header">
            <span className="kpi-icon-box drivers">👨‍✈️</span>
            <span className="kpi-label">Active Drivers</span>
            <span className="kpi-badge drivers">{drivers.active} Ready</span>
          </div>
          <div className="kpi-hero-number">
            <strong>{drivers.active}</strong>
            <span className="kpi-subtext">of {drivers.total} registered</span>
          </div>
          <div className="kpi-progress-bar">
            <div
              className="kpi-progress-fill drivers"
              style={{
                width: `${drivers.total > 0 ? Math.round((drivers.active / drivers.total) * 100) : 0}%`,
              }}
            ></div>
          </div>
          <div className="kpi-card-footer">
            <span>{drivers.on_trip} on trip</span>
            <span>•</span>
            <span>{drivers.on_leave} on leave</span>
          </div>
        </div>

        {/* Trips / Bookings KPI */}
        <div
          className="kpi-hero-card clickable"
          onClick={() => onNavigate && onNavigate("bookings")}
          title="Click to view bookings"
        >
          <div className="kpi-card-header">
            <span className="kpi-icon-box trips">🗓️</span>
            <span className="kpi-label">Upcoming Trips</span>
            <span className="kpi-badge trips">
              {bookings.active_trips} On Road
            </span>
          </div>
          <div className="kpi-hero-number">
            <strong>{bookings.upcoming}</strong>
            <span className="kpi-subtext">upcoming reservations</span>
          </div>
          <div className="kpi-progress-bar">
            <div
              className="kpi-progress-fill trips"
              style={{ width: "100%" }}
            ></div>
          </div>
          <div className="kpi-card-footer">
            <span className={bookings.pending > 0 ? "alert-text font-bold" : ""}>
              {bookings.pending} pending confirmation
            </span>
            <span>•</span>
            <span>{bookings.completed_month} completed</span>
          </div>
        </div>

        {/* Financial Revenue KPI */}
        <div
          className="kpi-hero-card clickable"
          onClick={() => onNavigate && onNavigate("reports")}
          title="Click to view revenue reports"
        >
          <div className="kpi-card-header">
            <span className="kpi-icon-box finance">💳</span>
            <span className="kpi-label">Month Revenue</span>
            <span className="kpi-badge finance">MTD</span>
          </div>
          <div className="kpi-hero-number">
            <strong>{formatCurrency(overview.financials?.revenue_month)}</strong>
            <span className="kpi-subtext">realized booking revenue</span>
          </div>
          <div className="kpi-progress-bar">
            <div
              className="kpi-progress-fill finance"
              style={{ width: "85%" }}
            ></div>
          </div>
          <div className="kpi-card-footer">
            <span>Spend: {formatCurrency(overview.financials?.maintenance_expense_month)}</span>
            <span>•</span>
            <span className="view-link">View P&L →</span>
          </div>
        </div>
      </section>

      {/* 4. Action Attention Hub (Alerts Banner) */}
      {totalAlertsCount > 0 && (
        <section className="overview-alert-hub" aria-label="Urgent Operational Attention">
          <div className="alert-hub-header">
            <div className="alert-hub-title">
              <span className="alert-pulse-icon">⚠️</span>
              <div>
                <h3>Action Required ({totalAlertsCount})</h3>
                <p>Items requiring operational review or dispatch intervention</p>
              </div>
            </div>

            <div className="alert-tabs">
              <button
                type="button"
                className={`alert-tab-btn ${activeAlertTab === "all" ? "active" : ""}`}
                onClick={() => setActiveAlertTab("all")}
              >
                All ({totalAlertsCount})
              </button>
              {documentAlerts.length > 0 && (
                <button
                  type="button"
                  className={`alert-tab-btn ${activeAlertTab === "documents" ? "active" : ""}`}
                  onClick={() => setActiveAlertTab("documents")}
                >
                  Documents ({documentAlerts.length})
                </button>
              )}
              {overview.maintenance_alerts > 0 && (
                <button
                  type="button"
                  className={`alert-tab-btn ${activeAlertTab === "maintenance" ? "active" : ""}`}
                  onClick={() => setActiveAlertTab("maintenance")}
                >
                  Maintenance ({overview.maintenance_alerts})
                </button>
              )}
              {bookings.pending > 0 && (
                <button
                  type="button"
                  className={`alert-tab-btn ${activeAlertTab === "pending" ? "active" : ""}`}
                  onClick={() => setActiveAlertTab("pending")}
                >
                  Pending Bookings ({bookings.pending})
                </button>
              )}
            </div>
          </div>

          <div className="alert-cards-row">
            {(activeAlertTab === "all" || activeAlertTab === "pending") && bookings.pending > 0 && (
              <div className="alert-chip-item alert-pending">
                <span className="chip-icon">⏳</span>
                <div className="chip-content">
                  <strong>{bookings.pending} Booking Request{bookings.pending > 1 ? "s" : ""} Pending</strong>
                  <span>Need taxi/driver assignment or confirmation</span>
                </div>
                <button
                  type="button"
                  className="chip-btn"
                  onClick={() => onNavigate && onNavigate("bookings")}
                >
                  Review Bookings →
                </button>
              </div>
            )}

            {(activeAlertTab === "all" || activeAlertTab === "maintenance") && overview.maintenance_alerts > 0 && (
              <div className="alert-chip-item alert-maintenance">
                <span className="chip-icon">🛠️</span>
                <div className="chip-content">
                  <strong>
                    {overview.maintenance_alerts} Vehicle{overview.maintenance_alerts > 1 ? "s" : ""} Due for Service
                  </strong>
                  <span>
                    {overview.overdue_maintenance_count > 0
                      ? `${overview.overdue_maintenance_count} overdue for safety check`
                      : "Scheduled service due within 30 days"}
                  </span>
                </div>
                <button
                  type="button"
                  className="chip-btn"
                  onClick={() => onNavigate && onNavigate("maintenance")}
                >
                  Open Garage →
                </button>
              </div>
            )}

            {(activeAlertTab === "all" || activeAlertTab === "documents") && documentAlerts.length > 0 && (
              <div className="alert-chip-item alert-compliance">
                <span className="chip-icon">📄</span>
                <div className="chip-content">
                  <strong>{documentAlerts.length} Driver Document{documentAlerts.length > 1 ? "s" : ""} Expiring/Expired</strong>
                  <span>Licenses, insurance or background clearances</span>
                </div>
                <button
                  type="button"
                  className="chip-btn"
                  onClick={() => onNavigate && onNavigate("documents")}
                >
                  Resolve Expiries →
                </button>
              </div>
            )}
          </div>
        </section>
      )}

      {/* 5. Main 2-Column Command Center Workspace */}
      <div className="overview-main-grid">
        {/* Left Column: Dispatches & Activity */}
        <div className="overview-column primary-column">
          {/* Upcoming Trips Card */}
          <div className="overview-panel">
            <div className="panel-header">
              <div className="panel-title-group">
                <h3>🗓️ Upcoming Dispatches & Trips</h3>
                <span className="panel-subtitle">Next confirmed and pending customer reservations</span>
              </div>
              <button
                type="button"
                className="panel-link-btn"
                onClick={() => onNavigate && onNavigate("bookings")}
              >
                All Bookings ({bookings.upcoming}) →
              </button>
            </div>

            <div className="upcoming-trips-list">
              {overview.upcoming_trips?.length > 0 ? (
                overview.upcoming_trips.map((trip) => (
                  <div key={trip.id} className="trip-feed-card">
                    <div className="trip-card-date">
                      <span className="trip-date-day">
                        {new Date(trip.pickup_date).toLocaleDateString("en-US", { day: "numeric" })}
                      </span>
                      <span className="trip-date-month">
                        {new Date(trip.pickup_date).toLocaleDateString("en-US", { month: "short" })}
                      </span>
                    </div>

                    <div className="trip-card-main">
                      <div className="trip-card-customer">
                        <strong>{trip.customer_name}</strong>
                        {trip.customer_phone && (
                          <span className="trip-phone">📞 {trip.customer_phone}</span>
                        )}
                        <span className={`badge ${trip.status}`}>{trip.status}</span>
                      </div>

                      <div className="trip-route">
                        <span className="route-point origin" title={trip.pickup_location}>
                          📍 {trip.pickup_location}
                        </span>
                        <span className="route-arrow">➔</span>
                        <span className="route-point dest" title={trip.drop_location || "Open destination"}>
                          🏁 {trip.drop_location || "Local Rental"}
                        </span>
                      </div>

                      <div className="trip-resources">
                        <span className={`resource-chip ${trip.taxi ? "assigned" : "unassigned"}`}>
                          🚕 {trip.taxi ? `${trip.taxi.reg_number} (${trip.taxi.make_model})` : "Taxi Unassigned"}
                        </span>
                        <span className={`resource-chip ${trip.driver ? "assigned" : "unassigned"}`}>
                          👨‍✈️ {trip.driver ? trip.driver.name : "Driver Unassigned"}
                        </span>
                        {trip.fare > 0 && (
                          <span className="trip-fare-chip">
                            {formatCurrency(trip.fare)}
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="trip-card-action">
                      <button
                        type="button"
                        className="btn-trip-details"
                        onClick={() => onNavigate && onNavigate("bookings")}
                        title="View and edit booking"
                      >
                        Manage
                      </button>
                    </div>
                  </div>
                ))
              ) : (
                <div className="empty-feed-card">
                  <span className="empty-icon">🏖️</span>
                  <h4>No upcoming trips scheduled</h4>
                  <p>All active bookings are completed or up to date.</p>
                  <button
                    type="button"
                    className="action-pill primary-pill"
                    onClick={() => onNavigate && onNavigate("bookings")}
                  >
                    ➕ Create New Booking
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Recent Operations Log Card */}
          <div className="overview-panel">
            <div className="panel-header">
              <div className="panel-title-group">
                <h3>🕒 Recent Operational Log</h3>
                <span className="panel-subtitle">Latest booking updates and dispatch history</span>
              </div>
              <button
                type="button"
                className="panel-link-btn"
                onClick={() => onNavigate && onNavigate("bookings")}
              >
                View History →
              </button>
            </div>

            <div className="table-wrap">
              <table className="data-table overview-table">
                <thead>
                  <tr>
                    <th>Customer</th>
                    <th>Pickup Date</th>
                    <th>Location</th>
                    <th>Assigned Taxi</th>
                    <th>Driver</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {overview.recent_activity?.length ? (
                    overview.recent_activity.map((item) => (
                      <tr key={item.id}>
                        <td>
                          <strong>{item.customer_name}</strong>
                        </td>
                        <td>{formatDate(item.pickup_date)}</td>
                        <td>{item.pickup_location}</td>
                        <td>
                          {item.taxi ? (
                            <span className="reg-badge">{item.taxi}</span>
                          ) : (
                            <span className="text-muted">Unassigned</span>
                          )}
                        </td>
                        <td>{item.driver || <span className="text-muted">Unassigned</span>}</td>
                        <td>
                          <span className={`badge ${item.status}`}>{item.status}</span>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={6} className="empty">
                        No recent activity recorded yet.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Right Column: Fleet Readiness, Workforce, Compliance */}
        <div className="overview-column secondary-column">
          {/* Fleet Status Breakdown */}
          <div className="overview-panel">
            <div className="panel-header">
              <div className="panel-title-group">
                <h3>🚕 Fleet Availability</h3>
                <span className="panel-subtitle">Real-time status of {fleet.total} taxis</span>
              </div>
              <button
                type="button"
                className="panel-link-btn"
                onClick={() => onNavigate && onNavigate("taxis")}
              >
                Fleet →
              </button>
            </div>

            {/* Segmented Bar */}
            <div className="fleet-segments-bar">
              {fleet.total > 0 ? (
                <>
                  <div
                    className="segment segment-available"
                    style={{ width: `${(fleet.available / fleet.total) * 100}%` }}
                    title={`Available: ${fleet.available}`}
                  ></div>
                  <div
                    className="segment segment-onrent"
                    style={{ width: `${(fleet.on_rent / fleet.total) * 100}%` }}
                    title={`On Rent: ${fleet.on_rent}`}
                  ></div>
                  <div
                    className="segment segment-maintenance"
                    style={{ width: `${(fleet.in_maintenance / fleet.total) * 100}%` }}
                    title={`In Service: ${fleet.in_maintenance}`}
                  ></div>
                  <div
                    className="segment segment-inactive"
                    style={{ width: `${(fleet.inactive / fleet.total) * 100}%` }}
                    title={`Inactive: ${fleet.inactive}`}
                  ></div>
                </>
              ) : (
                <div className="segment segment-empty" style={{ width: "100%" }}></div>
              )}
            </div>

            {/* Breakdown Grid */}
            <div className="status-breakdown-grid">
              <div className="status-item available">
                <span className="status-dot green"></span>
                <div className="status-info">
                  <span className="status-count">{fleet.available}</span>
                  <span className="status-name">Available</span>
                </div>
              </div>
              <div className="status-item onrent">
                <span className="status-dot blue"></span>
                <div className="status-info">
                  <span className="status-count">{fleet.on_rent}</span>
                  <span className="status-name">On Rent</span>
                </div>
              </div>
              <div className="status-item maintenance">
                <span className="status-dot amber"></span>
                <div className="status-info">
                  <span className="status-count">{fleet.in_maintenance}</span>
                  <span className="status-name">Maintenance</span>
                </div>
              </div>
              <div className="status-item inactive">
                <span className="status-dot gray"></span>
                <div className="status-info">
                  <span className="status-count">{fleet.inactive}</span>
                  <span className="status-name">Inactive</span>
                </div>
              </div>
            </div>
          </div>

          {/* Driver Workforce Breakdown */}
          <div className="overview-panel">
            <div className="panel-header">
              <div className="panel-title-group">
                <h3>👨‍✈️ Driver Workforce</h3>
                <span className="panel-subtitle">{drivers.total} registered staff drivers</span>
              </div>
              <button
                type="button"
                className="panel-link-btn"
                onClick={() => onNavigate && onNavigate("drivers")}
              >
                Drivers →
              </button>
            </div>

            <div className="workforce-list">
              <div className="workforce-row">
                <div className="workforce-left">
                  <span className="status-indicator-circle green"></span>
                  <span className="workforce-name">Ready for Dispatch</span>
                </div>
                <strong className="workforce-val">{drivers.active}</strong>
              </div>
              <div className="workforce-row">
                <div className="workforce-left">
                  <span className="status-indicator-circle blue"></span>
                  <span className="workforce-name">Currently on Trip</span>
                </div>
                <strong className="workforce-val">{drivers.on_trip}</strong>
              </div>
              <div className="workforce-row">
                <div className="workforce-left">
                  <span className="status-indicator-circle amber"></span>
                  <span className="workforce-name">On Leave / Rest</span>
                </div>
                <strong className="workforce-val">{drivers.on_leave}</strong>
              </div>
              <div className="workforce-row">
                <div className="workforce-left">
                  <span className="status-indicator-circle gray"></span>
                  <span className="workforce-name">Inactive / Off Roster</span>
                </div>
                <strong className="workforce-val">{drivers.inactive}</strong>
              </div>
            </div>
          </div>

          {/* Document & Compliance Watchlist */}
          <div className="overview-panel">
            <div className="panel-header">
              <div className="panel-title-group">
                <h3>📋 Compliance Watchlist</h3>
                <span className="panel-subtitle">Driver document and license monitoring</span>
              </div>
              <button
                type="button"
                className="panel-link-btn"
                onClick={() => onNavigate && onNavigate("documents")}
              >
                Docs Hub →
              </button>
            </div>

            {documentAlerts.length > 0 ? (
              <div className="watchlist-items">
                {documentAlerts.slice(0, 5).map((alert, idx) => (
                  <div key={`${alert.driver_id}-${alert.field}-${idx}`} className="watchlist-row">
                    <div className="watchlist-driver">
                      <strong>{alert.driver_name}</strong>
                      <span className="watchlist-field">{alert.label}</span>
                    </div>
                    <div className="watchlist-meta">
                      <span className={`badge ${alert.status}`}>
                        {alert.status.replace("_", " ")}
                      </span>
                      <span className="watchlist-date">{formatDate(alert.date)}</span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="compliance-clear-state">
                <span className="clear-icon">✅</span>
                <div>
                  <strong>All Documents Compliant</strong>
                  <p>All active driver licenses and documents are valid.</p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
