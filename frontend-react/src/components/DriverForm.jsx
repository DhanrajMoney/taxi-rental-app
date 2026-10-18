import React, { useState, useEffect } from "react";

const EMPTY_DRIVER = {
  name: "",
  phone: "",
  emergency_number: "",
  email: "",
  gender: "",
  license_number: "",
  license_expiry: "",
  insurance_expiry: "",
  document_expiry: "",
  required_document_expiry: "",
  office_id: "",
  address: "",
  joining_date: new Date().toISOString().slice(0, 10),
  status: "active",
  notes: "",
};

export default function DriverForm({
  initial,
  offices = [],
  onSubmit,
  onCancel,
}) {
  const isEdit = Boolean(initial && initial.id);
  const [form, setForm] = useState(() => {
    if (!initial) return EMPTY_DRIVER;
    return {
      name: initial.name || "",
      phone: initial.phone || "",
      emergency_number: initial.emergency_number || "",
      email: initial.email || "",
      gender: initial.gender || "",
      license_number: initial.license_number || "",
      license_expiry: initial.license_expiry ? initial.license_expiry.slice(0, 10) : "",
      insurance_expiry: initial.insurance_expiry ? initial.insurance_expiry.slice(0, 10) : "",
      document_expiry: initial.document_expiry ? initial.document_expiry.slice(0, 10) : "",
      required_document_expiry: initial.required_document_expiry ? initial.required_document_expiry.slice(0, 10) : "",
      office_id: initial.office_id || "",
      address: initial.address || "",
      joining_date: initial.joining_date ? initial.joining_date.slice(0, 10) : new Date().toISOString().slice(0, 10),
      status: initial.status || "active",
      notes: initial.notes || "",
    };
  });

  const [photo, setPhoto] = useState(null);
  const [previewUrl, setPreviewUrl] = useState(
    initial?.photo_path ? `/storage/${initial.photo_path.replace(/^\/+/, "")}` : null
  );
  const [submitting, setSubmitting] = useState(false);
  const [validationError, setValidationError] = useState("");

  // Handle ESC key to dismiss modal
  useEffect(() => {
    function handleKeyDown(e) {
      if (e.key === "Escape") {
        onCancel();
      }
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onCancel]);

  // Prevent memory leaks by revoking object URL when component unmounts or previewUrl changes
  useEffect(() => {
    return () => {
      if (previewUrl && previewUrl.startsWith("blob:")) {
        URL.revokeObjectURL(previewUrl);
      }
    };
  }, [previewUrl]);

  function handleChange(field, value) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  function handlePhotoChange(e) {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 2 * 1024 * 1024) {
        setValidationError("Photo size exceeds 2MB limit. Please choose a smaller image.");
        return;
      }
      if (previewUrl && previewUrl.startsWith("blob:")) {
        URL.revokeObjectURL(previewUrl);
      }
      setPhoto(file);
      setPreviewUrl(URL.createObjectURL(file));
      setValidationError("");
    }
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setValidationError("");

    const cleanName = form.name.trim();
    const cleanPhone = form.phone.trim();
    const cleanEmergency = (form.emergency_number || "").trim();
    const cleanEmail = (form.email || "").trim();
    const cleanLicense = form.license_number.trim().toUpperCase();

    if (!cleanName) {
      setValidationError("Driver full name is required.");
      return;
    }
    if (!cleanPhone) {
      setValidationError("Contact phone number is required.");
      return;
    }
    const phoneDigits = cleanPhone.replace(/\D/g, "");
    if (phoneDigits.length < 7) {
      setValidationError("Please enter a valid contact phone number (at least 7 digits).");
      return;
    }
    if (cleanEmergency) {
      const emergencyDigits = cleanEmergency.replace(/\D/g, "");
      if (emergencyDigits.length < 7) {
        setValidationError("Please enter a valid emergency phone number (at least 7 digits).");
        return;
      }
      if (cleanEmergency === cleanPhone || (phoneDigits.length >= 7 && phoneDigits === emergencyDigits)) {
        setValidationError("Emergency number must be different from the driver's primary phone.");
        return;
      }
    }
    if (cleanEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail)) {
      setValidationError("Please enter a valid email address.");
      return;
    }
    if (!cleanLicense) {
      setValidationError("Driving license number is required.");
      return;
    }
    if (!form.license_expiry) {
      setValidationError("License expiry date is required.");
      return;
    }
    if (!form.joining_date) {
      setValidationError("Joining date is required.");
      return;
    }

    const sanitizedForm = {
      ...form,
      name: cleanName,
      phone: cleanPhone,
      emergency_number: cleanEmergency,
      email: cleanEmail,
      license_number: cleanLicense,
      address: (form.address || "").trim(),
      notes: (form.notes || "").trim(),
    };

    try {
      setSubmitting(true);
      await onSubmit(sanitizedForm, photo);
    } catch (err) {
      setValidationError(err?.response?.data?.message || err.message || "Failed to save driver.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="drv-modal-overlay" onClick={onCancel} role="dialog" aria-modal="true" aria-labelledby="drv-modal-title">
      <div className="drv-modal-dialog" onClick={(e) => e.stopPropagation()}>
        <div className="drv-modal-header">
          <h2 id="drv-modal-title" className="drv-modal-title">
            <span>{isEdit ? "✏️" : "➕"}</span>
            {isEdit ? `Edit Driver: ${initial.name}` : "Register New Driver"}
          </h2>
          <button
            type="button"
            className="drv-panel-close-btn"
            onClick={onCancel}
            title="Close (Esc)"
            aria-label="Close modal"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" width="18" height="18">
              <path d="M18 6 6 18M6 6l12 12" />
            </svg>
          </button>
        </div>

        <form onSubmit={handleSubmit} style={{ display: "contents" }}>
          <div className="drv-modal-body">
            {validationError && (
              <div style={{
                background: "#fef2f2",
                border: "1px solid #fecaca",
                color: "#dc2626",
                padding: "0.75rem 1rem",
                borderRadius: "8px",
                marginBottom: "1rem",
                fontSize: "0.875rem"
              }}>
                ⚠️ {validationError}
              </div>
            )}

            <div className="drv-form-grid">
              {/* Photo Upload with Live Thumbnail */}
              <div className="drv-form-group full-width">
                <label className="drv-form-label">Driver Photograph</label>
                <div className="drv-photo-uploader">
                  {previewUrl ? (
                    <img
                      src={previewUrl}
                      alt="Driver avatar preview"
                      className="drv-preview-avatar"
                      onError={(e) => {
                        e.target.onerror = null;
                        e.target.src = "";
                        setPreviewUrl(null);
                      }}
                    />
                  ) : (
                    <div className="drv-preview-avatar">👤</div>
                  )}
                  <div className="drv-photo-controls">
                    <div className="drv-file-upload-row">
                      <label htmlFor="drv-photo-input" className="drv-file-btn">
                        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                          <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                          <polyline points="17 8 12 3 7 8" />
                          <line x1="12" y1="3" x2="12" y2="15" />
                        </svg>
                        <span>{photo ? "Change Photo" : isEdit && initial?.photo_path ? "Replace Photo" : "Choose File"}</span>
                      </label>
                      <input
                        type="file"
                        accept="image/jpeg,image/png,image/webp"
                        onChange={handlePhotoChange}
                        id="drv-photo-input"
                        className="drv-photo-input-hidden"
                      />
                      <span className="drv-file-name-text" title={photo ? photo.name : isEdit && initial?.photo_path ? "Existing photo active" : "No file chosen"}>
                        {photo ? photo.name : isEdit && initial?.photo_path ? "Existing photo active" : "No file chosen"}
                      </span>
                      {photo && (
                        <button
                          type="button"
                          className="drv-photo-clear-btn"
                          onClick={() => {
                            setPhoto(null);
                            setPreviewUrl(initial?.photo_path ? `/storage/${initial.photo_path.replace(/^\/+/, "")}` : null);
                          }}
                          title="Clear selected file"
                        >
                          ✕
                        </button>
                      )}
                    </div>
                    <div className="drv-photo-hint">
                      JPG, PNG, or WebP up to 2MB. {isEdit && "Choose a new file to update."}
                    </div>
                  </div>
                </div>
              </div>

              {/* Full Name */}
              <div className="drv-form-group">
                <label className="drv-form-label">
                  Full Name <span className="req">*</span>
                </label>
                <input
                  type="text"
                  required
                  className="drv-form-input"
                  placeholder="e.g. Ramesh Kumar"
                  value={form.name}
                  onChange={(e) => handleChange("name", e.target.value)}
                />
              </div>

              {/* Phone Number */}
              <div className="drv-form-group">
                <label className="drv-form-label">
                  Contact Phone <span className="req">*</span>
                </label>
                <input
                  type="tel"
                  required
                  className="drv-form-input"
                  placeholder="e.g. +91 98765 43210"
                  value={form.phone}
                  onChange={(e) => handleChange("phone", e.target.value)}
                />
              </div>

              {/* Emergency Number */}
              <div className="drv-form-group">
                <label className="drv-form-label">Emergency Number</label>
                <input
                  type="tel"
                  className="drv-form-input"
                  placeholder="e.g. +91 98765 43211"
                  value={form.emergency_number}
                  onChange={(e) => handleChange("emergency_number", e.target.value)}
                />
              </div>

              {/* Email */}
              <div className="drv-form-group">
                <label className="drv-form-label">Email Address (Optional)</label>
                <input
                  type="email"
                  className="drv-form-input"
                  placeholder="driver@example.com"
                  value={form.email}
                  onChange={(e) => handleChange("email", e.target.value)}
                />
              </div>

              {/* Gender */}
              <div className="drv-form-group">
                <label className="drv-form-label">Gender</label>
                <select
                  className="drv-form-select"
                  value={form.gender}
                  onChange={(e) => handleChange("gender", e.target.value)}
                >
                  <option value="">Select gender</option>
                  <option value="male">Male</option>
                  <option value="female">Female</option>
                  <option value="other">Other</option>
                  <option value="prefer_not_to_say">Prefer not to say</option>
                </select>
              </div>

              {/* Status */}
              <div className="drv-form-group">
                <label className="drv-form-label">
                  Duty Status <span className="req">*</span>
                </label>
                <select
                  className="drv-form-select"
                  value={form.status}
                  onChange={(e) => handleChange("status", e.target.value)}
                >
                  <option value="active">Active (Available)</option>
                  <option value="on_trip">On Trip</option>
                  <option value="on_leave">On Leave</option>
                  <option value="inactive">Inactive</option>
                </select>
              </div>

              {/* Office Branch */}
              <div className="drv-form-group">
                <label className="drv-form-label">Base Office Location</label>
                <select
                  className="drv-form-select"
                  value={form.office_id}
                  onChange={(e) => handleChange("office_id", e.target.value)}
                >
                  <option value="">Primary / Head Office</option>
                  {offices.map((o) => (
                    <option key={o.id} value={o.id}>
                      {o.name} {o.city ? `(${o.city})` : ""}
                    </option>
                  ))}
                </select>
              </div>

              {/* Joining Date */}
              <div className="drv-form-group">
                <label className="drv-form-label">
                  Date of Joining <span className="req">*</span>
                </label>
                <input
                  type="date"
                  required
                  className="drv-form-input"
                  value={form.joining_date}
                  onChange={(e) => handleChange("joining_date", e.target.value)}
                />
              </div>

              {/* License Number */}
              <div className="drv-form-group">
                <label className="drv-form-label">
                  Driving License No. <span className="req">*</span>
                </label>
                <input
                  type="text"
                  required
                  className="drv-form-input"
                  placeholder="e.g. DL-0420110012345"
                  value={form.license_number}
                  onChange={(e) => handleChange("license_number", e.target.value.toUpperCase())}
                />
              </div>

              {/* License Expiry */}
              <div className="drv-form-group">
                <label className="drv-form-label">
                  License Expiry Date <span className="req">*</span>
                </label>
                <input
                  type="date"
                  required
                  className="drv-form-input"
                  value={form.license_expiry}
                  onChange={(e) => handleChange("license_expiry", e.target.value)}
                />
              </div>
              {/*
              Insurance Expiry
              <div className="drv-form-group">
                <label className="drv-form-label">Insurance Expiry (Optional)</label>
                <input
                  type="date"
                  className="drv-form-input"
                  value={form.insurance_expiry}
                  onChange={(e) => handleChange("insurance_expiry", e.target.value)}
                />
              </div>

              Document Expiry
              <div className="drv-form-group">
                <label className="drv-form-label">Doc Expiry (Optional)</label>
                <input
                  type="date"
                  className="drv-form-input"
                  value={form.document_expiry}
                  onChange={(e) => handleChange("document_expiry", e.target.value)}
                />
              </div>

              Mandatory Clearance Expiry
              <div className="drv-form-group">
                <label className="drv-form-label">Mandatory Clearance Expiry</label>
                <input
                  type="date"
                  className="drv-form-input"
                  value={form.required_document_expiry}
                  onChange={(e) => handleChange("required_document_expiry", e.target.value)}
                />
              </div>
              */}

              {/* Address */}
              <div className="drv-form-group full-width">
                <label className="drv-form-label">Residential Address</label>
                <textarea
                  className="drv-form-textarea"
                  placeholder="Street address, city, state, postal code..."
                  value={form.address}
                  onChange={(e) => handleChange("address", e.target.value)}
                />
              </div>

              {/* Notes */}
              <div className="drv-form-group full-width">
                <label className="drv-form-label">Internal Notes / Remarks</label>
                <textarea
                  className="drv-form-textarea"
                  placeholder="Badge details, shift preferences, emergency contacts..."
                  value={form.notes}
                  onChange={(e) => handleChange("notes", e.target.value)}
                />
              </div>
            </div>
          </div>

          <div className="drv-modal-footer">
            <button
              type="button"
              className="drv-btn-refresh"
              onClick={onCancel}
              disabled={submitting}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="drv-btn-primary"
              disabled={submitting}
            >
              {submitting ? "Saving..." : isEdit ? "Update Driver" : "Register Driver"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
