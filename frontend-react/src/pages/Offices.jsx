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

  useEffect(() => {
    loadOffices();
  }, [debouncedSearch]);

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
    setError("");
    if (isEditing) {
      OfficeAPI.update(form.id, form)
        .then(() => {
          setForm(null);
          loadOffices();
        })
        .catch((err) => setError(err.response?.data?.message || "Failed to update office."));
    } else {
      OfficeAPI.create(form)
        .then(() => {
          setForm(null);
          loadOffices();
        })
        .catch((err) => setError(err.response?.data?.message || "Failed to create office."));
    }
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
          <button className="primary" onClick={() => { setForm(EMPTY); setIsEditing(false); }}>
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
        <div className="branch-modal-overlay">
          <div className="branch-modal-card">
            <div className="branch-form-header">
              <div className="branch-form-header-title">
                <span className="branch-form-header-icon">🏛</span>
                <div>
                  <h3>{isEditing ? "Edit Office Branch" : "Add New Office Branch"}</h3>
                  <p>Enter branch location details, phone, email, and operational status.</p>
                </div>
              </div>
              <button
                type="button"
                className="branch-close-btn"
                onClick={() => setForm(null)}
                title="Close"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSave}>
              <div className="settings-grid">
                <div className="field-group">
                  <label>🏢 Branch Name</label>
                  <input
                    required
                    value={form.name}
                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                    placeholder="e.g. Downtown Central"
                  />
                  <span className="field-hint">Primary display name for this location.</span>
                </div>

                <div className="field-group">
                  <label>📞 Phone Number</label>
                  <input
                    value={form.phone || ""}
                    onChange={(e) => setForm({ ...form, phone: e.target.value })}
                    placeholder="+91 98765 00000"
                  />
                  <span className="field-hint">Branch phone contact number.</span>
                </div>

                <div className="field-group">
                  <label>✉️ Email Address</label>
                  <input
                    type="email"
                    value={form.email || ""}
                    onChange={(e) => setForm({ ...form, email: e.target.value })}
                    placeholder="branch@ridedesk.test"
                  />
                  <span className="field-hint">Official email for this branch.</span>
                </div>

                <div className="field-group">
                  <label>Operational Status</label>
                  <select
                    value={form.status || "active"}
                    onChange={(e) => setForm({ ...form, status: e.target.value })}
                  >
                    <option value="active">Active (Operational)</option>
                    <option value="inactive">Inactive (Deactivated)</option>
                  </select>
                  <span className="field-hint">Inactive locations are hidden from booking creation.</span>
                </div>
              </div>

              <div className="field-group" style={{ marginTop: "18px" }}>
                <label>📍 Full Location Address</label>
                <textarea
                  rows="3"
                  value={form.address || ""}
                  onChange={(e) => setForm({ ...form, address: e.target.value })}
                  placeholder="Enter street, city, landmark, and postal code..."
                />
              </div>

              <div className="settings-actions" style={{ marginTop: "24px" }}>
                <button type="button" className="button secondary" onClick={() => setForm(null)}>
                  Cancel
                </button>
                <button type="submit" className="btn-primary">
                  {isEditing ? "💾 Save Branch Changes" : "🏛 Create Office Branch"}
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
                  <button type="button" className="secondary" onClick={() => { setForm(office); setIsEditing(true); }}>
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
                      <button type="button" className="secondary" onClick={() => { setForm(office); setIsEditing(true); }}>
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
