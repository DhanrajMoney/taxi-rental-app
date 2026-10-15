import React, { useEffect, useState } from "react";
import { ImportAPI } from "../api/client.js";
import { formatDate } from "../utils/formatDate.js";
import "../styles/import.css";

const TEMPLATE_META = [
  {
    type: "customers",
    title: "1. Customers",
    seq: "Step 1 of 4",
    icon: "👥",
    desc: "Customer names, contact numbers, email addresses, and location details.",
  },
  {
    type: "taxis",
    title: "2. Taxi Fleet",
    seq: "Step 2 of 4",
    icon: "🚕",
    desc: "Vehicle registration number, make/model, seating, fuel, rate per day/km.",
  },
  {
    type: "drivers",
    title: "3. Driver Roster",
    seq: "Step 3 of 4",
    icon: "👨‍✈️",
    desc: "Driver name, phone, license number, license expiry date, and status.",
  },
  {
    type: "bookings",
    title: "4. Reservations",
    seq: "Step 4 of 4",
    icon: "📅",
    desc: "Historical trips matched by taxi registration and driver license number.",
  },
];

export default function ImportData() {
  const [entityType, setEntityType] = useState("customers");
  const [selectedFile, setSelectedFile] = useState(null);
  const [preview, setPreview] = useState(null);
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  useEffect(() => {
    loadHistory();
  }, []);

  function loadHistory() {
    ImportAPI.getHistory()
      .then((data) => setHistory(data))
      .catch(() => {});
  }

  function handleFileChange(e) {
    const file = e.target.files?.[0] || null;
    setSelectedFile(file);
    setPreview(null);
    setError("");
    setMessage("");
  }

  function handlePreview(e) {
    e.preventDefault();
    if (!selectedFile) return;

    setLoading(true);
    setError("");
    setMessage("");

    const formData = new FormData();
    formData.append("entity_type", entityType);
    formData.append("file", selectedFile);

    ImportAPI.preview(formData)
      .then((data) => setPreview(data))
      .catch((err) => setError(err.response?.data?.message || "Failed to parse CSV file preview."))
      .finally(() => setLoading(false));
  }

  function handleConfirm() {
    if (!preview || !preview.rows?.length) return;

    setConfirming(true);
    setError("");
    setMessage("");

    const validRows = preview.rows.filter((r) => r.status === "valid" || r.status === "duplicate");

    ImportAPI.confirm({
      entity_type: entityType,
      file_name: preview.file_name,
      rows: validRows,
    })
      .then((res) => {
        setMessage(res.message);
        setPreview(null);
        setSelectedFile(null);
        loadHistory();
      })
      .catch((err) => setError(err.response?.data?.message || "Import execution failed."))
      .finally(() => setConfirming(false));
  }

  const currentStep = preview ? 3 : selectedFile ? 2 : 1;

  return (
    <div className="page import-page">
      <div className="page-header">
        <div>
          <h2>Excel &amp; CSV Data Import</h2>
          <p className="description">Import historical customer, taxi, driver, and reservation records into RideDesk with pre-validation.</p>
        </div>
      </div>

      {/* Stepper Workflow Header */}
      <div className="import-stepper">
        <div className={`import-step-item ${currentStep >= 1 ? "active" : ""}`}>
          <span className="import-step-number">1</span>
          <span>Download Sample Template</span>
        </div>
        <div className="import-step-divider"></div>
        <div className={`import-step-item ${currentStep >= 2 ? "active" : ""}`}>
          <span className="import-step-number">2</span>
          <span>Upload File &amp; Validate</span>
        </div>
        <div className="import-step-divider"></div>
        <div className={`import-step-item ${currentStep >= 3 ? "active" : ""}`}>
          <span className="import-step-number">3</span>
          <span>Review &amp; Confirm</span>
        </div>
      </div>

      {/* Alerts */}
      {error && <div className="settings-alert error" role="alert">⚠️ {error}</div>}
      {message && <div className="settings-alert success" role="status">✓ {message}</div>}

      {/* Step 1: Template Cards */}
      <section className="settings-card" style={{ marginBottom: "24px" }}>
        <div className="settings-card-header">
          <span className="header-icon">📥</span>
          <div>
            <h3>Step 1: Download Sample Templates</h3>
            <p>Download pre-formatted CSV templates. Import in dependency order (Customers → Taxis → Drivers → Bookings).</p>
          </div>
        </div>

        <div className="import-template-grid">
          {TEMPLATE_META.map((tmpl) => (
            <div key={tmpl.type} className="import-template-card">
              <div>
                <div className="import-template-header">
                  <span className="import-template-icon">{tmpl.icon}</span>
                  <div>
                    <span className="import-template-seq">{tmpl.seq}</span>
                    <div className="import-template-title">{tmpl.title}</div>
                  </div>
                </div>
                <p className="import-template-desc">{tmpl.desc}</p>
              </div>
              <a
                href={ImportAPI.getTemplateUrl(tmpl.type)}
                download
                className="button secondary"
                style={{ width: "100%", justifyContent: "center", textDecoration: "none" }}
              >
                📥 Download CSV
              </a>
            </div>
          ))}
        </div>
      </section>

      {/* Step 2: Upload File */}
      <section className="settings-card" style={{ marginBottom: "24px" }}>
        <div className="settings-card-header">
          <span className="header-icon">📤</span>
          <div>
            <h3>Step 2: Upload CSV File &amp; Choose Record Type</h3>
            <p>Select the record type and upload your CSV spreadsheet for automated validation.</p>
          </div>
        </div>

        <form onSubmit={handlePreview}>
          <div className="grid" style={{ marginBottom: "20px" }}>
            <div className="field-group">
              <label>Target Record Type</label>
              <select value={entityType} onChange={(e) => { setEntityType(e.target.value); setPreview(null); }}>
                <option value="customers">👥 1. Customers (Import First)</option>
                <option value="taxis">🚕 2. Taxi Fleet (Import Second)</option>
                <option value="drivers">👨‍✈️ 3. Driver Roster (Import Third)</option>
                <option value="bookings">📅 4. Reservations (Import Last)</option>
              </select>
              <span className="field-hint">Select the record type corresponding to your file headers.</span>
            </div>
          </div>

          <div className="field-group">
            <label>CSV Spreadsheet File</label>
            <label className={`import-dropzone ${selectedFile ? "has-file" : ""}`}>
              <input type="file" accept=".csv,text/csv" onChange={handleFileChange} style={{ display: "none" }} required />
              <div className="import-dropzone-icon">📄</div>
              <div className="import-dropzone-text">
                {selectedFile ? "CSV File Selected" : "Click to select a CSV file"}
              </div>
              <div className="import-dropzone-subtext">
                Supports .csv files (max 5 MB)
              </div>
              {selectedFile && (
                <div className="import-file-badge">
                  <span>📊 {selectedFile.name} ({(selectedFile.size / 1024).toFixed(1)} KB)</span>
                </div>
              )}
            </label>
          </div>

          <div className="settings-actions" style={{ marginTop: "20px" }}>
            <button type="submit" className="btn-primary" disabled={loading || !selectedFile}>
              {loading ? "🔍 Validating CSV Rows..." : "🔍 Preview &amp; Validate CSV"}
            </button>
          </div>
        </form>
      </section>

      {/* Step 3: Review Preview */}
      {preview && (
        <section className="settings-card" style={{ marginBottom: "24px" }}>
          <div className="settings-card-header">
            <span className="header-icon">📋</span>
            <div>
              <h3>Step 3: Validation Preview — {preview.file_name}</h3>
              <p>Review validation statuses, detected duplicates, and row-by-row error logs before confirming.</p>
            </div>
          </div>

          {/* Validation Metrics */}
          <div className="settings-summary-strip" style={{ marginBottom: "20px" }}>
            <div className="settings-summary-item">
              <div className="settings-summary-icon">📊</div>
              <div className="settings-summary-info">
                <label>Total Rows</label>
                <strong>{preview.total_rows} Rows</strong>
              </div>
            </div>

            <div className="settings-summary-item">
              <div className="settings-summary-icon" style={{ background: "#eaf8f4", color: "#0d6854" }}>✓</div>
              <div className="settings-summary-info">
                <label>Valid Rows</label>
                <strong style={{ color: "#0d6854" }}>{preview.valid_rows} Ready</strong>
              </div>
            </div>

            <div className="settings-summary-item">
              <div className="settings-summary-icon" style={{ background: "#fff8ec", color: "#c46624" }}>🔄</div>
              <div className="settings-summary-info">
                <label>Duplicates / Updates</label>
                <strong style={{ color: "#c46624" }}>{preview.duplicate_rows} Detected</strong>
              </div>
            </div>

            <div className="settings-summary-item">
              <div className="settings-summary-icon" style={{ background: "#fdf2f2", color: "#b91c1c" }}>❌</div>
              <div className="settings-summary-info">
                <label>Invalid Rows</label>
                <strong style={{ color: "#b91c1c" }}>{preview.invalid_rows} Errors</strong>
              </div>
            </div>
          </div>

          {/* Table Preview */}
          <div className="table-wrap" style={{ maxHeight: "360px", overflowY: "auto" }}>
            <table className="data-table">
              <thead>
                <tr>
                  <th>Row #</th>
                  <th>Status</th>
                  <th>Record Data Summary</th>
                  <th>Validation Messages</th>
                </tr>
              </thead>
              <tbody>
                {preview.rows.map((row) => {
                  const m = row.mapped;
                  const dataSummary = m.name || m.reg_number || m.customer_name || "Record Row";
                  const subSummary = m.phone || m.make_model || m.license_number || m.pickup_date || "";

                  return (
                    <tr key={row.row_number}>
                      <td>Row {row.row_number}</td>
                      <td>
                        <span className={`badge ${row.status === "valid" ? "confirmed" : row.status === "duplicate" ? "pending" : "cancelled"}`}>
                          {row.status}
                        </span>
                      </td>
                      <td>
                        <strong>{dataSummary}</strong>
                        {subSummary && <div style={{ fontSize: "12px", color: "#6b7c85" }}>{subSummary}</div>}
                      </td>
                      <td>
                        {row.errors?.length ? (
                          <ul style={{ color: "#b91c1c", paddingLeft: "1.2rem", margin: 0, fontSize: "13px" }}>
                            {row.errors.map((err, i) => <li key={i}>{err}</li>)}
                          </ul>
                        ) : (
                          <span style={{ color: "#0d6854", fontSize: "13px", fontWeight: "600" }}>✓ Ready for database write</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <div className="settings-actions" style={{ marginTop: "24px" }}>
            <button type="button" className="button secondary" onClick={() => setPreview(null)}>
              Cancel
            </button>
            <button
              type="button"
              className="btn-primary"
              onClick={handleConfirm}
              disabled={confirming || preview.valid_rows + preview.duplicate_rows === 0}
            >
              {confirming ? "⚙ Importing Records..." : `🚀 Confirm Import (${preview.valid_rows + preview.duplicate_rows} Rows)`}
            </button>
          </div>
        </section>
      )}

      {/* History Log Table */}
      <section className="settings-card">
        <div className="settings-card-header">
          <span className="header-icon">📜</span>
          <div>
            <h3>Import Audit History Log</h3>
            <p>Historical log of past data imports, user activity, row counts, and completion statuses.</p>
          </div>
        </div>

        <div className="table-wrap">
          <table className="data-table">
            <thead>
              <tr>
                <th>Date &amp; Time</th>
                <th>Entity Type</th>
                <th>File Name</th>
                <th>Total Rows</th>
                <th>Imported</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {history.map((log) => (
                <tr key={log.id}>
                  <td>{formatDate(log.created_at)}</td>
                  <td style={{ textTransform: "capitalize", fontWeight: "700" }}>{log.entity_type}</td>
                  <td>{log.file_name}</td>
                  <td>{log.total_rows}</td>
                  <td><strong>{log.imported_rows}</strong></td>
                  <td>
                    <span className={`badge ${log.status === "completed" ? "confirmed" : "cancelled"}`}>
                      {log.status}
                    </span>
                  </td>
                </tr>
              ))}
              {!history.length && (
                <tr>
                  <td colSpan="6" className="empty">No import history recorded yet.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
