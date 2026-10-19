import React, { useCallback, useEffect, useMemo, useState } from "react";
import { SettingAPI } from "../api/client.js";
import "../styles/settings.css";

const DEFAULT_SETTINGS = {
  company_name: "Rent A Ride Desk",
  company_gst_number: "27AADCR2345A1Z1",
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

const TAB_FIELDS = {
  general: ["company_name", "company_gst_number", "company_email", "company_phone"],
  finance: ["currency_symbol", "currency_code", "tax_percentage"],
  alerts: ["document_expiry_alert_days", "maintenance_alert_days", "default_booking_status"],
  terms: ["terms_and_conditions"],
};

export default function Settings() {
  const [activeTab, setActiveTab] = useState("general");
  const [settings, setSettings] = useState(DEFAULT_SETTINGS);
  const [savedSettings, setSavedSettings] = useState(DEFAULT_SETTINGS);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [fieldError, setFieldError] = useState(null);
  const [success, setSuccess] = useState("");

  // O(k) dirty checking across defined keys
  const isDirty = useMemo(() => {
    return Object.keys(DEFAULT_SETTINGS).some(
      (key) => (settings[key] ?? "") !== (savedSettings[key] ?? "")
    );
  }, [settings, savedSettings]);

  // Fast Set lookup for tabs with modified values
  const dirtyTabs = useMemo(() => {
    const dirtySet = new Set();
    for (const [tabId, fields] of Object.entries(TAB_FIELDS)) {
      if (fields.some((f) => (settings[f] ?? "") !== (savedSettings[f] ?? ""))) {
        dirtySet.add(tabId);
      }
    }
    return dirtySet;
  }, [settings, savedSettings]);

  // Auto-dismiss success alert after 4.5 seconds
  useEffect(() => {
    if (!success) return;
    const timer = setTimeout(() => {
      setSuccess("");
    }, 4500);
    return () => clearTimeout(timer);
  }, [success]);

  // Warn user on tab close/reload if there are unsaved edits
  useEffect(() => {
    const handleBeforeUnload = (e) => {
      if (isDirty) {
        e.preventDefault();
        e.returnValue = "You have unsaved changes in system settings.";
      }
    };
    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, [isDirty]);

  // Load initial settings from API
  const loadSettings = useCallback(() => {
    setLoading(true);
    setError("");
    setFieldError(null);
    SettingAPI.get()
      .then((data) => {
        if (data.settings) {
          const merged = { ...DEFAULT_SETTINGS, ...data.settings };
          setSettings(merged);
          setSavedSettings(merged);
        }
      })
      .catch(() => setError("Failed to load settings."))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    loadSettings();
  }, [loadSettings]);

  const handleChange = useCallback((field, value) => {
    setSettings((prev) => ({ ...prev, [field]: value }));
    setFieldError((prev) => (prev?.field === field ? null : prev));
  }, []);

  const handleReset = useCallback(() => {
    setSettings(savedSettings);
    setError("");
    setFieldError(null);
    setSuccess("");
  }, [savedSettings]);

  const validateSettings = useCallback((data) => {
    // General Tab
    if (!data.company_name || !data.company_name.trim()) {
      return { tab: "general", field: "company_name", message: "Company / Business Name is required." };
    }
    if (!data.company_email || !data.company_email.trim()) {
      return { tab: "general", field: "company_email", message: "Support Email Address is required." };
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(data.company_email.trim())) {
      return { tab: "general", field: "company_email", message: "Please enter a valid email address (e.g. support@domain.com)." };
    }
    if (!data.company_phone || !data.company_phone.trim()) {
      return { tab: "general", field: "company_phone", message: "Support Phone Number is required." };
    }
    if (data.company_gst_number && data.company_gst_number.trim().length > 15) {
      return { tab: "general", field: "company_gst_number", message: "GST / Tax ID Number cannot exceed 15 characters." };
    }

    // Finance Tab
    if (!data.currency_symbol || !data.currency_symbol.trim()) {
      return { tab: "finance", field: "currency_symbol", message: "Currency Symbol is required (e.g. ₹ or $)." };
    }
    if (!data.currency_code || !data.currency_code.trim()) {
      return { tab: "finance", field: "currency_code", message: "ISO Currency Code is required (e.g. INR or USD)." };
    }
    if (data.currency_code.trim().length !== 3) {
      return { tab: "finance", field: "currency_code", message: "Currency Code must be a 3-letter ISO code (e.g. INR, USD)." };
    }
    const tax = Number(data.tax_percentage);
    if (isNaN(tax) || tax < 0 || tax > 100) {
      return { tab: "finance", field: "tax_percentage", message: "Applicable Tax Percentage must be a valid number between 0% and 100%." };
    }

    // Operational Alerts Tab
    const docDays = Number(data.document_expiry_alert_days);
    if (!Number.isInteger(docDays) || docDays < 1 || docDays > 365) {
      return { tab: "alerts", field: "document_expiry_alert_days", message: "Document Expiry Warning threshold must be an integer between 1 and 365 days." };
    }
    const maintDays = Number(data.maintenance_alert_days);
    if (!Number.isInteger(maintDays) || maintDays < 1 || maintDays > 365) {
      return { tab: "alerts", field: "maintenance_alert_days", message: "Maintenance Warning threshold must be an integer between 1 and 365 days." };
    }

    return null;
  }, []);

  const saveSettings = useCallback(() => {
    setError("");
    setFieldError(null);
    setSuccess("");

    const validation = validateSettings(settings);
    if (validation) {
      setActiveTab(validation.tab);
      setFieldError({ field: validation.field, message: validation.message });
      setError(validation.message);
      return;
    }

    // Trim string inputs before submitting
    const payload = {};
    for (const [key, val] of Object.entries(settings)) {
      payload[key] = typeof val === "string" ? val.trim() : val;
    }

    setSaving(true);
    SettingAPI.update(payload)
      .then((res) => {
        setSuccess(res.message || "Settings updated successfully.");
        if (res.settings) {
          const merged = { ...DEFAULT_SETTINGS, ...res.settings };
          setSettings(merged);
          setSavedSettings(merged);
        }
      })
      .catch((err) => {
        const validationErrors = err.response?.data?.errors;
        if (validationErrors) {
          const firstKey = Object.keys(validationErrors)[0];
          const rawField = firstKey.replace(/^settings\./, "");
          const message = validationErrors[firstKey][0];
          const tabEntry = Object.entries(TAB_FIELDS).find(([_, fields]) => fields.includes(rawField));
          if (tabEntry) {
            setActiveTab(tabEntry[0]);
          }
          setFieldError({ field: rawField, message });
          setError(message);
        } else {
          setError(err.response?.data?.message || "Failed to save settings.");
        }
      })
      .finally(() => setSaving(false));
  }, [settings, validateSettings]);

  const handleSubmit = (e) => {
    e.preventDefault();
    saveSettings();
  };

  // Keyboard shortcut: Ctrl+S / Cmd+S to save
  useEffect(() => {
    const handleKeyDown = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "s") {
        e.preventDefault();
        if (isDirty && !saving) {
          saveSettings();
        }
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isDirty, saving, saveSettings]);

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
            <label>Business &amp; GST</label>
            <strong>{settings.company_name || "Rent A Ride Desk"}</strong>
            <span className="settings-summary-sub">GSTIN: {settings.company_gst_number || "Not Registered"}</span>
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
            id={`tab-${tab.id}`}
            type="button"
            className={`settings-tab-btn ${activeTab === tab.id ? "active" : ""}`}
            onClick={() => {
              setActiveTab(tab.id);
              setFieldError(null);
            }}
            role="tab"
            aria-selected={activeTab === tab.id}
            aria-controls={`panel-${tab.id}`}
          >
            <span>{tab.icon}</span>
            {tab.label}
            {dirtyTabs.has(tab.id) && <span className="tab-dirty-dot" title="Unsaved changes in this tab" />}
          </button>
        ))}
      </div>

      {/* Notifications */}
      {error && (
        <div className="settings-alert error" role="alert">
          <div className="alert-body">
            <span>⚠️</span>
            <span>{error}</span>
          </div>
          <button
            type="button"
            className="settings-alert-close"
            onClick={() => setError("")}
            aria-label="Dismiss error"
          >
            ✕
          </button>
        </div>
      )}

      {success && (
        <div className="settings-alert success" role="status">
          <div className="alert-body">
            <span>✓</span>
            <span>{success}</span>
          </div>
          <button
            type="button"
            className="settings-alert-close"
            onClick={() => setSuccess("")}
            aria-label="Dismiss notification"
          >
            ✕
          </button>
        </div>
      )}

      <form onSubmit={handleSubmit} noValidate>
        {/* Tab 1: Company Profile (Persistent DOM) */}
        <section
          id="panel-general"
          className="settings-card"
          role="tabpanel"
          aria-labelledby="tab-general"
          hidden={activeTab !== "general"}
        >
          <div className="settings-card-header">
            <span className="header-icon">🏢</span>
            <div>
              <h3>Company Profile &amp; Contact Details</h3>
              <p>Primary business identity, GST registration, support email, and phone contact for staff and customers.</p>
            </div>
          </div>

          <div className="settings-grid">
            <div className="field-group">
              <label htmlFor="company_name">Company / Business Name</label>
              <input
                id="company_name"
                required
                value={settings.company_name || ""}
                onChange={(e) => handleChange("company_name", e.target.value)}
                placeholder="e.g. Rent A Ride Desk"
                className={fieldError?.field === "company_name" ? "has-error" : ""}
              />
              <span className="field-hint">Appears on invoices, booking slips, and reports.</span>
              {fieldError?.field === "company_name" && <span className="field-error-msg">{fieldError.message}</span>}
            </div>

            <div className="field-group">
              <label htmlFor="company_gst_number">Company GST / Tax ID (GSTIN)</label>
              <input
                id="company_gst_number"
                value={settings.company_gst_number || ""}
                onChange={(e) => handleChange("company_gst_number", e.target.value.toUpperCase())}
                placeholder="e.g. 27AADCR2345A1Z1"
                maxLength={15}
                className={fieldError?.field === "company_gst_number" ? "has-error" : ""}
              />
              <span className="field-hint">15-digit GST identification number for invoices &amp; compliance.</span>
              {fieldError?.field === "company_gst_number" && <span className="field-error-msg">{fieldError.message}</span>}
            </div>

            <div className="field-group">
              <label htmlFor="company_email">Support Email Address</label>
              <input
                id="company_email"
                type="email"
                required
                value={settings.company_email || ""}
                onChange={(e) => handleChange("company_email", e.target.value)}
                placeholder="support@ridedesk.test"
                className={fieldError?.field === "company_email" ? "has-error" : ""}
              />
              <span className="field-hint">Primary operational email for customer inquiries.</span>
              {fieldError?.field === "company_email" && <span className="field-error-msg">{fieldError.message}</span>}
            </div>

            <div className="field-group">
              <label htmlFor="company_phone">Support Phone Number</label>
              <input
                id="company_phone"
                required
                value={settings.company_phone || ""}
                onChange={(e) => handleChange("company_phone", e.target.value)}
                placeholder="+91 98765 43210"
                className={fieldError?.field === "company_phone" ? "has-error" : ""}
              />
              <span className="field-hint">Primary hotline for booking support.</span>
              {fieldError?.field === "company_phone" && <span className="field-error-msg">{fieldError.message}</span>}
            </div>
          </div>
        </section>

        {/* Tab 2: Finance & Currency (Persistent DOM) */}
        <section
          id="panel-finance"
          className="settings-card"
          role="tabpanel"
          aria-labelledby="tab-finance"
          hidden={activeTab !== "finance"}
        >
          <div className="settings-card-header">
            <span className="header-icon">💵</span>
            <div>
              <h3>Finance &amp; Currency Format</h3>
              <p>Configure display currency symbols, codes, and default rental tax calculations.</p>
            </div>
          </div>

          <div className="settings-grid">
            <div className="field-group">
              <label htmlFor="currency_symbol">Currency Symbol</label>
              <input
                id="currency_symbol"
                required
                value={settings.currency_symbol || ""}
                onChange={(e) => handleChange("currency_symbol", e.target.value)}
                placeholder="₹ or $"
                className={fieldError?.field === "currency_symbol" ? "has-error" : ""}
              />
              <span className="field-hint">Used across revenue tables, booking calculations, and forms.</span>
              {fieldError?.field === "currency_symbol" && <span className="field-error-msg">{fieldError.message}</span>}
            </div>

            <div className="field-group">
              <label htmlFor="currency_code">ISO Currency Code</label>
              <input
                id="currency_code"
                required
                maxLength={3}
                value={settings.currency_code || ""}
                onChange={(e) => handleChange("currency_code", e.target.value.toUpperCase())}
                placeholder="INR or USD"
                className={fieldError?.field === "currency_code" ? "has-error" : ""}
              />
              <span className="field-hint">3-letter ISO code for banking, exports, and accounting.</span>
              {fieldError?.field === "currency_code" && <span className="field-error-msg">{fieldError.message}</span>}
            </div>

            <div className="field-group">
              <label htmlFor="tax_percentage">Applicable Tax Percentage (%)</label>
              <input
                id="tax_percentage"
                type="number"
                step="0.01"
                min="0"
                max="100"
                value={settings.tax_percentage ?? ""}
                onChange={(e) => handleChange("tax_percentage", e.target.value)}
                placeholder="5.00"
                className={fieldError?.field === "tax_percentage" ? "has-error" : ""}
              />
              <span className="field-hint">Default tax percentage calculated on finalized fares.</span>
              {fieldError?.field === "tax_percentage" && <span className="field-error-msg">{fieldError.message}</span>}
            </div>
          </div>
        </section>

        {/* Tab 3: Operational Thresholds (Persistent DOM) */}
        <section
          id="panel-alerts"
          className="settings-card"
          role="tabpanel"
          aria-labelledby="tab-alerts"
          hidden={activeTab !== "alerts"}
        >
          <div className="settings-card-header">
            <span className="header-icon">🚨</span>
            <div>
              <h3>Operational Alert Thresholds</h3>
              <p>Customize days-before-expiry warnings for documents, maintenance schedules, and initial booking states.</p>
            </div>
          </div>

          <div className="settings-grid">
            <div className="field-group">
              <label htmlFor="document_expiry_alert_days">Document Expiry Warning Threshold (Days)</label>
              <input
                id="document_expiry_alert_days"
                type="number"
                min="1"
                max="365"
                required
                value={settings.document_expiry_alert_days || "30"}
                onChange={(e) => handleChange("document_expiry_alert_days", e.target.value)}
                className={fieldError?.field === "document_expiry_alert_days" ? "has-error" : ""}
              />
              <span className="field-hint">Highlight driver licenses and insurance due within these days (1-365).</span>
              {fieldError?.field === "document_expiry_alert_days" && <span className="field-error-msg">{fieldError.message}</span>}
            </div>

            <div className="field-group">
              <label htmlFor="maintenance_alert_days">Maintenance Check Warning Threshold (Days)</label>
              <input
                id="maintenance_alert_days"
                type="number"
                min="1"
                max="365"
                required
                value={settings.maintenance_alert_days || "30"}
                onChange={(e) => handleChange("maintenance_alert_days", e.target.value)}
                className={fieldError?.field === "maintenance_alert_days" ? "has-error" : ""}
              />
              <span className="field-hint">Alert staff when taxi next service date is within this period (1-365).</span>
              {fieldError?.field === "maintenance_alert_days" && <span className="field-error-msg">{fieldError.message}</span>}
            </div>

            <div className="field-group">
              <label htmlFor="default_booking_status">Default Initial Booking Status</label>
              <select
                id="default_booking_status"
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

        {/* Tab 4: Rental Terms & Policies (Persistent DOM) */}
        <section
          id="panel-terms"
          className="settings-card"
          role="tabpanel"
          aria-labelledby="tab-terms"
          hidden={activeTab !== "terms"}
        >
          <div className="settings-card-header">
            <span className="header-icon">📜</span>
            <div>
              <h3>Rental Agreement Terms &amp; Conditions</h3>
              <p>Define standard terms, mileage policies, and cancellation conditions included on booking confirmations.</p>
            </div>
          </div>

          <div className="field-group">
            <label htmlFor="terms_and_conditions">Terms &amp; Conditions Text</label>
            <textarea
              id="terms_and_conditions"
              rows="7"
              value={settings.terms_and_conditions || ""}
              onChange={(e) => handleChange("terms_and_conditions", e.target.value)}
              placeholder="Enter standard rental terms, driver requirements, and cancellation policies..."
            />
            <span className="field-hint">Printed on customer receipts and rental agreement contracts.</span>
          </div>
        </section>

        {/* Save Bar */}
        <div className="settings-actions">
          {isDirty && (
            <button
              type="button"
              className="btn-secondary"
              onClick={handleReset}
              disabled={saving}
            >
              ↺ Discard Changes
            </button>
          )}
          <button type="submit" className="btn-primary" disabled={saving}>
            {saving ? "💾 Saving Settings..." : isDirty ? "💾 Save System Settings (Ctrl+S)" : "💾 Save System Settings"}
          </button>
        </div>
      </form>
    </div>
  );
}
