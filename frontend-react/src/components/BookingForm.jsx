import React, { useEffect, useState } from "react";
import { formatCurrency } from "../utils/format.js";
import "../styles/booking-form.css";

const EMPTY = {
  customer_name: "",
  customer_phone: "",
  pickup_date: new Date().toISOString().slice(0, 10),
  return_date: new Date().toISOString().slice(0, 10),
  pickup_location: "",
  drop_location: "",
  taxi_id: "",
  driver_id: "",
  office_id: "",
  planned_distance_km: "",
  status: "pending",
  notes: "",
  odometer_end: "",
};

function addDaysToDate(dateStr, days) {
  if (!dateStr) return dateStr;
  try {
    const d = new Date(dateStr);
    d.setDate(d.getDate() + days);
    return d.toISOString().slice(0, 10);
  } catch {
    return dateStr;
  }
}

export default function BookingForm({
  initial,
  taxis = [],
  drivers = [],
  offices = [],
  onSubmit,
  onCancel,
}) {
  const isEdit = Boolean(initial && initial.id);

  const [form, setForm] = useState(
    initial
      ? {
          ...EMPTY,
          ...initial,
          pickup_date: initial.pickup_date ? String(initial.pickup_date).slice(0, 10) : EMPTY.pickup_date,
          return_date: initial.return_date ? String(initial.return_date).slice(0, 10) : EMPTY.return_date,
          taxi_id: initial.taxi_id || initial.taxi?.id || "",
          driver_id: initial.driver_id || initial.driver?.id || "",
          office_id: initial.office_id || initial.office?.id || "",
          planned_distance_km: initial.planned_distance_km ?? "",
          odometer_end: initial.odometer_end ?? "",
        }
      : EMPTY
  );

  const [submitting, setSubmitting] = useState(false);
  const [validationError, setValidationError] = useState("");

  // Dismiss on Escape key
  useEffect(() => {
    function handleKeyDown(e) {
      if (e.key === "Escape" && !submitting) {
        onCancel();
      }
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onCancel, submitting]);

  function update(field, value) {
    setForm((current) => {
      const next = { ...current, [field]: value };
      // If pickup date is moved ahead of return date, auto-bump return date
      if (field === "pickup_date" && next.return_date < value) {
        next.return_date = value;
      }
      return next;
    });
    if (validationError) setValidationError("");
  }

  // Taxi & pricing resolution
  const selectedTaxi = taxis.find((t) => String(t.id) === String(form.taxi_id)) || initial?.taxi;
  const sameTaxi = initial && String(initial.taxi_id || initial.taxi?.id || "") === String(form.taxi_id);
  const pricingType = sameTaxi ? (initial.pricing_type || selectedTaxi?.pricing_type) : selectedTaxi?.pricing_type;
  const rateAmount =
    sameTaxi && initial.rate_amount != null && Number(initial.rate_amount) > 0
      ? Number(initial.rate_amount)
      : Number(selectedTaxi?.rate_amount) > 0
      ? Number(selectedTaxi.rate_amount)
      : Number(selectedTaxi?.daily_rate || 0);

  // Selected driver
  const selectedDriver = drivers.find((d) => String(d.id) === String(form.driver_id)) || initial?.driver;

  // Trip duration in days
  const tripDays = Math.max(
    1,
    Math.floor((Date.parse(`${form.return_date}T00:00:00Z`) - Date.parse(`${form.pickup_date}T00:00:00Z`)) / 86400000) + 1
  );

  // Live estimated fare
  const estimatedFare =
    pricingType === "per_km"
      ? Number(rateAmount || 0) * Number(form.planned_distance_km || 0)
      : pricingType === "daily"
      ? Number(rateAmount || 0) * tripDays
      : null;

  async function submit(event) {
    event.preventDefault();
    setValidationError("");

    if (!form.customer_name.trim()) {
      setValidationError("Customer name is required.");
      return;
    }
    if (!form.customer_phone.trim()) {
      setValidationError("Customer phone number is required.");
      return;
    }
    if (form.return_date < form.pickup_date) {
      setValidationError("Return date cannot be earlier than pickup date.");
      return;
    }
    if (form.status === "active" && !form.taxi_id) {
      setValidationError("An active booking requires an assigned taxi.");
      return;
    }
    if (pricingType === "per_km" && (!form.planned_distance_km || Number(form.planned_distance_km) <= 0)) {
      setValidationError("Planned distance in kilometers is required for per-km pricing.");
      return;
    }
    if (form.status === "completed" && initial?.status === "active") {
      if (form.odometer_end !== "" && Number(form.odometer_end) < (initial.odometer_start ?? 0)) {
        setValidationError(`Ending odometer must be greater than or equal to starting odometer (${initial.odometer_start ?? 0} km).`);
        return;
      }
    }

    setSubmitting(true);
    try {
      await onSubmit({
        ...form,
        customer_name: form.customer_name.trim(),
        customer_phone: form.customer_phone.trim(),
        pickup_location: form.pickup_location.trim(),
        drop_location: form.drop_location ? form.drop_location.trim() : "",
        planned_distance_km: pricingType === "per_km" ? Number(form.planned_distance_km) : null,
        taxi_id: form.taxi_id ? Number(form.taxi_id) : null,
        driver_id: form.driver_id ? Number(form.driver_id) : null,
        office_id: form.office_id ? Number(form.office_id) : null,
        odometer_end: form.odometer_end !== "" ? Number(form.odometer_end) : null,
      });
    } catch (err) {
      setValidationError(err?.response?.data?.message || err?.message || "Could not save booking.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div
      className="bk-modal-overlay"
      onClick={() => {
        if (!submitting) onCancel();
      }}
      role="dialog"
      aria-modal="true"
      aria-labelledby="bk-modal-title"
    >
      <div className="bk-modal-card" onClick={(e) => e.stopPropagation()}>
        {/* ── Modal Header ── */}
        <div className="bk-modal-header">
          <div className="bk-modal-title-group">
            <h3 id="bk-modal-title" className="bk-modal-title">
              <span>{isEdit ? "✏️" : "➕"}</span>
              {isEdit ? `Edit Booking #BK-${String(initial.id).padStart(5, "0")}` : "Create New Reservation"}
            </h3>
            <p className="bk-modal-subtitle">
              {isEdit
                ? "Update customer itinerary, vehicle dispatch, or trip billing parameters."
                : "Schedule customer pickup, select itinerary dates, and assign fleet resources."}
            </p>
          </div>
          <button
            type="button"
            className="bk-modal-close-btn"
            onClick={onCancel}
            disabled={submitting}
            title="Close (Esc)"
            aria-label="Close form"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" width="16" height="16">
              <path d="M18 6 6 18M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* ── Error Banner ── */}
        {validationError && (
          <div className="bk-modal-error">
            <span>⚠️</span>
            <span>{validationError}</span>
          </div>
        )}

        <form onSubmit={submit} style={{ display: "contents" }}>
          {/* ── Modal Body ── */}
          <div className="bk-modal-body">
            {/* ─── SECTION 1: Customer Details ─── */}
            <div className="bk-form-section">
              <div className="bk-section-legend">
                <span className="bk-section-legend-title">
                  <span>👤</span> Customer Information
                </span>
                <small style={{ color: "#94a3b8", fontWeight: 600 }}>Primary Contact</small>
              </div>

              <div className="bk-form-grid-2">
                <div className="bk-field-group">
                  <label className="bk-field-label">
                    Customer Full Name <span className="bk-req">*</span>
                  </label>
                  <div className="bk-input-wrap">
                    <span className="bk-input-icon">👤</span>
                    <input
                      className="bk-input has-icon"
                      required
                      value={form.customer_name}
                      onChange={(e) => update("customer_name", e.target.value)}
                      placeholder="e.g. Rajesh Kumar"
                    />
                  </div>
                </div>

                <div className="bk-field-group">
                  <label className="bk-field-label">
                    Contact Phone Number <span className="bk-req">*</span>
                  </label>
                  <div className="bk-input-wrap">
                    <span className="bk-input-icon">📞</span>
                    <input
                      className="bk-input has-icon"
                      required
                      value={form.customer_phone}
                      onChange={(e) => update("customer_phone", e.target.value)}
                      placeholder="e.g. +91 98765 43210"
                    />
                  </div>
                </div>

                <div className="bk-field-group full-width">
                  <label className="bk-field-label">
                    Dispatching Branch Office <span style={{ color: "#94a3b8", fontWeight: 500 }}>(Optional)</span>
                  </label>
                  <div className="bk-input-wrap">
                    <span className="bk-input-icon">🏢</span>
                    <select
                      className="bk-select has-icon"
                      value={form.office_id || ""}
                      onChange={(e) => update("office_id", e.target.value)}
                    >
                      <option value="">Primary / Head Office Branch</option>
                      {offices.map((off) => (
                        <option key={off.id} value={off.id}>
                          {off.name} {off.city ? `(${off.city})` : ""}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>
            </div>

            {/* ─── SECTION 2: Route & Schedule ─── */}
            <div className="bk-form-section">
              <div className="bk-section-legend">
                <span className="bk-section-legend-title">
                  <span>🗺️</span> Journey Route & Schedule
                </span>
                <span className="bk-journey-badge">
                  ⏳ {tripDays} Billable Day{tripDays > 1 ? "s" : ""}
                </span>
              </div>

              {/* Visual Journey Strip */}
              <div className="bk-journey-preview-strip">
                <div className="bk-journey-node">
                  <span>🟢</span>
                  <span className="loc" title={form.pickup_location || "Pickup point"}>
                    {form.pickup_location || "Enter pickup"}
                  </span>
                </div>
                <div className="bk-journey-path">
                  <div className="bk-journey-line" />
                  <span className="bk-journey-badge">
                    {tripDays} Day{tripDays > 1 ? "s" : ""}
                    {pricingType === "per_km" && form.planned_distance_km ? ` • ${form.planned_distance_km} km` : ""}
                  </span>
                  <div className="bk-journey-line" />
                </div>
                <div className="bk-journey-node">
                  <span>🏁</span>
                  <span className="loc" title={form.drop_location || "Drop point"}>
                    {form.drop_location || "Enter drop"}
                  </span>
                </div>
              </div>

              <div className="bk-form-grid-2">
                <div className="bk-field-group">
                  <label className="bk-field-label">
                    Pickup Location / Address <span className="bk-req">*</span>
                  </label>
                  <div className="bk-input-wrap">
                    <span className="bk-input-icon">📍</span>
                    <input
                      className="bk-input has-icon"
                      required
                      value={form.pickup_location}
                      onChange={(e) => update("pickup_location", e.target.value)}
                      placeholder="e.g. Airport Terminal 2, Mumbai"
                    />
                  </div>
                </div>

                <div className="bk-field-group">
                  <label className="bk-field-label">
                    Drop-off Destination <span className="bk-req">*</span>
                  </label>
                  <div className="bk-input-wrap">
                    <span className="bk-input-icon">🏁</span>
                    <input
                      className="bk-input has-icon"
                      required
                      value={form.drop_location || ""}
                      onChange={(e) => update("drop_location", e.target.value)}
                      placeholder="e.g. Taj Lands End, Bandra"
                    />
                  </div>
                </div>

                <div className="bk-field-group">
                  <label className="bk-field-label">
                    Pickup Date <span className="bk-req">*</span>
                  </label>
                  <input
                    type="date"
                    className="bk-input"
                    required
                    value={form.pickup_date}
                    onChange={(e) => update("pickup_date", e.target.value)}
                  />
                </div>

                <div className="bk-field-group">
                  <label className="bk-field-label">
                    Return / Drop Date <span className="bk-req">*</span>
                  </label>
                  <input
                    type="date"
                    className="bk-input"
                    required
                    min={form.pickup_date}
                    value={form.return_date}
                    onChange={(e) => update("return_date", e.target.value)}
                  />
                  {/* Quick preset chips */}
                  <div className="bk-date-presets">
                    <span className="bk-date-preset-label">Quick:</span>
                    <button
                      type="button"
                      className="bk-date-chip"
                      onClick={() => update("return_date", form.pickup_date)}
                    >
                      Same day
                    </button>
                    <button
                      type="button"
                      className="bk-date-chip"
                      onClick={() => update("return_date", addDaysToDate(form.pickup_date, 1))}
                    >
                      +1 day
                    </button>
                    <button
                      type="button"
                      className="bk-date-chip"
                      onClick={() => update("return_date", addDaysToDate(form.pickup_date, 3))}
                    >
                      +3 days
                    </button>
                    <button
                      type="button"
                      className="bk-date-chip"
                      onClick={() => update("return_date", addDaysToDate(form.pickup_date, 7))}
                    >
                      +1 week
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* ─── SECTION 3: Fleet & Driver Assignment ─── */}
            <div className="bk-form-section">
              <div className="bk-section-legend">
                <span className="bk-section-legend-title">
                  <span>🚕</span> Vehicle & Driver Assignment
                </span>
                <small style={{ color: "#94a3b8", fontWeight: 600 }}>Fleet Allocation</small>
              </div>

              <div className="bk-form-grid-2">
                <div className="bk-field-group">
                  <label className="bk-field-label">
                    Assign Fleet Taxi {form.status === "active" && <span className="bk-req">*</span>}
                  </label>
                  <select
                    className="bk-select"
                    value={form.taxi_id}
                    onChange={(e) => update("taxi_id", e.target.value)}
                  >
                    <option value="">No taxi assigned (Pending assignment)</option>
                    {taxis.map((taxi) => {
                      const rateText =
                        taxi.pricing_type === "per_km"
                          ? `₹${taxi.rate_amount || 0}/km`
                          : `₹${taxi.rate_amount || taxi.daily_rate || 0}/day`;
                      return (
                        <option key={taxi.id} value={taxi.id}>
                          {taxi.reg_number} · {taxi.make_model} ({rateText})
                        </option>
                      );
                    })}
                  </select>

                  {/* Selected Taxi Info Pill */}
                  {selectedTaxi && (
                    <div className="bk-assigned-preview">
                      <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                        <span className="bk-assigned-plate">{selectedTaxi.reg_number}</span>
                        <span style={{ fontWeight: 700, color: "#1e293b" }}>{selectedTaxi.make_model}</span>
                      </div>
                      <div className="bk-assigned-tags">
                        {selectedTaxi.vehicle_type && (
                          <span className="bk-assigned-tag">
                            {selectedTaxi.vehicle_type.toUpperCase()}
                          </span>
                        )}
                        <span className="bk-assigned-tag" style={{ color: "#0d9488", fontWeight: 800 }}>
                          {pricingType === "per_km" ? `${formatCurrency(rateAmount)}/km` : `${formatCurrency(rateAmount)}/day`}
                        </span>
                      </div>
                    </div>
                  )}
                </div>

                <div className="bk-field-group">
                  <label className="bk-field-label">Assign Chauffeur / Driver</label>
                  <select
                    className="bk-select"
                    value={form.driver_id}
                    onChange={(e) => update("driver_id", e.target.value)}
                  >
                    <option value="">No driver assigned (Unassigned)</option>
                    {drivers.map((driver) => (
                      <option key={driver.id} value={driver.id}>
                        {driver.name} {driver.phone ? `(${driver.phone})` : ""}
                      </option>
                    ))}
                  </select>

                  {/* Selected Driver Info Pill */}
                  {selectedDriver && (
                    <div className="bk-assigned-preview">
                      <span style={{ fontWeight: 700, color: "#1e293b" }}>
                        🧑‍✈️ {selectedDriver.name}
                      </span>
                      {selectedDriver.phone && (
                        <span style={{ color: "#64748b", fontFamily: "var(--bk-font-mono, monospace)" }}>
                          {selectedDriver.phone}
                        </span>
                      )}
                    </div>
                  )}
                </div>

                {/* Per-Km Planned Distance Field */}
                {pricingType === "per_km" && (
                  <div className="bk-field-group full-width">
                    <label className="bk-field-label">
                      Planned Route Distance (Kilometers) <span className="bk-req">*</span>
                    </label>
                    <div className="bk-input-wrap">
                      <span className="bk-input-icon">🛣️</span>
                      <input
                        type="number"
                        min="0.1"
                        step="0.1"
                        className="bk-input has-icon"
                        required
                        value={form.planned_distance_km || ""}
                        onChange={(e) => update("planned_distance_km", e.target.value)}
                        placeholder="e.g. 150"
                      />
                    </div>
                    <small style={{ color: "#64748b", fontSize: "0.75rem", marginTop: "2px" }}>
                      This vehicle uses distance-based pricing. Enter total estimated kilometers for quote calculation.
                    </small>
                  </div>
                )}

                {/* Ending Odometer Field for trip completion */}
                {form.status === "completed" && initial?.status === "active" && (
                  <div className="bk-field-group full-width">
                    <label className="bk-field-label">
                      Ending Odometer Reading (km) <span className="bk-req">*</span>
                    </label>
                    <div className="bk-input-wrap">
                      <span className="bk-input-icon">⏱️</span>
                      <input
                        type="number"
                        min={initial.odometer_start ?? 0}
                        step="1"
                        className="bk-input has-icon"
                        required
                        value={form.odometer_end ?? ""}
                        onChange={(e) => update("odometer_end", e.target.value)}
                        placeholder={`Min: ${initial.odometer_start ?? 0} km`}
                      />
                    </div>
                    {initial?.odometer_start != null && (
                      <small style={{ color: "#64748b", fontSize: "0.75rem", marginTop: "2px" }}>
                        Trip start odometer: <strong>{Number(initial.odometer_start).toLocaleString()} km</strong>
                      </small>
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* ─── SECTION 4: Live Dynamic Fare Card ─── */}
            {estimatedFare != null && Number.isFinite(estimatedFare) && (
              <div className="bk-fare-card">
                <div className="bk-fare-meta">
                  <span className="bk-fare-label">Estimated Rental Quote</span>
                  <span className="bk-fare-formula">
                    {pricingType === "per_km"
                      ? `${formatCurrency(rateAmount)} / km × ${form.planned_distance_km || 0} km`
                      : `${formatCurrency(rateAmount)} / day × ${tripDays} billable day${tripDays > 1 ? "s" : ""}`}
                  </span>
                </div>
                <div className="bk-fare-amount">
                  {formatCurrency(estimatedFare)}
                </div>
              </div>
            )}

            {!selectedTaxi && (
              <div className="bk-fare-empty">
                <span>💡</span>
                <span>Select a fleet taxi above to compute real-time rental pricing and quotes.</span>
              </div>
            )}

            {/* ─── SECTION 5: Status & Notes ─── */}
            <div className="bk-form-section">
              <div className="bk-section-legend">
                <span className="bk-section-legend-title">
                  <span>⚙️</span> Reservation Status & Notes
                </span>
              </div>

              <div className="bk-form-grid-2">
                <div className="bk-field-group">
                  <label className="bk-field-label">
                    Booking Status <span className="bk-req">*</span>
                  </label>
                  <select
                    className="bk-select"
                    value={form.status}
                    onChange={(e) => update("status", e.target.value)}
                  >
                    <option value="pending">⏳ Pending (Awaiting confirmation)</option>
                    <option value="confirmed">✅ Confirmed (Vehicle reserved)</option>
                    <option value="active">🚗 Active (Trip underway)</option>
                    <option value="completed">🏁 Completed (Trip finished)</option>
                    <option value="cancelled">✗ Cancelled</option>
                  </select>
                </div>

                <div className="bk-field-group full-width">
                  <label className="bk-field-label">
                    Trip Remarks / Special Requests <span style={{ color: "#94a3b8", fontWeight: 500 }}>(Optional)</span>
                  </label>
                  <textarea
                    className="bk-textarea"
                    value={form.notes || ""}
                    onChange={(e) => update("notes", e.target.value)}
                    placeholder="Enter special passenger requests, flight numbers, luggage notes, or directions..."
                  />
                </div>
              </div>
            </div>
          </div>

          {/* ── Modal Footer ── */}
          <div className="bk-modal-footer">
            <button
              type="button"
              className="bk-modal-btn-cancel"
              onClick={onCancel}
              disabled={submitting}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="bk-modal-btn-submit"
              disabled={submitting}
            >
              {submitting ? (
                <>
                  <svg className="bk-spin" viewBox="0 0 24 24" width="16" height="16" stroke="currentColor" strokeWidth="2.5" fill="none">
                    <circle cx="12" cy="12" r="10" strokeDasharray="32" strokeLinecap="round" />
                  </svg>
                  <span>Saving...</span>
                </>
              ) : (
                <>
                  <span>{isEdit ? "💾" : "🚀"}</span>
                  <span>{isEdit ? "Save Changes" : "Create Booking"}</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
