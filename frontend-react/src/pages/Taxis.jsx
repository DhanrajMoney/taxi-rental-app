import React, { useEffect, useState, useCallback } from "react";
import { TaxiAPI, DriverAPI, OfficeAPI } from "../api/client.js";
import TaxiForm from "../components/TaxiForm.jsx";
import useDebouncedValue from "../hooks/useDebouncedValue.js";
import { copyToClipboard, formatCurrency, formatDateTime } from "../utils/format.js";
import "../styles/taxis.css";

const VEHICLE_TYPES = ["sedan", "suv", "hatchback", "mini_bus"];

const STATUS_META = {
  available:   { color: "#16a34a", bg: "#f0fdf4", border: "#bbf7d0", label: "Available",   icon: "✅" },
  on_rent:     { color: "#2563eb", bg: "#eff6ff", border: "#bfdbfe", label: "On Rent",     icon: "🚗" },
  maintenance: { color: "#d97706", bg: "#fff7ed", border: "#fed7aa", label: "Maintenance", icon: "🛠️" },
  inactive:    { color: "#dc2626", bg: "#fef2f2", border: "#fecaca", label: "Inactive",    icon: "✗" },
};

const VEHICLE_ICONS = {
  sedan: "🚗",
  suv: "🚙",
  hatchback: "🚘",
  mini_bus: "🚐",
};

function DetailRow({ label, value, mono, isLink, href }) {
  if (value === null || value === undefined || value === "") return null;
  return (
    <div className="tx-detail-row">
      <span className="tx-detail-label">{label}</span>
      <span className={`tx-detail-val${mono ? " mono" : ""}`}>
        {isLink && href ? (
          <a href={href} className="tx-link-val" target="_blank" rel="noopener noreferrer">
            {value}
          </a>
        ) : (
          value
        )}
      </span>
    </div>
  );
}

function DetailSection({ title, icon, children, className = "", scrollable = false }) {
  return (
    <div className={`tx-detail-section ${scrollable ? "scrollable" : ""} ${className}`.trim()}>
      <div className="tx-section-header">
        <div className="tx-section-title-wrap">
          {icon && <span className="tx-section-icon">{icon}</span>}
          <span className="tx-section-title">{title}</span>
        </div>
      </div>
      <div className="tx-section-body">{children}</div>
    </div>
  );
}

export default function Taxis({ canManage = false }) {
  /* ── State ── */
  const [taxis, setTaxis]                   = useState([]);
  const [drivers, setDrivers]               = useState([]);
  const [offices, setOffices]               = useState([]);
  const [search, setSearch]                 = useState("");
  const debouncedSearch                     = useDebouncedValue(search);
  const [status, setStatus]                 = useState("");
  const [vehicleType, setVehicleType]       = useState("");
  const [viewMode, setViewMode]             = useState("grid"); // "grid" | "table"
  const [editing, setEditing]               = useState(null); // taxi object, "new", or null
  const [selectedTaxi, setSelectedTaxi]     = useState(null);
  const [detailData, setDetailData]         = useState(null);
  const [copied, setCopied]                 = useState(false);
  const [error, setError]                   = useState("");
  const [loading, setLoading]               = useState(false);

  /* ── Load taxis & options ── */
  const loadTaxis = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const taxiRes = await TaxiAPI.list({
        search: debouncedSearch,
        status: status || undefined,
        type: vehicleType || undefined,
      });
      setTaxis(taxiRes.data || taxiRes);
    } catch {
      setError("Couldn't reach the API. Is the Laravel backend running?");
    } finally {
      setLoading(false);
    }
  }, [debouncedSearch, status, vehicleType]);

  useEffect(() => {
    loadTaxis();
  }, [loadTaxis]);

  /* ── Load auxiliary options (drivers & offices) for management ── */
  useEffect(() => {
    if (!canManage) return;
    Promise.all([
      DriverAPI.list({ per_page: 100 }),
      OfficeAPI.list({ per_page: 100 }),
    ]).then(([driverRes, officeRes]) => {
      setDrivers(driverRes?.data || driverRes || []);
      setOffices(officeRes?.data || officeRes || []);
    }).catch(() => {
      // Non-critical, fallback to empty arrays
    });
  }, [canManage]);

  /* ── Open taxi details in slide-in drawer ── */
  function openDetail(taxi) {
    setSelectedTaxi(taxi);
    setDetailData(taxi); // Instant display

    // Fetch full relation details (including documents) in background
    TaxiAPI.get(taxi.id).then((res) => {
      const full = res?.data || res;
      if (full && full.id === taxi.id) {
        setDetailData(full);
      }
    }).catch(() => {
      // Kept fallback
    });
  }

  function closeDetail() {
    setSelectedTaxi(null);
    setDetailData(null);
  }

  /* ── Copy Reg Number ── */
  function handleCopyReg() {
    const current = detailData || selectedTaxi;
    if (!current?.reg_number) return;
    copyToClipboard(current.reg_number);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  /* ── Form Submit (Create / Edit) ── */
  async function handleSubmit(form) {
    try {
      if (editing && editing.id) {
        await TaxiAPI.update(editing.id, form);
      } else {
        await TaxiAPI.create(form);
      }
      setEditing(null);
      loadTaxis();

      // Refresh sidepanel if the edited taxi is currently open
      if (selectedTaxi && editing && editing.id === selectedTaxi.id) {
        TaxiAPI.get(selectedTaxi.id).then((res) => {
          const fresh = res?.data || res;
          if (fresh) {
            setSelectedTaxi(fresh);
            setDetailData(fresh);
          }
        });
      }
    } catch (err) {
      setError(err?.response?.data?.message || "Save failed. Check required fields.");
    }
  }

  /* ── Delete Taxi ── */
  async function handleDelete(id) {
    const taxi = taxis.find((item) => item.id === id);
    const taxiLabel = taxi?.reg_number || "this vehicle";
    const confirmed = window.confirm(
      `Permanently delete ${taxiLabel}? This cannot be undone. Its maintenance history, bills, and documents will also be purged.`,
    );
    if (!confirmed) return;

    try {
      await TaxiAPI.remove(id);
      if (selectedTaxi?.id === id) closeDetail();
      loadTaxis();
    } catch (err) {
      setError(err?.response?.data?.message || "Could not delete this taxi.");
    }
  }

  /* ── Summary Counters ── */
  const availableCount   = taxis.filter((t) => t.status === "available").length;
  const onRentCount      = taxis.filter((t) => t.status === "on_rent").length;
  const maintenanceCount = taxis.filter((t) => t.status === "maintenance").length;
  const inactiveCount    = taxis.filter((t) => t.status === "inactive").length;

  const panelTaxi   = detailData || selectedTaxi;
  const statusInfo  = panelTaxi ? (STATUS_META[panelTaxi.status?.toLowerCase()] || STATUS_META.available) : {};
  const vehicleIcon = panelTaxi ? (VEHICLE_ICONS[panelTaxi.vehicle_type?.toLowerCase()] || "🚕") : "🚕";

  return (
    <div className="taxis-workspace">
      {/* ══════════════════════════════════════
          1. TOOLBAR
      ══════════════════════════════════════ */}
      <div className="tx-toolbar">
        <div className="tx-search-wrap">
          <svg className="tx-search-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="11" cy="11" r="8" />
            <path d="m21 21-4.35-4.35" />
          </svg>
          <input
            className="tx-search-input"
            placeholder="Search reg. number, make or model…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          {search && (
            <button className="tx-search-clear" onClick={() => setSearch("")} title="Clear search">×</button>
          )}
        </div>

        {/* Status Filter */}
        <select
          className="tx-filter-select"
          value={status}
          onChange={(e) => setStatus(e.target.value)}
        >
          <option value="">All Statuses</option>
          <option value="available">Available</option>
          <option value="on_rent">On Rent</option>
          <option value="maintenance">Maintenance</option>
          <option value="inactive">Inactive</option>
        </select>

        {/* Vehicle Type Filter */}
        <select
          className="tx-filter-select"
          value={vehicleType}
          onChange={(e) => setVehicleType(e.target.value)}
        >
          <option value="">All Vehicle Types</option>
          {VEHICLE_TYPES.map((type) => (
            <option key={type} value={type}>
              {type === "mini_bus" ? "Mini Bus" : type.charAt(0).toUpperCase() + type.slice(1)}
            </option>
          ))}
        </select>

        {/* View Toggle (Grid vs Table) */}
        <div className="tx-view-toggle">
          <button
            type="button"
            className={`tx-view-btn${viewMode === "grid" ? " active" : ""}`}
            onClick={() => setViewMode("grid")}
            title="Card Grid View"
            aria-label="Grid view"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="16" height="16">
              <rect x="3" y="3" width="7" height="7" rx="1" />
              <rect x="14" y="3" width="7" height="7" rx="1" />
              <rect x="14" y="14" width="7" height="7" rx="1" />
              <rect x="3" y="14" width="7" height="7" rx="1" />
            </svg>
          </button>
          <button
            type="button"
            className={`tx-view-btn${viewMode === "table" ? " active" : ""}`}
            onClick={() => setViewMode("table")}
            title="Table View"
            aria-label="Table view"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="16" height="16">
              <line x1="3" y1="6" x2="21" y2="6" />
              <line x1="3" y1="12" x2="21" y2="12" />
              <line x1="3" y1="18" x2="21" y2="18" />
            </svg>
          </button>
        </div>

        {canManage && (
          <button className="tx-btn-new" onClick={() => setEditing("new")}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" width="16" height="16">
              <path d="M12 5v14M5 12h14" />
            </svg>
            Add Taxi
          </button>
        )}

        <button
          className="tx-btn-refresh"
          onClick={loadTaxis}
          disabled={loading}
          title="Refresh fleet list"
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="16" height="16">
            <path d="M23 4v6h-6" />
            <path d="M1 20v-6h6" />
            <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15" />
          </svg>
        </button>
      </div>

      {/* ══════════════════════════════════════
          2. METRIC SUMMARY STRIP
      ══════════════════════════════════════ */}
      <div className="tx-summary-strip" aria-label="Fleet metric summary">
        <div className="tx-summary-card">
          <span className="tx-summary-number">{taxis.length}</span>
          <span className="tx-summary-label">Total Fleet</span>
        </div>
        <div className="tx-summary-card tx-summary-good">
          <span className="tx-summary-number">{availableCount}</span>
          <span className="tx-summary-label">Available (Ready)</span>
        </div>
        <div className="tx-summary-card tx-summary-info">
          <span className="tx-summary-number">{onRentCount}</span>
          <span className="tx-summary-label">On Rent (Active)</span>
        </div>
        <div className="tx-summary-card tx-summary-alert">
          <span className="tx-summary-number">{maintenanceCount}</span>
          <span className="tx-summary-label">In Workshop</span>
        </div>
        <div className="tx-summary-card tx-summary-danger">
          <span className="tx-summary-number">{inactiveCount}</span>
          <span className="tx-summary-label">Inactive</span>
        </div>
      </div>

      {/* Errors */}
      {error && <p className="tx-error">{error}</p>}

      {/* ══════════════════════════════════════
          3. FLEET CONTENT AREA
      ══════════════════════════════════════ */}
      <div className="tx-content-area">
        {/* Loading Skeletons */}
        {loading && (
          <div className="tx-loading-wrap">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <div key={i} className="tx-skel-card">
                <div className="tx-skel tx-skel-title" />
                <div className="tx-skel tx-skel-line" />
                <div className="tx-skel tx-skel-footer" />
              </div>
            ))}
          </div>
        )}

        {/* Empty State */}
        {!loading && taxis.length === 0 && (
          <div className="tx-empty">
            <svg viewBox="0 0 64 64" fill="none" width="56" height="56">
              <rect x="8" y="14" width="48" height="36" rx="8" fill="#e8f0f3" />
              <path d="M18 36h28M24 24h16" stroke="#9db8c4" strokeWidth="3" strokeLinecap="round" />
            </svg>
            <p>No taxis found matching your filters.</p>
            {canManage && (
              <button className="tx-btn-new" onClick={() => setEditing("new")}>
                Add the first vehicle
              </button>
            )}
          </div>
        )}

        {/* ── CARD GRID VIEW ── */}
        {!loading && taxis.length > 0 && viewMode === "grid" && (
          <div className="tx-cards-grid">
            {taxis.map((taxi) => {
              const sm = STATUS_META[taxi.status?.toLowerCase()] || STATUS_META.available;
              const vIcon = VEHICLE_ICONS[taxi.vehicle_type?.toLowerCase()] || "🚕";
              const isSelected = selectedTaxi?.id === taxi.id;
              const rateDisplay = taxi.rate_amount ?? taxi.daily_rate;
              const pricingUnit = taxi.pricing_type === "per_km" ? "km" : "day";

              return (
                <div
                  key={taxi.id}
                  className={`tx-card${isSelected ? " tx-card-selected" : ""}`}
                  onClick={() => openDetail(taxi)}
                  tabIndex={0}
                  onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && openDetail(taxi)}
                  role="button"
                  aria-pressed={isSelected}
                  aria-label={`Taxi ${taxi.reg_number}`}
                >
                  <div className="tx-card-top-accent" style={{ background: sm.color }} />

                  {/* Header: Identity & Status Badge */}
                  <div className="tx-card-header">
                    <div className="tx-card-identity">
                      <div className="tx-card-icon-badge" style={{ background: sm.bg, color: sm.color }}>
                        {vIcon}
                      </div>
                      <div className="tx-card-title-group">
                        <span className="tx-card-reg">{taxi.reg_number}</span>
                        <span className="tx-card-type-subtext">
                          {taxi.vehicle_type ? taxi.vehicle_type.replace("_", " ") : "Vehicle"}
                        </span>
                      </div>
                    </div>

                    <span
                      className="tx-badge"
                      style={{ background: sm.bg, color: sm.color, borderColor: sm.border }}
                    >
                      {sm.icon} {sm.label}
                    </span>
                  </div>

                  {/* Model & Year */}
                  <div className="tx-card-model-row">
                    <span className="tx-card-model" title={taxi.make_model}>
                      {taxi.make_model || "Standard Model"}
                    </span>
                    {taxi.year_of_manufacture && (
                      <span className="tx-card-year">{taxi.year_of_manufacture}</span>
                    )}
                  </div>

                  {/* Specs Chips */}
                  <div className="tx-card-chips">
                    {taxi.ownership && (
                      <span className="tx-chip">🏷️ {taxi.ownership}</span>
                    )}
                    {taxi.seating_capacity && (
                      <span className="tx-chip">👥 {taxi.seating_capacity} seats</span>
                    )}
                    {taxi.fuel_type && (
                      <span className="tx-chip">⛽ {taxi.fuel_type.toUpperCase()}</span>
                    )}
                    {taxi.odometer_reading != null && (
                      <span className="tx-chip">⏱️ {Number(taxi.odometer_reading).toLocaleString()} km</span>
                    )}
                  </div>

                  {/* Card Footer: Rates & Driver */}
                  <div className="tx-card-footer">
                    <div className="tx-card-rate">
                      {formatCurrency(rateDisplay)} <small>/{pricingUnit}</small>
                    </div>

                    <div className="tx-card-driver" title={taxi.driver?.name ? `Driver: ${taxi.driver.name}` : "Unassigned"}>
                      👤 {taxi.driver?.name || "Unassigned"}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* ── DATA TABLE VIEW ── */}
        {!loading && taxis.length > 0 && viewMode === "table" && (
          <div className="tx-table-wrap">
            <table className="tx-table">
              <thead>
                <tr>
                  <th>Vehicle Reg.</th>
                  <th>Type</th>
                  <th>Make &amp; Model</th>
                  <th>Specs</th>
                  <th>Rate</th>
                  <th>Status</th>
                  <th>Assigned Driver</th>
                  <th>Branch</th>
                </tr>
              </thead>
              <tbody>
                {taxis.map((taxi) => {
                  const sm = STATUS_META[taxi.status?.toLowerCase()] || STATUS_META.available;
                  const isSelected = selectedTaxi?.id === taxi.id;
                  const rateDisplay = taxi.rate_amount ?? taxi.daily_rate;
                  const pricingUnit = taxi.pricing_type === "per_km" ? "km" : "day";

                  return (
                    <tr
                      key={taxi.id}
                      className={`tx-table-row${isSelected ? " selected" : ""}`}
                      onClick={() => openDetail(taxi)}
                    >
                      <td className="tx-table-reg">{taxi.reg_number}</td>
                      <td>{taxi.vehicle_type ? taxi.vehicle_type.replace("_", " ").toUpperCase() : "—"}</td>
                      <td>
                        <strong>{taxi.make_model || "—"}</strong>
                        {taxi.year_of_manufacture ? ` (${taxi.year_of_manufacture})` : ""}
                        {taxi.ownership && (
                          <div style={{ fontSize: "0.72rem", color: "#64748b" }}>🏷️ {taxi.ownership}</div>
                        )}
                      </td>
                      <td>
                        <small style={{ color: "#64748b" }}>
                          {taxi.seating_capacity ? `${taxi.seating_capacity}s` : ""}
                          {taxi.fuel_type ? ` • ${taxi.fuel_type.toUpperCase()}` : ""}
                        </small>
                      </td>
                      <td>
                        <strong>{formatCurrency(rateDisplay)}</strong>/{pricingUnit}
                      </td>
                      <td>
                        <span
                          className="tx-badge"
                          style={{ background: sm.bg, color: sm.color, borderColor: sm.border }}
                        >
                          {sm.icon} {sm.label}
                        </span>
                      </td>
                      <td>{taxi.driver?.name || "—"}</td>
                      <td>{taxi.office?.name || "Primary"}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ══════════════════════════════════════
          4. DETAIL SIDE PANEL DRAWER
      ══════════════════════════════════════ */}
      {selectedTaxi && (
        <div className="tx-panel-overlay" onClick={closeDetail} aria-hidden="true" />
      )}

      <aside
        className={`taxi-detail-panel${selectedTaxi ? " open" : ""}`}
        role="complementary"
        aria-label="Taxi detail drawer"
      >
        {panelTaxi && (
          <>
            {/* Header */}
            <div
              className="tx-panel-header"
              style={{ borderBottomColor: statusInfo.color + "40", background: statusInfo.bg }}
            >
              <div className="tx-panel-header-top">
                <span className="tx-panel-status-dot" style={{ background: statusInfo.color }} />
                <span className="tx-panel-status-label" style={{ color: statusInfo.color }}>
                  {statusInfo.icon} {statusInfo.label}
                </span>
                <button className="tx-panel-close" onClick={closeDetail} title="Close drawer" aria-label="Close">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" width="18" height="18">
                    <path d="M18 6 6 18M6 6l12 12" />
                  </svg>
                </button>
              </div>

              {/* Registration Number Hero */}
              <div className="taxi-id-hero">
                <span className="tx-reg-text">{panelTaxi.reg_number}</span>
                <button
                  className={`tx-copy-btn${copied ? " copied" : ""}`}
                  onClick={handleCopyReg}
                  title="Copy vehicle registration"
                >
                  {copied ? (
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" width="14" height="14">
                      <path d="M20 6 9 17l-5-5" />
                    </svg>
                  ) : (
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="14" height="14">
                      <rect x="9" y="9" width="13" height="13" rx="2" />
                      <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
                    </svg>
                  )}
                  {copied ? "Copied!" : "Copy"}
                </button>
              </div>
            </div>

            {/* Scrollable Body */}
            <div className="tx-panel-body">
              {/* Hero Specs Banner */}
              <div className="tx-hero-banner">
                <div>
                  <div className="tx-hero-vehicle-name">
                    {vehicleIcon} {panelTaxi.make_model || "Fleet Vehicle"}
                  </div>
                  <div className="tx-hero-vehicle-class">
                    {panelTaxi.vehicle_type ? panelTaxi.vehicle_type.replace("_", " ") : "Vehicle"}
                    {panelTaxi.year_of_manufacture ? ` • ${panelTaxi.year_of_manufacture}` : ""}
                  </div>
                </div>

                <div className="tx-hero-rate-tag">
                  <div className="tx-hero-rate-val">
                    {formatCurrency(panelTaxi.rate_amount ?? panelTaxi.daily_rate)}
                  </div>
                  <div className="tx-hero-rate-sub">
                    per {panelTaxi.pricing_type === "per_km" ? "kilometer" : "day"}
                  </div>
                </div>
              </div>

              {/* Vehicle Photographs Gallery */}
              {(panelTaxi.photo_front_url || panelTaxi.photo_front_path || panelTaxi.photo_back_url || panelTaxi.photo_back_path) && (
                <DetailSection title="Vehicle Photographs" icon="📷">
                  <div className="tx-drawer-photos-grid">
                    {(panelTaxi.photo_front_url || panelTaxi.photo_front_path) && (
                      <div
                        className="tx-drawer-photo-card"
                        onClick={() => window.open(panelTaxi.photo_front_url || `/storage/${String(panelTaxi.photo_front_path).replace(/^\/+/, "")}`, "_blank")}
                        title="Click to view full front photo"
                      >
                        <img
                          src={panelTaxi.photo_front_url || `/storage/${String(panelTaxi.photo_front_path).replace(/^\/+/, "")}`}
                          alt="Front view"
                          className="tx-drawer-photo-img"
                        />
                        <span className="tx-drawer-photo-label">Front View</span>
                      </div>
                    )}
                    {(panelTaxi.photo_back_url || panelTaxi.photo_back_path) && (
                      <div
                        className="tx-drawer-photo-card"
                        onClick={() => window.open(panelTaxi.photo_back_url || `/storage/${String(panelTaxi.photo_back_path).replace(/^\/+/, "")}`, "_blank")}
                        title="Click to view full back photo"
                      >
                        <img
                          src={panelTaxi.photo_back_url || `/storage/${String(panelTaxi.photo_back_path).replace(/^\/+/, "")}`}
                          alt="Back view"
                          className="tx-drawer-photo-img"
                        />
                        <span className="tx-drawer-photo-label">Rear / Back View</span>
                      </div>
                    )}
                  </div>
                </DetailSection>
              )}

              {/* Technical Specifications */}
              <DetailSection title="Vehicle Specifications" icon="⚙️">
                <DetailRow label="Make & Model" value={panelTaxi.make_model} />
                <DetailRow label="Vehicle Type" value={panelTaxi.vehicle_type ? panelTaxi.vehicle_type.replace("_", " ").toUpperCase() : "—"} />
                <DetailRow label="Year Model" value={panelTaxi.year_of_manufacture} />
                <DetailRow label="Ownership" value={panelTaxi.ownership} />
                <DetailRow label="Capacity" value={panelTaxi.seating_capacity ? `${panelTaxi.seating_capacity} Passengers` : null} />
                <DetailRow label="Fuel Type" value={panelTaxi.fuel_type ? panelTaxi.fuel_type.toUpperCase() : null} />
                <DetailRow
                  label="Odometer"
                  value={panelTaxi.odometer_reading != null ? `${Number(panelTaxi.odometer_reading).toLocaleString()} km` : null}
                  mono
                />
              </DetailSection>

              {/* Assigned Driver */}
              <DetailSection title="Assigned Driver" icon="👨‍✈️">
                <DetailRow label="Driver Name" value={panelTaxi.driver?.name || "No Driver Assigned"} />
                <DetailRow
                  label="Contact Phone"
                  value={panelTaxi.driver?.phone || (panelTaxi.driver ? "No phone registered" : null)}
                  isLink={Boolean(panelTaxi.driver?.phone)}
                  href={`tel:${panelTaxi.driver?.phone}`}
                />
                <DetailRow label="Driver License" value={panelTaxi.driver?.license_number} mono />
              </DetailSection>

              {/* Rates & Pricing Policy */}
              <DetailSection title="Rates & Billing Policy" icon="💳">
                <DetailRow
                  label="Pricing Model"
                  value={panelTaxi.pricing_type === "per_km" ? "Distance-based (Per Kilometer)" : "Time-based (Daily Rental)"}
                />
                <DetailRow
                  label="Base Rate"
                  value={`${formatCurrency(panelTaxi.rate_amount ?? panelTaxi.daily_rate)} / ${panelTaxi.pricing_type === "per_km" ? "km" : "day"}`}
                />
              </DetailSection>

              {/* Branch / Office Assignment */}
              <DetailSection title="Branch Location" icon="🏢">
                <DetailRow label="Office" value={panelTaxi.office?.name || "Primary / Head Office"} />
                <DetailRow label="Address" value={panelTaxi.office?.address || panelTaxi.office?.city} />
              </DetailSection>

              {/* Vehicle Documents & Compliance */}
              {panelTaxi.documents && panelTaxi.documents.length > 0 && (
                <DetailSection title="Compliance Documents" icon="📁">
                  {panelTaxi.documents.map((doc) => (
                    <DetailRow
                      key={doc.id}
                      label={doc.title || doc.document_type || "Document"}
                      value={doc.expiry_date ? `Exp: ${doc.expiry_date}` : "Attached"}
                    />
                  ))}
                </DetailSection>
              )}

              {/* Notes & Remarks */}
              {panelTaxi.notes && (
                <DetailSection title="Vehicle Remarks & Notes" icon="📝">
                  <p className="tx-notes-box">{panelTaxi.notes}</p>
                </DetailSection>
              )}

              {/* System Audit Timestamps */}
              <DetailSection title="Audit Records" icon="🕐">
                <DetailRow label="Registered" value={formatDateTime(panelTaxi.created_at)} />
                <DetailRow label="Last Updated" value={formatDateTime(panelTaxi.updated_at)} />
              </DetailSection>
            </div>

            {/* Drawer Action Footer */}
            {canManage && (
              <div className="tx-panel-footer">
                <button
                  className="tx-panel-btn-edit"
                  onClick={() => setEditing(panelTaxi)}
                >
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="15" height="15">
                    <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                    <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                  </svg>
                  Edit Taxi
                </button>
                <button
                  className="tx-panel-btn-delete"
                  onClick={() => handleDelete(panelTaxi.id)}
                >
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="15" height="15">
                    <polyline points="3 6 5 6 21 6" />
                    <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                  </svg>
                  Delete Taxi
                </button>
              </div>
            )}
          </>
        )}
      </aside>

      {/* ══════════════════════════════════════
          5. ADD / EDIT MODAL FORM
      ══════════════════════════════════════ */}
      {canManage && editing && (
        <TaxiForm
          initial={editing === "new" ? null : editing}
          drivers={drivers}
          offices={offices}
          onSubmit={handleSubmit}
          onCancel={() => setEditing(null)}
        />
      )}
    </div>
  );
}
