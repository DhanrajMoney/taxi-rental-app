import React, { useEffect, useState } from "react";
import { OfficeAPI } from "../api/client.js";
import useDebouncedValue from "../hooks/useDebouncedValue.js";
import "../styles/offices.css";

const EMPTY = { name: "", address: "", phone: "", email: "", status: "active" };

export default function Offices({ userRole }) {
  const [offices, setOffices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const debouncedSearch = useDebouncedValue(search, 300);
  const [viewMode, setViewMode] = useState("cards"); // "cards" or "table"
  const [form, setForm] = useState(null); // null or office object
  const [isEditing, setIsEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState("");

  useEffect(() => {
    loadOffices();
  }, [debouncedSearch]);

  useEffect(() => {
    function handleKeyDown(e) {
      if (e.key === "Escape" && form && !saving) {
        setForm(null);
      }
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [form, saving]);

  function loadOffices() {
    setLoading(true);
    setError("");
    OfficeAPI.list({ search: debouncedSearch })
      .then((data) => setOffices(data))
      .catch(() => setError("Failed to load offices."))
      .finally(() => setLoading(false));
  }

  function handleSave(e) {
    e.preventDefault();
    setFormError("");
    setSaving(true);
    const request = isEditing
      ? OfficeAPI.update(form.id, form)
      : OfficeAPI.create(form);

    request
      .then(() => {
        setForm(null);
        setFormError("");
        loadOffices();
      })
      .catch((err) => {
        setFormError(err.response?.data?.message || `Failed to ${isEditing ? "update" : "create"} office.`);
      })
      .finally(() => setSaving(false));
  }

  function handleDelete(id) {
    if (!window.confirm("Are you sure you want to deactivate/delete this office location?")) return;
    OfficeAPI.remove(id)
      .then(() => loadOffices())
      .catch(() => setError("Failed to delete office."));
  }

  const canManage = userRole === "admin";
  const activeCount = offices.filter((o) => o.status === "active").length;
  const inactiveCount = offices.filter((o) => o.status === "inactive").length;

  return (
    <div className="page offices-page">
      <div className="page-header">
        <div>
          <h2>Office Locations</h2>
          <p className="description">Manage multi-location office branches, contact details, and branch operational scoping.</p>
        </div>
        {canManage && (
          <button className="primary" onClick={() => { setForm(EMPTY); setIsEditing(false); setFormError(""); }}>
            + Add Branch Location
          </button>
        )}
      </div>

      {error && <div className="settings-alert error" role="alert">⚠️ {error}</div>}

      {/* Metric Summary Bar */}
      <div className="office-summary-strip">
        <div className="office-summary-card">
          <div className="office-summary-icon">🏛</div>
          <div className="office-summary-info">
            <label>Total Locations</label>
            <strong>{offices.length} Branches</strong>
          </div>
        </div>

        <div className="office-summary-card">
          <div className="office-summary-icon" style={{ background: "#eaf8f4", color: "#0d6854" }}>✅</div>
          <div className="office-summary-info">
            <label>Active Branches</label>
            <strong style={{ color: "#0d6854" }}>{activeCount} Active</strong>
          </div>
        </div>

        <div className="office-summary-card">
          <div className="office-summary-icon" style={{ background: "#fff8ec", color: "#c46624" }}>⏸</div>
          <div className="office-summary-info">
            <label>Inactive Branches</label>
            <strong style={{ color: "#c46624" }}>{inactiveCount} Inactive</strong>
          </div>
        </div>
      </div>

      {/* Controls Bar: Search + View Toggle */}
      <div className="office-controls-bar">
        <div className="filters card office-search-input" style={{ margin: 0, padding: "8px 14px" }}>
          <input
            type="search"
            placeholder="Search by branch name, address, phone, or email..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{ width: "100%", border: 0, outline: 0, background: "transparent", font: "inherit" }}
          />
        </div>

        <div className="office-view-toggle">
          <button
            type="button"
            className={viewMode === "cards" ? "active" : ""}
            onClick={() => setViewMode("cards")}
          >
            📇 Grid Cards
          </button>
          <button
            type="button"
            className={viewMode === "table" ? "active" : ""}
            onClick={() => setViewMode("table")}
          >
            📊 Table List
          </button>
        </div>
      </div>

      {/* Add / Edit Office Modal Overlay */}
      {form && canManage && (
        <div className="branch-modal-overlay" onClick={() => !saving && setForm(null)}>
          <div className="branch-modal-card" onClick={(e) => e.stopPropagation()}>
            <div className="branch-modal-header">
              <div className="branch-modal-header-title">
                <span className="branch-modal-header-icon">🏛</span>
                <div>
                  <h3>{isEditing ? "Edit Office Branch" : "Add New Office Branch"}</h3>
                  <p>Configure branch details, contact info, and booking availability.</p>
                </div>
              </div>
              <button
                type="button"
                className="branch-modal-close"
                onClick={() => setForm(null)}
                title="Close"
                disabled={saving}
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSave} className="branch-modal-form">
              <div className="branch-modal-body">
                {formError && (
                  <div className="branch-form-error" role="alert">
                    <span>⚠️</span>
                    <span>{formError}</span>
                  </div>
                )}

                <div className="branch-form-grid">
                  <div className="branch-field-group">
                    <label className="branch-label">
                      <span>Branch Name</span>
                      <span className="required-indicator">*</span>
                    </label>
                    <div className="branch-input-wrapper">
                      <span className="branch-input-icon">🏢</span>
                      <input
                        required
                        className="branch-input"
                        value={form.name}
                        onChange={(e) => setForm({ ...form, name: e.target.value })}
                        placeholder="e.g. Downtown Central"
                        disabled={saving}
                      />
                    </div>
                    <span className="branch-field-hint">Primary name used across dispatches and fleet reports.</span>
                  </div>

                  <div className="branch-field-group">
                    <label className="branch-label">
                      <span>Operational Status</span>
                      <span className="required-indicator">*</span>
                    </label>
                    <div className="branch-input-wrapper">
                      <span className="branch-input-icon">⚡</span>
                      <select
                        className="branch-select"
                        value={form.status || "active"}
                        onChange={(e) => setForm({ ...form, status: e.target.value })}
                        disabled={saving}
                      >
                        <option value="active">Active (Operational)</option>
                        <option value="inactive">Inactive (Deactivated)</option>
                      </select>
                    </div>
                    <span className="branch-field-hint">
                      {form.status === "inactive"
                        ? "⚠️ Inactive branches cannot be assigned to new bookings."
                        : "Ready for trip dispatching and vehicle allocations."}
                    </span>
                  </div>

                  <div className="branch-field-group">
                    <label className="branch-label">
                      <span>Phone Number</span>
                    </label>
                    <div className="branch-input-wrapper">
                      <span className="branch-input-icon">📞</span>
                      <input
                        type="tel"
                        className="branch-input"
                        value={form.phone || ""}
                        onChange={(e) => setForm({ ...form, phone: e.target.value })}
                        placeholder="+91 98765 00000"
                        disabled={saving}
                      />
                    </div>
                    <span className="branch-field-hint">Direct branch contact line for operations.</span>
                  </div>

                  <div className="branch-field-group">
                    <label className="branch-label">
                      <span>Email Address</span>
                    </label>
                    <div className="branch-input-wrapper">
                      <span className="branch-input-icon">✉️</span>
                      <input
                        type="email"
                        className="branch-input"
                        value={form.email || ""}
                        onChange={(e) => setForm({ ...form, email: e.target.value })}
                        placeholder="branch@ridedesk.test"
                        disabled={saving}
                      />
                    </div>
                    <span className="branch-field-hint">Official branch email for dispatch notices.</span>
                  </div>

                  <div className="branch-field-group full-width">
                    <label className="branch-label">
                      <span>Full Location Address</span>
                    </label>
                    <div className="branch-input-wrapper">
                      <textarea
                        rows="3"
                        className="branch-textarea"
                        value={form.address || ""}
                        onChange={(e) => setForm({ ...form, address: e.target.value })}
                        placeholder="Enter street, city, landmark, and postal code..."
                        disabled={saving}
                      />
                    </div>
                    <span className="branch-field-hint">Physical dispatch lot address and pickup depot.</span>
                  </div>
                </div>
              </div>

              <div className="branch-modal-footer">
                <button
                  type="button"
                  className="branch-btn branch-btn-secondary"
                  onClick={() => setForm(null)}
                  disabled={saving}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="branch-btn branch-btn-primary"
                  disabled={saving}
                >
                  {saving ? (
                    <>⏳ Saving...</>
                  ) : isEditing ? (
                    <>💾 Save Branch Changes</>
                  ) : (
                    <>🏛 Create Office Branch</>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Main List / Grid View */}
      {loading ? (
        <p className="loading">Loading office locations...</p>
      ) : viewMode === "cards" ? (
        <div className="office-grid">
          {offices.map((office) => (
            <div key={office.id} className="office-card">
              <div>
                <div className="office-card-header">
                  <div className="office-card-title">
                    <span className="office-card-icon">🏛</span>
                    <div>
                      <h3>{office.name}</h3>
                    </div>
                  </div>
                  <span className={`badge ${office.status === "active" ? "confirmed" : "cancelled"}`}>
                    {office.status}
                  </span>
                </div>

                <div className="office-card-body">
                  <div className="office-meta-item">
                    <span>📞</span>
                    <strong>{office.phone || "—"}</strong>
                  </div>
                  <div className="office-meta-item">
                    <span>✉️</span>
                    <span>{office.email || "—"}</span>
                  </div>
                  <div className="office-meta-item">
                    <span>📍</span>
                    <span>{office.address || "—"}</span>
                  </div>
                  <div className="office-meta-item" style={{ marginTop: "8px", paddingTop: "8px", borderTop: "1px solid #eef2f6" }}>
                    <span>📊</span>
                    <span style={{ fontSize: "0.82rem", fontWeight: 600, color: "#1e40af" }}>
                      🚖 {office.taxis_count ?? 0} Taxis &nbsp;•&nbsp; 🧑‍✈️ {office.drivers_count ?? 0} Drivers &nbsp;•&nbsp; 📅 {office.bookings_count ?? 0} Bookings
                    </span>
                  </div>
                </div>
              </div>

              {canManage && (
                <div className="office-card-footer">
                  <button type="button" className="secondary" onClick={() => { setForm(office); setIsEditing(true); setFormError(""); }}>
                    Edit
                  </button>
                  <button type="button" className="danger" onClick={() => handleDelete(office.id)}>
                    Delete
                  </button>
                </div>
              )}
            </div>
          ))}

          {!offices.length && (
            <div className="card" style={{ gridColumn: "1 / -1", textAlign: "center", padding: "32px" }}>
              <p className="empty">No office locations found matching your search query.</p>
            </div>
          )}
        </div>
      ) : (
        <div className="table-wrap card">
          <table className="data-table">
            <thead>
              <tr>
                <th>Branch Name</th>
                <th>Phone</th>
                <th>Email</th>
                <th>Address</th>
                <th>Fleet &amp; Ops</th>
                <th>Status</th>
                {canManage && <th>Actions</th>}
              </tr>
            </thead>
            <tbody>
              {offices.map((office) => (
                <tr key={office.id}>
                  <td><strong>{office.name}</strong></td>
                  <td>{office.phone || "—"}</td>
                  <td>{office.email || "—"}</td>
                  <td>{office.address || "—"}</td>
                  <td style={{ fontSize: "0.85rem", whiteSpace: "nowrap" }}>
                    🚖 {office.taxis_count ?? 0} &nbsp;|&nbsp; 🧑‍✈️ {office.drivers_count ?? 0} &nbsp;|&nbsp; 📅 {office.bookings_count ?? 0}
                  </td>
                  <td>
                    <span className={`badge ${office.status === "active" ? "confirmed" : "cancelled"}`}>
                      {office.status}
                    </span>
                  </td>
                  {canManage && (
                    <td>
                      <button type="button" className="secondary" onClick={() => { setForm(office); setIsEditing(true); setFormError(""); }}>
                        Edit
                      </button>
                      {" "}
                      <button type="button" className="danger" onClick={() => handleDelete(office.id)}>
                        Delete
                      </button>
                    </td>
                  )}
                </tr>
              ))}
              {!offices.length && (
                <tr>
                  <td colSpan={canManage ? 6 : 5} className="empty">No office locations found.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
