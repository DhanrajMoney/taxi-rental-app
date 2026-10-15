import React, { useEffect, useState } from "react";
import { DriverAPI, OfficeAPI, UserAPI } from "../api/client.js";
import UserForm from "../components/UserForm.jsx";
import useDebouncedValue from "../hooks/useDebouncedValue.js";
import { formatDate } from "../utils/formatDate.js";

export default function Users({ canManage = false }) {
  const [users, setUsers] = useState([]);
  const [drivers, setDrivers] = useState([]);
  const [offices, setOffices] = useState([]);
  const [search, setSearch] = useState("");
  const debouncedSearch = useDebouncedValue(search);
  const [role, setRole] = useState("");
  const [editing, setEditing] = useState(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function load() {
    if (!canManage) return;
    setLoading(true);
    setError("");

    try {
      const [userResult, driverResult, officeResult] = await Promise.all([
        UserAPI.list({ search: debouncedSearch, role }),
        DriverAPI.list({ per_page: 100 }),
        OfficeAPI.list().catch(() => []),
      ]);
      setUsers(userResult?.data ?? []);
      setDrivers(driverResult?.data ?? driverResult ?? []);
      setOffices(officeResult || []);
    } catch (err) {
      setError("Couldn't load users. Check the Laravel backend and admin permissions.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (!canManage) return;
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debouncedSearch, role, canManage]);

  if (!canManage) {
    return (
      <div className="card" style={{ padding: "2rem", textAlign: "center" }}>
        <h3>Access Restricted</h3>
        <p>User management requires administrator permissions.</p>
      </div>
    );
  }

  async function handleSubmit(form) {
    try {
      if (editing && editing.id) {
        await UserAPI.update(editing.id, form);
      } else {
        await UserAPI.create(form);
      }

      setEditing(null);
      load();
    } catch (err) {
      setError(err?.response?.data?.message || "Save failed. Please check the user details.");
    }
  }

  async function handleDelete(id) {
    if (!confirm("Remove this user?")) return;

    try {
      await UserAPI.remove(id);
      load();
    } catch (err) {
      setError(err?.response?.data?.message || "Delete failed.");
    }
  }

  return (
    <div>
      <div className="toolbar">
        <input placeholder="Search name or email…" value={search} onChange={(e) => setSearch(e.target.value)} />
        <select value={role} onChange={(e) => setRole(e.target.value)}>
          <option value="">All roles</option>
          <option value="admin">Admin</option>
          <option value="staff">Staff</option>
          <option value="driver">Driver</option>
        </select>
        {canManage && (
          <button className="primary" onClick={() => setEditing("new")}>
            + Add User
          </button>
        )}
        <button className="refresh-button" onClick={load} disabled={loading} title="Refresh user list">
          {loading ? "Refreshing..." : "Refresh"}
        </button>
      </div>

      <section className="summary-strip" aria-label="User summary">
        <div className="summary-card">
          <span className="summary-label">In view</span>
          <strong>{users.length}</strong>
          <span className="summary-note">total users</span>
        </div>
        <div className="summary-card summary-card-good">
          <span className="summary-label">Admins</span>
          <strong>{users.filter((user) => user.role === "admin").length}</strong>
          <span className="summary-note">system owners</span>
        </div>
        <div className="summary-card summary-card-alert">
          <span className="summary-label">Drivers</span>
          <strong>{users.filter((user) => user.role === "driver").length}</strong>
          <span className="summary-note">mobile team</span>
        </div>
      </section>

      {error && <p className="error">{error}</p>}
      {loading && <p>Loading…</p>}

      {canManage && editing && (
        <UserForm
          initial={editing === "new" ? null : editing}
          drivers={drivers}
          offices={offices}
          onSubmit={handleSubmit}
          onCancel={() => setEditing(null)}
        />
      )}

      <table className="data-table">
        <thead>
          <tr>
            <th>Name</th>
            <th>Email</th>
            <th>Role</th>
            <th>Branch &amp; Profile</th>
            <th>Created</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          {users.map((user) => (
            <tr key={user.id}>
              <td>
                <strong>{user.name}</strong>
              </td>
              <td>{user.email}</td>
              <td>
                <span className={`badge ${user.role}`}>{user.role}</span>
              </td>
              <td>
                <div>{user.office?.name || (user.role === "admin" ? "All Locations" : "—")}</div>
                {user.driver && (
                  <div style={{ fontSize: "0.78rem", color: "#2563eb", marginTop: "2px" }}>
                    🪪 {user.driver.name} ({user.driver.license_number || "Driver"})
                  </div>
                )}
              </td>
              <td>{formatDate(user.created_at)}</td>
              <td className="row-actions">
                {canManage && (
                  <>
                    <button onClick={() => setEditing(user)}>Edit</button>
                    <button className="danger" onClick={() => handleDelete(user.id)}>Delete</button>
                  </>
                )}
              </td>
            </tr>
          ))}
          {!loading && users.length === 0 && (
            <tr>
              <td colSpan={6} className="empty">
                No users match this filter.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
