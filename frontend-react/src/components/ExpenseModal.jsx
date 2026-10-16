import React, { useState, useEffect } from "react";
import { ExpenseAPI } from "../api/client.js";
import "../styles/expenses.css";

const CATEGORIES = [
  { id: "fuel", label: "Fuel & Energy", icon: "⛽" },
  { id: "toll", label: "Tolls & FASTag", icon: "🛣️" },
  { id: "parking", label: "Parking Charges", icon: "🅿️" },
  { id: "driver_allowance", label: "Driver Allowance", icon: "🍽️" },
  { id: "permit", label: "Border & Permits", icon: "🛂" },
  { id: "other", label: "Incidentals / Other", icon: "🧹" },
];

const PAYMENT_METHODS = [
  { id: "driver_cash", label: "Driver Cash (Reimbursable)" },
  { id: "driver_upi", label: "Driver UPI (Reimbursable)" },
  { id: "company_card", label: "Company Corporate Card" },
  { id: "fastag", label: "FASTag (Company Direct)" },
  { id: "customer_paid", label: "Customer Direct Paid" },
];

export default function ExpenseModal({ isOpen, onClose, booking, expense, onSaved, canManage }) {
  const [category, setCategory] = useState("fuel");
  const [amount, setAmount] = useState("");
  const [paymentMethod, setPaymentMethod] = useState("driver_cash");
  const [isBillable, setIsBillable] = useState(false);
  const [expenseDate, setExpenseDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [notes, setNotes] = useState("");
  const [receiptFile, setReceiptFile] = useState(null);
  const [status, setStatus] = useState("pending_approval");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (expense) {
      setCategory(expense.category || "fuel");
      setAmount(expense.amount || "");
      setPaymentMethod(expense.payment_method || "driver_cash");
      setIsBillable(Boolean(expense.is_billable));
      setExpenseDate(expense.expense_date ? expense.expense_date.slice(0, 10) : new Date().toISOString().slice(0, 10));
      setNotes(expense.notes || "");
      setStatus(expense.status || "pending_approval");
      setReceiptFile(null);
    } else {
      setCategory("fuel");
      setAmount("");
      setPaymentMethod(canManage ? "company_card" : "driver_cash");
      setIsBillable(false);
      setExpenseDate(new Date().toISOString().slice(0, 10));
      setNotes("");
      setStatus(canManage ? "approved" : "pending_approval");
      setReceiptFile(null);
    }
    setError("");
  }, [expense, isOpen, canManage]);

  if (!isOpen || !booking) return null;

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");

    const parsedAmount = parseFloat(amount);
    if (isNaN(parsedAmount) || parsedAmount <= 0) {
      setError("Please enter a valid positive amount.");
      return;
    }

    setLoading(true);

    try {
      const formData = new FormData();
      formData.append("category", category);
      formData.append("amount", parsedAmount.toFixed(2));
      formData.append("payment_method", paymentMethod);
      formData.append("is_billable", isBillable ? "1" : "0");
      formData.append("expense_date", expenseDate);
      if (notes.trim()) formData.append("notes", notes.trim());
      if (status) formData.append("status", status);

      if (receiptFile) {
        formData.append("receipt", receiptFile);
      }

      let savedRecord;
      if (expense?.id) {
        savedRecord = await ExpenseAPI.update(expense.id, formData);
      } else {
        savedRecord = await ExpenseAPI.create(booking.id, formData);
      }

      onSaved(savedRecord?.data || savedRecord);
      onClose();
    } catch (err) {
      const msg = err?.response?.data?.message || err?.response?.data?.error || "Failed to save expense. Please verify your inputs.";
      setError(msg);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="exp-modal-backdrop" onClick={onClose} role="dialog" aria-modal="true">
      <div className="exp-modal-shell" onClick={(e) => e.stopPropagation()}>
        <div className="exp-modal-header">
          <div className="exp-modal-header-info">
            <span className="exp-modal-badge">Booking #{booking.id}</span>
            <h3 className="exp-modal-title">
              {expense ? "Edit Ride Expense" : "Log Trip Operational Expense"}
            </h3>
          </div>
          <button type="button" className="exp-modal-close" onClick={onClose} aria-label="Close">
            ✕
          </button>
        </div>

        <form onSubmit={handleSubmit} className="exp-modal-form">
          {error && <div className="exp-alert error">{error}</div>}

          {/* Quick Category Chips */}
          <div className="exp-form-group">
            <label className="exp-label">Expense Category</label>
            <div className="exp-category-grid">
              {CATEGORIES.map((cat) => (
                <button
                  type="button"
                  key={cat.id}
                  className={`exp-cat-btn ${category === cat.id ? "active" : ""}`}
                  onClick={() => setCategory(cat.id)}
                >
                  <span className="exp-cat-icon">{cat.icon}</span>
                  <span className="exp-cat-text">{cat.label}</span>
                </button>
              ))}
            </div>
          </div>

          <div className="exp-grid-2">
            {/* Amount */}
            <div className="exp-form-group">
              <label className="exp-label" htmlFor="exp-amount">
                Amount (₹) <span className="req">*</span>
              </label>
              <input
                id="exp-amount"
                type="number"
                step="0.01"
                min="0.01"
                required
                className="exp-input"
                placeholder="e.g. 1500.00"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
              />
            </div>

            {/* Expense Date */}
            <div className="exp-form-group">
              <label className="exp-label" htmlFor="exp-date">
                Date Incurred <span className="req">*</span>
              </label>
              <input
                id="exp-date"
                type="date"
                required
                className="exp-input"
                value={expenseDate}
                onChange={(e) => setExpenseDate(e.target.value)}
              />
            </div>
          </div>

          <div className="exp-grid-2">
            {/* Payment Method */}
            <div className="exp-form-group">
              <label className="exp-label" htmlFor="exp-pay-method">
                Payment Method & Payer
              </label>
              <select
                id="exp-pay-method"
                className="exp-select"
                value={paymentMethod}
                onChange={(e) => setPaymentMethod(e.target.value)}
              >
                {PAYMENT_METHODS.map((pm) => (
                  <option key={pm.id} value={pm.id}>
                    {pm.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Approval Status (Staff/Admin) */}
            {canManage ? (
              <div className="exp-form-group">
                <label className="exp-label" htmlFor="exp-status">
                  Approval Status
                </label>
                <select
                  id="exp-status"
                  className="exp-select"
                  value={status}
                  onChange={(e) => setStatus(e.target.value)}
                >
                  <option value="approved">Approved</option>
                  <option value="pending_approval">Pending Approval</option>
                  <option value="reimbursed">Reimbursed</option>
                  <option value="rejected">Rejected</option>
                </select>
              </div>
            ) : (
              <div className="exp-form-group">
                <label className="exp-label">Approval Status</label>
                <div className="exp-status-chip pending">⏳ Pending Approval by Dispatcher</div>
              </div>
            )}
          </div>

          {/* Billable Toggle */}
          <div className="exp-form-group">
            <label className="exp-toggle-label">
              <input
                type="checkbox"
                checked={isBillable}
                onChange={(e) => setIsBillable(e.target.checked)}
                className="exp-checkbox"
              />
              <span className="exp-toggle-content">
                <strong>Billable to Customer (Add-on at Actuals)</strong>
                <small>
                  Check this if tolls, parking, or permits should be added onto the customer's final invoice.
                </small>
              </span>
            </label>
          </div>

          {/* Receipt File Upload */}
          <div className="exp-form-group">
            <label className="exp-label">Attach Bill / Slip Receipt (PDF, JPG, PNG up to 10MB)</label>
            <div className="exp-file-upload">
              <input
                type="file"
                id="exp-receipt-input"
                accept=".pdf,.jpg,.jpeg,.png"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) {
                    if (file.size > 10 * 1024 * 1024) {
                      setError("Receipt file cannot exceed 10MB.");
                      return;
                    }
                    setReceiptFile(file);
                    setError("");
                  }
                }}
                className="exp-file-native"
              />
              <label htmlFor="exp-receipt-input" className="exp-file-btn">
                <span>📎</span> {receiptFile ? receiptFile.name : expense?.receipt_path ? "Replace current receipt" : "Select or snap receipt photo"}
              </label>
              {receiptFile && (
                <span className="exp-file-selected">
                  Selected: {receiptFile.name} ({(receiptFile.size / 1024).toFixed(0)} KB)
                </span>
              )}
            </div>
          </div>

          {/* Notes */}
          <div className="exp-form-group">
            <label className="exp-label" htmlFor="exp-notes">
              Notes / Location Details
            </label>
            <textarea
              id="exp-notes"
              rows={2}
              className="exp-textarea"
              placeholder="e.g. Fuel receipt from BPCL Pump, Toll plaza at expressway..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
            />
          </div>

          {/* Actions */}
          <div className="exp-modal-actions">
            <button type="button" className="exp-btn-secondary" onClick={onClose} disabled={loading}>
              Cancel
            </button>
            <button type="submit" className="exp-btn-primary" disabled={loading}>
              {loading ? "Saving…" : expense ? "Save Changes" : "Record Expense"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

