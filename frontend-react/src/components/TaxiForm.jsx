import React, { useEffect, useState } from "react";

const FIRST_VEHICLE_YEAR = 1990;
const LAST_VEHICLE_YEAR = new Date().getFullYear() + 1;
const VEHICLE_YEARS = Array.from(
  { length: LAST_VEHICLE_YEAR - FIRST_VEHICLE_YEAR + 1 },
  (_, index) => LAST_VEHICLE_YEAR - index,
);

const EMPTY = {
  reg_number: "",
  vehicle_type: "sedan",
  make_model: "",
  year_of_manufacture: new Date().getFullYear(),
  seating_capacity: 4,
  fuel_type: "petrol",
  pricing_type: "daily",
  rate_amount: "",
  office_id: "",
  status: "available",
  odometer_reading: 0,
  notes: "",
};

export default function TaxiForm({ initial, drivers = [], offices = [], onSubmit, onCancel }) {
  const [form, setForm] = useState(initial ? {
    ...initial,
    pricing_type: initial.pricing_type || "daily",
    rate_amount: initial.rate_amount ?? initial.daily_rate ?? "",
    office_id: initial.office_id || initial.office?.id || "",
    driver_id: initial.driver_id || initial.driver?.id || "",
  } : EMPTY);

  // Close on Escape key
  useEffect(() => {
    function handleKeyDown(e) {
      if (e.key === "Escape") onCancel();
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onCancel]);

  function update(field, value) {
    setForm((f) => ({ ...f, [field]: value }));
  }

  function submit(e) {
    e.preventDefault();
    onSubmit({
      ...form,
      reg_number: String(form.reg_number ?? "").toUpperCase().trim(),
      office_id: form.office_id || null,
      driver_id: form.driver_id || null,
      seating_capacity: Number(form.seating_capacity) || 4,
      year_of_manufacture: Number(form.year_of_manufacture) || new Date().getFullYear(),
      rate_amount: Number(form.rate_amount) || 0,
      odometer_reading: Number(form.odometer_reading) || 0,
    });
  }

  return (
    <div className="tx-modal-overlay" onClick={onCancel} role="dialog" aria-modal="true">
      <div className="tx-modal-card" onClick={(e) => e.stopPropagation()}>
        <div className="tx-modal-header">
          <h3 className="tx-modal-title">{initial ? "Edit Taxi Details" : "Register New Taxi"}</h3>
          <button type="button" className="tx-panel-close" onClick={onCancel} title="Close form" aria-label="Close">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" width="18" height="18">
              <path d="M18 6 6 18M6 6l12 12" />
            </svg>
          </button>
        </div>

        <form onSubmit={submit}>
          <div className="tx-modal-body">
            <div className="tx-form-grid">
              <div className="tx-field-group">
                <label className="tx-field-label">
                  Registration Number <span style={{ color: "var(--tx-danger)" }}>*</span>
                </label>
                <input
                  className="tx-field-input"
                  style={{ fontFamily: "var(--tx-font-mono)", fontWeight: 700 }}
                  required
                  value={String(form.reg_number ?? "").toUpperCase()}
                  onChange={(e) => update("reg_number", e.target.value.toUpperCase())}
                  placeholder="UP21 AB 1234"
                />
              </div>

              <div className="tx-field-group">
                <label className="tx-field-label">Vehicle Type / Class</label>
                <select className="tx-field-select" value={form.vehicle_type} onChange={(e) => update("vehicle_type", e.target.value)}>
                  <option value="sedan">Sedan</option>
                  <option value="suv">SUV</option>
                  <option value="hatchback">Hatchback</option>
                  <option value="mini_bus">Mini Bus</option>
                </select>
              </div>

              <div className="tx-field-group">
                <label className="tx-field-label">
                  Make &amp; Model <span style={{ color: "var(--tx-danger)" }}>*</span>
                </label>
                <input
                  className="tx-field-input"
                  required
                  value={form.make_model}
                  onChange={(e) => update("make_model", e.target.value)}
                  placeholder="e.g. Maruti Dzire, Toyota Innova"
                />
              </div>

              <div className="tx-field-group">
                <label className="tx-field-label">Year of Manufacture</label>
                <select className="tx-field-select" required value={form.year_of_manufacture} onChange={(e) => update("year_of_manufacture", e.target.value)}>
                  {VEHICLE_YEARS.map((year) => (
                    <option key={year} value={year}>{year}</option>
                  ))}
                </select>
              </div>

              <div className="tx-field-group">
                <label className="tx-field-label">Seating Capacity</label>
                <input
                  type="number"
                  min="1"
                  max="60"
                  className="tx-field-input"
                  required
                  value={form.seating_capacity}
                  onChange={(e) => update("seating_capacity", e.target.value)}
                />
              </div>

              <div className="tx-field-group">
                <label className="tx-field-label">Fuel Type</label>
                <select className="tx-field-select" value={form.fuel_type} onChange={(e) => update("fuel_type", e.target.value)}>
                  <option value="petrol">Petrol</option>
                  <option value="diesel">Diesel</option>
                  <option value="cng">CNG</option>
                  <option value="ev">Electric (EV)</option>
                </select>
              </div>

              <div className="tx-field-group">
                <label className="tx-field-label">Pricing Type</label>
                <select className="tx-field-select" value={form.pricing_type} onChange={(e) => update("pricing_type", e.target.value)}>
                  <option value="daily">Daily Rental (₹/day)</option>
                  <option value="per_km">Per Kilometer (₹/km)</option>
                </select>
              </div>

              <div className="tx-field-group">
                <label className="tx-field-label">
                  Rate Amount (₹/{form.pricing_type === "per_km" ? "km" : "day"}) <span style={{ color: "var(--tx-danger)" }}>*</span>
                </label>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  className="tx-field-input"
                  required
                  value={form.rate_amount}
                  onChange={(e) => update("rate_amount", e.target.value)}
                  placeholder="e.g. 1800"
                />
              </div>

              <div className="tx-field-group">
                <label className="tx-field-label">Operational Status</label>
                <select className="tx-field-select" value={form.status} onChange={(e) => update("status", e.target.value)}>
                  <option value="available">Available (Ready)</option>
                  <option value="on_rent">On Rent (Active Trip)</option>
                  <option value="maintenance">Maintenance (Workshop)</option>
                  <option value="inactive">Inactive (Decommissioned)</option>
                </select>
              </div>

              <div className="tx-field-group">
                <label className="tx-field-label">Assigned Driver</label>
                <select className="tx-field-select" value={form.driver_id || ""} onChange={(e) => update("driver_id", e.target.value || null)}>
                  <option value="">— None (Unassigned) —</option>
                  {drivers.map((d) => (
                    <option key={d.id} value={d.id}>
                      {d.name} {d.phone ? `(${d.phone})` : ""}
                    </option>
                  ))}
                </select>
              </div>

              <div className="tx-field-group">
                <label className="tx-field-label">Office / Branch</label>
                <select className="tx-field-select" value={form.office_id || ""} onChange={(e) => update("office_id", e.target.value)}>
                  <option value="">Primary / All Branches</option>
                  {offices.map((off) => (
                    <option key={off.id} value={off.id}>{off.name}</option>
                  ))}
                </select>
              </div>

              <div className="tx-field-group">
                <label className="tx-field-label">Odometer Reading (km)</label>
                <input
                  type="number"
                  min="0"
                  className="tx-field-input"
                  value={form.odometer_reading}
                  onChange={(e) => update("odometer_reading", e.target.value)}
                />
              </div>

              <div className="tx-field-group full-width">
                <label className="tx-field-label">Notes &amp; Vehicle Remarks</label>
                <textarea
                  className="tx-field-textarea"
                  value={form.notes || ""}
                  onChange={(e) => update("notes", e.target.value)}
                  placeholder="Optional notes regarding insurance, vehicle condition, or permits..."
                />
              </div>
            </div>
          </div>

          <div className="tx-modal-footer">
            <button type="button" className="btn-modal-cancel-ghost" onClick={onCancel}>
              Cancel
            </button>
            <button type="submit" className="tx-btn-new">
              {initial ? "Save Changes" : "Create Taxi"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
