import React, { useEffect, useState } from "react";
import { ProfileAPI } from "../api/client.js";
import { formatDate, getInitials } from "../utils/format.js";
import "../styles/profile-modal.css";

const ROLE_INFO = {
  admin: {
    label: "Administrator",
    desc: "Full administrative & system access",
    icon: "👑",
    class: "admin",
  },
  staff: {
    label: "Operations Staff",
    desc: "Fleet dispatch & bookings management",
    icon: "💼",
    class: "staff",
  },
  driver: {
    label: "Driver Partner",
    desc: "Assigned vehicle trips & personal roster",
    icon: "🚗",
    class: "driver",
  },
};

export default function ProfileModal({ user, onClose, onUserUpdate }) {
  const [activeTab, setActiveTab] = useState("details");

  // Profile fields
  const [name, setName] = useState(user?.name || "");
  const [email, setEmail] = useState(user?.email || "");

  // Password fields
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  // Activity fields
  const [loginActivity, setLoginActivity] = useState([]);

  // States
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const roleMeta = ROLE_INFO[user?.role] || ROLE_INFO.staff;
  const initials = getInitials(user?.name);

  // Close on Escape key
  useEffect(() => {
    function handleKeyDown(e) {
      if (e.key === "Escape") {
        onClose();
      }
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onClose]);

  // Load login activity when switching to that tab
  useEffect(() => {
    if (activeTab === "activity") {
      setLoading(true);
      setError("");
      ProfileAPI.loginActivity()
        .then((res) => {
          setLoginActivity(res.data || res || []);
        })
        .catch(() => setError("Could not load recent login activity."))
        .finally(() => setLoading(false));
    }
  }, [activeTab]);

  async function handleProfileSave(e) {
    e.preventDefault();
    setError("");
    setSuccess("");

    if (!name.trim()) {
      setError("Full name is required.");
      return;
    }
    if (!email.trim()) {
      setError("Email address is required.");
      return;
    }

    try {
      setLoading(true);
      const res = await ProfileAPI.update({ name: name.trim(), email: email.trim() });
      setSuccess(res.message || "Profile details updated successfully.");
      if (onUserUpdate && res.user) {
        onUserUpdate(res.user);
      }
    } catch (err) {
      setError(err?.response?.data?.message || "Failed to update profile.");
    } finally {
      setLoading(false);
    }
  }

  async function handlePasswordChange(e) {
    e.preventDefault();
    setError("");
    setSuccess("");

    if (!currentPassword) {
      setError("Current password is required.");
      return;
    }
    if (newPassword.length < 8) {
      setError("New password must be at least 8 characters long.");
      return;
    }
    if (newPassword !== confirmPassword) {
      setError("New passwords do not match.");
      return;
    }

    try {
      setLoading(true);
      const res = await ProfileAPI.changePassword({
        current_password: currentPassword,
        password: newPassword,
        password_confirmation: confirmPassword,
      });
      setSuccess(res.message || "Password changed successfully.");
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    } catch (err) {
      setError(err?.response?.data?.message || "Failed to change password. Please check your current password.");
    } finally {
      setLoading(false);
    }
  }

  function switchTab(tab) {
    setActiveTab(tab);
    setError("");
    setSuccess("");
  }

  return (
    <div
      className="prf-modal-overlay"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-labelledby="prf-modal-title"
    >
      <div className="prf-modal-dialog" onClick={(e) => e.stopPropagation()}>
        {/* ── 1. Hero Profile Header ── */}
        <div className="prf-hero-header">
          <div className="prf-avatar-circle" aria-hidden="true">
            {initials}
          </div>

          <div className="prf-hero-meta">
            <h2 id="prf-modal-title" className="prf-hero-name" title={user?.name}>
              {user?.name || "User Profile"}
            </h2>
            <div className="prf-hero-email" title={user?.email}>
              {user?.email}
            </div>

            <div className="prf-hero-badges">
              <span className={`prf-role-badge ${roleMeta.class}`}>
                <span>{roleMeta.icon}</span>
                <span>{roleMeta.label}</span>
              </span>

              <span className="prf-office-badge">
                <span>🏢</span>
                <span>{user?.office?.name || "Head Office / Central"}</span>
              </span>
            </div>
          </div>

          <button
            type="button"
            className="prf-close-btn"
            onClick={onClose}
            title="Close profile (Esc)"
            aria-label="Close modal"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" width="18" height="18">
              <path d="M18 6 6 18M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* ── 2. Tab Navigation Bar ── */}
        <div className="prf-tab-bar" role="tablist">
          <button
            type="button"
            role="tab"
            aria-selected={activeTab === "details"}
            className={`prf-tab-btn${activeTab === "details" ? " active" : ""}`}
            onClick={() => switchTab("details")}
          >
            <span>👤</span> Personal Details
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={activeTab === "password"}
            className={`prf-tab-btn${activeTab === "password" ? " active" : ""}`}
            onClick={() => switchTab("password")}
          >
            <span>🔐</span> Security &amp; Password
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={activeTab === "activity"}
            className={`prf-tab-btn${activeTab === "activity" ? " active" : ""}`}
            onClick={() => switchTab("activity")}
          >
            <span>🕒</span> Login Activity
          </button>
        </div>

        {/* ── 3. Modal Body ── */}
        <div className="prf-modal-body">
          {/* Notifications */}
          {error && (
            <div className="prf-alert-error" role="alert">
              <span>⚠️</span>
              <span>{error}</span>
            </div>
          )}
          {success && (
            <div className="prf-alert-success" role="status">
              <span>✅</span>
              <span>{success}</span>
            </div>
          )}

          {/* TAB 1: PERSONAL DETAILS */}
          {activeTab === "details" && (
            <>
              {/* Meta information summary cards */}
              <div className="prf-meta-grid">
                <div className="prf-meta-card">
                  <span className="prf-meta-card-label">
                    <span>🛡️</span> Account Role
                  </span>
                  <span className="prf-meta-card-val">{roleMeta.label}</span>
                  <span className="prf-meta-card-sub">{roleMeta.desc}</span>
                </div>

                <div className="prf-meta-card">
                  <span className="prf-meta-card-label">
                    <span>🏢</span> Assigned Office
                  </span>
                  <span className="prf-meta-card-val">{user?.office?.name || "Head Office / All Branches"}</span>
                  <span className="prf-meta-card-sub">{user?.office?.city || "Primary Operating Base"}</span>
                </div>

                <div className="prf-meta-card">
                  <span className="prf-meta-card-label">
                    <span>📅</span> Member Since
                  </span>
                  <span className="prf-meta-card-val">
                    {user?.created_at ? formatDate(user.created_at) : "Active Account"}
                  </span>
                  <span className="prf-meta-card-sub">Registered platform user</span>
                </div>

                <div className="prf-meta-card">
                  <span className="prf-meta-card-label">
                    <span>🪪</span> Account ID
                  </span>
                  <span className="prf-meta-card-val" style={{ fontFamily: "monospace" }}>
                    USR-#{String(user?.id || 1).padStart(4, "0")}
                  </span>
                  <span className="prf-meta-card-sub">Internal system identifier</span>
                </div>
              </div>

              {/* Editable Name & Email Form */}
              <form onSubmit={handleProfileSave} className="prf-form">
                <div className="prf-field-group">
                  <label className="prf-field-label">
                    Full Name <span className="req">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    className="prf-field-input"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="e.g. John Doe"
                  />
                </div>

                <div className="prf-field-group">
                  <label className="prf-field-label">
                    Email Address <span className="req">*</span>
                  </label>
                  <input
                    type="email"
                    required
                    className="prf-field-input"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="name@example.com"
                  />
                </div>

                <div style={{ display: "flex", justifyContent: "flex-end", marginTop: "0.5rem" }}>
                  <button
                    type="submit"
                    className="prf-btn-primary"
                    disabled={loading}
                  >
                    {loading ? "Saving Changes..." : "Save Profile Details"}
                  </button>
                </div>
              </form>
            </>
          )}

          {/* TAB 2: SECURITY & PASSWORD */}
          {activeTab === "password" && (
            <form onSubmit={handlePasswordChange} className="prf-form">
              <div className="prf-field-group">
                <label className="prf-field-label">
                  Current Password <span className="req">*</span>
                </label>
                <input
                  type="password"
                  required
                  className="prf-field-input"
                  placeholder="Enter your current password"
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  autoComplete="current-password"
                />
              </div>

              <div className="prf-field-group">
                <label className="prf-field-label">
                  New Password <span className="req">*</span>
                </label>
                <input
                  type="password"
                  required
                  className="prf-field-input"
                  placeholder="At least 8 characters"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  autoComplete="new-password"
                />
                <span style={{ fontSize: "0.74rem", color: "#64748b" }}>
                  Must contain a minimum of 8 characters.
                </span>
              </div>

              <div className="prf-field-group">
                <label className="prf-field-label">
                  Confirm New Password <span className="req">*</span>
                </label>
                <input
                  type="password"
                  required
                  className="prf-field-input"
                  placeholder="Re-enter your new password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  autoComplete="new-password"
                />
              </div>

              <div style={{ display: "flex", justifyContent: "flex-end", marginTop: "0.5rem" }}>
                <button
                  type="submit"
                  className="prf-btn-primary"
                  disabled={loading}
                >
                  {loading ? "Updating..." : "Update Password"}
                </button>
              </div>
            </form>
          )}

          {/* TAB 3: LOGIN ACTIVITY */}
          {activeTab === "activity" && (
            <div>
              {loading && loginActivity.length === 0 ? (
                <div style={{ textAlign: "center", padding: "2rem", color: "#64748b" }}>
                  ⏳ Loading login audit logs...
                </div>
              ) : loginActivity.length === 0 ? (
                <div style={{ textAlign: "center", padding: "2rem", color: "#64748b" }}>
                  No previous login activity records found.
                </div>
              ) : (
                <div className="prf-table-wrap">
                  <table className="prf-activity-table">
                    <thead>
                      <tr>
                        <th>Login Timestamp</th>
                        <th>IP Address</th>
                        <th>Client / Environment</th>
                        <th>Session</th>
                      </tr>
                    </thead>
                    <tbody>
                      {loginActivity.map((log, idx) => (
                        <tr key={log.id || idx}>
                          <td>
                            <strong>{formatDate(log.logged_in_at)}</strong>
                          </td>
                          <td>
                            <span className="prf-ip-badge">{log.ip_address || "127.0.0.1"}</span>
                          </td>
                          <td style={{ color: "#64748b", fontSize: "0.78rem" }}>
                            {log.user_agent ? (
                              <span title={log.user_agent}>
                                {log.user_agent.length > 25
                                  ? `${log.user_agent.substring(0, 25)}...`
                                  : log.user_agent}
                              </span>
                            ) : (
                              "Web Browser Session"
                            )}
                          </td>
                          <td>
                            {idx === 0 ? (
                              <span className="prf-status-pill active">
                                🟢 Current
                              </span>
                            ) : (
                              <span className="prf-status-pill past">
                                Recorded
                              </span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}
        </div>

        {/* ── 4. Modal Footer ── */}
        <div className="prf-modal-footer">
          <span className="prf-footer-meta">
            Rent A Ride Desk • User ID #{user?.id || 1}
          </span>
          <button type="button" className="prf-btn-secondary" onClick={onClose}>
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
