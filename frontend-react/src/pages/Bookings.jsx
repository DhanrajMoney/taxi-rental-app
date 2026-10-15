import React, { useEffect, useState, useCallback } from "react";
import { BookingAPI, DriverAPI, OfficeAPI, TaxiAPI } from "../api/client.js";
import {
  formatDate,
  formatDateTime,
  formatCurrency,
  copyToClipboard,
  getInitials,
  getAvatarColor,
} from "../utils/format.js";
import BookingForm from "../components/BookingForm.jsx";
import CancelBookingModal from "../components/CancelBookingModal.jsx";
import useDebouncedValue from "../hooks/useDebouncedValue.js";
import "../styles/bookings.css";

const STATUSES = ["pending", "confirmed", "active", "completed", "cancelled"];

const STATUS_META = {
  pending:   { color: "#d97706", bg: "#fef3c7", border: "#fde68a", label: "Pending",   icon: "⏳" },
  confirmed: { color: "#2563eb", bg: "#eff6ff", border: "#bfdbfe", label: "Confirmed", icon: "✅" },
  active:    { color: "#16a34a", bg: "#f0fdf4", border: "#bbf7d0", label: "Active",    icon: "🚗" },
  completed: { color: "#0d6854", bg: "#eaf8f4", border: "#a7f3d0", label: "Completed", icon: "🏁" },
  cancelled: { color: "#dc2626", bg: "#fef2f2", border: "#fecaca", label: "Cancelled", icon: "✗" },
};

const DATE_PRESETS = [
  { value: "all", label: "📅 All Dates" },
  { value: "today", label: "⚡ Today" },
  { value: "tomorrow", label: "⏭️ Tomorrow" },
  { value: "this_week", label: "📆 This Week" },
  { value: "next_7_days", label: "🗓️ Next 7 Days" },
  { value: "next_30_days", label: "🗓️ Next 30 Days" },
  { value: "this_month", label: "📅 This Month" },
  { value: "past_7_days", label: "⏪ Past 7 Days" },
  { value: "past_30_days", label: "⏪ Past 30 Days" },
  { value: "custom", label: "🎯 Custom Range…" },
];

function calculateTripDays(start, end) {
  if (!start || !end) return null;
  try {
    const s = new Date(start);
    const e = new Date(end);
    const diffTime = e.getTime() - s.getTime();
    const diffDays = Math.round(diffTime / (1000 * 60 * 60 * 24)) + 1;
    return diffDays > 0 ? `${diffDays} day${diffDays > 1 ? "s" : ""}` : "1 day";
  } catch {
    return null;
  }
}

function DetailRow({ label, value, mono, isLink, href, subtext, icon }) {
  if (value === null || value === undefined || value === "") return null;
  return (
    <div className="bk-detail-row">
      <span className="bk-detail-label">
        {icon && <span className="bk-detail-icon">{icon}</span>}
        {label}
      </span>
      <div className="bk-detail-value-wrap">
        {isLink && href ? (
          <a href={href} className="bk-link-value" target="_blank" rel="noopener noreferrer">
            {value}
          </a>
        ) : (
          <span className={`bk-detail-value${mono ? " mono" : ""}`}>{value}</span>
        )}
        {subtext && <small className="bk-detail-subtext">{subtext}</small>}
      </div>
    </div>
  );
}

function DetailSection({ title, icon, badge, children }) {
  return (
    <div className="bk-detail-section">
      <div className="bk-section-header">
        <div className="bk-section-title-wrap">
          {icon && <span className="bk-section-icon">{icon}</span>}
          <span className="bk-section-title">{title}</span>
        </div>
        {badge && <span className="bk-section-badge">{badge}</span>}
      </div>
      <div className="bk-section-body">{children}</div>
    </div>
  );
}

export default function Bookings({ canManage }) {
  /* ── List state ── */
  const [bookings, setBookings]                   = useState([]);
  const [taxis, setTaxis]                         = useState([]);
  const [drivers, setDrivers]                     = useState([]);
  const [offices, setOffices]                     = useState([]);
  const [search, setSearch]                       = useState("");
  const debouncedSearch                           = useDebouncedValue(search);
  const [statusFilter, setStatusFilter]           = useState("");
  const [datePreset, setDatePreset]               = useState("all");
  const [customStart, setCustomStart]             = useState("");
  const [customEnd, setCustomEnd]                 = useState("");
  const [officeFilter, setOfficeFilter]           = useState("");
  const [loading, setLoading]                     = useState(false);
  const [error, setError]                         = useState("");

  /* ── Edit / cancel modal state ── */
  const [editing, setEditing]                     = useState(null);
  const [cancellingBooking, setCancellingBooking] = useState(null);
  const [cancelLoading, setCancelLoading]         = useState(false);
  const [cancelError, setCancelError]             = useState("");

  /* ── Side panel state ── */
  const [selectedBooking, setSelectedBooking]     = useState(null);
  const [detailData, setDetailData]               = useState(null);
  const [copiedKey, setCopiedKey]                 = useState(null);
  const [panelTab, setPanelTab]                   = useState("journey"); // journey | passenger | fleet | fare

  /* ── Load bookings list ── */
  const loadBookings = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const params = {
        search: debouncedSearch || undefined,
        status: statusFilter || undefined,
        office_id: officeFilter || undefined,
        per_page: 100,
      };

      if (datePreset === "custom") {
        if (customStart) params.start_date = customStart;
        if (customEnd) params.end_date = customEnd;
      } else if (datePreset && datePreset !== "all") {
        params.date_preset = datePreset;
      }

      const result = await BookingAPI.list(params);
      setBookings(result.data || result);
    } catch {
      setError("Could not load bookings. Is the Laravel backend running?");
    } finally {
      setLoading(false);
    }
  }, [debouncedSearch, statusFilter, officeFilter, datePreset, customStart, customEnd]);

  useEffect(() => { loadBookings(); }, [loadBookings]);

  /* ── Load offices for filtering (all users) ── */
  useEffect(() => {
    OfficeAPI.list({ per_page: 100 })
      .then(res => setOffices(res.data || res))
      .catch(() => {});
  }, []);

  /* ── Load taxis/drivers for create/edit form ── */
  useEffect(() => {
    if (!canManage) return;
    Promise.all([
      TaxiAPI.list({ status: "available", per_page: 100 }),
      DriverAPI.list({ status: "active", per_page: 100 }),
    ]).then(([taxiRes, driverRes]) => {
      setTaxis(taxiRes.data || taxiRes);
      setDrivers(driverRes.data || driverRes);
    }).catch(() => setError("Could not load booking options."));
  }, [canManage]);

  /* ── Close panel on Escape key ── */
  useEffect(() => {
    function handleKeyDown(e) {
      if (e.key === "Escape" && selectedBooking) {
        closeDetail();
      }
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [selectedBooking]);

  /* ── Open side panel: render instantly, fetch full detail seamlessly ── */
  function openDetail(booking) {
    setSelectedBooking(booking);
    setDetailData(booking); // Show immediately without blank screen flash

    // Fetch latest fresh record with all relationships in background
    BookingAPI.get(booking.id).then((full) => {
      const data = full?.data || full;
      if (data && data.id === booking.id) {
        setDetailData(data);
      }
    }).catch(() => {
      // Fallback already displayed
    });
  }

  function closeDetail() {
    setSelectedBooking(null);
    setDetailData(null);
  }

  /* ── Copy text with temporary key ── */
  function handleCopy(text, key) {
    if (!text) return;
    copyToClipboard(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2000);
  }

  /* ── Copy dispatch summary text ── */
  function handleCopySummary() {
    const target = detailData || selectedBooking;
    if (!target) return;
    const idStr = `#BK-${String(target.id).padStart(5, "0")}`;
    const lines = [
      `🚕 RideDesk Booking ${idStr}`,
      `Status: ${(target.status || "pending").toUpperCase()}`,
      `Customer: ${target.customer_name || "—"} (${target.customer_phone || "—"})`,
      target.customer?.email ? `Email: ${target.customer.email}` : null,
      `Pickup: ${target.pickup_location || "—"} [${formatDate(target.pickup_date)}]`,
      `Drop: ${target.drop_location || "—"} [${formatDate(target.return_date)}]`,
      target.taxi ? `Vehicle: ${target.taxi.reg_number} (${target.taxi.make_model || "Fleet Taxi"})` : "Vehicle: Unassigned",
      target.driver ? `Driver: ${target.driver.name} (${target.driver.phone || "—"})` : "Driver: Unassigned",
      target.final_fare != null ? `Final Fare: ${formatCurrency(target.final_fare)}` : target.estimated_fare != null ? `Est. Fare: ${formatCurrency(target.estimated_fare)}` : null,
      target.office?.name ? `Branch: ${target.office.name}` : null,
    ].filter(Boolean);

    handleCopy(lines.join("\n"), "summary");
  }

  /* ── Save booking (create / edit) ── */
  async function saveBooking(form) {
    try {
      if (editing && editing.id) await BookingAPI.update(editing.id, form);
      else await BookingAPI.create(form);
      setEditing(null);
      loadBookings();
      // Refresh side panel if the edited booking is open
      if (selectedBooking && editing && editing.id === selectedBooking.id) {
        BookingAPI.get(selectedBooking.id).then((res) => {
          const fresh = res?.data || res;
          if (fresh) {
            setSelectedBooking(fresh);
            setDetailData(fresh);
          }
        });
      }
    } catch (err) {
      setError(err?.response?.data?.message || "Booking could not be saved.");
    }
  }

  /* ── Cancel booking ── */
  function handleInitiateCancel(booking) {
    setCancelError("");
    setCancellingBooking(booking);
  }

  async function handleConfirmCancel({ reason, notes }) {
    if (!cancellingBooking) return;
    setCancelLoading(true);
    setCancelError("");
    try {
      await BookingAPI.remove(cancellingBooking.id, { reason, notes });
      setCancellingBooking(null);
      if (selectedBooking?.id === cancellingBooking.id) closeDetail();
      loadBookings();
    } catch (err) {
      setCancelError(err?.response?.data?.message || "Booking could not be cancelled.");
    } finally {
      setCancelLoading(false);
    }
  }

  /* ── Summary counts & filter helpers ── */
  const confirmedCount = bookings.filter(b => b.status === "confirmed" || b.status === "active").length;
  const pendingCount   = bookings.filter(b => b.status === "pending").length;

  const hasActiveFilters = Boolean(
    search ||
    statusFilter ||
    officeFilter ||
    (datePreset && datePreset !== "all") ||
    customStart ||
    customEnd
  );

  function resetAllFilters() {
    setSearch("");
    setStatusFilter("");
    setOfficeFilter("");
    setDatePreset("all");
    setCustomStart("");
    setCustomEnd("");
  }

  const panelBooking = detailData || selectedBooking;
  const statusInfo   = panelBooking ? (STATUS_META[panelBooking.status?.toLowerCase()] || STATUS_META.pending) : {};
  const bookingIdStr = panelBooking ? `#BK-${String(panelBooking.id).padStart(5, "0")}` : "";

  // Extract cancellation notice if present
  const cancellationReason = panelBooking?.notes?.match(/\[Cancellation Reason\]\s*([^\n]+)/i)?.[1];
  const cleanNotes = panelBooking?.notes ? panelBooking.notes.replace(/\[Cancellation Reason\][^\n]*/i, "").trim() : null;

  // Fare display calculations
  const tripDaysText = panelBooking ? calculateTripDays(panelBooking.pickup_date, panelBooking.return_date) : null;
  const pricingTypeLabel = panelBooking?.pricing_type === "per_km" ? "Distance-based (Per Km)" : "Time-based (Daily Rental)";
  const rateLabel = panelBooking?.rate_amount
    ? `${formatCurrency(panelBooking.rate_amount)} / ${panelBooking.pricing_type === "per_km" ? "km" : "day"}`
    : null;

  return (
    <div className="bookings-workspace">
      {/* ══════════════════════════════════════
          LEFT: Bookings List Panel
      ══════════════════════════════════════ */}
      <div className="bookings-list-panel">

        {/* Toolbar */}
        <div className="bk-toolbar">
          <div className="bk-search-wrap">
            <svg className="bk-search-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/>
            </svg>
            <input
              className="bk-search-input"
              placeholder="Search customer, phone or location…"
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
            {search && (
              <button className="bk-search-clear" onClick={() => setSearch("")} title="Clear search">×</button>
            )}
          </div>

          {/* Quick Date Filter Dropdown */}
          <select
            className="bk-filter-select bk-date-select"
            value={datePreset}
            onChange={e => setDatePreset(e.target.value)}
            aria-label="Filter bookings by date"
            title="Filter by date range"
          >
            {DATE_PRESETS.map(p => (
              <option key={p.value} value={p.value}>{p.label}</option>
            ))}
          </select>

          {/* Status Filter */}
          <select
            className="bk-status-filter"
            value={statusFilter}
            onChange={e => setStatusFilter(e.target.value)}
            aria-label="Filter by status"
          >
            <option value="">All statuses</option>
            {STATUSES.map(s => (
              <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>
            ))}
          </select>

          {/* Branch / Office Filter */}
          {offices.length > 0 && (
            <select
              className="bk-filter-select bk-office-select"
              value={officeFilter}
              onChange={e => setOfficeFilter(e.target.value)}
              aria-label="Filter by office branch"
            >
              <option value="">🏢 All Branches</option>
              {offices.map(o => (
                <option key={o.id} value={o.id}>{o.name}</option>
              ))}
            </select>
          )}

          {canManage && (
            <button className="bk-btn-new" onClick={() => setEditing("new")}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" width="16" height="16">
                <path d="M12 5v14M5 12h14"/>
              </svg>
              New Booking
            </button>
          )}

          <button
            className="bk-btn-refresh"
            onClick={loadBookings}
            disabled={loading}
            title="Refresh list"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="16" height="16">
              <path d="M23 4v6h-6"/>
              <path d="M1 20v-6h6"/>
              <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"/>
            </svg>
          </button>
        </div>

        {/* Custom Date Range Picker */}
        {datePreset === "custom" && (
          <div className="bk-custom-date-bar">
            <span className="bk-date-range-label">From:</span>
            <input
              type="date"
              className="bk-date-input"
              value={customStart}
              onChange={e => setCustomStart(e.target.value)}
              aria-label="Start pickup date"
            />
            <span className="bk-date-range-label">To:</span>
            <input
              type="date"
              className="bk-date-input"
              value={customEnd}
              onChange={e => setCustomEnd(e.target.value)}
              aria-label="End pickup date"
            />
            {(customStart || customEnd) && (
              <button
                type="button"
                className="bk-btn-date-clear"
                onClick={() => { setCustomStart(""); setCustomEnd(""); }}
                title="Clear custom dates"
              >
                Clear Dates
              </button>
            )}
          </div>
        )}

        {/* Active Filters Pill Bar */}
        {hasActiveFilters && (
          <div className="bk-active-filters-bar">
            <span className="bk-active-filters-title">Active Filters:</span>
            {search && (
              <span className="bk-filter-tag">
                Search: "{search}"
                <button type="button" onClick={() => setSearch("")} title="Clear search tag">×</button>
              </span>
            )}
            {datePreset !== "all" && (
              <span className="bk-filter-tag">
                Date: {datePreset === "custom" ? (customStart || customEnd ? `${customStart || "…"} to ${customEnd || "…"}` : "Custom Range") : (DATE_PRESETS.find(p => p.value === datePreset)?.label || datePreset)}
                <button type="button" onClick={() => { setDatePreset("all"); setCustomStart(""); setCustomEnd(""); }} title="Clear date filter">×</button>
              </span>
            )}
            {statusFilter && (
              <span className="bk-filter-tag">
                Status: {statusFilter.charAt(0).toUpperCase() + statusFilter.slice(1)}
                <button type="button" onClick={() => setStatusFilter("")} title="Clear status filter">×</button>
              </span>
            )}
            {officeFilter && (
              <span className="bk-filter-tag">
                Office: {offices.find(o => String(o.id) === String(officeFilter))?.name || officeFilter}
                <button type="button" onClick={() => setOfficeFilter("")} title="Clear office filter">×</button>
              </span>
            )}
            <button
              type="button"
              className="bk-reset-filters-btn"
              onClick={resetAllFilters}
            >
              Reset all
            </button>
          </div>
        )}

        {/* Summary strip with interactive click-to-filter */}
        <div className="bk-summary-strip">
          <button
            type="button"
            className={`bk-summary-card bk-summary-btn${!statusFilter ? " active" : ""}`}
            onClick={() => setStatusFilter("")}
            title="Show all statuses"
          >
            <span className="bk-summary-number">{bookings.length}</span>
            <span className="bk-summary-label">In view</span>
          </button>
          <button
            type="button"
            className={`bk-summary-card bk-summary-good bk-summary-btn${statusFilter === "confirmed" ? " active" : ""}`}
            onClick={() => setStatusFilter(statusFilter === "confirmed" ? "" : "confirmed")}
            title="Filter by Confirmed / Active"
          >
            <span className="bk-summary-number">{confirmedCount}</span>
            <span className="bk-summary-label">Confirmed / Active</span>
          </button>
          <button
            type="button"
            className={`bk-summary-card bk-summary-alert bk-summary-btn${statusFilter === "pending" ? " active" : ""}`}
            onClick={() => setStatusFilter(statusFilter === "pending" ? "" : "pending")}
            title="Filter by Pending"
          >
            <span className="bk-summary-number">{pendingCount}</span>
            <span className="bk-summary-label">Pending</span>
          </button>
        </div>

        {/* Errors */}
        {error && <p className="bk-error">{error}</p>}

        {/* Loading skeleton */}
        {loading && (
          <div className="bk-loading-wrap">
            {[1, 2, 3, 4].map(i => (
              <div key={i} className="bk-skeleton-row">
                <div className="bk-skel bk-skel-avatar"/>
                <div className="bk-skel-lines">
                  <div className="bk-skel bk-skel-line bk-skel-wide"/>
                  <div className="bk-skel bk-skel-line bk-skel-narrow"/>
                </div>
                <div className="bk-skel bk-skel-badge"/>
              </div>
            ))}
          </div>
        )}

        {/* Bookings list */}
        {!loading && (
          <div className="bk-list">
            {bookings.length === 0 ? (
              <div className="bk-empty">
                <svg viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg" width="56" height="56">
                  <rect x="8" y="12" width="48" height="40" rx="6" fill="#e8f0f3"/>
                  <rect x="16" y="22" width="20" height="3" rx="1.5" fill="#9db8c4"/>
                  <rect x="16" y="30" width="32" height="3" rx="1.5" fill="#c8d8de"/>
                  <rect x="16" y="38" width="24" height="3" rx="1.5" fill="#c8d8de"/>
                </svg>
                <p>No bookings found.</p>
                {canManage && (
                  <button className="bk-btn-new" onClick={() => setEditing("new")}>
                    Create first reservation
                  </button>
                )}
              </div>
            ) : (
              bookings.map(booking => {
                const sm = STATUS_META[booking.status?.toLowerCase()] || STATUS_META.pending;
                const isSelected = selectedBooking?.id === booking.id;
                return (
                  <div
                    key={booking.id}
                    className={`bk-card${isSelected ? " bk-card-selected" : ""}`}
                    onClick={() => openDetail(booking)}
                    tabIndex={0}
                    onKeyDown={e => (e.key === "Enter" || e.key === " ") && openDetail(booking)}
                    role="button"
                    aria-pressed={isSelected}
                    aria-label={`Booking #BK-${String(booking.id).padStart(5,"0")} for ${booking.customer_name}`}
                  >
                    {/* Left accent */}
                    <div className="bk-card-accent" style={{ background: sm.color }}/>

                    {/* Customer avatar */}
                    <div className="bk-card-avatar" style={{ background: sm.bg, color: sm.color }}>
                      {(booking.customer_name || "?").charAt(0).toUpperCase()}
                    </div>

                    {/* Main info */}
                    <div className="bk-card-main">
                      <div className="bk-card-top">
                        <span className="bk-card-name">{booking.customer_name}</span>
                        <span className="bk-card-id">#{String(booking.id).padStart(5,"0")}</span>
                      </div>
                      <div className="bk-card-meta">
                        <span className="bk-card-dates">
                          {formatDate(booking.pickup_date)}
                          {booking.return_date && ` → ${formatDate(booking.return_date)}`}
                        </span>
                        {booking.pickup_location && (
                          <span className="bk-card-location" title={booking.pickup_location}>
                            📍 {booking.pickup_location}
                          </span>
                        )}
                      </div>
                      <div className="bk-card-bottom">
                        <span className="bk-badge" style={{ background: sm.bg, color: sm.color, borderColor: sm.color + "40" }}>
                          {sm.icon} {sm.label}
                        </span>
                        {booking.taxi?.reg_number && (
                          <span className="bk-card-taxi">🚕 {booking.taxi.reg_number}</span>
                        )}
                        {(booking.final_fare != null || booking.estimated_fare != null) && (
                          <span className="bk-card-fare">
                            {formatCurrency(booking.final_fare ?? booking.estimated_fare)}
                            {booking.final_fare == null && <em> est.</em>}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Chevron */}
                    <svg className="bk-card-chevron" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="16" height="16">
                      <path d="M9 18l6-6-6-6"/>
                    </svg>
                  </div>
                );
              })
            )}
          </div>
        )}
      </div>

      {/* ══════════════════════════════════════
          RIGHT: Detail Side Panel (Drawer)
      ══════════════════════════════════════ */}
      {selectedBooking && (
        <div className="bk-panel-overlay" onClick={closeDetail} aria-hidden="true"/>
      )}
      <aside
        className={`booking-detail-panel${selectedBooking ? " open" : ""}`}
        role="complementary"
        aria-label="Booking detail drawer"
      >
        {panelBooking && (
          <>
            {/* 1. Panel Hero Header */}
            <div
              className="bk-panel-header"
              style={{
                borderBottomColor: (statusInfo.color || "#0d6854") + "40",
                background: statusInfo.bg || "#f8fafc",
              }}
            >
              <div className="bk-panel-header-top">
                <div className="bk-panel-badge-group">
                  <span
                    className="bk-panel-status-pill"
                    style={{
                      background: statusInfo.bg,
                      color: statusInfo.color,
                      borderColor: statusInfo.border || statusInfo.color + "50",
                    }}
                  >
                    <span className="bk-panel-status-dot" style={{ background: statusInfo.color }}/>
                    {statusInfo.icon} {statusInfo.label}
                  </span>
                  {tripDaysText && (
                    <span className="bk-panel-duration-pill">
                      ⏳ {tripDaysText}
                    </span>
                  )}
                </div>

                <button
                  type="button"
                  className="bk-panel-close"
                  onClick={closeDetail}
                  title="Close (Esc)"
                  aria-label="Close panel"
                >
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" width="18" height="18">
                    <path d="M18 6 6 18M6 6l12 12"/>
                  </svg>
                </button>
              </div>

              {/* Booking ID Hero */}
              <div className="booking-id-hero">
                <div className="bk-id-wrap">
                  <span className="bk-id-prefix">BOOKING REF</span>
                  <span className="bk-id-text">{bookingIdStr}</span>
                </div>
                <button
                  type="button"
                  className={`bk-copy-btn${copiedKey === "id" ? " copied" : ""}`}
                  onClick={() => handleCopy(bookingIdStr, "id")}
                  title="Copy booking reference ID"
                >
                  {copiedKey === "id" ? (
                    <>
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" width="14" height="14">
                        <path d="M20 6 9 17l-5-5"/>
                      </svg>
                      Copied!
                    </>
                  ) : (
                    <>
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="14" height="14">
                        <rect x="9" y="9" width="13" height="13" rx="2"/>
                        <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/>
                      </svg>
                      Copy ID
                    </>
                  )}
                </button>
              </div>

              {/* Quick Customer Action Bar */}
              <div className="bk-quick-actions">
                {panelBooking.customer_phone ? (
                  <a href={`tel:${panelBooking.customer_phone}`} className="bk-quick-btn">
                    <span>📞</span> Call
                  </a>
                ) : (
                  <button type="button" className="bk-quick-btn disabled" disabled>
                    <span>📞</span> Call
                  </button>
                )}

                {panelBooking.customer?.email ? (
                  <a href={`mailto:${panelBooking.customer.email}`} className="bk-quick-btn">
                    <span>✉️</span> Email
                  </a>
                ) : (
                  <button
                    type="button"
                    className="bk-quick-btn"
                    onClick={() => handleCopy(panelBooking.customer_phone, "tel-quick")}
                    title="Copy phone"
                  >
                    <span>{copiedKey === "tel-quick" ? "✓" : "📋"}</span>
                    {copiedKey === "tel-quick" ? "Copied" : "Copy Phone"}
                  </button>
                )}

                <button
                  type="button"
                  className="bk-quick-btn"
                  onClick={handleCopySummary}
                  title="Copy full booking summary for dispatch"
                >
                  <span>{copiedKey === "summary" ? "✓" : "📤"}</span>
                  {copiedKey === "summary" ? "Copied" : "Share Summary"}
                </button>
              </div>
            </div>

            {/* 2. Segmented Navigation Tabs */}
            <div className="bk-tabs-bar" role="tablist">
              <button
                type="button"
                role="tab"
                aria-selected={panelTab === "journey"}
                className={`bk-tab-btn${panelTab === "journey" ? " active" : ""}`}
                onClick={() => setPanelTab("journey")}
              >
                <span>🧭</span> Journey
              </button>
              <button
                type="button"
                role="tab"
                aria-selected={panelTab === "passenger"}
                className={`bk-tab-btn${panelTab === "passenger" ? " active" : ""}`}
                onClick={() => setPanelTab("passenger")}
              >
                <span>👤</span> Passenger
              </button>
              <button
                type="button"
                role="tab"
                aria-selected={panelTab === "fleet"}
                className={`bk-tab-btn${panelTab === "fleet" ? " active" : ""}`}
                onClick={() => setPanelTab("fleet")}
              >
                <span>🚕</span> Fleet & Crew
              </button>
              <button
                type="button"
                role="tab"
                aria-selected={panelTab === "fare"}
                className={`bk-tab-btn${panelTab === "fare" ? " active" : ""}`}
                onClick={() => setPanelTab("fare")}
              >
                <span>💰</span> Billing
              </button>
            </div>

            {/* 3. Scrollable Panel Body */}
            <div className="bk-panel-body">
              {/* Cancellation Reason Alert if Cancelled */}
              {panelBooking.status === "cancelled" && (
                <div className="bk-cancellation-banner">
                  <div className="bk-cancellation-title">
                    <span role="img" aria-label="Alert">⚠️</span> Reservation Cancelled
                  </div>
                  <p className="bk-cancellation-text">
                    {cancellationReason || "This booking was marked as cancelled."}
                  </p>
                </div>
              )}

              {/* ─── TAB 1: JOURNEY & ROUTE ─── */}
              {panelTab === "journey" && (
                <div className="bk-tab-pane">
                  {/* Visual Route Progress Timeline */}
                  <div className="bk-route-card">
                    <div className="bk-route-card-header">
                      <span className="bk-route-card-title">Route & Schedule</span>
                      {tripDaysText && <span className="bk-route-tag">{tripDaysText}</span>}
                    </div>

                    <div className="bk-route-timeline">
                      {/* Pickup Node */}
                      <div className="bk-route-node pickup">
                        <div className="bk-node-marker pickup">
                          <span className="bk-node-dot" />
                        </div>
                        <div className="bk-node-content">
                          <div className="bk-node-badge">PICKUP POINT</div>
                          <div className="bk-node-location">
                            {panelBooking.pickup_location || "Pickup point not specified"}
                          </div>
                          <div className="bk-node-time">
                            📅 {formatDateTime(panelBooking.pickup_date)}
                          </div>
                        </div>
                      </div>

                      {/* Route Path Connector */}
                      <div className="bk-route-path">
                        <div className="bk-path-line" />
                        <div className="bk-path-metrics">
                          {panelBooking.planned_distance_km ? (
                            <span className="bk-path-chip">
                              🛣️ {Number(panelBooking.planned_distance_km).toLocaleString()} km planned
                            </span>
                          ) : (
                            <span className="bk-path-chip">
                              ↔ Trip in transit
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Drop-off Node */}
                      <div className="bk-route-node drop">
                        <div className="bk-node-marker drop">
                          <span className="bk-node-pin">📍</span>
                        </div>
                        <div className="bk-node-content">
                          <div className="bk-node-badge">DROP-OFF POINT</div>
                          <div className="bk-node-location">
                            {panelBooking.drop_location || "Drop location open / not specified"}
                          </div>
                          <div className="bk-node-time">
                            📅 {formatDateTime(panelBooking.return_date)}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Branch Office Info */}
                  <DetailSection title="Dispatching Branch" icon="🏢">
                    <DetailRow
                      label="Branch"
                      value={panelBooking.office?.name || "Main Office / Headquarters"}
                    />
                    <DetailRow
                      label="Phone"
                      value={panelBooking.office?.phone}
                      isLink={Boolean(panelBooking.office?.phone)}
                      href={`tel:${panelBooking.office?.phone}`}
                    />
                    <DetailRow
                      label="Address"
                      value={panelBooking.office?.address || panelBooking.office?.city}
                    />
                  </DetailSection>

                  {/* Trip Remarks & Instructions */}
                  {cleanNotes && (
                    <DetailSection title="Notes & Special Requests" icon="📝">
                      <p className="bk-notes-text">{cleanNotes}</p>
                    </DetailSection>
                  )}
                </div>
              )}

              {/* ─── TAB 2: PASSENGER / CUSTOMER ─── */}
              {panelTab === "passenger" && (
                <div className="bk-tab-pane">
                  {/* Customer Hero Profile */}
                  <div className="bk-customer-hero-card">
                    <div
                      className="bk-customer-avatar"
                      style={{ background: getAvatarColor(panelBooking.customer_name || "Customer") }}
                    >
                      {getInitials(panelBooking.customer_name || "Customer")}
                    </div>
                    <div className="bk-customer-hero-info">
                      <h3 className="bk-customer-hero-name" title={panelBooking.customer_name}>
                        {panelBooking.customer_name}
                      </h3>
                      <div className="bk-customer-hero-badges">
                        <span className="bk-customer-role-badge">Passenger</span>
                        {panelBooking.customer?.id && (
                          <span className="bk-customer-id-pill">
                            Account #{panelBooking.customer.id}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Contact Methods */}
                  <DetailSection title="Contact Information" icon="📱">
                    <div className="bk-contact-row">
                      <div className="bk-contact-icon">📞</div>
                      <div className="bk-contact-data">
                        <span className="bk-contact-label">Phone Number</span>
                        <a href={`tel:${panelBooking.customer_phone}`} className="bk-contact-val">
                          {panelBooking.customer_phone || "No phone on record"}
                        </a>
                      </div>
                      {panelBooking.customer_phone && (
                        <button
                          type="button"
                          className="bk-contact-copy-btn"
                          onClick={() => handleCopy(panelBooking.customer_phone, "cust-phone")}
                          title="Copy phone number"
                        >
                          {copiedKey === "cust-phone" ? "✓" : "📋"}
                        </button>
                      )}
                    </div>

                    <div className="bk-contact-row">
                      <div className="bk-contact-icon">✉️</div>
                      <div className="bk-contact-data">
                        <span className="bk-contact-label">Email Address</span>
                        {panelBooking.customer?.email ? (
                          <a href={`mailto:${panelBooking.customer.email}`} className="bk-contact-val">
                            {panelBooking.customer.email}
                          </a>
                        ) : (
                          <span className="bk-contact-val muted">Not on file</span>
                        )}
                      </div>
                      {panelBooking.customer?.email && (
                        <button
                          type="button"
                          className="bk-contact-copy-btn"
                          onClick={() => handleCopy(panelBooking.customer.email, "cust-email")}
                          title="Copy email address"
                        >
                          {copiedKey === "cust-email" ? "✓" : "📋"}
                        </button>
                      )}
                    </div>

                    <div className="bk-contact-row">
                      <div className="bk-contact-icon">🏠</div>
                      <div className="bk-contact-data">
                        <span className="bk-contact-label">Registered Address</span>
                        <span className="bk-contact-val">
                          {panelBooking.customer?.address || "Address not provided"}
                        </span>
                      </div>
                    </div>
                  </DetailSection>
                </div>
              )}

              {/* ─── TAB 3: FLEET & DRIVER ─── */}
              {panelTab === "fleet" && (
                <div className="bk-tab-pane">
                  {/* Taxi Card */}
                  <div className="bk-resource-card">
                    <div className="bk-resource-header">
                      <span className="bk-resource-icon">🚕</span>
                      <span className="bk-resource-title">Assigned Fleet Vehicle</span>
                    </div>

                    {panelBooking.taxi ? (
                      <div className="bk-resource-body">
                        {/* Vehicle Plate Badge */}
                        <div className="bk-plate-banner">
                          <span className="bk-plate-pill">
                            <span className="bk-plate-flag">IND</span>
                            <span className="bk-plate-num">{panelBooking.taxi.reg_number}</span>
                          </span>
                          <span className="bk-plate-status">Active Fleet</span>
                        </div>

                        <DetailRow
                          label="Make & Model"
                          value={panelBooking.taxi.make_model || panelBooking.taxi.model || "Standard Taxi"}
                        />
                        <DetailRow
                          label="Vehicle Class"
                          value={panelBooking.taxi.vehicle_type ? panelBooking.taxi.vehicle_type.toUpperCase().replace("_", " ") : "Standard"}
                        />
                        <DetailRow
                          label="Capacity"
                          value={panelBooking.taxi.seating_capacity ? `${panelBooking.taxi.seating_capacity} Passenger Seats` : null}
                        />
                        <DetailRow
                          label="Fuel Type"
                          value={panelBooking.taxi.fuel_type ? panelBooking.taxi.fuel_type.toUpperCase() : null}
                        />
                      </div>
                    ) : (
                      <div className="bk-resource-empty">
                        <span className="bk-empty-icon">🚖</span>
                        <div className="bk-empty-title">No Taxi Assigned</div>
                        <p className="bk-empty-desc">
                          This booking does not currently have a fleet vehicle assigned.
                        </p>
                        {canManage && (
                          <button
                            type="button"
                            className="bk-assign-btn"
                            onClick={() => setEditing(panelBooking)}
                          >
                            Assign Taxi Now
                          </button>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Driver Card */}
                  <div className="bk-resource-card">
                    <div className="bk-resource-header">
                      <span className="bk-resource-icon">🧑‍✈️</span>
                      <span className="bk-resource-title">Assigned Chauffeur / Driver</span>
                    </div>

                    {panelBooking.driver ? (
                      <div className="bk-resource-body">
                        <div className="bk-driver-hero">
                          <div
                            className="bk-driver-avatar"
                            style={{ background: getAvatarColor(panelBooking.driver.name) }}
                          >
                            {getInitials(panelBooking.driver.name)}
                          </div>
                          <div className="bk-driver-info">
                            <h4 className="bk-driver-name">{panelBooking.driver.name}</h4>
                            <span className="bk-driver-sub">Registered Commercial Driver</span>
                          </div>
                        </div>

                        <DetailRow
                          label="Driver Phone"
                          value={panelBooking.driver.phone || "No phone"}
                          isLink={Boolean(panelBooking.driver.phone)}
                          href={`tel:${panelBooking.driver.phone}`}
                        />
                        <DetailRow
                          label="License No."
                          value={panelBooking.driver.license_number}
                          mono
                        />
                      </div>
                    ) : (
                      <div className="bk-resource-empty">
                        <span className="bk-empty-icon">👤</span>
                        <div className="bk-empty-title">No Driver Assigned</div>
                        <p className="bk-empty-desc">
                          No commercial driver is currently allocated for this ride.
                        </p>
                        {canManage && (
                          <button
                            type="button"
                            className="bk-assign-btn"
                            onClick={() => setEditing(panelBooking)}
                          >
                            Assign Driver Now
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* ─── TAB 4: BILLING & FARE ─── */}
              {panelTab === "fare" && (
                <div className="bk-tab-pane">
                  {/* Fare Hero Card */}
                  <div className="bk-fare-hero-card">
                    <div className="bk-fare-hero-meta">
                      <span className="bk-fare-hero-label">
                        {panelBooking.final_fare != null
                          ? "Final Billed Fare"
                          : panelBooking.estimated_fare != null
                            ? "Estimated Fare Quote"
                            : "Billing Status"}
                      </span>
                      <span className="bk-fare-hero-amount">
                        {panelBooking.final_fare != null
                          ? formatCurrency(panelBooking.final_fare)
                          : panelBooking.estimated_fare != null
                            ? formatCurrency(panelBooking.estimated_fare)
                            : rateLabel || "Pending"}
                      </span>
                    </div>
                    {panelBooking.final_fare != null ? (
                      <span className="bk-fare-status-tag settled">Billed</span>
                    ) : (
                      <span className="bk-fare-status-tag quote">Estimated</span>
                    )}
                  </div>

                  {/* Pricing Matrix */}
                  <DetailSection title="Rate Structure" icon="🏷️">
                    <DetailRow label="Pricing Model" value={pricingTypeLabel} />
                    <DetailRow label="Unit Rate" value={rateLabel} />
                    {panelBooking.final_fare != null && panelBooking.estimated_fare != null && (
                      <DetailRow label="Original Quote" value={formatCurrency(panelBooking.estimated_fare)} />
                    )}
                  </DetailSection>

                  {/* Odometer & Mileage Tracking */}
                  <DetailSection title="Odometer & Distance" icon="⏱️">
                    <DetailRow
                      label="Start Odometer"
                      value={panelBooking.odometer_start != null ? `${Number(panelBooking.odometer_start).toLocaleString()} km` : "Pending start"}
                      mono
                    />
                    <DetailRow
                      label="End Odometer"
                      value={panelBooking.odometer_end != null ? `${Number(panelBooking.odometer_end).toLocaleString()} km` : "Pending trip completion"}
                      mono
                    />
                    <DetailRow
                      label="Actual Distance"
                      value={panelBooking.actual_distance_km != null ? `${Number(panelBooking.actual_distance_km).toLocaleString()} km` : null}
                      mono
                    />
                  </DetailSection>

                  {/* Audit Trail */}
                  <DetailSection title="Audit & Records" icon="🕐">
                    <DetailRow label="Created On" value={formatDateTime(panelBooking.created_at)} />
                    <DetailRow label="Last Modified" value={formatDateTime(panelBooking.updated_at)} />
                  </DetailSection>
                </div>
              )}
            </div>

            {/* 4. Panel Footer Actions */}
            {canManage && (
              <div className="bk-panel-footer">
                <button
                  type="button"
                  className="bk-panel-btn-edit"
                  onClick={() => setEditing(panelBooking)}
                >
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="15" height="15">
                    <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
                    <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
                  </svg>
                  Edit Booking
                </button>
                {panelBooking.status !== "cancelled" && (
                  <button
                    type="button"
                    className="bk-panel-btn-cancel"
                    onClick={() => handleInitiateCancel(panelBooking)}
                  >
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="15" height="15">
                      <circle cx="12" cy="12" r="10"/>
                      <path d="m15 9-6 6M9 9l6 6"/>
                    </svg>
                    Cancel Booking
                  </button>
                )}
              </div>
            )}
          </>
        )}
      </aside>

      {/* ══════════════════════════════════════
          Modals
      ══════════════════════════════════════ */}
      {editing && canManage && (
        <BookingForm
          initial={editing === "new" ? null : editing}
          taxis={taxis}
          drivers={drivers}
          offices={offices}
          onSubmit={saveBooking}
          onCancel={() => setEditing(null)}
        />
      )}

      {cancellingBooking && (
        <CancelBookingModal
          booking={cancellingBooking}
          loading={cancelLoading}
          error={cancelError}
          onClose={() => {
            if (!cancelLoading) {
              setCancellingBooking(null);
              setCancelError("");
            }
          }}
          onConfirm={handleConfirmCancel}
        />
      )}
    </div>
  );
}
