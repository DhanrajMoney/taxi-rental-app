import React, { useEffect, useState, useMemo, useCallback } from "react";
import { DriverAPI, OfficeAPI } from "../api/client.js";
import DriverForm from "../components/DriverForm.jsx";
import useDebouncedValue from "../hooks/useDebouncedValue.js";
import { formatDate, getAvatarColor, getInitials, copyToClipboard } from "../utils/format.js";
import "../styles/drivers.css";

const STATUS_META = {
  active:   { color: "#16a34a", bg: "#f0fdf4", border: "#bbf7d0", label: "Active",   icon: "🟢" },
  on_trip:  { color: "#2563eb", bg: "#eff6ff", border: "#bfdbfe", label: "On Trip",  icon: "🚕" },
  on_leave: { color: "#d97706", bg: "#fff7ed", border: "#fed7aa", label: "On Leave", icon: "🏖️" },
  inactive: { color: "#dc2626", bg: "#fef2f2", border: "#fecaca", label: "Inactive", icon: "⛔" },
};

function computeDriverCompliance(driver) {
  const dates = [
    { key: "license", label: "License", date: driver.license_expiry },
    { key: "insurance", label: "Insurance", date: driver.insurance_expiry },
    { key: "doc", label: "Doc", date: driver.document_expiry },
    { key: "req", label: "Clearance", date: driver.required_document_expiry },
  ].filter((d) => Boolean(d.date));

  if (dates.length === 0) return { status: "unknown", text: "No dates", class: "ok" };

  const now = new Date();
  now.setHours(0, 0, 0, 0);

  // Check expired first
  for (const item of dates) {
    const expiry = new Date(item.date);
    expiry.setHours(0, 0, 0, 0);
    const diffDays = Math.ceil((expiry - now) / (1000 * 60 * 60 * 24));
    if (diffDays < 0) {
      return {
        status: "expired",
        text: `${item.label} Expired`,
        sub: `${Math.abs(diffDays)}d overdue`,
        class: "expired",
        urgent: true,
      };
    }
  }

  // Check expiring soon within 30 days
  for (const item of dates) {
    const expiry = new Date(item.date);
    expiry.setHours(0, 0, 0, 0);
    const diffDays = Math.ceil((expiry - now) / (1000 * 60 * 60 * 24));
    if (diffDays <= 30) {
      return {
        status: "expiring",
        text: `${item.label} (${diffDays}d left)`,
        sub: "Expiring soon",
        class: "expiring",
        urgent: true,
      };
    }
  }

  return {
    status: "ok",
    text: "Compliant",
    sub: "All docs valid",
    class: "ok",
    urgent: false,
  };
}

export default function Drivers({ canManage = false }) {
  const [drivers, setDrivers] = useState([]);
  const [offices, setOffices] = useState([]);
  const [search, setSearch] = useState("");
  const debouncedSearch = useDebouncedValue(search);
  const [status, setStatus] = useState("");
  const [officeFilter, setOfficeFilter] = useState("");
  const [complianceFilter, setComplianceFilter] = useState("");
  const [viewMode, setViewMode] = useState(() => localStorage.getItem("ridedesk_driver_view") || "grid");
  const [editing, setEditing] = useState(null);
  const [selectedDriver, setSelectedDriver] = useState(null);
  const [selectedDriverFull, setSelectedDriverFull] = useState(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [copiedKey, setCopiedKey] = useState(null);

  function handleViewMode(mode) {
    setViewMode(mode);
    localStorage.setItem("ridedesk_driver_view", mode);
  }

  const loadOffices = useCallback(async () => {
    try {
      const res = await OfficeAPI.list();
      setOffices(res.data || res || []);
    } catch {
      // Non-critical
    }
  }, []);

  const loadDrivers = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const params = {};
      if (debouncedSearch) params.search = debouncedSearch;
      if (status) params.status = status;
      if (officeFilter) params.office_id = officeFilter;
      const res = await DriverAPI.list(params);
      const list = res.data || res || [];
      setDrivers(list);
    } catch (err) {
      setError(err?.response?.data?.message || "Could not load drivers. Please verify the backend connection.");
    } finally {
      setLoading(false);
    }
  }, [debouncedSearch, status, officeFilter]);

  useEffect(() => {
    loadOffices();
  }, [loadOffices]);

  useEffect(() => {
    loadDrivers();
  }, [loadDrivers]);

  // Load detailed driver info when opening drawer
  const openDetail = useCallback(async (driver) => {
    setSelectedDriver(driver);
    setSelectedDriverFull(driver);
    try {
      const full = await DriverAPI.get(driver.id);
      setSelectedDriverFull(full);
    } catch {
      // Keep lightweight driver if get fails
    }
  }, []);

  const closeDetail = useCallback(() => {
    setSelectedDriver(null);
    setSelectedDriverFull(null);
  }, []);

  // Handle ESC key for detail drawer
  useEffect(() => {
    function handleKeyDown(e) {
      if (e.key === "Escape" && selectedDriver && !editing) {
        closeDetail();
      }
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [selectedDriver, editing, closeDetail]);

  async function handleSubmit(form, photo) {
    const payload = new FormData();
    Object.entries(form).forEach(([field, value]) => {
      if (value !== null && value !== undefined) payload.append(field, String(value));
    });
    if (photo) payload.append("photo", photo);

    if (editing && editing.id) {
      await DriverAPI.update(editing.id, payload);
    } else {
      await DriverAPI.create(payload);
    }
    setEditing(null);
    loadDrivers();
    if (selectedDriver && editing && editing.id === selectedDriver.id) {
      // Refresh current drawer driver
      try {
        const updated = await DriverAPI.get(editing.id);
        setSelectedDriver(updated);
        setSelectedDriverFull(updated);
      } catch {
        // ignore
      }
    }
  }

  async function handleDelete(id, name) {
    if (!window.confirm(`Are you sure you want to remove driver "${name || id}"? This action will soft-delete their profile.`)) {
      return;
    }
    try {
      await DriverAPI.remove(id);
      if (selectedDriver && selectedDriver.id === id) {
        closeDetail();
      }
      loadDrivers();
    } catch (err) {
      setError(err?.response?.data?.message || "Failed to remove driver.");
    }
  }

  function handleCopy(text, key) {
    copyToClipboard(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2000);
  }

  // Filtered drivers (including local compliance filter)
  const filteredDrivers = useMemo(() => {
    return drivers.filter((d) => {
      if (!complianceFilter) return true;
      const comp = computeDriverCompliance(d);
      if (complianceFilter === "alert") return comp.status === "expired" || comp.status === "expiring";
      if (complianceFilter === "ok") return comp.status === "ok";
      return true;
    });
  }, [drivers, complianceFilter]);

  // Metric counts
  const metrics = useMemo(() => {
    const total = drivers.length;
    let active = 0;
    let onTrip = 0;
    let onLeave = 0;
    let alerts = 0;

    drivers.forEach((d) => {
      if (d.status === "active") active++;
      else if (d.status === "on_trip") onTrip++;
      else if (d.status === "on_leave") onLeave++;

      const comp = computeDriverCompliance(d);
      if (comp.status === "expired" || comp.status === "expiring") {
        alerts++;
      }
    });

    return { total, active, onTrip, onLeave, alerts };
  }, [drivers]);

  const hasActiveFilters = Boolean(search || status || officeFilter || complianceFilter);

  function resetFilters() {
    setSearch("");
    setStatus("");
    setOfficeFilter("");
    setComplianceFilter("");
  }

  const activeDriver = selectedDriverFull || selectedDriver;
  const activeStatusMeta = activeDriver ? (STATUS_META[activeDriver.status] || STATUS_META.active) : STATUS_META.active;
  const activeCompliance = activeDriver ? computeDriverCompliance(activeDriver) : null;

  return (
    <div className="drivers-page">
      {/* ──────────────────────────────────────────────
          1. TOP METRICS STRIP
      ────────────────────────────────────────────── */}
      <section className="drv-metrics-strip" aria-label="Driver fleet summary">
        {/* Total Drivers */}
        <div
          className={`drv-metric-card${!status && !complianceFilter ? " active-filter" : ""}`}
          onClick={resetFilters}
          title="Show all drivers"
        >
          <div className="drv-metric-icon" style={{ background: "#f1f5f9", color: "#153d4a" }}>
            👥
          </div>
          <div className="drv-metric-info">
            <span className="drv-metric-count">{metrics.total}</span>
            <span className="drv-metric-label">Total Fleet</span>
            <span className="drv-metric-desc">Registered drivers</span>
          </div>
        </div>

        {/* Active & Ready */}
        <div
          className={`drv-metric-card${status === "active" ? " active-filter" : ""}`}
          onClick={() => {
            setStatus(status === "active" ? "" : "active");
            setComplianceFilter("");
          }}
          title="Filter active drivers"
        >
          <div className="drv-metric-icon" style={{ background: "#f0fdf4", color: "#16a34a" }}>
            🟢
          </div>
          <div className="drv-metric-info">
            <span className="drv-metric-count">{metrics.active}</span>
            <span className="drv-metric-label">Active</span>
            <span className="drv-metric-desc">Available for duty</span>
          </div>
        </div>

        {/* On Trip */}
        <div
          className={`drv-metric-card${status === "on_trip" ? " active-filter" : ""}`}
          onClick={() => {
            setStatus(status === "on_trip" ? "" : "on_trip");
            setComplianceFilter("");
          }}
          title="Filter drivers currently on trip"
        >
          <div className="drv-metric-icon" style={{ background: "#eff6ff", color: "#2563eb" }}>
            🚕
          </div>
          <div className="drv-metric-info">
            <span className="drv-metric-count">{metrics.onTrip}</span>
            <span className="drv-metric-label">On Trip</span>
            <span className="drv-metric-desc">In transit with ride</span>
          </div>
        </div>

        {/* On Leave */}
        <div
          className={`drv-metric-card${status === "on_leave" ? " active-filter" : ""}`}
          onClick={() => {
            setStatus(status === "on_leave" ? "" : "on_leave");
            setComplianceFilter("");
          }}
          title="Filter drivers on leave"
        >
          <div className="drv-metric-icon" style={{ background: "#fff7ed", color: "#d97706" }}>
            🏖️
          </div>
          <div className="drv-metric-info">
            <span className="drv-metric-count">{metrics.onLeave}</span>
            <span className="drv-metric-label">On Leave</span>
            <span className="drv-metric-desc">Scheduled time off</span>
          </div>
        </div>

        {/* Compliance Alerts */}
        <div
          className={`drv-metric-card${complianceFilter === "alert" ? " active-filter" : ""}`}
          onClick={() => {
            setComplianceFilter(complianceFilter === "alert" ? "" : "alert");
            setStatus("");
          }}
          title="Filter drivers with expired or expiring documents"
        >
          <div className="drv-metric-icon" style={{ background: "#fef2f2", color: "#dc2626" }}>
            ⚠️
          </div>
          <div className="drv-metric-info">
            <span className="drv-metric-count">{metrics.alerts}</span>
            <span className="drv-metric-label">Doc Alerts</span>
            <span className="drv-metric-desc">Expiring / overdue</span>
          </div>
        </div>
      </section>

      {/* ──────────────────────────────────────────────
          2. CONTROLS TOOLBAR
      ────────────────────────────────────────────── */}
      <div className="drv-toolbar">
        {/* Search Input */}
        <div className="drv-search-box">
          <span className="drv-search-icon">🔍</span>
          <input
            type="search"
            className="drv-search-input"
            placeholder="Search driver by name, phone, or license..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        {/* Filter Dropdowns */}
        <div className="drv-filters-group">
          {/* Status Filter */}
          <select
            className="drv-select"
            value={status}
            onChange={(e) => setStatus(e.target.value)}
          >
            <option value="">All Statuses</option>
            <option value="active">Active (Available)</option>
            <option value="on_trip">On Trip</option>
            <option value="on_leave">On Leave</option>
            <option value="inactive">Inactive</option>
          </select>

          {/* Office Branch Filter */}
          {offices.length > 0 && (
            <select
              className="drv-select"
              value={officeFilter}
              onChange={(e) => setOfficeFilter(e.target.value)}
            >
              <option value="">All Offices</option>
              {offices.map((o) => (
                <option key={o.id} value={o.id}>
                  {o.name}
                </option>
              ))}
            </select>
          )}

          {/* Compliance Filter */}
          <select
            className="drv-select"
            value={complianceFilter}
            onChange={(e) => setComplianceFilter(e.target.value)}
          >
            <option value="">All Compliance</option>
            <option value="alert">⚠️ Expiring / Expired</option>
            <option value="ok">✅ All Compliant</option>
          </select>

          {/* Reset Filters */}
          {hasActiveFilters && (
            <button
              type="button"
              className="drv-btn-reset"
              onClick={resetFilters}
              title="Reset all search & filters"
            >
              ✕ Clear Filters
            </button>
          )}
        </div>

        {/* Right side controls: View switch & Add Driver */}
        <div style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: "0.5rem" }}>
          {/* View Mode Toggle */}
          <div className="drv-view-toggle">
            <button
              type="button"
              className={`drv-view-btn${viewMode === "grid" ? " active" : ""}`}
              onClick={() => handleViewMode("grid")}
              title="Card Grid View"
            >
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <rect x="3" y="3" width="7" height="7" rx="1.5" />
                <rect x="14" y="3" width="7" height="7" rx="1.5" />
                <rect x="14" y="14" width="7" height="7" rx="1.5" />
                <rect x="3" y="14" width="7" height="7" rx="1.5" />
              </svg>
              <span>Grid</span>
            </button>
            <button
              type="button"
              className={`drv-view-btn${viewMode === "table" ? " active" : ""}`}
              onClick={() => handleViewMode("table")}
              title="Structured Table View"
            >
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <line x1="3" y1="6" x2="21" y2="6" />
                <line x1="3" y1="12" x2="21" y2="12" />
                <line x1="3" y1="18" x2="21" y2="18" />
              </svg>
              <span>Table</span>
            </button>
          </div>

          {/* Refresh Button */}
          <button
            type="button"
            className="drv-btn-refresh"
            onClick={loadDrivers}
            disabled={loading}
            title="Refresh driver records"
          >
            {loading ? "Refreshing..." : "↻ Refresh"}
          </button>

          {/* Add Driver Button */}
          {canManage && (
            <button
              type="button"
              className="drv-btn-primary"
              onClick={() => setEditing("new")}
            >
              <span>+</span> Add Driver
            </button>
          )}
        </div>
      </div>

      {/* Error alert */}
      {error && (
        <div style={{
          background: "#fef2f2",
          border: "1px solid #fecaca",
          color: "#dc2626",
          padding: "0.75rem 1rem",
          borderRadius: "8px",
          marginBottom: "1.25rem",
          fontSize: "0.875rem"
        }}>
          ⚠️ {error}
        </div>
      )}

      {/* ──────────────────────────────────────────────
          3. CONTENT DISPLAY: GRID OR TABLE
      ────────────────────────────────────────────── */}
      {loading && drivers.length === 0 ? (
        <div style={{ textAlign: "center", padding: "4rem 1rem", color: "#64748b" }}>
          <div style={{ fontSize: "2rem", marginBottom: "0.5rem" }}>⏳</div>
          <strong>Loading driver fleet records...</strong>
        </div>
      ) : filteredDrivers.length === 0 ? (
        <div style={{
          background: "#ffffff",
          border: "1px dashed #cbd5e1",
          borderRadius: "12px",
          padding: "3.5rem 1.5rem",
          textAlign: "center",
          color: "#64748b",
          marginBottom: "2rem"
        }}>
          <div style={{ fontSize: "2.5rem", marginBottom: "0.75rem" }}>👨‍✈️</div>
          <h3 style={{ margin: "0 0 0.5rem", color: "#0f172a" }}>No drivers found</h3>
          <p style={{ margin: "0 0 1.25rem", fontSize: "0.875rem" }}>
            {hasActiveFilters
              ? "No drivers matched your active search or filter criteria."
              : "No drivers registered in the fleet yet."}
          </p>
          {hasActiveFilters ? (
            <button type="button" className="drv-btn-refresh" onClick={resetFilters} style={{ margin: "0 auto" }}>
              Clear Filters
            </button>
          ) : canManage ? (
            <button type="button" className="drv-btn-primary" onClick={() => setEditing("new")} style={{ margin: "0 auto" }}>
              + Add First Driver
            </button>
          ) : null}
        </div>
      ) : viewMode === "grid" ? (
        /* ──── GRID VIEW ──── */
        <div className="drv-grid">
          {filteredDrivers.map((driver) => {
            const sm = STATUS_META[driver.status] || STATUS_META.active;
            const comp = computeDriverCompliance(driver);
            const photoUrl = driver.photo_path ? `/storage/${driver.photo_path.replace(/^\/+/, "")}` : null;
            const avatarBg = getAvatarColor(driver.name);
            const initials = getInitials(driver.name);

            return (
              <div key={driver.id} className="drv-card">
                {/* Header */}
                <div className="drv-card-header">
                  <div className="drv-avatar-wrap">
                    {photoUrl ? (
                      <img
                        src={photoUrl}
                        alt={driver.name}
                        className="drv-avatar"
                        onError={(e) => {
                          e.target.onerror = null;
                          e.target.style.display = "none";
                          e.target.parentElement.innerHTML = `<div class="drv-avatar" style="background:${avatarBg}">${initials}</div>`;
                        }}
                      />
                    ) : (
                      <div className="drv-avatar" style={{ background: avatarBg }}>
                        {initials}
                      </div>
                    )}
                    <span className="drv-status-indicator" style={{ background: sm.color }} />
                  </div>

                  <div className="drv-header-meta">
                    <h3 className="drv-name" title={driver.name}>
                      {driver.name}
                    </h3>
                    <div className="drv-contact-row">
                      <span>📞</span>
                      <a href={`tel:${driver.phone}`} className="drv-contact-link">
                        {driver.phone}
                      </a>
                    </div>
                  </div>

                  <span
                    className="drv-status-pill"
                    style={{ background: sm.bg, color: sm.color, borderColor: sm.border }}
                  >
                    {sm.icon} {sm.label}
                  </span>
                </div>

                {/* Body Details */}
                <div className="drv-card-body" onClick={() => openDetail(driver)} style={{ cursor: "pointer" }}>
                  {/* Assigned Vehicle */}
                  <div className="drv-info-row">
                    <span className="drv-info-label">
                      <span>🚗</span> Assigned Taxi
                    </span>
                    {driver.taxi ? (
                      <span className="drv-vehicle-pill assigned" title={driver.taxi.make_model}>
                        {driver.taxi.reg_number} • {driver.taxi.make_model}
                      </span>
                    ) : (
                      <span className="drv-vehicle-pill unassigned">Unassigned</span>
                    )}
                  </div>

                  {/* Office */}
                  <div className="drv-info-row">
                    <span className="drv-info-label">
                      <span>🏢</span> Office
                    </span>
                    <span className="drv-info-val">
                      {driver.office?.name || "Head Office"}
                    </span>
                  </div>

                  {/* License */}
                  <div className="drv-info-row">
                    <span className="drv-info-label">
                      <span>🪪</span> License
                    </span>
                    <span className="drv-info-val" style={{ fontFamily: "monospace" }}>
                      {driver.license_number}
                    </span>
                  </div>

                  {/* Compliance Health */}
                  <div className="drv-info-row">
                    <span className="drv-info-label">
                      <span>🛡️</span> Compliance
                    </span>
                    <span className={`drv-compliance-badge ${comp.class}`}>
                      {comp.status === "ok" ? "✅" : comp.status === "expiring" ? "⏳" : "⚠️"} {comp.text}
                    </span>
                  </div>
                </div>

                {/* Footer Actions */}
                <div className="drv-card-footer">
                  <button
                    type="button"
                    className="drv-view-details-btn"
                    onClick={() => openDetail(driver)}
                  >
                    <span>View Profile</span> →
                  </button>

                  <div className="drv-card-actions">
                    <button
                      type="button"
                      className="drv-btn-icon"
                      onClick={() => handleCopy(driver.phone, `phone-${driver.id}`)}
                      title="Copy phone number"
                    >
                      {copiedKey === `phone-${driver.id}` ? "✓" : "📞"}
                    </button>
                    {canManage && (
                      <>
                        <button
                          type="button"
                          className="drv-btn-icon"
                          onClick={() => setEditing(driver)}
                          title="Edit driver"
                        >
                          ✏️
                        </button>
                        <button
                          type="button"
                          className="drv-btn-icon danger"
                          onClick={() => handleDelete(driver.id, driver.name)}
                          title="Delete driver"
                        >
                          🗑️
                        </button>
                      </>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        /* ──── TABLE VIEW ──── */
        <div className="drv-table-wrapper">
          <table className="drv-table">
            <thead>
              <tr>
                <th>Driver Profile</th>
                <th>Status</th>
                <th>Assigned Taxi</th>
                <th>Base Office</th>
                <th>License No.</th>
                <th>License Expiry</th>
                <th>Compliance</th>
                <th style={{ textAlign: "right" }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredDrivers.map((driver) => {
                const sm = STATUS_META[driver.status] || STATUS_META.active;
                const comp = computeDriverCompliance(driver);
                const photoUrl = driver.photo_path ? `/storage/${driver.photo_path.replace(/^\/+/, "")}` : null;
                const avatarBg = getAvatarColor(driver.name);
                const initials = getInitials(driver.name);

                return (
                  <tr
                    key={driver.id}
                    className="drv-table-row"
                    onClick={() => openDetail(driver)}
                  >
                    <td>
                      <div className="drv-driver-cell">
                        {photoUrl ? (
                          <img
                            src={photoUrl}
                            alt={driver.name}
                            className="drv-table-avatar"
                            onError={(e) => {
                              e.target.onerror = null;
                              e.target.style.display = "none";
                              e.target.parentElement.innerHTML = `<div class="drv-table-avatar" style="background:${avatarBg}">${initials}</div>`;
                            }}
                          />
                        ) : (
                          <div className="drv-table-avatar" style={{ background: avatarBg }}>
                            {initials}
                          </div>
                        )}
                        <div>
                          <div className="drv-cell-name">{driver.name}</div>
                          <div className="drv-cell-phone">{driver.phone}</div>
                        </div>
                      </div>
                    </td>

                    <td>
                      <span
                        className="drv-status-pill"
                        style={{ background: sm.bg, color: sm.color, borderColor: sm.border }}
                      >
                        {sm.icon} {sm.label}
                      </span>
                    </td>

                    <td>
                      {driver.taxi ? (
                        <span className="drv-vehicle-pill assigned" title={driver.taxi.make_model}>
                          {driver.taxi.reg_number}
                        </span>
                      ) : (
                        <span className="drv-vehicle-pill unassigned">Unassigned</span>
                      )}
                    </td>

                    <td>{driver.office?.name || "Head Office"}</td>

                    <td style={{ fontFamily: "monospace", fontWeight: 600 }}>
                      {driver.license_number}
                    </td>

                    <td>{formatDate(driver.license_expiry)}</td>

                    <td>
                      <span className={`drv-compliance-badge ${comp.class}`}>
                        {comp.status === "ok" ? "✅" : comp.status === "expiring" ? "⏳" : "⚠️"} {comp.text}
                      </span>
                    </td>

                    <td style={{ textAlign: "right" }} onClick={(e) => e.stopPropagation()}>
                      <div style={{ display: "inline-flex", gap: "0.35rem" }}>
                        <button
                          type="button"
                          className="drv-btn-icon"
                          onClick={() => openDetail(driver)}
                          title="View profile drawer"
                        >
                          👁️
                        </button>
                        {canManage && (
                          <>
                            <button
                              type="button"
                              className="drv-btn-icon"
                              onClick={() => setEditing(driver)}
                              title="Edit driver"
                            >
                              ✏️
                            </button>
                            <button
                              type="button"
                              className="drv-btn-icon danger"
                              onClick={() => handleDelete(driver.id, driver.name)}
                              title="Delete driver"
                            >
                              🗑️
                            </button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* ──────────────────────────────────────────────
          4. SLIDE-IN DRIVER DETAIL DRAWER
      ────────────────────────────────────────────── */}
      {selectedDriver && (
        <div className="drv-panel-overlay" onClick={closeDetail} aria-hidden="true" />
      )}

      <aside
        className={`driver-detail-panel${selectedDriver ? " open" : ""}`}
        role="complementary"
        aria-label="Driver details drawer"
      >
        {activeDriver && (
          <>
            {/* Header */}
            <div className="drv-panel-header">
              <div className="drv-panel-top-bar">
                <div className="drv-panel-badge-group">
                  <span
                    className="drv-status-pill"
                    style={{
                      background: activeStatusMeta.bg,
                      color: activeStatusMeta.color,
                      borderColor: activeStatusMeta.border
                    }}
                  >
                    {activeStatusMeta.icon} {activeStatusMeta.label}
                  </span>
                  {activeCompliance && (
                    <span className={`drv-compliance-badge ${activeCompliance.class}`}>
                      {activeCompliance.status === "ok" ? "✅" : "⚠️"} {activeCompliance.text}
                    </span>
                  )}
                </div>

                <button
                  type="button"
                  className="drv-panel-close-btn"
                  onClick={closeDetail}
                  title="Close (Esc)"
                  aria-label="Close drawer"
                >
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" width="18" height="18">
                    <path d="M18 6 6 18M6 6l12 12" />
                  </svg>
                </button>
              </div>

              {/* Hero Profile Info */}
              <div className="drv-panel-hero">
                {activeDriver.photo_path ? (
                  <img
                    src={`/storage/${activeDriver.photo_path.replace(/^\/+/, "")}`}
                    alt={activeDriver.name}
                    className="drv-hero-avatar"
                    onError={(e) => {
                      e.target.onerror = null;
                      e.target.style.display = "none";
                      e.target.parentElement.innerHTML = `<div class="drv-hero-avatar" style="background:${getAvatarColor(activeDriver.name)}">${getInitials(activeDriver.name)}</div>`;
                    }}
                  />
                ) : (
                  <div
                    className="drv-hero-avatar"
                    style={{ background: getAvatarColor(activeDriver.name) }}
                  >
                    {getInitials(activeDriver.name)}
                  </div>
                )}

                <div className="drv-hero-info">
                  <h2 className="drv-hero-name" title={activeDriver.name}>
                    {activeDriver.name}
                  </h2>
                  <div className="drv-hero-sub">
                    <span>🏢 {activeDriver.office?.name || "Head Office"}</span>
                    <span>•</span>
                    <span>Joined {formatDate(activeDriver.joining_date)}</span>
                  </div>
                </div>
              </div>

              {/* Quick Action Bar */}
              <div className="drv-quick-actions">
                <a href={`tel:${activeDriver.phone}`} className="drv-quick-btn">
                  <span>📞</span> Call
                </a>
                {activeDriver.email ? (
                  <a href={`mailto:${activeDriver.email}`} className="drv-quick-btn">
                    <span>✉️</span> Email
                  </a>
                ) : (
                  <button
                    type="button"
                    className="drv-quick-btn"
                    onClick={() => handleCopy(activeDriver.phone, "phone-drawer")}
                  >
                    <span>{copiedKey === "phone-drawer" ? "✓" : "📋"}</span>
                    {copiedKey === "phone-drawer" ? "Copied" : "Copy Tel"}
                  </button>
                )}
                <button
                  type="button"
                  className="drv-quick-btn"
                  onClick={() => handleCopy(activeDriver.license_number, "lic-drawer")}
                >
                  <span>{copiedKey === "lic-drawer" ? "✓" : "🪪"}</span>
                  {copiedKey === "lic-drawer" ? "Copied" : "Copy Lic"}
                </button>
              </div>
            </div>

            {/* Scrollable Body */}
            <div className="drv-panel-body">
              {/* Assigned Vehicle */}
              <div className="drv-panel-section">
                <div className="drv-section-title">
                  <span>🚗</span> Assigned Fleet Taxi
                </div>
                <div className="drv-section-content">
                  {activeDriver.taxi ? (
                    <>
                      <div className="drv-detail-row">
                        <span className="drv-detail-label">Vehicle Plate</span>
                        <span className="drv-detail-val mono" style={{ color: "#0369a1" }}>
                          {activeDriver.taxi.reg_number}
                        </span>
                      </div>
                      <div className="drv-detail-row">
                        <span className="drv-detail-label">Make & Model</span>
                        <span className="drv-detail-val">{activeDriver.taxi.make_model}</span>
                      </div>
                      {activeDriver.taxi.vehicle_type && (
                        <div className="drv-detail-row">
                          <span className="drv-detail-label">Type</span>
                          <span className="drv-detail-val" style={{ textTransform: "capitalize" }}>
                            {activeDriver.taxi.vehicle_type.replace("_", " ")}
                          </span>
                        </div>
                      )}
                      <div className="drv-detail-row">
                        <span className="drv-detail-label">Daily / Base Rate</span>
                        <span className="drv-detail-val">
                          ₹{activeDriver.taxi.rate_amount ?? activeDriver.taxi.daily_rate ?? "—"}
                        </span>
                      </div>
                    </>
                  ) : (
                    <div style={{ color: "#64748b", fontSize: "0.8125rem", padding: "0.25rem 0" }}>
                      This driver is currently not assigned to any fleet vehicle. They can be assigned through the Taxi management tab.
                    </div>
                  )}
                </div>
              </div>

              {/* Licensing & Compliance Health */}
              <div className="drv-panel-section">
                <div className="drv-section-title">
                  <span>🛡️</span> Licensing & Compliance
                </div>
                <div className="drv-section-content">
                  <div className="drv-detail-row">
                    <span className="drv-detail-label">License Number</span>
                    <span className="drv-detail-val mono">{activeDriver.license_number}</span>
                  </div>
                  <div className="drv-detail-row">
                    <span className="drv-detail-label">License Expiry</span>
                    <span className="drv-detail-val">
                      {formatDate(activeDriver.license_expiry)}
                    </span>
                  </div>
                  {activeDriver.insurance_expiry && (
                    <div className="drv-detail-row">
                      <span className="drv-detail-label">Insurance Expiry</span>
                      <span className="drv-detail-val">
                        {formatDate(activeDriver.insurance_expiry)}
                      </span>
                    </div>
                  )}
                  {activeDriver.document_expiry && (
                    <div className="drv-detail-row">
                      <span className="drv-detail-label">Document Expiry</span>
                      <span className="drv-detail-val">
                        {formatDate(activeDriver.document_expiry)}
                      </span>
                    </div>
                  )}
                  {activeDriver.required_document_expiry && (
                    <div className="drv-detail-row">
                      <span className="drv-detail-label">Mandatory Clearance</span>
                      <span className="drv-detail-val">
                        {formatDate(activeDriver.required_document_expiry)}
                      </span>
                    </div>
                  )}

                  {/* Attached Driver Documents */}
                  {activeDriver.documents && activeDriver.documents.length > 0 && (
                    <div style={{ marginTop: "0.5rem", borderTop: "1px dashed #e2e8f0", paddingTop: "0.5rem" }}>
                      <div style={{ fontSize: "0.75rem", fontWeight: 700, color: "#64748b", textTransform: "uppercase", marginBottom: "0.4rem" }}>
                        Attached Documents ({activeDriver.documents.length})
                      </div>
                      {activeDriver.documents.map((doc) => (
                        <div key={doc.id} className="drv-detail-row" style={{ padding: "0.25rem 0" }}>
                          <span className="drv-detail-label">📄 {doc.title || doc.document_type || "Document"}</span>
                          <span className="drv-detail-val">
                            {doc.expiry_date ? `Exp: ${formatDate(doc.expiry_date)}` : "Attached"}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* Personal & Contact Details */}
              <div className="drv-panel-section">
                <div className="drv-section-title">
                  <span>👤</span> Personal & Contact
                </div>
                <div className="drv-section-content">
                  <div className="drv-detail-row">
                    <span className="drv-detail-label">Full Name</span>
                    <span className="drv-detail-val">{activeDriver.name}</span>
                  </div>
                  <div className="drv-detail-row">
                    <span className="drv-detail-label">Phone</span>
                    <span className="drv-detail-val">
                      <a href={`tel:${activeDriver.phone}`} style={{ color: "#0369a1" }}>
                        {activeDriver.phone}
                      </a>
                    </span>
                  </div>
                  {activeDriver.email && (
                    <div className="drv-detail-row">
                      <span className="drv-detail-label">Email</span>
                      <span className="drv-detail-val">
                        <a href={`mailto:${activeDriver.email}`} style={{ color: "#0369a1" }}>
                          {activeDriver.email}
                        </a>
                      </span>
                    </div>
                  )}
                  {activeDriver.gender && (
                    <div className="drv-detail-row">
                      <span className="drv-detail-label">Gender</span>
                      <span className="drv-detail-val" style={{ textTransform: "capitalize" }}>
                        {activeDriver.gender.replace("_", " ")}
                      </span>
                    </div>
                  )}
                  {activeDriver.address && (
                    <div className="drv-detail-row">
                      <span className="drv-detail-label">Address</span>
                      <span className="drv-detail-val">{activeDriver.address}</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Employment & Notes */}
              <div className="drv-panel-section">
                <div className="drv-section-title">
                  <span>📋</span> Employment & Notes
                </div>
                <div className="drv-section-content">
                  <div className="drv-detail-row">
                    <span className="drv-detail-label">Date of Joining</span>
                    <span className="drv-detail-val">{formatDate(activeDriver.joining_date)}</span>
                  </div>
                  <div className="drv-detail-row">
                    <span className="drv-detail-label">Office Location</span>
                    <span className="drv-detail-val">{activeDriver.office?.name || "Head Office"}</span>
                  </div>
                  {activeDriver.notes && (
                    <div className="drv-detail-row" style={{ flexDirection: "column", gap: "0.25rem" }}>
                      <span className="drv-detail-label">Notes & Remarks:</span>
                      <span className="drv-detail-val" style={{ textAlign: "left", whiteSpace: "pre-wrap", fontWeight: 400 }}>
                        {activeDriver.notes}
                      </span>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="drv-panel-footer">
              {canManage ? (
                <>
                  <button
                    type="button"
                    className="drv-btn-reset"
                    onClick={() => handleDelete(activeDriver.id, activeDriver.name)}
                  >
                    Delete Driver
                  </button>
                  <button
                    type="button"
                    className="drv-btn-primary"
                    onClick={() => setEditing(activeDriver)}
                  >
                    ✏️ Edit Driver
                  </button>
                </>
              ) : (
                <button
                  type="button"
                  className="drv-btn-refresh"
                  onClick={closeDetail}
                  style={{ width: "100%" }}
                >
                  Close
                </button>
              )}
            </div>
          </>
        )}
      </aside>

      {/* ──────────────────────────────────────────────
          5. MODAL FORM: CREATE / EDIT DRIVER
      ────────────────────────────────────────────── */}
      {canManage && editing && (
        <DriverForm
          initial={editing === "new" ? null : editing}
          offices={offices}
          onSubmit={handleSubmit}
          onCancel={() => setEditing(null)}
        />
      )}
    </div>
  );
}
