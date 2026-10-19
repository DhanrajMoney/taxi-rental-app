import React, { useEffect, useState } from "react";
import "../styles/users.css";

const EMPTY = {
  name: "",
  email: "",
  role: "staff",
  office_id: "",
  password: "",
};

export default function UserForm({
  initial,
  currentUser,
  drivers = [],
  offices = [],
  assignedDriverIds = new Set(),
  submitting = false,
  error = "",
  onSubmit,
  onCancel,
}) {
  const [form, setForm] = useState(initial || EMPTY);
  const isEditing = Boolean(initial && initial.id);
  const isSelf = Boolean(currentUser && initial && initial.id === currentUser.id);

  // Close on Escape key
  useEffect(() => {
    function handleKeyDown(e) {
      if (e.key === "Escape" && !submitting) {
        onCancel();
      }
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [submitting, onCancel]);

  function update(field, value) {
    setForm((current) => ({ ...current, [field]: value }));
  }

  function submit(e) {
    e.preventDefault();
    const payload = {
      ...form,
      name: form.name.trim(),
      email: form.email.trim(),
      driver_id: form.role === "driver" ? form.driver_id || null : null,
      office_id: form.office_id || null,
    };

    // When editing, if password was left blank, do not include it in payload
    if (isEditing && (!payload.password || !payload.password.trim())) {
      delete payload.password;
    }

    onSubmit(payload);
  }

  return (
    <div className="usr-modal-overlay" onClick={onCancel} role="dialog" aria-modal="true">
      <div className="usr-modal-card" onClick={(e) => e.stopPropagation()}>
        {/* Modal Header */}
        <div className="usr-modal-header">
          <div className="usr-modal-header-text">
            <h3>
              <span>{isEditing ? "✏️" : "➕"}</span>
              {isEditing ? `Edit User: ${initial.name}` : "Create New User"}
              {isSelf && <span className="badge-you">Your Account</span>}
            </h3>
            <p>
              {isEditing
                ? "Update account credentials, branch location, and operational role."
                : "Register a new user account with role-based dashboard access."}
            </p>
          </div>
          <button
            type="button"
            className="usr-modal-close"
            onClick={onCancel}
            title="Close (Esc)"
            aria-label="Close dialog"
          >
            ✕
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={submit} noValidate={false}>
          <div className="usr-modal-body">
            {error && (
              <div className="usr-form-error" role="alert">
                <span>⚠️</span>
                <span>{error}</span>
              </div>
            )}

            {isSelf && (
              <div className="usr-self-banner">
                <span>ℹ️</span>
                <div>
                  <strong>Active Session:</strong> You are currently editing your own administrator account. Role modification is locked to prevent accidental lockout.
                </div>
              </div>
            )}

            <div className="usr-form-grid">
              {/* Full Name */}
              <div className="usr-field-group">
                <label htmlFor="user_name" className="usr-label">
                  <span>Full Name</span>
                  <span className="required-indicator">*</span>
                </label>
                <input
                  id="user_name"
                  className="usr-input"
                  required
                  autoFocus
                  value={form.name}
                  onChange={(e) => update("name", e.target.value)}
                  placeholder="e.g. Rahul Sharma"
                />
                <span className="usr-field-hint">Display name used across audit trails &amp; activity logs.</span>
              </div>

              {/* Email Address */}
              <div className="usr-field-group">
                <label htmlFor="user_email" className="usr-label">
                  <span>Email Address</span>
                  <span className="required-indicator">*</span>
                </label>
                <input
                  id="user_email"
                  className="usr-input"
                  type="email"
                  required
                  value={form.email}
                  onChange={(e) => update("email", e.target.value)}
                  placeholder="e.g. rahul@ridedesk.test"
                />
                <span className="usr-field-hint">Used for sign in and account notifications.</span>
              </div>

              {/* Role Selection */}
              <div className="usr-field-group">
                <label htmlFor="user_role" className="usr-label">
                  <span>Role &amp; Permissions</span>
                  <span className="required-indicator">*</span>
                </label>
                <select
                  id="user_role"
                  className="usr-select"
                  value={form.role}
                  disabled={isSelf}
                  onChange={(e) => update("role", e.target.value)}
                >
                  <option value="admin">Administrator (Full Access)</option>
                  <option value="staff">Operations Staff</option>
                  <option value="driver">Driver (Mobile Roster)</option>
                </select>
                <span className="usr-role-note">
                  {form.role === "admin" && "👑 Admin: Full access to all fleet, settings, reports & users."}
                  {form.role === "staff" && "🏢 Staff: Fleet management, dispatch, bookings & maintenance."}
                  {form.role === "driver" && "🚗 Driver: Assigned booking trips, trip routes & compliance."}
                </span>
              </div>

              {/* Office Location */}
              <div className="usr-field-group">
                <label htmlFor="user_office" className="usr-label">
                  <span>Office Branch</span>
                </label>
                <select
                  id="user_office"
                  className="usr-select"
                  value={form.office_id || ""}
                  onChange={(e) => update("office_id", e.target.value)}
                >
                  <option value="">All Locations (Global Access)</option>
                  {offices.map((off) => (
                    <option key={off.id} value={off.id}>
                      {off.name}
                    </option>
                  ))}
                </select>
                <span className="usr-field-hint">Assign user to a specific branch or leave for global access.</span>
              </div>

              {/* Driver Profile (Only for Driver role) */}
              {form.role === "driver" && (
                <div className="usr-field-group full-width">
                  <label htmlFor="user_driver_id" className="usr-label">
                    <span>Linked Driver Roster Profile</span>
                    <span className="required-indicator">*</span>
                  </label>
                  <select
                    id="user_driver_id"
                    className="usr-select"
                    required
                    value={form.driver_id || ""}
                    onChange={(e) => update("driver_id", e.target.value ? Number(e.target.value) : null)}
                  >
                    <option value="">Select a driver roster profile...</option>
                    {drivers.map((driver) => {
                      const isAssigned = assignedDriverIds.has(driver.id) && driver.id !== initial?.driver_id;
                      return (
                        <option
                          key={driver.id}
                          value={driver.id}
                          disabled={isAssigned}
                        >
                          {driver.name} ({driver.phone}) {isAssigned ? "— [Already Assigned to another account]" : ""}
                        </option>
                      );
                    })}
                  </select>
                  <span className="usr-field-hint">
                    Connects this account directly to driver bookings, dispatch trips, and document verification.
                  </span>
                </div>
              )}

              {/* Password */}
              <div className="usr-field-group full-width">
                <label htmlFor="user_password" className="usr-label">
                  <span>
                    Password{" "}
                    {isEditing ? (
                      <span style={{ fontWeight: 400, color: "#64748b" }}>(Leave blank to keep current)</span>
                    ) : (
                      <span className="required-indicator">*</span>
                    )}
                  </span>
                </label>
                <input
                  id="user_password"
                  className="usr-input"
                  type="password"
                  value={form.password || ""}
                  onChange={(e) => update("password", e.target.value)}
                  placeholder={isEditing ? "Leave blank to keep unchanged" : "Minimum 8 characters"}
                  required={!isEditing}
                  minLength={8}
                />
                <span className="usr-field-hint">
                  {isEditing
                    ? "Only enter a value if you wish to reset this user's password (min. 8 characters)."
                    : "Must be at least 8 characters with a combination of letters and numbers."}
                </span>
              </div>
            </div>
          </div>

          {/* Modal Actions Footer */}
          <div className="usr-modal-actions">
            <button
              type="button"
              className="btn-usr-cancel"
              onClick={onCancel}
              disabled={submitting}
            >
              Cancel
            </button>
            <button type="submit" className="btn-usr-save" disabled={submitting}>
              {submitting ? "Saving..." : isEditing ? "Save Changes" : "Create User"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
