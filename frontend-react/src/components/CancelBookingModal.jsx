import React, { useEffect, useState } from "react";
import { formatDate } from "../utils/formatDate.js";
import "../styles/cancel-modal.css";

const PRESET_REASONS = [
  { chip: "Customer Request", full: "Customer requested cancellation" },
  { chip: "Schedule Change", full: "Customer changed travel plans / dates" },
  { chip: "Vehicle Issue", full: "Vehicle unavailable / maintenance issue" },
  { chip: "Driver Unavailable", full: "Driver unavailable / emergency" },
  { chip: "Customer No-Show", full: "Customer did not show up (No-Show)" },
  { chip: "Duplicate Booking", full: "Duplicate reservation" },
  { chip: "Other Reason", full: "Other reason" },
];

export default function CancelBookingModal({
  booking,
  onClose,
  onConfirm,
  loading = false,
  error = "",
}) {
  const [selectedReason, setSelectedReason] = useState(PRESET_REASONS[0].full);
  const [notes, setNotes] = useState("");
  const [confirmed, setConfirmed] = useState(false);

  // Close on Escape key
  useEffect(() => {
    function handleKeyDown(e) {
      if (e.key === "Escape" && !loading) {
        onClose();
      }
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onClose, loading]);

  if (!booking) return null;

  function handleSubmit(e) {
    e.preventDefault();
    onConfirm({
      reason: selectedReason,
      notes: notes.trim(),
    });
  }

  const fareDisplay =
    booking.final_fare != null
      ? `₹${booking.final_fare} (Final)`
      : booking.estimated_fare != null
      ? `₹${booking.estimated_fare} (Est.)`
      : "Not set";

  return (
    <div
      className="cancel-modal-overlay"
      onClick={() => {
        if (!loading) onClose();
      }}
      role="dialog"
      aria-modal="true"
      aria-labelledby="cancel-modal-title"
    >
      <div
        className="cancel-modal-card"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="cancel-modal-top-accent" />

        {/* Modal Header */}
        <div className="cancel-modal-header">
          <div className="cancel-modal-header-content">
            <div className="cancel-icon-badge" aria-hidden="true">
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
                <line x1="12" y1="9" x2="12" y2="13" />
                <line x1="12" y1="17" x2="12.01" y2="17" />
              </svg>
            </div>
            <div>
              <h3 id="cancel-modal-title" className="cancel-modal-title">
                Cancel Booking Reservation
              </h3>
              <div className="cancel-modal-subtitle">
                <span className="cancel-booking-id-tag">ID #{booking.id}</span>
                <span>•</span>
                <span>{booking.customer_name}</span>
                <span className={`badge ${booking.status}`}>{booking.status}</span>
              </div>
            </div>
          </div>

          <button
            type="button"
            className="btn-close-modal"
            onClick={onClose}
            disabled={loading}
            aria-label="Close cancel dialog"
            title="Close"
          >
            ✕
          </button>
        </div>

        {/* Modal Body & Form */}
        <form onSubmit={handleSubmit} style={{ display: "contents" }}>
          <div className="cancel-modal-body">
            {/* Warning Callout Banner */}
            <div className="cancel-warning-banner">
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
              >
                <circle cx="12" cy="12" r="10" />
                <line x1="12" y1="8" x2="12" y2="12" />
                <line x1="12" y1="16" x2="12.01" y2="16" />
              </svg>
              <div>
                <strong>Cancellation Warning:</strong> This will update the reservation status to <strong>Cancelled</strong>, release the assigned taxi and driver back to available fleet, and log this activity.
              </div>
            </div>

            {/* Booking Details Overview Card */}
            <div className="cancel-summary-box">
              <span className="cancel-summary-title">Reservation Summary</span>
              <div className="cancel-summary-grid">
                <div className="cancel-summary-item">
                  <span className="cancel-summary-label">Customer Details</span>
                  <span className="cancel-summary-val">
                    {booking.customer_name}
                    <small>{booking.customer_phone}</small>
                  </span>
                </div>

                <div className="cancel-summary-item">
                  <span className="cancel-summary-label">Trip Schedule</span>
                  <span className="cancel-summary-val">
                    {formatDate(booking.pickup_date)}
                    <small>to {formatDate(booking.return_date)}</small>
                  </span>
                </div>

                <div className="cancel-summary-item">
                  <span className="cancel-summary-label">Route</span>
                  <span className="cancel-summary-val">
                    {booking.pickup_location}
                    <small>→ {booking.drop_location || "Not specified"}</small>
                  </span>
                </div>

                <div className="cancel-summary-item">
                  <span className="cancel-summary-label">Vehicle & Driver</span>
                  <span className="cancel-summary-val">
                    {booking.taxi ? `${booking.taxi.reg_number}` : "No taxi"}
                    <small>{booking.driver ? `Driver: ${booking.driver.name}` : "No driver"}</small>
                  </span>
                </div>

                <div className="cancel-summary-item">
                  <span className="cancel-summary-label">Estimated / Final Fare</span>
                  <span className="cancel-summary-val">{fareDisplay}</span>
                </div>

                <div className="cancel-summary-item">
                  <span className="cancel-summary-label">Current Status</span>
                  <span className="cancel-summary-val">
                    <span className={`badge ${booking.status}`}>{booking.status}</span>
                  </span>
                </div>
              </div>
            </div>

            {/* Quick Reason Chips */}
            <div>
              <span className="cancel-chips-label">Reason for cancellation</span>
              <div className="cancel-reason-chips">
                {PRESET_REASONS.map((item) => (
                  <button
                    key={item.chip}
                    type="button"
                    className={`cancel-chip ${selectedReason === item.full ? "selected" : ""}`}
                    onClick={() => setSelectedReason(item.full)}
                    disabled={loading}
                  >
                    {item.chip}
                  </button>
                ))}
              </div>

              {/* Standard Reasons Dropdown */}
              <div className="cancel-field-group">
                <select
                  className="cancel-select"
                  value={selectedReason}
                  onChange={(e) => setSelectedReason(e.target.value)}
                  disabled={loading}
                  required
                >
                  {PRESET_REASONS.map((item) => (
                    <option key={item.full} value={item.full}>
                      {item.full}
                    </option>
                  ))}
                  <option value="Customer price disagreement">Customer price disagreement</option>
                  <option value="Severe weather / road obstruction">Severe weather / road obstruction</option>
                </select>
              </div>
            </div>

            {/* Optional Cancellation Notes */}
            <div className="cancel-field-group">
              <label className="cancel-field-label" htmlFor="cancel-notes">
                Additional Notes or Remarks <small style={{ color: "#64748b", fontWeight: "normal" }}>(Optional)</small>
              </label>
              <textarea
                id="cancel-notes"
                className="cancel-textarea"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Provide internal details or context for this cancellation..."
                disabled={loading}
                rows={2}
              />
            </div>

            {/* Confirmation Acknowledgement Checkbox */}
            <label className="cancel-confirm-toggle">
              <input
                type="checkbox"
                checked={confirmed}
                onChange={(e) => setConfirmed(e.target.checked)}
                disabled={loading}
              />
              <span>I confirm that I want to cancel this booking reservation.</span>
            </label>

            {/* Error banner if submission fails */}
            {error && (
              <div className="cancel-error-message">
                <span aria-hidden="true">⚠️</span>
                <span>{error}</span>
              </div>
            )}
          </div>

          {/* Modal Footer Actions */}
          <div className="cancel-modal-footer">
            <button
              type="button"
              className="btn-modal-cancel-ghost"
              onClick={onClose}
              disabled={loading}
            >
              Keep Booking
            </button>
            <button
              type="submit"
              className="btn-modal-danger-confirm"
              disabled={loading || !confirmed}
            >
              {loading ? (
                <>
                  <span className="cancel-spinner" aria-hidden="true" />
                  Cancelling...
                </>
              ) : (
                <>
                  <svg
                    width="16"
                    height="16"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    aria-hidden="true"
                  >
                    <line x1="18" y1="6" x2="6" y2="18" />
                    <line x1="6" y1="6" x2="18" y2="18" />
                  </svg>
                  Confirm Cancellation
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

