import React, { useEffect, useState, useRef, useCallback } from "react";
import "../styles/taxi-form.css";

const FIRST_VEHICLE_YEAR = 1990;
const LAST_VEHICLE_YEAR = new Date().getFullYear() + 1;
const VEHICLE_YEARS = Array.from(
  { length: LAST_VEHICLE_YEAR - FIRST_VEHICLE_YEAR + 1 },
  (_, index) => LAST_VEHICLE_YEAR - index,
);

const VEHICLE_TYPES = [
  { id: "sedan", label: "Sedan", icon: "🚗", sub: "Comfort • 4-5 Seats" },
  { id: "suv", label: "SUV", icon: "🚙", sub: "Spacious • 6-7 Seats" },
  { id: "hatchback", label: "Hatchback", icon: "🚘", sub: "Economy • 4 Seats" },
  { id: "mini_bus", label: "Mini Bus", icon: "🚐", sub: "Group • 10-20 Seats" },
];

const OWNERSHIP_PRESETS = [
  "Company Owned",
  "Driver Owned",
  "Leased",
  "Attached Fleet",
  "Third-Party Partner",
];

const MODEL_PRESETS = [
  "Maruti Suzuki Dzire",
  "Toyota Innova Crysta",
  "Hyundai Aura",
  "Tata Tigor EV",
  "Mahindra Scorpio",
  "Maruti Ertiga",
];

const SEATING_PRESETS = [4, 5, 6, 7, 12];

const TABS = [
  { id: "identity", label: "Identity", icon: "🚗", num: "1" },
  { id: "photos", label: "Photographs", icon: "📷", num: "2" },
  { id: "specs", label: "Specs & Ownership", icon: "⚙️", num: "3" },
  { id: "rates", label: "Rates & Fleet", icon: "💳", num: "4" },
  { id: "docs", label: "Docs & Notes", icon: "📄", num: "5" },
];

const EMPTY = {
  reg_number: "",
  vehicle_type: "sedan",
  make_model: "",
  year_of_manufacture: new Date().getFullYear(),
  seating_capacity: 4,
  fuel_type: "petrol",
  pricing_type: "daily",
  rate_amount: "",
  office_id: "",
  driver_id: "",
  status: "available",
  odometer_reading: 0,
  ownership: "Company Owned",
  notes: "",
};

export default function TaxiForm({
  initial,
  drivers = [],
  offices = [],
  onSubmit,
  onCancel,
}) {
  const [form, setForm] = useState(
    initial
      ? {
          ...initial,
          pricing_type: initial.pricing_type || "daily",
          rate_amount: initial.rate_amount ?? initial.daily_rate ?? "",
          office_id: initial.office_id || initial.office?.id || "",
          driver_id: initial.driver_id || initial.driver?.id || "",
          ownership: initial.ownership || "",
        }
      : EMPTY,
  );

  const [activeTab, setActiveTab] = useState("identity");
  const [viewMode, setViewMode] = useState("stepped"); // 'stepped' or 'all'
  const [validationError, setValidationError] = useState("");
  const [highlightField, setHighlightField] = useState(null);

  // Drag-and-drop hover states
  const [isDraggingFront, setIsDraggingFront] = useState(false);
  const [isDraggingBack, setIsDraggingBack] = useState(false);

  const resolveUrl = useCallback((path, url) => {
    if (url) return url;
    if (path) return `/storage/${String(path).replace(/^\/+/, "")}`;
    return null;
  }, []);

  // Track blob URLs to revoke on cleanup to prevent memory leaks
  const createdUrlsRef = useRef([]);

  const createSafeObjectUrl = useCallback((file) => {
    const url = URL.createObjectURL(file);
    createdUrlsRef.current.push(url);
    return url;
  }, []);

  // Front Photo state
  const [photoFront, setPhotoFront] = useState(null);
  const [previewFront, setPreviewFront] = useState(() =>
    resolveUrl(initial?.photo_front_path, initial?.photo_front_url),
  );
  const [removePhotoFront, setRemovePhotoFront] = useState(false);

  // Back Photo state
  const [photoBack, setPhotoBack] = useState(null);
  const [previewBack, setPreviewBack] = useState(() =>
    resolveUrl(initial?.photo_back_path, initial?.photo_back_url),
  );
  const [removePhotoBack, setRemovePhotoBack] = useState(false);

  // Document state (RC / Fitness certificate)
  const [documentFile, setDocumentFile] = useState(null);
  const [existingDocPath, setExistingDocPath] = useState(
    initial?.document_path || null,
  );
  const [removeDoc, setRemoveDoc] = useState(false);

  const regInputRef = useRef(null);
  const modelInputRef = useRef(null);
  const rateInputRef = useRef(null);

  // Clean up object URLs on component unmount
  useEffect(() => {
    return () => {
      createdUrlsRef.current.forEach((url) => {
        try {
          URL.revokeObjectURL(url);
        } catch (_) {}
      });
      createdUrlsRef.current = [];
    };
  }, []);

  // Keyboard accessibility: Escape to cancel, Ctrl+Enter / Cmd+Enter to submit
  useEffect(() => {
    function handleKeyDown(e) {
      if (e.key === "Escape") {
        onCancel();
      } else if ((e.ctrlKey || e.metaKey) && e.key === "Enter") {
        e.preventDefault();
        submitForm();
      }
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onCancel, form, photoFront, removePhotoFront, photoBack, removePhotoBack, documentFile, removeDoc]);

  const update = useCallback((field, value) => {
    setValidationError((prevErr) => (highlightField === field ? "" : prevErr));
    setHighlightField((prevField) => (prevField === field ? null : prevField));
    setForm((f) => ({ ...f, [field]: value }));
  }, [highlightField]);

  const handlePhotoFrontChange = useCallback((e) => {
    const file = e.target.files?.[0];
    if (file && file.type.startsWith("image/")) {
      setPhotoFront(file);
      setPreviewFront(createSafeObjectUrl(file));
      setRemovePhotoFront(false);
    }
  }, [createSafeObjectUrl]);

  const handleClearPhotoFront = useCallback(() => {
    setPhotoFront(null);
    setPreviewFront(null);
    setRemovePhotoFront(true);
  }, []);

  const handlePhotoBackChange = useCallback((e) => {
    const file = e.target.files?.[0];
    if (file && file.type.startsWith("image/")) {
      setPhotoBack(file);
      setPreviewBack(createSafeObjectUrl(file));
      setRemovePhotoBack(false);
    }
  }, [createSafeObjectUrl]);

  const handleClearPhotoBack = useCallback(() => {
    setPhotoBack(null);
    setPreviewBack(null);
    setRemovePhotoBack(true);
  }, []);

  // Drag-and-drop handlers
  const handleDropFront = useCallback((e) => {
    e.preventDefault();
    setIsDraggingFront(false);
    const file = e.dataTransfer.files?.[0];
    if (file && file.type.startsWith("image/")) {
      setPhotoFront(file);
      setPreviewFront(createSafeObjectUrl(file));
      setRemovePhotoFront(false);
    }
  }, [createSafeObjectUrl]);

  const handleDropBack = useCallback((e) => {
    e.preventDefault();
    setIsDraggingBack(false);
    const file = e.dataTransfer.files?.[0];
    if (file && file.type.startsWith("image/")) {
      setPhotoBack(file);
      setPreviewBack(createSafeObjectUrl(file));
      setRemovePhotoBack(false);
    }
  }, [createSafeObjectUrl]);

  const handleDocumentChange = useCallback((e) => {
    const file = e.target.files?.[0];
    if (file) {
      setDocumentFile(file);
      setRemoveDoc(false);
    }
  }, []);

  const handleClearDocument = useCallback(() => {
    setDocumentFile(null);
    setExistingDocPath(null);
    setRemoveDoc(true);
  }, []);

  /* ── Form Navigation & Validation ── */
  const validateTab = useCallback((tabId) => {
    if (tabId === "identity") {
      if (!form.reg_number || !String(form.reg_number).trim()) {
        setHighlightField("reg_number");
        setValidationError("Please enter a valid Registration Number (e.g. UP21 AB 1234).");
        setTimeout(() => regInputRef.current?.focus(), 50);
        return false;
      }
      if (!form.make_model || !String(form.make_model).trim()) {
        setHighlightField("make_model");
        setValidationError("Please specify the Vehicle Make & Model.");
        setTimeout(() => modelInputRef.current?.focus(), 50);
        return false;
      }
    } else if (tabId === "rates") {
      if (form.rate_amount === "" || isNaN(Number(form.rate_amount)) || Number(form.rate_amount) < 0) {
        setHighlightField("rate_amount");
        setValidationError("Please enter a valid rental Rate Amount in Rates & Fleet.");
        setTimeout(() => rateInputRef.current?.focus(), 50);
        return false;
      }
    }
    return true;
  }, [form.reg_number, form.make_model, form.rate_amount]);

  const validateAll = useCallback(() => {
    if (!form.reg_number || !String(form.reg_number).trim()) {
      setActiveTab("identity");
      setHighlightField("reg_number");
      setValidationError("Please enter a valid Registration Number (e.g. UP21 AB 1234).");
      setTimeout(() => regInputRef.current?.focus(), 50);
      return false;
    }
    if (!form.make_model || !String(form.make_model).trim()) {
      setActiveTab("identity");
      setHighlightField("make_model");
      setValidationError("Please specify the Vehicle Make & Model.");
      setTimeout(() => modelInputRef.current?.focus(), 50);
      return false;
    }
    if (form.rate_amount === "" || isNaN(Number(form.rate_amount)) || Number(form.rate_amount) < 0) {
      setActiveTab("rates");
      setHighlightField("rate_amount");
      setValidationError("Please enter a valid rental Rate Amount in Rates & Fleet.");
      setTimeout(() => rateInputRef.current?.focus(), 50);
      return false;
    }
    return true;
  }, [form.reg_number, form.make_model, form.rate_amount]);

  const handleNextTab = useCallback(() => {
    // Validate current tab before advancing
    if (!validateTab(activeTab)) return;

    const currentIndex = TABS.findIndex((t) => t.id === activeTab);
    if (currentIndex < TABS.length - 1) {
      setActiveTab(TABS[currentIndex + 1].id);
      setValidationError("");
    }
  }, [activeTab, validateTab]);

  const handlePrevTab = useCallback(() => {
    const currentIndex = TABS.findIndex((t) => t.id === activeTab);
    if (currentIndex > 0) {
      setActiveTab(TABS[currentIndex - 1].id);
      setValidationError("");
    }
  }, [activeTab]);

  const submitForm = useCallback(() => {
    if (!validateAll()) return;

    const payload = new FormData();
    payload.append("reg_number", String(form.reg_number ?? "").toUpperCase().trim());
    payload.append("vehicle_type", form.vehicle_type);
    payload.append("make_model", String(form.make_model ?? "").trim());
    payload.append("year_of_manufacture", String(Number(form.year_of_manufacture) || new Date().getFullYear()));
    payload.append("seating_capacity", String(Number(form.seating_capacity) || 4));
    payload.append("fuel_type", form.fuel_type);
    payload.append("pricing_type", form.pricing_type);
    payload.append("rate_amount", String(Number(form.rate_amount) || 0));
    payload.append("daily_rate", String(Number(form.rate_amount) || 0));
    payload.append("status", form.status);
    payload.append("odometer_reading", String(Number(form.odometer_reading) || 0));
    payload.append("ownership", String(form.ownership ?? "").trim());

    if (form.office_id) {
      payload.append("office_id", String(form.office_id));
    }
    if (form.driver_id) {
      payload.append("driver_id", String(form.driver_id));
    }
    if (form.notes) {
      payload.append("notes", String(form.notes));
    }

    // Photo files & flags
    if (photoFront) {
      payload.append("photo_front", photoFront);
    } else if (removePhotoFront) {
      payload.append("remove_photo_front", "1");
    }

    if (photoBack) {
      payload.append("photo_back", photoBack);
    } else if (removePhotoBack) {
      payload.append("remove_photo_back", "1");
    }

    // Document file & flags
    if (documentFile) {
      payload.append("document", documentFile);
    } else if (removeDoc) {
      payload.append("remove_document", "1");
    }

    onSubmit(payload);
  }, [form, photoFront, removePhotoFront, photoBack, removePhotoBack, documentFile, removeDoc, onSubmit, validateAll]);

  function handleSubmit(e) {
    e.preventDefault();
    submitForm();
  }

  /* ── Tab Completeness Status ── */
  const hasReg = Boolean(String(form.reg_number || "").trim());
  const hasModel = Boolean(String(form.make_model || "").trim());
  const identityComplete = hasReg && hasModel;

  const photoCount = (previewFront ? 1 : 0) + (previewBack ? 1 : 0);
  const specsComplete = Boolean(form.ownership && form.seating_capacity && form.fuel_type);
  const hasRate = form.rate_amount !== "" && Number(form.rate_amount) >= 0;
  const ratesComplete = hasRate && Boolean(form.status);
  const hasDoc = Boolean(documentFile || existingDocPath);

  const currentTabIndex = TABS.findIndex((t) => t.id === activeTab);
  const isFirstTab = currentTabIndex === 0;
  const isLastTab = currentTabIndex === TABS.length - 1;

  return (
    <div className="tx-modal-overlay" onClick={onCancel} role="dialog" aria-modal="true">
      <div className="tx-modal-card" onClick={(e) => e.stopPropagation()}>
        {/* 1. Modal Header */}
        <div className="tx-modal-header">
          <div className="tx-modal-header-info">
            <h3 className="tx-modal-title">
              <span>{initial ? "✏️ Edit Taxi Details" : "🚕 Register New Taxi"}</span>
            </h3>
            <p className="tx-modal-subtitle">
              {initial
                ? `Updating ${initial.reg_number || "Vehicle"} (${initial.make_model || "Fleet"})`
                : "Complete vehicle identity, photographs, ownership, and rental rates"}
            </p>
          </div>
          <button
            type="button"
            className="tx-panel-close"
            onClick={onCancel}
            title="Close form (Esc)"
            aria-label="Close"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" width="18" height="18">
              <path d="M18 6 6 18M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* 2. Interactive Completeness & Summary Checklist Bar */}
        <div className="tx-modal-summary-bar">
          <span className="tx-summary-bar-label">Form Checklist:</span>

          <span
            className={`tx-summary-chip ${hasReg ? "is-set" : "is-missing"}`}
            onClick={() => { setActiveTab("identity"); setViewMode("stepped"); }}
            title="Click to jump to Registration Number"
          >
            🚗 Reg: {hasReg ? form.reg_number.toUpperCase() : "Required *"}
          </span>

          <span
            className={`tx-summary-chip ${hasModel ? "is-set" : "is-missing"}`}
            onClick={() => { setActiveTab("identity"); setViewMode("stepped"); }}
            title="Click to jump to Make & Model"
          >
            🚘 Model: {hasModel ? form.make_model : "Required *"}
          </span>

          <span
            className={`tx-summary-chip ${photoCount === 2 ? "is-set" : photoCount === 1 ? "is-set" : "is-neutral"}`}
            onClick={() => { setActiveTab("photos"); setViewMode("stepped"); }}
            title="Click to jump to Vehicle Photos"
          >
            📷 Photos: {photoCount === 2 ? "Front & Rear ✓" : photoCount === 1 ? "1 of 2 Uploaded" : "0/2 Uploaded"}
          </span>

          <span
            className={`tx-summary-chip ${form.ownership ? "is-set" : "is-neutral"}`}
            onClick={() => { setActiveTab("specs"); setViewMode("stepped"); }}
            title="Click to jump to Ownership"
          >
            🏷️ Ownership: {form.ownership || "Not specified"}
          </span>

          <span
            className={`tx-summary-chip ${hasRate ? "is-set" : "is-missing"}`}
            onClick={() => { setActiveTab("rates"); setViewMode("stepped"); }}
            title="Click to jump to Rental Rate"
          >
            💳 Rate: {hasRate ? `₹${Number(form.rate_amount).toLocaleString()}/${form.pricing_type === "per_km" ? "km" : "day"}` : "Required *"}
          </span>

          <span
            className="tx-summary-chip is-set"
            onClick={() => { setActiveTab("rates"); setViewMode("stepped"); }}
            title="Click to jump to Status"
          >
            🟢 Status: {form.status}
          </span>

          {hasDoc && (
            <span
              className="tx-summary-chip is-set"
              onClick={() => { setActiveTab("docs"); setViewMode("stepped"); }}
              title="Vehicle RC Document Attached"
            >
              📄 RC Doc Attached
            </span>
          )}
        </div>

        {/* 3. Navigation Tabs Bar & View Switcher */}
        <div className="tx-tabs-container">
          <div className="tx-nav-tabs">
            {TABS.map((tab) => {
              const isActive = viewMode === "stepped" && activeTab === tab.id;
              let badge = null;
              if (tab.id === "identity") badge = identityComplete ? "✓" : "*";
              if (tab.id === "photos") badge = `${photoCount}/2`;
              if (tab.id === "specs") badge = specsComplete ? "✓" : "";
              if (tab.id === "rates") badge = ratesComplete ? "✓" : "*";
              if (tab.id === "docs") badge = hasDoc ? "✓" : "";

              return (
                <button
                  key={tab.id}
                  type="button"
                  className={`tx-nav-tab ${isActive ? "active" : ""}`}
                  onClick={() => {
                    setActiveTab(tab.id);
                    setViewMode("stepped");
                  }}
                >
                  <span>{tab.icon}</span>
                  <span>{tab.num}. {tab.label}</span>
                  {badge && <span className="tx-nav-tab-badge">{badge}</span>}
                </button>
              );
            })}
          </div>

          <button
            type="button"
            className="tx-view-toggle"
            onClick={() => setViewMode((m) => (m === "stepped" ? "all" : "stepped"))}
            title="Toggle between Step-by-Step view and All Sections view"
          >
            {viewMode === "stepped" ? "📜 Show All Sections" : "⚡ Stepped Tabs"}
          </button>
        </div>

        {/* 4. Form Content Area */}
        <form onSubmit={handleSubmit} style={{ display: "contents" }}>
          <div className="tx-modal-body">
            {/* Inline Error Alert */}
            {validationError && (
              <div className="tx-form-alert">
                <span>⚠️</span>
                <span>{validationError}</span>
              </div>
            )}

            {/* ══════════════════════════════════════════════════════════════
                SECTION 1: VEHICLE IDENTITY & CLASSIFICATION
            ══════════════════════════════════════════════════════════════ */}
            {(viewMode === "all" || activeTab === "identity") && (
              <div className="tx-form-grid" id="section-identity">
                <div className="tx-form-section-header">
                  <span>🚗 1. Vehicle Identity &amp; Classification</span>
                  <span style={{ fontSize: "0.72rem", color: "var(--tx-text-muted)" }}>Mandatory Identification</span>
                </div>
                <p className="tx-form-section-desc">
                  Official registration plate and vehicle classification recognized in government records.
                </p>

                {/* Registration Number */}
                <div className="tx-field-group">
                  <label className="tx-field-label">
                    <span>Registration Number <span style={{ color: "var(--tx-danger)" }}>*</span></span>
                    <span className="tx-field-note">e.g. UP21 AB 1234 / DL01 TA 5678</span>
                  </label>
                  <input
                    ref={regInputRef}
                    className={`tx-field-input ${highlightField === "reg_number" ? "has-error" : ""}`}
                    style={{ fontFamily: "var(--tx-font-mono)", fontWeight: 700, textTransform: "uppercase" }}
                    required
                    value={String(form.reg_number ?? "").toUpperCase()}
                    onChange={(e) => update("reg_number", e.target.value.toUpperCase().replace(/[^A-Z0-9 ]/g, ""))}
                    placeholder="UP21 AB 1234"
                  />
                  {form.reg_number && (
                    <div className="tx-plate-preview-wrap">
                      <div className="tx-plate-box">
                        <div className="tx-plate-ind">IND</div>
                        <div className="tx-plate-text">{form.reg_number.toUpperCase()}</div>
                      </div>
                      <span style={{ fontSize: "0.74rem", color: "#16a34a", fontWeight: 700 }}>
                        ✓ License plate preview
                      </span>
                    </div>
                  )}
                </div>

                {/* Make & Model */}
                <div className="tx-field-group">
                  <label className="tx-field-label">
                    <span>Make &amp; Model <span style={{ color: "var(--tx-danger)" }}>*</span></span>
                    <span className="tx-field-note">Brand and variant</span>
                  </label>
                  <input
                    ref={modelInputRef}
                    className={`tx-field-input ${highlightField === "make_model" ? "has-error" : ""}`}
                    required
                    value={form.make_model}
                    onChange={(e) => update("make_model", e.target.value)}
                    placeholder="e.g. Maruti Suzuki Dzire"
                  />
                  {/* Quick Model Presets */}
                  <div className="tx-quick-chips">
                    {MODEL_PRESETS.map((m) => (
                      <button
                        key={m}
                        type="button"
                        className={`tx-chip-btn ${form.make_model === m ? "active" : ""}`}
                        onClick={() => update("make_model", m)}
                      >
                        {m}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Vehicle Type / Class (Visual Cards) */}
                <div className="tx-field-group full-width">
                  <label className="tx-field-label">Vehicle Type / Class Category</label>
                  <div className="tx-type-cards">
                    {VEHICLE_TYPES.map((type) => (
                      <div
                        key={type.id}
                        className={`tx-type-card ${form.vehicle_type === type.id ? "selected" : ""}`}
                        onClick={() => update("vehicle_type", type.id)}
                      >
                        <span className="tx-type-icon">{type.icon}</span>
                        <span className="tx-type-name">{type.label}</span>
                        <span className="tx-type-sub">{type.sub}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Year of Manufacture */}
                <div className="tx-field-group">
                  <label className="tx-field-label">Year of Manufacture</label>
                  <select
                    className="tx-field-select"
                    required
                    value={form.year_of_manufacture}
                    onChange={(e) => update("year_of_manufacture", e.target.value)}
                  >
                    {VEHICLE_YEARS.map((year) => (
                      <option key={year} value={year}>{year}</option>
                    ))}
                  </select>
                </div>

                {/* Seating Capacity */}
                <div className="tx-field-group">
                  <label className="tx-field-label">
                    <span>Seating Capacity (Passengers)</span>
                    <span className="tx-field-note">Excluding driver</span>
                  </label>
                  <input
                    type="number"
                    min="1"
                    max="60"
                    className="tx-field-input"
                    required
                    value={form.seating_capacity}
                    onChange={(e) => update("seating_capacity", e.target.value)}
                  />
                  <div className="tx-quick-chips">
                    {SEATING_PRESETS.map((seats) => (
                      <button
                        key={seats}
                        type="button"
                        className={`tx-chip-btn ${Number(form.seating_capacity) === seats ? "active" : ""}`}
                        onClick={() => update("seating_capacity", seats)}
                      >
                        {seats} Seats
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* ══════════════════════════════════════════════════════════════
                SECTION 2: VEHICLE PHOTOGRAPHS (FRONT & BACK)
            ══════════════════════════════════════════════════════════════ */}
            {(viewMode === "all" || activeTab === "photos") && (
              <div className="tx-form-grid" id="section-photos">
                <div className="tx-form-section-header">
                  <span>📷 2. Vehicle Photographs (Front &amp; Rear View)</span>
                  <span style={{ fontSize: "0.72rem", color: "var(--tx-text-muted)" }}>Inspection &amp; Verification</span>
                </div>
                <p className="tx-form-section-desc">
                  Drag and drop or upload high-resolution photographs used for fleet cataloging, right sidepanel drawer, and driver vehicle handovers.
                </p>

                <div className="tx-field-group full-width">
                  <div className="tx-photos-grid">
                    {/* Front Photo Card */}
                    <div
                      className={`tx-photo-upload-card ${isDraggingFront ? "is-dragging" : ""}`}
                      onDragOver={(e) => { e.preventDefault(); setIsDraggingFront(true); }}
                      onDragLeave={() => setIsDraggingFront(false)}
                      onDrop={handleDropFront}
                    >
                      <div className="tx-photo-card-header">
                        <span className="tx-photo-card-tag">🚘 Front View Photo</span>
                        <span className={`tx-photo-badge ${previewFront ? "attached" : ""}`}>
                          {previewFront ? "Attached ✓" : "Optional"}
                        </span>
                      </div>
                      <div
                        className="tx-photo-preview-wrap"
                        onClick={() => {
                          if (previewFront) window.open(previewFront, "_blank");
                        }}
                        title={previewFront ? "Click to view full image in new tab" : "Upload front photo"}
                      >
                        {previewFront ? (
                          <img
                            src={previewFront}
                            alt="Taxi front view"
                            className="tx-photo-preview-img"
                          />
                        ) : (
                          <div className="tx-photo-placeholder">
                            <span className="tx-photo-placeholder-icon">🚖</span>
                            <span className="tx-photo-placeholder-text">Front Grille &amp; License Plate</span>
                            <span className="tx-photo-placeholder-hint">Click or drag &amp; drop (JPG, PNG, WebP)</span>
                          </div>
                        )}
                      </div>
                      <div className="tx-photo-actions">
                        <label className="tx-photo-upload-btn">
                          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="14" height="14">
                            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                            <polyline points="17 8 12 3 7 8" />
                            <line x1="12" y1="3" x2="12" y2="15" />
                          </svg>
                          <span>{photoFront ? "Change Front" : previewFront ? "Replace Front" : "Upload Front Photo"}</span>
                          <input
                            type="file"
                            accept="image/jpeg,image/png,image/webp"
                            onChange={handlePhotoFrontChange}
                            style={{ display: "none" }}
                          />
                        </label>
                        {previewFront && (
                          <button
                            type="button"
                            className="tx-photo-remove-btn"
                            onClick={handleClearPhotoFront}
                            title="Remove front photo"
                          >
                            Remove
                          </button>
                        )}
                      </div>
                    </div>

                    {/* Back / Rear Photo Card */}
                    <div
                      className={`tx-photo-upload-card ${isDraggingBack ? "is-dragging" : ""}`}
                      onDragOver={(e) => { e.preventDefault(); setIsDraggingBack(true); }}
                      onDragLeave={() => setIsDraggingBack(false)}
                      onDrop={handleDropBack}
                    >
                      <div className="tx-photo-card-header">
                        <span className="tx-photo-card-tag">🔙 Rear / Back View Photo</span>
                        <span className={`tx-photo-badge ${previewBack ? "attached" : ""}`}>
                          {previewBack ? "Attached ✓" : "Optional"}
                        </span>
                      </div>
                      <div
                        className="tx-photo-preview-wrap"
                        onClick={() => {
                          if (previewBack) window.open(previewBack, "_blank");
                        }}
                        title={previewBack ? "Click to view full image in new tab" : "Upload rear photo"}
                      >
                        {previewBack ? (
                          <img
                            src={previewBack}
                            alt="Taxi rear view"
                            className="tx-photo-preview-img"
                          />
                        ) : (
                          <div className="tx-photo-placeholder">
                            <span className="tx-photo-placeholder-icon">🚗</span>
                            <span className="tx-photo-placeholder-text">Rear Boot &amp; Tailgate</span>
                            <span className="tx-photo-placeholder-hint">Click or drag &amp; drop (JPG, PNG, WebP)</span>
                          </div>
                        )}
                      </div>
                      <div className="tx-photo-actions">
                        <label className="tx-photo-upload-btn">
                          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="14" height="14">
                            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                            <polyline points="17 8 12 3 7 8" />
                            <line x1="12" y1="3" x2="12" y2="15" />
                          </svg>
                          <span>{photoBack ? "Change Rear" : previewBack ? "Replace Rear" : "Upload Rear Photo"}</span>
                          <input
                            type="file"
                            accept="image/jpeg,image/png,image/webp"
                            onChange={handlePhotoBackChange}
                            style={{ display: "none" }}
                          />
                        </label>
                        {previewBack && (
                          <button
                            type="button"
                            className="tx-photo-remove-btn"
                            onClick={handleClearPhotoBack}
                            title="Remove rear photo"
                          >
                            Remove
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* ══════════════════════════════════════════════════════════════
                SECTION 3: TECHNICAL SPECS & OWNERSHIP
            ══════════════════════════════════════════════════════════════ */}
            {(viewMode === "all" || activeTab === "specs") && (
              <div className="tx-form-grid" id="section-specs">
                <div className="tx-form-section-header">
                  <span>⚙️ 3. Technical Specifications &amp; Ownership</span>
                  <span style={{ fontSize: "0.72rem", color: "var(--tx-text-muted)" }}>Fleet Asset Details</span>
                </div>
                <p className="tx-form-section-desc">
                  Asset ownership model, powertrain type, and active odometer mileage.
                </p>

                {/* Vehicle Ownership Text Field + Quick Chips */}
                <div className="tx-field-group full-width">
                  <label className="tx-field-label">
                    <span>Vehicle Ownership</span>
                    <span className="tx-field-note">Company owned, driver attached, lease, or third-party partner</span>
                  </label>
                  <input
                    type="text"
                    className="tx-field-input"
                    value={form.ownership}
                    onChange={(e) => update("ownership", e.target.value)}
                    placeholder="e.g. Company Owned, Leased, Driver Owned"
                  />
                  {/* Preset Ownership Chips */}
                  <div className="tx-quick-chips">
                    {OWNERSHIP_PRESETS.map((preset) => (
                      <button
                        key={preset}
                        type="button"
                        className={`tx-chip-btn ${form.ownership === preset ? "active" : ""}`}
                        onClick={() => update("ownership", preset)}
                      >
                        {preset}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Fuel Type */}
                <div className="tx-field-group">
                  <label className="tx-field-label">Fuel / Powertrain Type</label>
                  <select
                    className="tx-field-select"
                    value={form.fuel_type}
                    onChange={(e) => update("fuel_type", e.target.value)}
                  >
                    <option value="petrol">⛽ Petrol</option>
                    <option value="diesel">🛢️ Diesel</option>
                    <option value="cng">🟢 CNG (Compressed Gas)</option>
                    <option value="ev">⚡ Electric (EV)</option>
                  </select>
                </div>

                {/* Odometer Reading */}
                <div className="tx-field-group">
                  <label className="tx-field-label">
                    <span>Current Odometer Reading (km)</span>
                    <span className="tx-field-note">Recorded mileage</span>
                  </label>
                  <input
                    type="number"
                    min="0"
                    className="tx-field-input"
                    value={form.odometer_reading}
                    onChange={(e) => update("odometer_reading", e.target.value)}
                    placeholder="e.g. 45000"
                  />
                </div>
              </div>
            )}

            {/* ══════════════════════════════════════════════════════════════
                SECTION 4: RATES & OPERATIONAL ASSIGNMENT
            ══════════════════════════════════════════════════════════════ */}
            {(viewMode === "all" || activeTab === "rates") && (
              <div className="tx-form-grid" id="section-rates">
                <div className="tx-form-section-header">
                  <span>💳 4. Rates &amp; Fleet Operations</span>
                  <span style={{ fontSize: "0.72rem", color: "var(--tx-text-muted)" }}>Billing &amp; Allocation</span>
                </div>
                <p className="tx-form-section-desc">
                  Pricing model, operational readiness, and branch &amp; driver assignment.
                </p>

                {/* Pricing Type Toggle */}
                <div className="tx-field-group">
                  <label className="tx-field-label">Pricing Billing Model</label>
                  <select
                    className="tx-field-select"
                    value={form.pricing_type}
                    onChange={(e) => update("pricing_type", e.target.value)}
                  >
                    <option value="daily">📅 Daily Rental (₹ per day)</option>
                    <option value="per_km">🛣️ Per Kilometer (₹ per km)</option>
                  </select>
                </div>

                {/* Rate Amount */}
                <div className="tx-field-group">
                  <label className="tx-field-label">
                    <span>Rate Amount (₹/{form.pricing_type === "per_km" ? "km" : "day"}) <span style={{ color: "var(--tx-danger)" }}>*</span></span>
                    <span className="tx-field-note">
                      {form.pricing_type === "per_km" ? "Distance billing rate" : "Standard daily fee"}
                    </span>
                  </label>
                  <input
                    ref={rateInputRef}
                    type="number"
                    min="0"
                    step="0.01"
                    className={`tx-field-input ${highlightField === "rate_amount" ? "has-error" : ""}`}
                    required
                    value={form.rate_amount}
                    onChange={(e) => update("rate_amount", e.target.value)}
                    placeholder={form.pricing_type === "per_km" ? "e.g. 14" : "e.g. 1800"}
                  />
                </div>

                {/* Operational Status */}
                <div className="tx-field-group">
                  <label className="tx-field-label">Fleet Operational Status</label>
                  <select
                    className="tx-field-select"
                    value={form.status}
                    onChange={(e) => update("status", e.target.value)}
                  >
                    <option value="available">🟢 Available (Ready for trips)</option>
                    <option value="on_rent">🔵 On Rent (Active Booking)</option>
                    <option value="maintenance">🟠 Maintenance (Workshop)</option>
                    <option value="inactive">⚪ Inactive (Decommissioned)</option>
                  </select>
                </div>

                {/* Office / Branch Assignment */}
                <div className="tx-field-group">
                  <label className="tx-field-label">Office / Branch</label>
                  <select
                    className="tx-field-select"
                    value={form.office_id || ""}
                    onChange={(e) => update("office_id", e.target.value)}
                  >
                    <option value="">🏢 Primary / All Branches</option>
                    {offices.map((off) => (
                      <option key={off.id} value={off.id}>
                        {off.name} {off.city ? `(${off.city})` : ""}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Assigned Driver */}
                <div className="tx-field-group full-width">
                  <label className="tx-field-label">
                    <span>Assigned Primary Driver</span>
                    <span className="tx-field-note">Driver currently assigned to this vehicle</span>
                  </label>
                  <select
                    className="tx-field-select"
                    value={form.driver_id || ""}
                    onChange={(e) => update("driver_id", e.target.value || null)}
                  >
                    <option value="">— None (Unassigned / Pool Vehicle) —</option>
                    {drivers.map((d) => (
                      <option key={d.id} value={d.id}>
                        {d.name} {d.phone ? `(${d.phone})` : ""} {d.license_number ? `• Lic: ${d.license_number}` : ""}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            )}

            {/* ══════════════════════════════════════════════════════════════
                SECTION 5: REGISTRATION DOCUMENTS & REMARKS
            ══════════════════════════════════════════════════════════════ */}
            {(viewMode === "all" || activeTab === "docs") && (
              <div className="tx-form-grid" id="section-docs">
                <div className="tx-form-section-header">
                  <span>📄 5. Compliance Documents &amp; Vehicle Notes</span>
                  <span style={{ fontSize: "0.72rem", color: "var(--tx-text-muted)" }}>Records &amp; Remarks</span>
                </div>
                <p className="tx-form-section-desc">
                  Registration certificate (RC), fitness permits, insurance documents, and operational remarks.
                </p>

                {/* RC / Vehicle Document Upload */}
                <div className="tx-field-group full-width">
                  <label className="tx-field-label">
                    <span>Vehicle Registration Certificate (RC / Permit)</span>
                    <span className="tx-field-note">PDF, JPG, PNG up to 4MB</span>
                  </label>
                  <div className="tx-doc-upload-card">
                    <div className="tx-doc-info">
                      <span className="tx-doc-icon">📑</span>
                      <div>
                        <div className="tx-doc-title">
                          {documentFile
                            ? documentFile.name
                            : existingDocPath
                            ? "Registration Document Attached"
                            : "No Document Uploaded"}
                        </div>
                        <div className="tx-doc-sub">
                          {documentFile ? (
                            `${(documentFile.size / 1024).toFixed(1)} KB • Ready to save`
                          ) : existingDocPath ? (
                            <span style={{ display: "inline-flex", gap: "6px", alignItems: "center" }}>
                              Saved on server
                              <a
                                href={initial?.document_url || `/storage/${String(existingDocPath).replace(/^\/+/, "")}`}
                                target="_blank"
                                rel="noreferrer"
                                className="tx-doc-view-link"
                              >
                                View File ↗
                              </a>
                            </span>
                          ) : (
                            "Upload RC paper or fitness certificate"
                          )}
                        </div>
                      </div>
                    </div>
                    <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
                      <label className="tx-photo-upload-btn">
                        <span>{documentFile || existingDocPath ? "Replace File" : "Choose File"}</span>
                        <input
                          type="file"
                          accept=".pdf,image/jpeg,image/png"
                          onChange={handleDocumentChange}
                          style={{ display: "none" }}
                        />
                      </label>
                      {(documentFile || existingDocPath) && (
                        <button
                          type="button"
                          className="tx-photo-remove-btn"
                          onClick={handleClearDocument}
                        >
                          Remove
                        </button>
                      )}
                    </div>
                  </div>
                </div>

                {/* Remarks & Notes */}
                <div className="tx-field-group full-width">
                  <label className="tx-field-label">Notes &amp; Vehicle Remarks</label>
                  <textarea
                    className="tx-field-textarea"
                    value={form.notes || ""}
                    onChange={(e) => update("notes", e.target.value)}
                    placeholder="Enter insurance renewal dates, FASTag toll tag ID, permit restrictions, or service remarks..."
                  />
                </div>
              </div>
            )}
          </div>

          {/* 5. Modal Footer Action Bar */}
          <div className="tx-modal-footer">
            <div className="tx-footer-left">
              {viewMode === "stepped" ? (
                <span>
                  Section {currentTabIndex + 1} of {TABS.length}: <strong>{TABS[currentTabIndex].label}</strong>
                </span>
              ) : (
                <span>All 5 sections displayed</span>
              )}
            </div>

            <div className="tx-footer-right">
              <button
                type="button"
                className="btn-modal-cancel-ghost"
                onClick={onCancel}
              >
                Cancel
              </button>

              {viewMode === "stepped" && !isFirstTab && (
                <button
                  type="button"
                  className="btn-modal-nav"
                  onClick={handlePrevTab}
                >
                  ← Previous
                </button>
              )}

              {viewMode === "stepped" && !isLastTab && (
                <button
                  type="button"
                  className="btn-modal-nav"
                  onClick={handleNextTab}
                >
                  Next: {TABS[currentTabIndex + 1].label} →
                </button>
              )}

              <button
                type="submit"
                className="tx-btn-new"
                title="Save and register this taxi (Ctrl + Enter)"
              >
                {initial ? "Save Taxi Changes" : "Register Taxi"}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}