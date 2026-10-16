import React, { useState, useEffect, useCallback } from "react";
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
  const [expenses, setExpenses] = useState([]);
  const [pnl, setPnl] = useState({
    base_fare: 0,
    billable_expenses: 0,
    customer_grand_total: 0,
    total_expenses: 0,
    net_profit: 0,
    profit_margin_pct: 0,
    reimbursable_pending: 0,
    reimbursed_total: 0,
  });
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("all");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingExpense, setEditingExpense] = useState(null);
  const [actionLoading, setActionLoading] = useState(false);

  const loadExpenses = useCallback(async () => {
    if (!booking?.id) return;
    try {
      setLoading(true);
      const res = await ExpenseAPI.listForBooking(booking.id);
      setExpenses(res?.expenses || []);
      if (res?.pnl) {
        setPnl(res.pnl);
      }
    } catch (err) {
      // Fallback if booking already had expenses populated
      if (booking.expenses) {
        setExpenses(booking.expenses);
      }
    } finally {
      setLoading(false);
    }
  }, [booking?.id, booking?.expenses]);

  useEffect(() => {
    loadExpenses();
  }, [loadExpenses]);

  async function handleApprove(expenseId) {
    try {
      setActionLoading(true);
      await ExpenseAPI.approve(expenseId);
      await loadExpenses();
      if (onBookingUpdated) onBookingUpdated();
    } catch (err) {
      alert(err?.response?.data?.message || "Failed to approve expense.");
    } finally {
      setActionLoading(false);
    }
  }

  async function handleReimburse(expenseId) {
    try {
      setActionLoading(true);
      await ExpenseAPI.reimburse(expenseId);
      await loadExpenses();
      if (onBookingUpdated) onBookingUpdated();
    } catch (err) {
      alert(err?.response?.data?.message || "Failed to mark as reimbursed.");
    } finally {
      setActionLoading(false);
    }
  }

  async function handleReject(expenseId) {
    if (!window.confirm("Are you sure you want to reject this expense claim?")) return;
    try {
      setActionLoading(true);
      await ExpenseAPI.reject(expenseId);
      await loadExpenses();
      if (onBookingUpdated) onBookingUpdated();
    } catch (err) {
      alert(err?.response?.data?.message || "Failed to reject expense.");
    } finally {
      setActionLoading(false);
    }
  }

  async function handleDelete(expenseId) {
    if (!window.confirm("Are you sure you want to delete this expense record?")) return;
    try {
      setActionLoading(true);
      await ExpenseAPI.remove(expenseId);
      await loadExpenses();
      if (onBookingUpdated) onBookingUpdated();
    } catch (err) {
      alert(err?.response?.data?.message || "Failed to delete expense.");
    } finally {
      setActionLoading(false);
    }
  }

  const filteredExpenses = expenses.filter((e) => {
    if (filter === "all") return true;
    return e.status === filter;
  });

  const isPositiveMargin = pnl.net_profit >= 0;

  return (
    <div className="bk-tab-pane">
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
                    <a
                      href={ExpenseAPI.getReceiptUrl(exp.id)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="exp-receipt-link"
                    >
                      📎 View Receipt Slip
                    </a>
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
                        onClick={() => handleReject(exp.id)}
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
                        onClick={() => handleDelete(exp.id)}
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
          await loadExpenses();
          if (onBookingUpdated) onBookingUpdated();
        }}
      />
    </div>
  );
}

