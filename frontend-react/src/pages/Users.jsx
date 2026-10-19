import React, { useCallback, useEffect, useMemo, useState } from "react";
import { DriverAPI, OfficeAPI, UserAPI } from "../api/client.js";
import UserForm from "../components/UserForm.jsx";
import useDebouncedValue from "../hooks/useDebouncedValue.js";
import { formatDate } from "../utils/formatDate.js";
import "../styles/users.css";

export default function Users({ canManage = false, currentUser = null }) {
  const [users, setUsers] = useState([]);
  const [drivers, setDrivers] = useState([]);
  const [offices, setOffices] = useState([]);
  const [search, setSearch] = useState("");
  const debouncedSearch = useDebouncedValue(search);
  const [role, setRole] = useState("");
  const [officeId, setOfficeId] = useState("");
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState({ current_page: 1, last_page: 1, total: 0, per_page: 15 });
  const [meta, setMeta] = useState({ total_users: 0, admin_count: 0, staff_count: 0, driver_count: 0 });
  const [editing, setEditing] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [loading, setLoading] = useState(false);

  // Auto-dismiss success message
  useEffect(() => {
    if (!success) return;
    const timer = setTimeout(() => setSuccess(""), 4500);
    return () => clearTimeout(timer);
  }, [success]);

  // Set of driver IDs that already have a user account
  const assignedDriverIds = useMemo(() => {
    return new Set(users.map((u) => u.driver_id).filter(Boolean));
  }, [users]);

  const load = useCallback(async () => {
    if (!canManage) return;
    setLoading(true);
    setError("");

    try {
      const [userResult, driverResult, officeResult] = await Promise.all([
        UserAPI.list({
          search: debouncedSearch,
          role: role || undefined,
          office_id: officeId || undefined,
          page,
          per_page: 15,
        }),
        DriverAPI.list({ per_page: 100 }).catch(() => ({ data: [] })),
        OfficeAPI.list().catch(() => []),
      ]);

      setUsers(userResult?.data ?? []);
      setPagination({
        current_page: userResult?.current_page || 1,
        last_page: userResult?.last_page || 1,
        total: userResult?.total || 0,
        per_page: userResult?.per_page || 15,
      });

      if (userResult?.meta) {
        setMeta(userResult.meta);
      } else {
        setMeta((prev) => ({
          ...prev,
          total_users: userResult?.total || (userResult?.data?.length ?? 0),
        }));
      }

      setDrivers(driverResult?.data ?? driverResult ?? []);
      setOffices(officeResult || []);
    } catch (err) {
      setError("Couldn't load users. Check the Laravel backend and admin permissions.");
    } finally {
      setLoading(false);
    }
  }, [canManage, debouncedSearch, role, officeId, page]);

  useEffect(() => {
    if (!canManage) return;
    load();
  }, [load, canManage]);

  if (!canManage) {
    return (
      <div className="card" style={{ padding: "2rem", textAlign: "center" }}>
        <h3>Access Restricted</h3>
        <p>User management requires administrator permissions.</p>
      </div>
    );
  }

  async function handleSubmit(formPayload) {
    setSubmitting(true);
    setFormError("");

    try {
      if (editing && editing.id) {
        await UserAPI.update(editing.id, formPayload);
        setSuccess(`User "${formPayload.name}" updated successfully.`);
      } else {
        await UserAPI.create(formPayload);
        setSuccess(`User "${formPayload.name}" created successfully.`);
      }

      setEditing(null);
      load();
    } catch (err) {
      const validationErrors = err?.response?.data?.errors;
      let msg = err?.response?.data?.message || "Save failed. Please check the user details.";
      if (validationErrors) {
        const firstKey = Object.keys(validationErrors)[0];
        msg = validationErrors[firstKey][0];
      }
      setFormError(msg);
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDelete(targetUser) {
    if (currentUser && targetUser.id === currentUser.id) {
      setError("You cannot delete your own account.");
      return;
    }

    if (!confirm(`Are you sure you want to remove user "${targetUser.name}"?`)) return;

    try {
      await UserAPI.remove(targetUser.id);
      setSuccess(`User "${targetUser.name}" removed successfully.`);
      load();
    } catch (err) {
      setError(err?.response?.data?.message || "Delete failed.");
    }
  }

  const startRecord = users.length ? (pagination.current_page - 1) * pagination.per_page + 1 : 0;
  const endRecord = (pagination.current_page - 1) * pagination.per_page + users.length;

  return (
    <div>
      {/* Search & Filter Toolbar */}
      <div className="toolbar" style={{ flexWrap: "wrap", gap: "10px" }}>
        <input
          placeholder="Search name or email…"
          value={search}
          onChange={(e) => {
            setSearch(e.target.value);
            setPage(1);
          }}
        />
        <select
          value={role}
          onChange={(e) => {
            setRole(e.target.value);
            setPage(1);
          }}
        >
          <option value="">All roles</option>
          <option value="admin">Admin</option>
          <option value="staff">Staff</option>
          <option value="driver">Driver</option>
        </select>
        <select
          value={officeId}
          onChange={(e) => {
            setOfficeId(e.target.value);
            setPage(1);
          }}
        >
          <option value="">All Offices</option>
          {offices.map((off) => (
            <option key={off.id} value={off.id}>
              {off.name}
            </option>
          ))}
        </select>
        {canManage && (
          <button
            className="primary"
            onClick={() => {
              setFormError("");
              setEditing("new");
            }}
          >
            + Add User
          </button>
        )}
        <button className="refresh-button" onClick={load} disabled={loading} title="Refresh user list">
          {loading ? "Refreshing..." : "Refresh"}
        </button>
      </div>

      {/* Accurate System Summary Strip */}
      <section className="summary-strip" aria-label="User summary">
        <div className="summary-card">
          <span className="summary-label">Total Users</span>
          <strong>{meta.total_users || pagination.total}</strong>
          <span className="summary-note">registered accounts</span>
        </div>
        <div className="summary-card summary-card-good">
          <span className="summary-label">Admins</span>
          <strong>{meta.admin_count}</strong>
          <span className="summary-note">system owners</span>
        </div>
        <div className="summary-card">
          <span className="summary-label">Staff</span>
          <strong>{meta.staff_count}</strong>
          <span className="summary-note">desk operators</span>
        </div>
        <div className="summary-card summary-card-alert">
          <span className="summary-label">Drivers</span>
          <strong>{meta.driver_count}</strong>
          <span className="summary-note">mobile logins</span>
        </div>
      </section>

      {/* Notifications */}
      {success && (
        <div style={{ padding: "10px 16px", background: "#ecfdf5", color: "#065f46", border: "1px solid #a7f3d0", borderRadius: "8px", marginBottom: "16px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <span>✓ {success}</span>
          <button type="button" onClick={() => setSuccess("")} style={{ background: "transparent", border: 0, cursor: "pointer", color: "inherit", fontWeight: "bold" }}>✕</button>
        </div>
      )}
      {error && !editing && (
        <div style={{ padding: "10px 16px", background: "#fef2f2", color: "#991b1b", border: "1px solid #f87171", borderRadius: "8px", marginBottom: "16px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <span>⚠️ {error}</span>
          <button type="button" onClick={() => setError("")} style={{ background: "transparent", border: 0, cursor: "pointer", color: "inherit", fontWeight: "bold" }}>✕</button>
        </div>
      )}

      {loading && <p>Loading users…</p>}

      {/* Users Data Table */}
      <table className="data-table">
        <thead>
          <tr>
            <th>Name</th>
            <th>Email</th>
            <th>Role</th>
            <th>Branch &amp; Profile</th>
            <th>Created</th>
            <th style={{ textAlign: "right" }}>Actions</th>
          </tr>
        </thead>
        <tbody>
          {users.map((user) => {
            const isSelf = Boolean(currentUser && user.id === currentUser.id);

            return (
              <tr key={user.id} style={isSelf ? { backgroundColor: "#f8fafc" } : undefined}>
                <td>
                  <strong>{user.name}</strong>
                  {isSelf && <span className="badge-you">You</span>}
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
                <td className="row-actions" style={{ textAlign: "right" }}>
                  {canManage && (
                    <>
                      <button
                        type="button"
                        onClick={() => {
                          setFormError("");
                          setEditing(user);
                        }}
                      >
                        Edit
                      </button>
                      <button
                        type="button"
                        className="danger"
                        disabled={isSelf}
                        title={isSelf ? "You cannot delete your own account" : `Remove ${user.name}`}
                        onClick={() => handleDelete(user)}
                        style={isSelf ? { opacity: 0.4, cursor: "not-allowed" } : undefined}
                      >
                        Delete
                      </button>
                    </>
                  )}
                </td>
              </tr>
            );
          })}
          {!loading && users.length === 0 && (
            <tr>
              <td colSpan={6} className="empty">
                No users match this filter.
              </td>
            </tr>
          )}
        </tbody>
      </table>

      {/* Pagination Footer */}
      {pagination.last_page > 1 && (
        <div className="user-pagination-footer">
          <span style={{ fontSize: "12px", color: "#64748b" }}>
            Showing {startRecord} to {endRecord} of {pagination.total} users
          </span>
          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <button
              type="button"
              className="secondary"
              disabled={loading || pagination.current_page <= 1}
              onClick={() => setPage((c) => Math.max(1, c - 1))}
              style={{ padding: "5px 12px", fontSize: "12px" }}
            >
              Previous
            </button>
            <span style={{ fontSize: "12px", color: "#334155", fontWeight: "600" }}>
              Page {pagination.current_page} of {pagination.last_page}
            </span>
            <button
              type="button"
              className="secondary"
              disabled={loading || pagination.current_page >= pagination.last_page}
              onClick={() => setPage((c) => Math.min(pagination.last_page, c + 1))}
              style={{ padding: "5px 12px", fontSize: "12px" }}
            >
              Next
            </button>
          </div>
        </div>
      )}

      {/* Edit / Create Form Modal Overlay */}
      {canManage && editing && (
        <UserForm
          initial={editing === "new" ? null : editing}
          currentUser={currentUser}
          drivers={drivers}
          offices={offices}
          assignedDriverIds={assignedDriverIds}
          submitting={submitting}
          error={formError}
          onSubmit={handleSubmit}
          onCancel={() => {
            setEditing(null);
            setFormError("");
          }}
        />
      )}
    </div>
  );
}
