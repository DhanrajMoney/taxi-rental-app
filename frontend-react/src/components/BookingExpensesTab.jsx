import React, { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { ExpenseAPI } from "../api/client.js";
import { formatCurrency, formatDate } from "../utils/format.js";
import ExpenseModal from "./ExpenseModal.jsx";
import "../styles/expenses.css";

const CATEGORY_ICONS = {
  fuel: "⛽",
  toll: "🛣️",
  parking: "🅿️",
  driver_allowance: "🍽️",
  permit: "🛂",
  other: "🧹",
};

export default function BookingExpensesTab({ booking, canManage, onBookingUpdated }) {
  // Pre-seed from booking props to eliminate layout shift on initial render
  const [expenses, setExpenses] = useState(() => booking?.expenses || []);
  const [pnl, setPnl] = useState(() => {
    const baseFare = Number(booking?.final_fare ?? booking?.estimated_fare ?? 0);
    const billable = Number(booking?.billable_expenses ?? 0);
    const totalExp = Number(booking?.total_expenses ?? 0);
    const grand = baseFare + billable;
    const netProfit = Number(booking?.net_profit ?? (grand - totalExp));
    const margin = booking?.profit_margin_pct ?? (grand > 0 ? Number(((netProfit / grand) * 100).toFixed(1)) : 0);
    return {
      base_fare: baseFare,
      billable_expenses: billable,
      customer_grand_total: grand,
      total_expenses: totalExp,
      net_profit: netProfit,
      profit_margin_pct: margin,
      reimbursable_pending: 0,
      reimbursed_total: 0,
    };
  });

  const [loading, setLoading] = useState(() => !(booking?.expenses && booking.expenses.length > 0));
  const [filter, setFilter] = useState("all");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingExpense, setEditingExpense] = useState(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [downloadingId, setDownloadingId] = useState(null);
  const [banner, setBanner] = useState(null); // { type: 'success' | 'error', message: string }
  const [confirmState, setConfirmState] = useState(null); // { title, message, onConfirm, actionLabel, danger }

  const isMountedRef = useRef(true);
  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  const loadExpenses = useCallback(async (showSpinner = false) => {
    if (!booking?.id) return;
    try {
      if (showSpinner) setLoading(true);
      const res = await ExpenseAPI.listForBooking(booking.id);
      if (!isMountedRef.current) return;
      setExpenses(res?.expenses || []);
      if (res?.pnl) {
        setPnl(res.pnl);
      }
    } catch (err) {
      if (isMountedRef.current && booking.expenses) {
        setExpenses(booking.expenses);
      }
    } finally {
      if (isMountedRef.current) setLoading(false);
    }
  }, [booking?.id, booking?.expenses]);

  useEffect(() => {
    loadExpenses();
  }, [loadExpenses]);

  // Memoize filtered expenses for instant tab switching without re-allocating
  const filteredExpenses = useMemo(() => {
    if (filter === "all") return expenses;
    return expenses.filter((e) => e.status === filter);
  }, [expenses, filter]);

  // Authenticated receipt download using Axios blob response
  const handleDownloadReceipt = useCallback(async (exp) => {
    try {
      setDownloadingId(exp.id);
      const blob = await ExpenseAPI.downloadReceipt(exp.id);
      const blobUrl = window.URL.createObjectURL(new Blob([blob]));
      const link = document.createElement("a");
      link.href = blobUrl;
      link.download = exp.receipt_original_name || `expense-${exp.id}-receipt.pdf`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(blobUrl);
    } catch (err) {
      setBanner({
        type: "error",
        message: err?.response?.data?.message || "Failed to download receipt slip.",
      });
    } finally {
      setDownloadingId(null);
    }
  }, []);

  const handleApprove = useCallback(async (expenseId) => {
    try {
      setActionLoading(true);
      await ExpenseAPI.approve(expenseId);
      setBanner({ type: "success", message: "Expense approved successfully." });
      await loadExpenses();
      if (onBookingUpdated) onBookingUpdated();
    } catch (err) {
      setBanner({ type: "error", message: err?.response?.data?.message || "Failed to approve expense." });
    } finally {
      if (isMountedRef.current) setActionLoading(false);
    }
  }, [loadExpenses, onBookingUpdated]);

  const handleReimburse = useCallback(async (expenseId) => {
    try {
      setActionLoading(true);
      await ExpenseAPI.reimburse(expenseId);
      setBanner({ type: "success", message: "Expense marked as reimbursed." });
      await loadExpenses();
      if (onBookingUpdated) onBookingUpdated();
    } catch (err) {
      setBanner({ type: "error", message: err?.response?.data?.message || "Failed to mark as reimbursed." });
    } finally {
      if (isMountedRef.current) setActionLoading(false);
    }
  }, [loadExpenses, onBookingUpdated]);

  const executeReject = useCallback(async (expenseId) => {
    try {
      setActionLoading(true);
      await ExpenseAPI.reject(expenseId);
      setBanner({ type: "success", message: "Expense claim rejected." });
      await loadExpenses();
      if (onBookingUpdated) onBookingUpdated();
    } catch (err) {
      setBanner({ type: "error", message: err?.response?.data?.message || "Failed to reject expense." });
    } finally {
      if (isMountedRef.current) setActionLoading(false);
      setConfirmState(null);
    }
  }, [loadExpenses, onBookingUpdated]);

  const executeDelete = useCallback(async (expenseId) => {
    try {
      setActionLoading(true);
      await ExpenseAPI.remove(expenseId);
      setBanner({ type: "success", message: "Expense deleted successfully." });
      await loadExpenses();
      if (onBookingUpdated) onBookingUpdated();
    } catch (err) {
      setBanner({ type: "error", message: err?.response?.data?.message || "Failed to delete expense." });
    } finally {
      if (isMountedRef.current) setActionLoading(false);
      setConfirmState(null);
    }
  }, [loadExpenses, onBookingUpdated]);

  const isPositiveMargin = pnl.net_profit >= 0;

  return (
    <div className="bk-tab-pane">
      {/* Optional feedback banner */}
      {banner && (
        <div className={`exp-tab-banner ${banner.type}`}>
          <span>{banner.message}</span>
          <button
            type="button"
            className="exp-tab-banner-close"
            onClick={() => setBanner(null)}
            aria-label="Dismiss banner"
          >
            ✕
          </button>
        </div>
      )}

      {/* 1. Trip Real-Time P&L Hero Summary Card */}
      <div className="exp-pnl-card">
        <div className="exp-pnl-header">
          <div className="exp-pnl-title-wrap">
            <span className="exp-pnl-icon">📊</span>
            <span className="exp-pnl-title">Trip Profit & Loss (P&L)</span>
          </div>
          <span className={`exp-margin-pill ${isPositiveMargin ? "positive" : "negative"}`}>
            Net Margin: {pnl.profit_margin_pct}%
          </span>
        </div>

        <div className="exp-pnl-grid">
          {/* Net Profit Hero */}
          <div className="exp-pnl-stat hero">
            <span className="exp-stat-label">Net Operating Profit</span>
            <span className="exp-stat-val">{formatCurrency(pnl.net_profit)}</span>
            <span className="exp-stat-sub">
              Gross Fare ({formatCurrency(pnl.customer_grand_total)}) − Ride Expenses ({formatCurrency(pnl.total_expenses)})
            </span>
          </div>

          {/* Customer Grand Total */}
          <div className="exp-pnl-stat">
            <span className="exp-stat-label">Customer Grand Total</span>
            <span className="exp-stat-val">{formatCurrency(pnl.customer_grand_total)}</span>
            <span className="exp-stat-sub">
              Base: {formatCurrency(pnl.base_fare)} + Add-ons: {formatCurrency(pnl.billable_expenses)}
            </span>
          </div>

          {/* Total Expenses */}
          <div className="exp-pnl-stat">
            <span className="exp-stat-label">Total Ride Expenses</span>
            <span className="exp-stat-val">{formatCurrency(pnl.total_expenses)}</span>
            <span className="exp-stat-sub">{expenses.length} expense item(s) logged</span>
          </div>

          {/* Driver Reimbursable */}
          <div className="exp-pnl-stat">
            <span className="exp-stat-label">Driver Reimbursable</span>
            <span className="exp-stat-val">{formatCurrency(pnl.reimbursable_pending)}</span>
            <span className="exp-stat-sub">
              Pending approval ({formatCurrency(pnl.reimbursable_pending)}) / Settled ({formatCurrency(pnl.reimbursed_total)})
            </span>
          </div>
        </div>
      </div>

      {/* 2. Toolbar & Log Button */}
      <div className="exp-toolbar">
        <div className="exp-toolbar-title">
          <span>Operational Expense Ledger</span>
          <small>({filteredExpenses.length})</small>
        </div>
        <button
          type="button"
          className="exp-btn-log"
          onClick={() => {
            setEditingExpense(null);
            setIsModalOpen(true);
          }}
        >
          <span>+</span> Log Ride Expense
        </button>
      </div>

      {/* 3. Filter Pills */}
      <div className="exp-filter-bar">
        {[
          { id: "all", label: `All (${expenses.length})` },
          { id: "pending_approval", label: "⏳ Pending" },
          { id: "approved", label: "✅ Approved" },
          { id: "reimbursed", label: "💵 Reimbursed" },
          { id: "rejected", label: "❌ Rejected" },
        ].map((tab) => (
          <button
            key={tab.id}
            type="button"
            className={`exp-filter-chip ${filter === tab.id ? "active" : ""}`}
            onClick={() => setFilter(tab.id)}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* 4. Expense Items List */}
      {loading ? (
        <div className="exp-empty">Loading trip operational expenses…</div>
      ) : filteredExpenses.length === 0 ? (
        <div className="exp-empty">
          <div className="exp-empty-icon">🧾</div>
          <div className="exp-empty-title">No expenses recorded</div>
          <p>
            {filter === "all"
              ? "No en-route fuel, toll, or allowance expenses have been logged for this trip."
              : `No expenses matching status "${filter}".`}
          </p>
        </div>
      ) : (
        <div className="exp-list">
          {filteredExpenses.map((exp) => {
            const icon = CATEGORY_ICONS[exp.category] || "🧾";
            const isPending = exp.status === "pending_approval";
            const isApproved = exp.status === "approved";
            const isReimbursed = exp.status === "reimbursed";

            return (
              <div key={exp.id} className="exp-card">
                <div className="exp-card-header">
                  <div className="exp-card-meta">
                    <span className="exp-category-pill">
                      <span>{icon}</span> {exp.category_label || exp.category}
                    </span>
                    <span className={`exp-billable-chip ${exp.is_billable ? "billable" : "company"}`}>
                      {exp.is_billable ? "Billable to Customer" : "Company Expense"}
                    </span>
                  </div>
                  <span className="exp-card-amount">{formatCurrency(exp.amount)}</span>
                </div>

                <div className="exp-card-body">
                  <span>
                    📅 {formatDate(exp.expense_date)} • 💳 {exp.payment_method_label || exp.payment_method}
                    {exp.driver?.name && ` • 🧑‍✈️ ${exp.driver.name}`}
                  </span>
                  <span className={`exp-status-badge ${exp.status}`}>
                    {isPending && "⏳ Pending"}
                    {isApproved && "✅ Approved"}
                    {isReimbursed && "💵 Reimbursed"}
                    {exp.status === "rejected" && "❌ Rejected"}
                  </span>
                </div>

                {exp.notes && <div className="exp-card-notes">"{exp.notes}"</div>}

                <div className="exp-card-footer">
                  {exp.receipt_path ? (
                    <button
                      type="button"
                      className="exp-receipt-link-btn"
                      onClick={() => handleDownloadReceipt(exp)}
                      disabled={downloadingId === exp.id}
                      title="Download attached receipt"
                    >
                      📎 {downloadingId === exp.id ? "Downloading…" : exp.receipt_original_name || "View Receipt Slip"}
                    </button>
                  ) : (
                    <span className="exp-stat-sub">No receipt attached</span>
                  )}

                  <div className="exp-actions-group">
                    {/* Approval workflows for Admin/Staff */}
                    {canManage && isPending && (
                      <button
                        type="button"
                        className="exp-btn-act approve"
                        disabled={actionLoading}
                        onClick={() => handleApprove(exp.id)}
                      >
                        Approve
                      </button>
                    )}
                    {canManage && (isPending || isApproved) && (
                      <button
                        type="button"
                        className="exp-btn-act reimburse"
                        disabled={actionLoading}
                        onClick={() => handleReimburse(exp.id)}
                      >
                        Reimburse
                      </button>
                    )}
                    {canManage && isPending && (
                      <button
                        type="button"
                        className="exp-btn-act reject"
                        disabled={actionLoading}
                        onClick={() => {
                          setConfirmState({
                            title: "Reject Expense Claim?",
                            message: `Are you sure you want to reject this ${exp.category_label || exp.category} claim of ${formatCurrency(exp.amount)}?`,
                            actionLabel: "Reject Claim",
                            danger: true,
                            onConfirm: () => executeReject(exp.id),
                          });
                        }}
                      >
                        Reject
                      </button>
                    )}

                    {/* Edit */}
                    {(canManage || isPending) && (
                      <button
                        type="button"
                        className="exp-btn-act"
                        onClick={() => {
                          setEditingExpense(exp);
                          setIsModalOpen(true);
                        }}
                      >
                        Edit
                      </button>
                    )}

                    {/* Delete */}
                    {(canManage || isPending) && (
                      <button
                        type="button"
                        className="exp-btn-act delete"
                        disabled={actionLoading}
                        onClick={() => {
                          setConfirmState({
                            title: "Delete Expense Record?",
                            message: `Are you sure you want to permanently delete this ${exp.category_label || exp.category} expense of ${formatCurrency(exp.amount)}?`,
                            actionLabel: "Delete Expense",
                            danger: true,
                            onConfirm: () => executeDelete(exp.id),
                          });
                        }}
                        title="Delete expense"
                      >
                        🗑️
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Confirmation Dialog Modal */}
      {confirmState && (
        <div className="exp-modal-backdrop" onClick={() => setConfirmState(null)} role="dialog" aria-modal="true">
          <div className="exp-modal-shell" style={{ maxWidth: 420 }} onClick={(e) => e.stopPropagation()}>
            <div className="exp-modal-header">
              <h3 className="exp-modal-title">{confirmState.title}</h3>
              <button
                type="button"
                className="exp-modal-close"
                onClick={() => setConfirmState(null)}
                aria-label="Close"
              >
                ✕
              </button>
            </div>
            <div style={{ padding: "1.2rem", fontSize: "0.9rem", color: "#334155" }}>
              <p>{confirmState.message}</p>
            </div>
            <div className="exp-modal-actions" style={{ padding: "0 1.2rem 1.2rem" }}>
              <button
                type="button"
                className="exp-btn-secondary"
                onClick={() => setConfirmState(null)}
                disabled={actionLoading}
              >
                Cancel
              </button>
              <button
                type="button"
                className="exp-btn-primary"
                style={confirmState.danger ? { background: "#dc2626" } : undefined}
                onClick={confirmState.onConfirm}
                disabled={actionLoading}
              >
                {actionLoading ? "Processing…" : confirmState.actionLabel}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 5. Expense Create/Edit Modal */}
      <ExpenseModal
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          setEditingExpense(null);
        }}
        booking={booking}
        expense={editingExpense}
        canManage={canManage}
        onSaved={async () => {
          setBanner({
            type: "success",
            message: editingExpense ? "Expense updated successfully." : "Expense recorded successfully.",
          });
          await loadExpenses();
          if (onBookingUpdated) onBookingUpdated();
        }}
      />
    </div>
  );
}
