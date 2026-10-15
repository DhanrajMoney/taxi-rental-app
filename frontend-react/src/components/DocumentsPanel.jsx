import { useEffect, useMemo, useState } from "react";
import { DriverAPI, DriverDocumentAPI, TaxiAPI, TaxiDocumentAPI } from "../api/client.js";
import { formatDate } from "../utils/formatDate.js";
import "../styles/documents.css";

const DRIVER_CATEGORIES = [
  { key: "license", label: "Driving License", icon: "🪪", desc: "Commercial & heavy vehicle permit" },
  { key: "insurance", label: "Commercial Insurance", icon: "🛡️", desc: "Driver liability & passenger cover" },
  { key: "background_check", label: "Background Check", icon: "🔍", desc: "Police clearance & verification" },
  { key: "training", label: "Training Certificate", icon: "🎓", desc: "Defensive driving & safety badge" },
  { key: "required", label: "Mandatory Clearance", icon: "📋", desc: "Local authority & municipal permit" },
  { key: "other", label: "Other Document", icon: "📄", desc: "ID proof, medical fitness, or other record" },
];

function computeDocStatus(doc) {
  if (!doc.expiry_date) return doc.status || "Valid";
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const expiry = new Date(doc.expiry_date);
  expiry.setHours(0, 0, 0, 0);
  if (expiry < today) return "Expired";
  const diffDays = Math.ceil((expiry - today) / (1000 * 60 * 60 * 24));
  if (diffDays <= 30) return "Expiring soon";
  return "Valid";
}

function getExpiryMeta(expiryDate) {
  if (!expiryDate) return { text: "No expiry date set", badgeClass: "neutral", days: null };
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const expiry = new Date(expiryDate);
  expiry.setHours(0, 0, 0, 0);
  const diffDays = Math.ceil((expiry - today) / (1000 * 60 * 60 * 24));
  if (diffDays < 0) {
    return { text: `Expired ${Math.abs(diffDays)} days ago`, badgeClass: "expired", days: diffDays };
  }
  if (diffDays === 0) {
    return { text: "Expires today", badgeClass: "expiring-soon", days: 0 };
  }
  if (diffDays <= 30) {
    return { text: `Expiring in ${diffDays} day${diffDays === 1 ? "" : "s"}`, badgeClass: "expiring-soon", days: diffDays };
  }
  return { text: `Valid • ${diffDays} days left`, badgeClass: "valid", days: diffDays };
}

function getFileBadge(filename = "") {
  const lower = filename.toLowerCase();
  if (lower.endsWith(".pdf")) return { ext: "PDF", className: "pdf", icon: "📕" };
  if (lower.endsWith(".png") || lower.endsWith(".jpg") || lower.endsWith(".jpeg") || lower.endsWith(".webp")) {
    return { ext: "IMG", className: "img", icon: "🖼️" };
  }
  return { ext: "DOC", className: "doc", icon: "📄" };
}

const getTaxiDocumentLabel = (type) => type === "insurance" ? "Insurance" : "RC (Registration Certificate)";

export default function DocumentsPanel({ canManage = false, currentUser = null }) {
  const isDriverRole = currentUser?.role === "driver";

  const [selectedType, setSelectedType] = useState(isDriverRole ? "driver" : "driver");
  const [selectedEntityId, setSelectedEntityId] = useState("");
  const [taxiEntities, setTaxiEntities] = useState([]);
  const [driverEntities, setDriverEntities] = useState([]);
  const [taxiDocuments, setTaxiDocuments] = useState([]);
  const [driverDocuments, setDriverDocuments] = useState([]);

  const [loading, setLoading] = useState(true);
  const [docsLoading, setDocsLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  // Filters & Controls
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [viewMode, setViewMode] = useState("cards"); // "cards" or "table"

  // Upload modal state
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [selectedTaxiDocumentType, setSelectedTaxiDocumentType] = useState("insurance");
  const [selectedDriverDocType, setSelectedDriverDocType] = useState("license");
  const [selectedDriverDocName, setSelectedDriverDocName] = useState("");
  const [selectedDriverDocExpiry, setSelectedDriverDocExpiry] = useState("");
  const [selectedFile, setSelectedFile] = useState(null);
  const [isDragOver, setIsDragOver] = useState(false);

  // Load entities
  useEffect(() => {
    let current = true;
    setLoading(true);

    Promise.all([
      TaxiAPI.list({ per_page: 100 }).catch(() => ({ data: [] })),
      DriverAPI.list({ per_page: 100 }).catch(() => ({ data: [] })),
    ]).then(([taxisRes, driversRes]) => {
      if (!current) return;
      const taxis = taxisRes.data ?? [];
      const rawDrivers = driversRes.data ?? [];

      const drivers = rawDrivers.map((d) => ({
        ...d,
        label: `${d.name} (${d.license_number})`,
      }));

      setTaxiEntities(taxis);
      setDriverEntities(drivers);

      if (isDriverRole) {
        // Lock to logged-in driver
        const matched = drivers.find((d) =>
          (currentUser.driver_id && String(d.id) === String(currentUser.driver_id)) ||
          d.email?.toLowerCase() === currentUser.email?.toLowerCase() ||
          d.name?.toLowerCase() === currentUser.name?.toLowerCase()
        ) || drivers[0];
        if (matched) setSelectedEntityId(String(matched.id));
      } else {
        setSelectedEntityId((prev) => prev || (drivers[0]?.id ? String(drivers[0].id) : ""));
      }
    }).finally(() => {
      if (current) setLoading(false);
    });

    return () => { current = false; };
  }, [isDriverRole, currentUser]);

  const activeCollection = useMemo(
    () => selectedType === "taxi" ? taxiEntities : driverEntities,
    [driverEntities, selectedType, taxiEntities],
  );

  const activeEntity = useMemo(() => {
    if (!activeCollection.length) return null;
    return activeCollection.find((e) => String(e.id) === String(selectedEntityId)) ?? activeCollection[0];
  }, [activeCollection, selectedEntityId]);

  // Load documents whenever active entity or type changes
  useEffect(() => {
    if (!activeEntity?.id) {
      setTaxiDocuments([]);
      setDriverDocuments([]);
      return;
    }

    let current = true;
    setDocsLoading(true);
    setError("");

    if (selectedType === "taxi") {
      TaxiDocumentAPI.list(activeEntity.id)
        .then((docs) => { if (current) setTaxiDocuments(docs); })
        .catch(() => { if (current) setError("Could not load documents for this taxi."); })
        .finally(() => { if (current) setDocsLoading(false); });
    } else {
      DriverDocumentAPI.list(activeEntity.id)
        .then((docs) => { if (current) setDriverDocuments(docs); })
        .catch(() => { if (current) setError("Could not load documents for this driver."); })
        .finally(() => { if (current) setDocsLoading(false); });
    }

    return () => { current = false; };
  }, [activeEntity?.id, selectedType]);

  const items = selectedType === "taxi" ? taxiDocuments : driverDocuments;

  // Filtered documents
  const filteredItems = useMemo(() => {
    return items.filter((doc) => {
      const title = selectedType === "taxi" ? getTaxiDocumentLabel(doc.document_type) : (doc.document_name || "");
      const matchesSearch = !searchTerm ||
        title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (doc.file_path && doc.file_path.toLowerCase().includes(searchTerm.toLowerCase()));

      const computedStatus = computeDocStatus(doc).toLowerCase().replace(/\s+/g, "-");
      const matchesStatus = statusFilter === "all" || computedStatus === statusFilter;

      const matchesCat = categoryFilter === "all" || doc.type === categoryFilter;

      return matchesSearch && matchesStatus && matchesCat;
    });
  }, [items, searchTerm, statusFilter, categoryFilter, selectedType]);

  // Summary Metrics
  const summary = useMemo(() => {
    if (selectedType === "driver") {
      const total = items.length;
      const valid = items.filter((d) => computeDocStatus(d) === "Valid").length;
      const expiringSoon = items.filter((d) => computeDocStatus(d) === "Expiring soon").length;
      const expired = items.filter((d) => computeDocStatus(d) === "Expired").length;
      return { total, valid, expiringSoon, expired };
    }
    return {
      total: items.length,
      valid: items.filter((d) => docIsValid(d)).length,
      expiringSoon: 0,
      expired: 0,
    };
  }, [items, selectedType]);

  function docIsValid(doc) {
    return true;
  }

  // File Handlers
  async function handleViewDocument(doc) {
    try {
      let file;
      if (selectedType === "taxi") {
        file = await TaxiDocumentAPI.download(activeEntity.id, doc.id);
      } else {
        file = await DriverDocumentAPI.download(activeEntity.id, doc.id);
      }
      const url = URL.createObjectURL(file);
      const downloadLink = document.createElement("a");
      downloadLink.href = url;
      downloadLink.download = doc.original_filename || doc.document_name || "document";
      document.body.appendChild(downloadLink);
      downloadLink.click();
      downloadLink.remove();
      window.setTimeout(() => URL.revokeObjectURL(url), 1000);
    } catch {
      setError("Could not download this document.");
    }
  }

  async function handleDeleteDocument(docId) {
    if (!window.confirm("Are you sure you want to permanently delete this document?")) return;
    setError("");
    try {
      if (selectedType === "taxi") {
        await TaxiDocumentAPI.remove(activeEntity.id, docId);
        setTaxiDocuments((prev) => prev.filter((d) => d.id !== docId));
        setSuccessMessage("Taxi document removed successfully.");
      } else {
        await DriverDocumentAPI.remove(activeEntity.id, docId);
        setDriverDocuments((prev) => prev.filter((d) => d.id !== docId));
        setSuccessMessage("Driver document removed successfully.");
      }
      setTimeout(() => setSuccessMessage(""), 3500);
    } catch {
      setError("Could not delete document. Please try again.");
    }
  }

  function handleFileDrop(e) {
    e.preventDefault();
    setIsDragOver(false);
    const droppedFile = e.dataTransfer.files?.[0];
    if (droppedFile) setSelectedFile(droppedFile);
  }

  function handleCategoryClick(catKey) {
    setSelectedDriverDocType(catKey);
    const cat = DRIVER_CATEGORIES.find((c) => c.key === catKey);
    if (cat && (!selectedDriverDocName || DRIVER_CATEGORIES.some((c) => selectedDriverDocName.includes(c.label)))) {
      setSelectedDriverDocName(`${activeEntity?.name ? activeEntity.name + " " : ""}${cat.label}`);
    }
  }

  function setExpiryPreset(years) {
    const d = new Date();
    d.setFullYear(d.getFullYear() + years);
    setSelectedDriverDocExpiry(d.toISOString().split("T")[0]);
  }

  async function handleUploadSubmit(e) {
    e.preventDefault();
    if (!selectedFile || !activeEntity) return;

    setError("");
    setUploading(true);

    try {
      if (selectedType === "taxi") {
        const payload = new FormData();
        payload.append("document_type", selectedTaxiDocumentType);
        payload.append("document", selectedFile);
        const uploaded = await TaxiDocumentAPI.upload(activeEntity.id, payload);
        setTaxiDocuments((current) => [
          uploaded,
          ...current.filter((d) => d.document_type !== uploaded.document_type),
        ]);
      } else {
        const payload = new FormData();
        payload.append("document_name", selectedDriverDocName || selectedFile.name);
        payload.append("type", selectedDriverDocType);
        if (selectedDriverDocExpiry) payload.append("expiry_date", selectedDriverDocExpiry);
        payload.append("file", selectedFile);

        const uploaded = await DriverDocumentAPI.upload(activeEntity.id, payload);
        setDriverDocuments((current) => [uploaded, ...current]);
      }

      setShowUploadModal(false);
      setSelectedFile(null);
      setSelectedDriverDocName("");
      setSelectedDriverDocExpiry("");
      setSuccessMessage("Document uploaded and saved successfully!");
      setTimeout(() => setSuccessMessage(""), 4000);
    } catch (err) {
      setError(err?.response?.data?.message || "Could not upload document. Please ensure file is PDF, JPG, or PNG under 10MB.");
    } finally {
      setUploading(false);
    }
  }

  function formatBytes(bytes) {
    if (!bytes) return "";
    if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  }

  return (
    <div className="documents-panel">
      {/* Category Navigation Bar (Admin / Staff) */}
      {!isDriverRole && (
        <div className="document-tabs" aria-label="Document categories">
          <button
            type="button"
            className={selectedType === "driver" ? "active" : ""}
            onClick={() => {
              setSelectedType("driver");
              setSelectedEntityId(driverEntities[0]?.id ? String(driverEntities[0].id) : "");
              setError("");
            }}
          >
            🪪 Driver Compliance Documents
          </button>
          <button
            type="button"
            className={selectedType === "taxi" ? "active" : ""}
            onClick={() => {
              setSelectedType("taxi");
              setSelectedEntityId(taxiEntities[0]?.id ? String(taxiEntities[0].id) : "");
              setError("");
            }}
          >
            🚖 Taxi Fleet Documents
          </button>
        </div>
      )}

      {error && <div className="settings-alert error" role="alert">⚠️ {error}</div>}
      {successMessage && <div className="settings-alert success" role="status">✅ {successMessage}</div>}

      {/* Driver Compliance Hero Card */}
      {selectedType === "driver" && activeEntity && (
        <section className="driver-hero-card" aria-label="Driver profile snapshot">
          <div className="driver-hero-top">
            <div className="driver-identity">
              <div className="driver-avatar">
                {activeEntity.name
                  ? activeEntity.name.split(" ").map((n) => n[0]).slice(0, 2).join("").toUpperCase()
                  : "DR"}
              </div>
              <div className="driver-title-group">
                <h2>{activeEntity.name}</h2>
                <div className="driver-badges-strip">
                  <span className="driver-pill license">
                    🪪 {activeEntity.license_number || "No License #"}
                  </span>
                  {activeEntity.office && (
                    <span className="driver-pill office">
                      🏛 {activeEntity.office.name}
                    </span>
                  )}
                  <span className={`driver-pill ${activeEntity.status === "active" ? "status-active" : "status-leave"}`}>
                    ● {activeEntity.status === "active" ? "Active Duty" : "On Leave"}
                  </span>
                </div>
              </div>
            </div>

            {/* Switch driver dropdown (Admin / Staff) */}
            {!isDriverRole && driverEntities.length > 1 && (
              <div className="driver-hero-selector">
                <select
                  className="driver-select-input"
                  value={selectedEntityId}
                  onChange={(e) => setSelectedEntityId(e.target.value)}
                  aria-label="Select Driver"
                >
                  {driverEntities.map((d) => (
                    <option key={d.id} value={d.id}>
                      {d.name} — {d.license_number || "Driver"}
                    </option>
                  ))}
                </select>
              </div>
            )}
          </div>

          <div className="driver-hero-details">
            <div className="driver-detail-item">
              <span>📞 Contact Phone</span>
              <strong>{activeEntity.phone || "—"}</strong>
            </div>
            <div className="driver-detail-item">
              <span>✉️ Email Address</span>
              <strong>{activeEntity.email || "—"}</strong>
            </div>
            <div className="driver-detail-item">
              <span>📅 License Expiry</span>
              <strong>{formatDate(activeEntity.license_expiry) || "Not Recorded"}</strong>
            </div>
            <div className="driver-detail-item">
              <span>🛡️ Compliance Status</span>
              <strong>
                {summary.expired > 0 ? "🔴 Action Required" : summary.expiringSoon > 0 ? "🟡 Renewal Pending" : "🟢 Fully Compliant"}
              </strong>
            </div>
          </div>
        </section>
      )}

      {/* Taxi Snapshot Header (When Taxi Documents active) */}
      {selectedType === "taxi" && activeEntity && (
        <section className="driver-hero-card" style={{ background: "linear-gradient(135deg, #1b3d37 0%, #225149 100%)" }} aria-label="Taxi snapshot">
          <div className="driver-hero-top">
            <div className="driver-identity">
              <div className="driver-avatar" style={{ background: "linear-gradient(135deg, #2a7c6f 0%, #3ca090 100%)" }}>
                🚖
              </div>
              <div className="driver-title-group">
                <h2>{activeEntity.reg_number} — {activeEntity.make_model}</h2>
                <div className="driver-badges-strip">
                  <span className="driver-pill" style={{ background: "rgba(255,255,255,0.18)" }}>
                    {activeEntity.vehicle_type?.toUpperCase()}
                  </span>
                  <span className="driver-pill status-active">
                    ● {activeEntity.status?.toUpperCase()}
                  </span>
                </div>
              </div>
            </div>

            {taxiEntities.length > 1 && (
              <div className="driver-hero-selector">
                <select
                  className="driver-select-input"
                  style={{ background: "rgba(255,255,255,0.15)" }}
                  value={selectedEntityId}
                  onChange={(e) => setSelectedEntityId(e.target.value)}
                  aria-label="Select Taxi"
                >
                  {taxiEntities.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.reg_number} — {t.make_model}
                    </option>
                  ))}
                </select>
              </div>
            )}
          </div>
        </section>
      )}

      {/* Compliance Metrics Strip */}
      <section className="compliance-stats-grid" aria-label="Compliance Metrics">
        <div className="comp-card">
          <div className="comp-card-icon blue">📁</div>
          <div className="comp-card-info">
            <span className="comp-card-label">Total Documents</span>
            <strong>{summary.total}</strong>
            <span className="comp-card-note">Verified files on record</span>
          </div>
        </div>

        <div className="comp-card">
          <div className="comp-card-icon green">✅</div>
          <div className="comp-card-info">
            <span className="comp-card-label">Valid &amp; Compliant</span>
            <strong>{summary.valid}</strong>
            <span className="comp-card-note">Active credentials</span>
          </div>
        </div>

        <div className="comp-card">
          <div className="comp-card-icon amber">⏳</div>
          <div className="comp-card-info">
            <span className="comp-card-label">Expiring Soon</span>
            <strong>{summary.expiringSoon}</strong>
            <span className="comp-card-note">Due within 30 days</span>
          </div>
        </div>

        <div className="comp-card">
          <div className="comp-card-icon red">⚠️</div>
          <div className="comp-card-info">
            <span className="comp-card-label">Expired</span>
            <strong>{summary.expired}</strong>
            <span className="comp-card-note">Immediate attention needed</span>
          </div>
        </div>
      </section>

      {/* Toolbar & Filters Bar */}
      <section className="doc-toolbar-container" aria-label="Document Toolbar">
        <div className="doc-search-filters">
          <div className="doc-search-box">
            <span className="doc-search-icon">🔍</span>
            <input
              type="search"
              placeholder="Search documents by name or keyword…"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>

          <select
            className="doc-filter-select"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            aria-label="Filter by Status"
          >
            <option value="all">All Statuses</option>
            <option value="valid">✅ Valid Only</option>
            <option value="expiring-soon">⏳ Expiring Soon (&lt;30d)</option>
            <option value="expired">⚠️ Expired</option>
          </select>

          {selectedType === "driver" && (
            <select
              className="doc-filter-select"
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              aria-label="Filter by Category"
            >
              <option value="all">All Document Types</option>
              {DRIVER_CATEGORIES.map((cat) => (
                <option key={cat.key} value={cat.key}>
                  {cat.icon} {cat.label}
                </option>
              ))}
            </select>
          )}
        </div>

        <div className="doc-actions-group">
          <div className="doc-view-toggle">
            <button
              type="button"
              className={viewMode === "cards" ? "active" : ""}
              onClick={() => setViewMode("cards")}
              title="Grid Cards View"
            >
              📇 Grid
            </button>
            <button
              type="button"
              className={viewMode === "table" ? "active" : ""}
              onClick={() => setViewMode("table")}
              title="Table List View"
            >
              📊 Table
            </button>
          </div>

          {canManage && (
            <button
              type="button"
              className="btn-upload-new"
              onClick={() => {
                setShowUploadModal(true);
                setSelectedFile(null);
                setError("");
                if (selectedType === "driver") {
                  handleCategoryClick("license");
                }
              }}
            >
              + Upload Document
            </button>
          )}
        </div>
      </section>

      {/* Document Content View */}
      {docsLoading ? (
        <div className="card" style={{ padding: "40px", textAlign: "center" }}>
          <p style={{ margin: 0, fontWeight: 700, color: "#556c80" }}>Loading compliance documents…</p>
        </div>
      ) : filteredItems.length === 0 ? (
        <div className="doc-empty-state">
          <span className="doc-empty-icon">📂</span>
          <h3>No documents found</h3>
          <p>
            {searchTerm || statusFilter !== "all" || categoryFilter !== "all"
              ? "No files match your current filters. Try resetting the search or status filters."
              : `No compliance records uploaded for ${activeEntity?.name || "this profile"} yet.`}
          </p>
          {canManage && (
            <button
              type="button"
              className="btn-upload-new"
              onClick={() => {
                setShowUploadModal(true);
                setSelectedFile(null);
              }}
            >
              + Upload First Document
            </button>
          )}
        </div>
      ) : viewMode === "cards" ? (
        /* Grid Cards View */
        <div className="doc-cards-grid">
          {filteredItems.map((doc) => {
            const docName = selectedType === "taxi"
              ? getTaxiDocumentLabel(doc.document_type)
              : (doc.document_name || "Driver Document");
            const categoryObj = selectedType === "taxi"
              ? (doc.document_type === "insurance" ? { icon: "🛡️", label: "Insurance Policy" } : { icon: "📋", label: "RC Certificate" })
              : (DRIVER_CATEGORIES.find((c) => c.key === doc.type) || { icon: "📄", label: "General Record" });
            const fileBadge = getFileBadge(doc.original_filename || doc.document_name || doc.file_path || "");
            const expiry = getExpiryMeta(doc.expiry_date);
            const status = computeDocStatus(doc);

            return (
              <div key={doc.id} className="doc-item-card">
                <div className="doc-item-card-header">
                  <span className="doc-category-pill">
                    {categoryObj.icon} {categoryObj.label}
                  </span>
                  <span className={`doc-ext-badge ${fileBadge.className}`}>
                    {fileBadge.ext}
                  </span>
                </div>

                <div className="doc-item-card-body">
                  <div className="doc-card-title-row">
                    <div className="doc-type-icon-box">
                      {fileBadge.icon}
                    </div>
                    <div className="doc-card-title-meta">
                      <h4 title={docName}>{docName}</h4>
                      <span>Uploaded {formatDate(doc.created_at || doc.uploaded)}</span>
                    </div>
                  </div>

                  {selectedType === "driver" && (
                    <div className={`doc-expiry-box ${expiry.badgeClass}`}>
                      <span>📅 {expiry.text}</span>
                      <span>● {status}</span>
                    </div>
                  )}

                  <div className="doc-card-details-strip">
                    <span>💾 Size: {doc.file_size || "Stored"}</span>
                    {doc.expiry_date && <span>Exp: {formatDate(doc.expiry_date)}</span>}
                  </div>
                </div>

                <div className="doc-item-card-footer">
                  <button
                    type="button"
                    className="btn-card-action download"
                    onClick={() => handleViewDocument(doc)}
                    title="Download document copy"
                  >
                    📥 Download
                  </button>
                  {canManage && (
                    <button
                      type="button"
                      className="btn-card-action delete"
                      onClick={() => handleDeleteDocument(doc.id)}
                      title="Delete document"
                    >
                      🗑️ Delete
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        /* Table List View */
        <div className="doc-table-card">
          <table className="doc-table">
            <thead>
              <tr>
                <th>Document Name</th>
                <th>Type / Category</th>
                <th>Validity &amp; Expiry</th>
                <th>Uploaded Date</th>
                <th>File Size</th>
                <th style={{ textAlign: "right" }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredItems.map((doc) => {
                const docName = selectedType === "taxi"
                  ? getTaxiDocumentLabel(doc.document_type)
                  : (doc.document_name || "Document");
                const categoryObj = selectedType === "taxi"
                  ? (doc.document_type === "insurance" ? { icon: "🛡️", label: "Insurance Policy" } : { icon: "📋", label: "RC Certificate" })
                  : (DRIVER_CATEGORIES.find((c) => c.key === doc.type) || { icon: "📄", label: "General" });
                const fileBadge = getFileBadge(doc.original_filename || doc.document_name || "");
                const expiry = getExpiryMeta(doc.expiry_date);
                const status = computeDocStatus(doc);

                return (
                  <tr key={doc.id}>
                    <td>
                      <div className="table-doc-cell">
                        <div className="table-doc-icon">{fileBadge.icon}</div>
                        <div>
                          <strong>{docName}</strong>
                          <div style={{ fontSize: "0.75rem", color: "#7b91a3" }}>
                            {fileBadge.ext} Document
                          </div>
                        </div>
                      </div>
                    </td>
                    <td>
                      <span className="doc-category-pill">
                        {categoryObj.icon} {categoryObj.label}
                      </span>
                    </td>
                    <td>
                      <div className={`doc-expiry-box ${expiry.badgeClass}`} style={{ display: "inline-flex", padding: "4px 8px" }}>
                        {expiry.text}
                      </div>
                    </td>
                    <td>{formatDate(doc.created_at || doc.uploaded)}</td>
                    <td>{doc.file_size || "—"}</td>
                    <td style={{ textAlign: "right" }}>
                      <button
                        type="button"
                        className="btn-card-action download"
                        onClick={() => handleViewDocument(doc)}
                        style={{ marginRight: "8px" }}
                      >
                        📥
                      </button>
                      {canManage && (
                        <button
                          type="button"
                          className="btn-card-action delete"
                          onClick={() => handleDeleteDocument(doc.id)}
                        >
                          🗑️
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Upload Document Modal */}
      {showUploadModal && canManage && (
        <div className="upload-modal-overlay" onClick={() => !uploading && setShowUploadModal(false)}>
          <div className="upload-modal-card" onClick={(e) => e.stopPropagation()}>
            <div className="upload-modal-header">
              <div className="upload-modal-title-wrap">
                <div className="upload-modal-icon">📤</div>
                <div>
                  <h3>Upload {selectedType === "taxi" ? "Taxi" : "Driver"} Document</h3>
                  <p>Attach verified records for {activeEntity?.name || activeEntity?.reg_number}</p>
                </div>
              </div>
              <button
                type="button"
                className="btn-close-modal"
                onClick={() => !uploading && setShowUploadModal(false)}
                disabled={uploading}
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleUploadSubmit}>
              <div className="upload-modal-body">
                {selectedType === "driver" ? (
                  <>
                    <div>
                      <span className="category-selection-label">Select Document Category</span>
                      <div className="category-chips-grid">
                        {DRIVER_CATEGORIES.map((cat) => (
                          <button
                            key={cat.key}
                            type="button"
                            className={`category-chip-btn ${selectedDriverDocType === cat.key ? "active" : ""}`}
                            onClick={() => handleCategoryClick(cat.key)}
                          >
                            <span className="category-chip-icon">{cat.icon}</span>
                            <span className="category-chip-title">{cat.label}</span>
                            <span className="category-chip-sub">{cat.desc}</span>
                          </button>
                        ))}
                      </div>
                    </div>

                    <div className="form-field-group">
                      <label>Document Title</label>
                      <input
                        required
                        type="text"
                        placeholder="e.g. Commercial Driving License"
                        value={selectedDriverDocName}
                        onChange={(e) => setSelectedDriverDocName(e.target.value)}
                      />
                    </div>

                    <div className="form-field-group">
                      <label>Document Expiry Date</label>
                      <input
                        type="date"
                        value={selectedDriverDocExpiry}
                        onChange={(e) => setSelectedDriverDocExpiry(e.target.value)}
                      />
                      <div className="date-presets-strip">
                        <span>Quick Presets:</span>
                        <button type="button" className="preset-chip" onClick={() => setExpiryPreset(1)}>+1 Year</button>
                        <button type="button" className="preset-chip" onClick={() => setExpiryPreset(2)}>+2 Years</button>
                        <button type="button" className="preset-chip" onClick={() => setExpiryPreset(3)}>+3 Years</button>
                        <button type="button" className="preset-chip" onClick={() => setExpiryPreset(5)}>+5 Years</button>
                      </div>
                    </div>
                  </>
                ) : (
                  <div className="form-field-group">
                    <label>Taxi Document Type</label>
                    <select
                      value={selectedTaxiDocumentType}
                      onChange={(e) => setSelectedTaxiDocumentType(e.target.value)}
                    >
                      <option value="insurance">🛡️ Insurance Policy</option>
                      <option value="rc">📄 RC (Registration Certificate)</option>
                    </select>
                  </div>
                )}

                {/* Drag and Drop Zone */}
                <div
                  className={`dropzone-box ${isDragOver ? "dragover" : ""}`}
                  onDragOver={(e) => { e.preventDefault(); setIsDragOver(true); }}
                  onDragLeave={() => setIsDragOver(false)}
                  onDrop={handleFileDrop}
                >
                  <input
                    type="file"
                    accept=".pdf,.jpg,.jpeg,.png,application/pdf,image/jpeg,image/png"
                    onChange={(e) => {
                      if (e.target.files?.[0]) setSelectedFile(e.target.files[0]);
                    }}
                    required={!selectedFile}
                  />
                  <div className="dropzone-icon">📎</div>
                  <strong>Drag &amp; drop file here, or click to browse</strong>
                  <span>Supports PDF, JPG, PNG files up to 10 MB</span>
                </div>

                {/* Selected File Card */}
                {selectedFile && (
                  <div className="selected-file-preview">
                    <div className="selected-file-info">
                      <span className="file-icon">{getFileBadge(selectedFile.name).icon}</span>
                      <div>
                        <strong>{selectedFile.name}</strong>
                        <small>{formatBytes(selectedFile.size)} • Ready to upload</small>
                      </div>
                    </div>
                    <button
                      type="button"
                      className="btn-remove-file"
                      onClick={() => setSelectedFile(null)}
                    >
                      ✕ Remove
                    </button>
                  </div>
                )}
              </div>

              <div className="upload-modal-footer">
                <button
                  type="button"
                  className="btn-modal-cancel"
                  onClick={() => setShowUploadModal(false)}
                  disabled={uploading}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn-modal-submit"
                  disabled={uploading || !selectedFile}
                >
                  {uploading ? "Uploading Document…" : "💾 Save & Upload Document"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
