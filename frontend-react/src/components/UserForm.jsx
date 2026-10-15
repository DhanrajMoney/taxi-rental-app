import React, { useState } from "react";

const EMPTY = {
  name: "",
  email: "",
  role: "staff",
  office_id: "",
  password: "",
};

export default function UserForm({ initial, drivers = [], offices = [], onSubmit, onCancel }) {
  const [form, setForm] = useState(initial || EMPTY);

  function update(field, value) {
    setForm((current) => ({ ...current, [field]: value }));
  }

  function submit(e) {
    e.preventDefault();
    onSubmit({
      ...form,
      driver_id: form.role === "driver" ? form.driver_id || null : null,
      office_id: form.office_id || null,
    });
  }

  return (
    <form className="card form" onSubmit={submit}>
      <h3>{initial ? "Edit User" : "Add User"}</h3>

      <div className="grid">
        <label>
          Full Name
          <input required value={form.name} onChange={(e) => update("name", e.target.value)} />
        </label>

        <label>
          Email
          <input type="email" required value={form.email} onChange={(e) => update("email", e.target.value)} />
        </label>

        <label>
          Role
          <select value={form.role} onChange={(e) => update("role", e.target.value)}>
            <option value="admin">Admin</option>
            <option value="staff">Staff</option>
            <option value="driver">Driver</option>
          </select>
        </label>

        <label>
          Office Location (optional for Admin)
          <select value={form.office_id || ""} onChange={(e) => update("office_id", e.target.value)}>
            <option value="">All Locations (Admin default)</option>
            {offices.map((off) => (
              <option key={off.id} value={off.id}>{off.name}</option>
            ))}
          </select>
        </label>

        {form.role === "driver" && (
          <label>
            Driver profile
            <select required value={form.driver_id || ""} onChange={(e) => update("driver_id", e.target.value || null)}>
              <option value="">Select a driver</option>
              {drivers.map((driver) => (
                <option key={driver.id} value={driver.id}>{driver.name} ({driver.phone})</option>
              ))}
            </select>
          </label>
        )}

        <label>
          Password {initial ? "(leave blank to keep current)" : ""}
          <input
            type="password"
            value={form.password || ""}
            onChange={(e) => update("password", e.target.value)}
            placeholder={initial ? "Optional" : "Minimum 8 characters"}
            required={!initial}
          />
        </label>
      </div>

      <div className="actions">
        <button type="submit" className="primary">
          {initial ? "Save Changes" : "Add User"}
        </button>
        <button type="button" className="secondary" onClick={onCancel}>Cancel</button>
      </div>
    </form>
  );
}
