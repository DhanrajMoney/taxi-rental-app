import React, { useEffect, useState } from "react";
import { SettingAPI } from "../api/client.js";
import "../styles/settings.css";

const DEFAULT_SETTINGS = {
  company_name: "Rent A Ride Desk",
  company_email: "admin@ridedesk.test",
  company_phone: "+91 98765 43210",
  currency_symbol: "₹",
  currency_code: "INR",
  tax_percentage: "5.00",
  document_expiry_alert_days: "30",
  maintenance_alert_days: "30",
  default_booking_status: "pending",
  terms_and_conditions: "Standard rental terms apply to all bookings.",
};

const TAB_META = [
  { id: "general", label: "Company Profile", icon: "🏢" },
  { id: "finance", label: "Finance & Currency", icon: "💵" },
  { id: "alerts", label: "Operational Thresholds", icon: "🚨" },
  { id: "terms", label: "Rental Terms & Policies", icon: "📜" },
];

export default function Settings() {
  const [activeTab, setActiveTab] = useState("general");
  const [settings, setSettings] = useState(DEFAULT_SETTINGS);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  useEffect(() => {
    loadSettings();
  }, []);

  function loadSettings() {
    setLoading(true);
    setError("");
    SettingAPI.get()
      .then((data) => {
        if (data.settings) {
          setSettings((prev) => ({ ...prev, ...data.settings }));
        }
      })
      .catch(() => setError("Failed to load settings."))
      .finally(() => setLoading(false));
  }

  function handleChange(field, value) {
    setSettings((prev) => ({ ...prev, [field]: value }));
  }

  function handleSubmit(e) {
    e.preventDefault();
    setSaving(true);
    setError("");
    setSuccess("");

    SettingAPI.update(settings)
      .then((res) => {
        setSuccess(res.message || "Settings updated successfully.");
        if (res.settings) {
          setSettings((prev) => ({ ...prev, ...res.settings }));
        }
      })
      .catch((err) => setError(err.response?.data?.message || "Failed to save settings."))
      .finally(() => setSaving(false));
  }

  if (loading) return <p className="loading">Loading settings...</p>;

  return (
    <div className="page settings-page">
      <div className="page-header">
        <div>
          <h2>System Settings</h2>
          <p className="description">Manage business details, operational alert thresholds, tax rates, and booking policies.</p>
        </div>
      </div>

      {/* Top Settings Summary Bar */}
      <div className="settings-summary-strip">
        <div className="settings-summary-item">
          <div className="settings-summary-icon">🏢</div>
          <div className="settings-summary-info">
            <label>Business Name</label>
            <strong>{settings.company_name || "Rent A Ride Desk"}</strong>
          </div>
        </div>

        <div className="settings-summary-item">
          <div className="settings-summary-icon">💵</div>
          <div className="settings-summary-info">
            <label>Currency &amp; Tax</label>
            <strong>{settings.currency_symbol || "₹"} {settings.currency_code || "INR"} ({settings.tax_percentage || "5.00"}% Tax)</strong>
          </div>
        </div>

        <div className="settings-summary-item">
          <div className="settings-summary-icon">🚨</div>
          <div className="settings-summary-info">
            <label>Doc Expiry Warning</label>
            <strong>{settings.document_expiry_alert_days || "30"} Days Threshold</strong>
          </div>
        </div>

        <div className="settings-summary-item">
          <div className="settings-summary-icon">🛠</div>
          <div className="settings-summary-info">
            <label>Maintenance Warning</label>
            <strong>{settings.maintenance_alert_days || "30"} Days Threshold</strong>
          </div>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="settings-tabs" role="tablist">
        {TAB_META.map((tab) => (
          <button
            key={tab.id}
            type="button"
            className={`settings-tab-btn ${activeTab === tab.id ? "active" : ""}`}
            onClick={() => { setActiveTab(tab.id); setError(""); setSuccess(""); }}
            role="tab"
          >
            <span>{tab.icon}</span>
            {tab.label}
          </button>
        ))}
      </div>

      {/* Notifications */}
      {error && <div className="settings-alert error" role="alert">⚠️ {error}</div>}
      {success && <div className="settings-alert success" role="status">✓ {success}</div>}

      <form onSubmit={handleSubmit}>
        {/* Tab 1: Company Profile */}
        {activeTab === "general" && (
          <section className="settings-card">
            <div className="settings-card-header">
              <span className="header-icon">🏢</span>
              <div>
                <h3>Company Profile &amp; Contact Details</h3>
                <p>Primary business identity, support email, and phone contact for staff and customers.</p>
              </div>
            </div>

            <div className="settings-grid">
              <div className="field-group">
                <label>Company / Business Name</label>
                <input
                  required
                  value={settings.company_name || ""}
                  onChange={(e) => handleChange("company_name", e.target.value)}
                  placeholder="e.g. Rent A Ride Desk"
                />
                <span className="field-hint">Appears on invoices, booking slips, and reports.</span>
              </div>

              <div className="field-group">
                <label>Support Email Address</label>
                <input
                  type="email"
                  required
                  value={settings.company_email || ""}
                  onChange={(e) => handleChange("company_email", e.target.value)}
                  placeholder="support@ridedesk.test"
                />
                <span className="field-hint">Primary operational email for customer inquiries.</span>
              </div>

              <div className="field-group">
                <label>Support Phone Number</label>
                <input
                  required
                  value={settings.company_phone || ""}
                  onChange={(e) => handleChange("company_phone", e.target.value)}
                  placeholder="+91 98765 43210"
                />
                <span className="field-hint">Primary hotline for booking support.</span>
              </div>
            </div>
          </section>
        )}

        {/* Tab 2: Finance & Currency */}
        {activeTab === "finance" && (
          <section className="settings-card">
            <div className="settings-card-header">
              <span className="header-icon">💵</span>
              <div>
                <h3>Finance &amp; Currency Format</h3>
                <p>Configure display currency symbols, codes, and default rental tax calculations.</p>
              </div>
            </div>

            <div className="settings-grid">
              <div className="field-group">
                <label>Currency Symbol</label>
                <input
                  required
                  value={settings.currency_symbol || ""}
                  onChange={(e) => handleChange("currency_symbol", e.target.value)}
                  placeholder="₹ or $"
                />
                <span className="field-hint">Used across revenue tables and booking forms.</span>
              </div>

              <div className="field-group">
                <label>Currency Code</label>
                <input
                  required
                  value={settings.currency_code || ""}
                  onChange={(e) => handleChange("currency_code", e.target.value)}
                  placeholder="INR or USD"
                />
                <span className="field-hint">ISO currency code for exports and accounting.</span>
              </div>

              <div className="field-group">
                <label>Applicable Tax Percentage (%)</label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  max="100"
                  value={settings.tax_percentage || ""}
                  onChange={(e) => handleChange("tax_percentage", e.target.value)}
                  placeholder="5.00"
                />
                <span className="field-hint">Default tax percentage calculated on finalized fares.</span>
              </div>
            </div>
          </section>
        )}

        {/* Tab 3: Operational Thresholds */}
        {activeTab === "alerts" && (
          <section className="settings-card">
            <div className="settings-card-header">
              <span className="header-icon">🚨</span>
              <div>
                <h3>Operational Alert Thresholds</h3>
                <p>Customize days-before-expiry warnings for documents, maintenance schedules, and initial booking states.</p>
              </div>
            </div>

            <div className="settings-grid">
              <div className="field-group">
                <label>Document Expiry Warning Threshold (Days)</label>
                <input
                  type="number"
                  min="1"
                  max="180"
                  required
                  value={settings.document_expiry_alert_days || "30"}
                  onChange={(e) => handleChange("document_expiry_alert_days", e.target.value)}
                />
                <span className="field-hint">Highlight driver licenses and insurance due within these days.</span>
              </div>

              <div className="field-group">
                <label>Maintenance Check Warning Threshold (Days)</label>
                <input
                  type="number"
                  min="1"
                  max="180"
                  required
                  value={settings.maintenance_alert_days || "30"}
                  onChange={(e) => handleChange("maintenance_alert_days", e.target.value)}
                />
                <span className="field-hint">Alert staff when taxi next service date is within this period.</span>
              </div>

              <div className="field-group">
                <label>Default Initial Booking Status</label>
                <select
                  value={settings.default_booking_status || "pending"}
                  onChange={(e) => handleChange("default_booking_status", e.target.value)}
                >
                  <option value="pending">Pending (Awaiting Taxi/Driver confirmation)</option>
                  <option value="confirmed">Confirmed (Instant reservation)</option>
                </select>
                <span className="field-hint">Initial state for new customer booking requests.</span>
              </div>
            </div>
          </section>
        )}

        {/* Tab 4: Rental Terms & Policies */}
        {activeTab === "terms" && (
          <section className="settings-card">
            <div className="settings-card-header">
              <span className="header-icon">📜</span>
              <div>
                <h3>Rental Agreement Terms &amp; Conditions</h3>
                <p>Define standard terms, mileage policies, and cancellation conditions included on booking confirmations.</p>
              </div>
            </div>

            <div className="field-group">
              <label>Terms &amp; Conditions Text</label>
              <textarea
                rows="6"
                value={settings.terms_and_conditions || ""}
                onChange={(e) => handleChange("terms_and_conditions", e.target.value)}
                placeholder="Enter standard rental terms, driver requirements, and cancellation policies..."
              />
              <span className="field-hint">Printed on customer receipts and rental agreement contracts.</span>
            </div>
          </section>
        )}

        {/* Save Bar */}
        <div className="settings-actions">
          <button type="submit" className="btn-primary" disabled={saving}>
            {saving ? "💾 Saving Settings..." : "💾 Save System Settings"}
          </button>
        </div>
      </form>
    </div>
  );
}
