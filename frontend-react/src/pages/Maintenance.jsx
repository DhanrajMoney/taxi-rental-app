import React, { useEffect, useMemo, useState } from "react";
import { MaintenanceAPI, OfficeAPI, SettingAPI, TaxiAPI } from "../api/client.js";
import { formatDate } from "../utils/formatDate.js";
import "../styles/maintenance.css";

const initialForm = {
  taxi_id: "",
  service_date: new Date().toISOString().slice(0, 10),
  odometer_reading: "",
  cost: "",
  description: "",
  next_service_date: "",
};

const commonServicePresets = [
  "Routine Oil & Filter Change",
  "Brake Pads & Disc Inspection",
  "Tyre Rotation & Wheel Balancing",
  "Air Conditioning & Cabin Filter",
  "Transmission & Clutch Service",
  "Full Fleet Annual Inspection",
];

export default function Maintenance({ canManage = false }) {
  const [records, setRecords] = useState([]);
  const [taxis, setTaxis] = useState([]);
  const [offices, setOffices] = useState([]);
  const [settings, setSettings] = useState({});
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState({ current_page: 1, last_page: 1, total: 0 });

  // Filters
  const [selectedTaxi, setSelectedTaxi] = useState("all");
  const [selectedOffice, setSelectedOffice] = useState("all");
  const [statusTab, setStatusTab] = useState("all"); // all, due_soon, overdue, with_bill
  const [searchQuery, setSearchQuery] = useState("");

  // Modal Form State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [form, setForm] = useState(initialForm);
  const [billFile, setBillFile] = useState(null);
  const [billInputKey, setBillInputKey] = useState(0);
  const [editingRecord, setEditingRecord] = useState(null);

  // Status & Feedback
  const [error, setError] = useState("");
  const [successMsg, setSuccessMsg] = useState("");
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [downloadingId, setDownloadingId] = useState(null);

  // Load Records from Backend
  async function load(targetPage = page) {
    setLoading(true);
    setError("");

    try {
      const response = await MaintenanceAPI.list({
        taxi_id: selectedTaxi === "all" ? undefined : selectedTaxi,
        office_id: selectedOffice === "all" ? undefined : selectedOffice,
        page: targetPage,
      });

      if (targetPage > response.last_page && response.last_page > 0) {
        setPage(response.last_page);
        return;
      }

      setRecords(response.data || []);
      setPagination({
        current_page: response.current_page || 1,
        last_page: response.last_page || 1,
        total: response.total || 0,
      });
    } catch (requestError) {
      setError("Could not load maintenance records. Is the Laravel API running?");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load(page);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, selectedTaxi, selectedOffice]);

  // Load Taxis, Offices, Settings
  useEffect(() => {
    Promise.all([
      TaxiAPI.list({ per_page: 200 }),
      OfficeAPI.list({ per_page: 100 }).catch(() => ({ data: [] })),
      SettingAPI.get().catch(() => ({ settings: {} })),
    ])
      .then(([taxiResponse, officeResponse, settingResponse]) => {
        const taxiList = taxiResponse.data || taxiResponse || [];
        setTaxis(taxiList);
        setOffices(officeResponse.data || officeResponse || []);
        setSettings(settingResponse.settings || settingResponse || {});
        if (!form.taxi_id && taxiList[0]?.id) {
          setForm((current) => ({ ...current, taxi_id: String(taxiList[0].id) }));
        }
      })
      .catch(() => {
        setError("Could not load taxi or system options.");
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const currencySymbol = settings.currency_symbol || "₹";

  const formatMoney = (amount) => {
    if (amount == null || Number.isNaN(Number(amount))) return `${currencySymbol}0.00`;
    return `${currencySymbol}${Number(amount).toLocaleString("en-IN", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })}`;
  };

  // Due Soon & Overdue Calculations
  const now = new Date();
  now.setHours(0, 0, 0, 0);

  const getServiceStatus = (nextServiceDate) => {
    if (!nextServiceDate) return { type: "none", label: "No check set" };
    const dueDate = new Date(nextServiceDate);
    dueDate.setHours(0, 0, 0, 0);

    const diffDays = Math.ceil((dueDate - now) / (1000 * 60 * 60 * 24));

    if (diffDays < 0) {
      return { type: "overdue", label: `${Math.abs(diffDays)}d overdue`, days: diffDays };
    }
    if (diffDays <= 30) {
      return { type: "due_soon", label: `Due in ${diffDays}d`, days: diffDays };
    }
    return { type: "scheduled", label: `In ${diffDays}d`, days: diffDays };
  };

  // KPI Metrics
  const dueSoonRecords = useMemo(() => {
    return records.filter((r) => {
      const status = getServiceStatus(r.next_service_date);
      return status.type === "due_soon";
    });
  }, [records]);

  const overdueRecords = useMemo(() => {
    return records.filter((r) => {
      const status = getServiceStatus(r.next_service_date);
      return status.type === "overdue";
    });
  }, [records]);

  const totalPageSpend = useMemo(() => {
    return records.reduce((sum, r) => sum + Number(r.cost || 0), 0);
  }, [records]);

  const avgCostPerService = useMemo(() => {
    return records.length ? totalPageSpend / records.length : 0;
  }, [records, totalPageSpend]);

  // Client-side Filtered Records for Active Tab & Search
  const filteredRecords = useMemo(() => {
    return records.filter((record) => {
      // Tab Filter
      const serviceStatus = getServiceStatus(record.next_service_date);
      if (statusTab === "due_soon" && serviceStatus.type !== "due_soon") return false;
      if (statusTab === "overdue" && serviceStatus.type !== "overdue") return false;
      if (statusTab === "with_bill" && !record.bill_path) return false;

      // Text Search
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchTaxi = record.taxi?.reg_number?.toLowerCase().includes(q) || record.taxi?.make_model?.toLowerCase().includes(q);
        const matchDesc = record.description?.toLowerCase().includes(q);
        const matchDate = record.service_date?.includes(q) || record.next_service_date?.includes(q);
        const matchOdometer = String(record.odometer_reading || "").includes(q);
        return matchTaxi || matchDesc || matchDate || matchOdometer;
      }

      return true;
    });
  }, [records, statusTab, searchQuery]);

  // Modal Open/Close Helpers
  function openAddModal() {
    setEditingRecord(null);
    setBillFile(null);
    setBillInputKey((k) => k + 1);
    setForm({
      ...initialForm,
      taxi_id: taxis[0]?.id ? String(taxis[0].id) : "",
      odometer_reading: taxis[0]?.odometer_reading ? String(taxis[0].odometer_reading) : "",
    });
    setError("");
    setSuccessMsg("");
    setIsModalOpen(true);
  }

  function openEditModal(record) {
    setEditingRecord(record);
    setBillFile(null);
    setBillInputKey((k) => k + 1);
    setForm({
      taxi_id: String(record.taxi_id ?? ""),
      service_date: record.service_date ? String(record.service_date).slice(0, 10) : "",
      odometer_reading: String(record.odometer_reading ?? ""),
      cost: record.cost != null ? String(record.cost) : "",
      description: record.description ?? "",
      next_service_date: record.next_service_date ? String(record.next_service_date).slice(0, 10) : "",
    });
    setError("");
    setSuccessMsg("");
    setIsModalOpen(true);
  }

  function closeModal() {
    setIsModalOpen(false);
    setEditingRecord(null);
    setBillFile(null);
  }

  // Handle Taxi selection in Form to auto-suggest odometer
  function handleFormTaxiChange(taxiId) {
    const matched = taxis.find((t) => String(t.id) === String(taxiId));
    setForm((current) => ({
      ...current,
      taxi_id: taxiId,
      odometer_reading: matched?.odometer_reading ? String(matched.odometer_reading) : current.odometer_reading,
    }));
  }

  // Quick preset helper
  function addPresetToDescription(preset) {
    setForm((current) => ({
      ...current,
      description: current.description ? `${current.description}, ${preset}` : preset,
    }));
  }

  // Quick date helper for next service (+3m, +6m, +1y)
  function setNextDateMonths(months) {
    const baseDate = form.service_date ? new Date(form.service_date) : new Date();
    baseDate.setMonth(baseDate.getMonth() + months);
    setForm((current) => ({
      ...current,
      next_service_date: baseDate.toISOString().slice(0, 10),
    }));
  }

  // Submit Handler
  async function handleSubmit(event) {
    event.preventDefault();
    if (!form.taxi_id || !form.service_date || !form.odometer_reading) {
      setError("Please select a taxi and enter both the service date and odometer reading.");
      return;
    }

    setSaving(true);
    setError("");

    try {
      const payload = new FormData();
      payload.append("taxi_id", form.taxi_id);
      payload.append("service_date", form.service_date);
      payload.append("odometer_reading", String(Number(form.odometer_reading)));
      if (form.cost !== "" && form.cost !== null) {
        payload.append("cost", String(Number(form.cost)));
      }
      if (form.description) {
        payload.append("description", form.description);
      }
      if (form.next_service_date) {
        payload.append("next_service_date", form.next_service_date);
      }
      if (billFile) {
        payload.append("bill", billFile);
      }

      if (editingRecord) {
        await MaintenanceAPI.update(editingRecord.id, payload);
        setSuccessMsg("Maintenance record updated successfully.");
      } else {
        await MaintenanceAPI.create(payload);
        setSuccessMsg("New maintenance work order logged successfully.");
      }

      closeModal();
      await load(page);
    } catch (requestError) {
      setError(requestError?.response?.data?.message || "Failed to save the maintenance record.");
    } finally {
      setSaving(false);
    }
  }

  // Delete Handler
  async function handleDelete(id) {
    if (!window.confirm("Are you sure you want to delete this maintenance work order? This action cannot be undone.")) {
      return;
    }

    try {
      await MaintenanceAPI.remove(id);
      setSuccessMsg("Maintenance record deleted.");
      await load(page);
    } catch (requestError) {
      setError(requestError?.response?.data?.message || "Failed to remove maintenance record.");
    }
  }

  // Bill Download Handler
  async function handleDownloadBill(record) {
    setDownloadingId(record.id);
    try {
      const bill = await MaintenanceAPI.downloadBill(record.id);
      const url = URL.createObjectURL(bill);
      const link = document.createElement("a");
      link.href = url;
      const extension = record.bill_path ? record.bill_path.split(".").pop() : "pdf";
      link.download = `maintenance-${record.taxi?.reg_number || record.id}-bill.${extension}`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.setTimeout(() => URL.revokeObjectURL(url), 1000);
    } catch (requestError) {
      setError("Could not download invoice file for this record.");
    } finally {
      setDownloadingId(null);
    }
  }

  return (
    <div className="maintenance-workspace">
      {/* 1. Executive Fleet Upkeep Header */}
      <header className="maintenance-header-banner">
        <div className="header-info-wrap">
          <div className="header-title-row">
            <h2>Fleet Maintenance & Servicing Workspace</h2>
            <span className="live-tag">Active Fleet Health</span>
          </div>
          <p className="header-subhead">
            Log garage service work orders, track vehicle odometer progression, schedule upcoming checks, and archive invoice receipts.
          </p>
        </div>

        {canManage && (
          <div className="header-cta-wrap">
            <button type="button" className="btn-log-service" onClick={openAddModal}>
              <span className="btn-icon">🔧</span> Log New Service
            </button>
          </div>
        )}
      </header>

      {/* 2. Fleet Health KPI Summary Cards */}
      <section className="maintenance-kpi-grid" aria-label="Maintenance KPI overview">
        <div className="m-kpi-card total-card">
          <div className="m-kpi-icon">📋</div>
          <div className="m-kpi-body">
            <span className="m-kpi-label">Total Work Orders</span>
            <strong className="m-kpi-val">{pagination.total}</strong>
            <small className="m-kpi-sub">Logged vehicle services</small>
          </div>
        </div>

        <div className={`m-kpi-card due-card ${dueSoonRecords.length > 0 ? "has-alert" : ""}`}>
          <div className="m-kpi-icon">⏳</div>
          <div className="m-kpi-body">
            <span className="m-kpi-label">Due within 30 Days</span>
            <strong className="m-kpi-val">{dueSoonRecords.length}</strong>
            <small className="m-kpi-sub">Upcoming scheduled services</small>
          </div>
        </div>

        <div className={`m-kpi-card overdue-card ${overdueRecords.length > 0 ? "has-danger" : ""}`}>
          <div className="m-kpi-icon">⚠️</div>
          <div className="m-kpi-body">
            <span className="m-kpi-label">Overdue Checkups</span>
            <strong className="m-kpi-val">{overdueRecords.length}</strong>
            <small className="m-kpi-sub">Require immediate garage visit</small>
          </div>
        </div>

        <div className="m-kpi-card spend-card">
          <div className="m-kpi-icon">💳</div>
          <div className="m-kpi-body">
            <span className="m-kpi-label">Page Service Spend</span>
            <strong className="m-kpi-val">{formatMoney(totalPageSpend)}</strong>
            <small className="m-kpi-sub">Avg: {formatMoney(avgCostPerService)} / service</small>
          </div>
        </div>
      </section>

      {/* 3. Overdue / Due Soon Alert Banner */}
      {(dueSoonRecords.length > 0 || overdueRecords.length > 0) && (
        <div className="maintenance-status-callout">
          <div className="callout-icon">🚨</div>
          <div className="callout-content">
            <h4>Attention Required: Upcoming Fleet Checkups</h4>
            <p>
              {overdueRecords.length > 0 && `${overdueRecords.length} vehicles have passed their scheduled check date. `}
              {dueSoonRecords.length > 0 && `${dueSoonRecords.length} vehicles are due for routine servicing in the next 30 days.`}
            </p>
            <div className="callout-badges">
              {[...overdueRecords, ...dueSoonRecords].slice(0, 6).map((rec) => (
                <button
                  key={rec.id}
                  type="button"
                  className="callout-chip"
                  onClick={() => setSelectedTaxi(String(rec.taxi_id))}
                  title="Filter to this taxi"
                >
                  {rec.taxi?.reg_number || "Taxi"} • {rec.next_service_date ? formatDate(rec.next_service_date) : "Due"}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Feedback Messages */}
      {error && <div className="maintenance-alert-banner alert-error">{error}</div>}
      {successMsg && <div className="maintenance-alert-banner alert-success">{successMsg}</div>}

      {/* 4. Controls & Filters Toolbar */}
      <div className="maintenance-controls-card">
        {/* Navigation Tabs */}
        <div className="m-tabs-row" role="tablist">
          <button
            type="button"
            className={`m-tab-btn ${statusTab === "all" ? "active" : ""}`}
            onClick={() => setStatusTab("all")}
          >
            All Logs ({pagination.total})
          </button>
          <button
            type="button"
            className={`m-tab-btn ${statusTab === "due_soon" ? "active" : ""}`}
            onClick={() => setStatusTab("due_soon")}
          >
            Due Soon ({dueSoonRecords.length})
          </button>
          <button
            type="button"
            className={`m-tab-btn ${statusTab === "overdue" ? "active" : ""}`}
            onClick={() => setStatusTab("overdue")}
          >
            Overdue ({overdueRecords.length})
          </button>
          <button
            type="button"
            className={`m-tab-btn ${statusTab === "with_bill" ? "active" : ""}`}
            onClick={() => setStatusTab("with_bill")}
          >
            Receipts on File
          </button>
        </div>

        {/* Filter Dropdowns & Live Search */}
        <div className="m-filters-row">
          <div className="m-search-box">
            <span className="search-icon">🔍</span>
            <input
              type="search"
              placeholder="Search registration, notes, odometer..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>

          <div className="m-select-group">
            <select
              value={selectedTaxi}
              onChange={(e) => {
                setSelectedTaxi(e.target.value);
                setPage(1);
              }}
              aria-label="Filter by taxi"
            >
              <option value="all">🚗 All Taxis</option>
              {taxis.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.reg_number} — {t.make_model}
                </option>
              ))}
            </select>

            {offices.length > 0 && (
              <select
                value={selectedOffice}
                onChange={(e) => {
                  setSelectedOffice(e.target.value);
                  setPage(1);
                }}
                aria-label="Filter by office branch"
              >
                <option value="all">🏢 All Branches</option>
                {offices.map((o) => (
                  <option key={o.id} value={o.id}>
                    {o.name}
                  </option>
                ))}
              </select>
            )}

            <button
              type="button"
              className="btn-refresh"
              onClick={() => load(page)}
              disabled={loading}
              title="Refresh records"
            >
              {loading ? "Refreshing..." : "↻ Refresh"}
            </button>
          </div>
        </div>
      </div>

      {/* 5. Main Maintenance Work Order Table */}
      <div className="maintenance-table-card">
        <div className="table-responsive">
          <table className="data-table maintenance-table">
            <thead>
              <tr>
                <th>Vehicle Details</th>
                <th>Service Date</th>
                <th>Odometer Reading</th>
                <th>Scheduled Next Check</th>
                <th className="num-col">Service Cost</th>
                <th>Receipt / Bill</th>
                <th>Work Done / Notes</th>
                {canManage && <th className="actions-col">Actions</th>}
              </tr>
            </thead>
            <tbody>
              {filteredRecords.map((record) => {
                const statusInfo = getServiceStatus(record.next_service_date);
                const isOverdue = statusInfo.type === "overdue";
                const isDueSoon = statusInfo.type === "due_soon";

                return (
                  <tr key={record.id} className={isOverdue ? "row-overdue" : isDueSoon ? "row-due-soon" : ""}>
                    {/* Vehicle Details */}
                    <td>
                      <div className="vehicle-ident-cell">
                        <strong className="taxi-reg-badge">{record.taxi?.reg_number || `Taxi #${record.taxi_id}`}</strong>
                        <span className="taxi-model-text">
                          {record.taxi?.make_model || "Fleet vehicle"}
                          {record.taxi?.vehicle_type && ` (${record.taxi.vehicle_type})`}
                        </span>
                        {record.taxi?.office && (
                          <small className="office-tag">🏢 {record.taxi.office.name}</small>
                        )}
                      </div>
                    </td>

                    {/* Service Date */}
                    <td>
                      <div className="date-cell">
                        <span>{formatDate(record.service_date)}</span>
                        <small className="date-sub">Logged entry</small>
                      </div>
                    </td>

                    {/* Odometer */}
                    <td>
                      <div className="odometer-pill">
                        <span className="odo-value">{record.odometer_reading?.toLocaleString("en-IN") || "—"}</span>
                        <span className="odo-unit">km</span>
                      </div>
                    </td>

                    {/* Next Service Date */}
                    <td>
                      {record.next_service_date ? (
                        <div className="next-check-cell">
                          <span className="next-date">{formatDate(record.next_service_date)}</span>
                          <span className={`status-pill pill-${statusInfo.type}`}>
                            {statusInfo.label}
                          </span>
                        </div>
                      ) : (
                        <span className="text-muted">—</span>
                      )}
                    </td>

                    {/* Cost */}
                    <td className="num-col">
                      <strong className="cost-highlight">{formatMoney(record.cost)}</strong>
                    </td>

                    {/* Bill Receipt */}
                    <td>
                      {record.bill_path ? (
                        <button
                          type="button"
                          className="btn-bill-download"
                          onClick={() => handleDownloadBill(record)}
                          disabled={downloadingId === record.id}
                        >
                          {downloadingId === record.id ? "Downloading..." : "📄 Download Invoice"}
                        </button>
                      ) : (
                        <span className="no-receipt-label">No Bill</span>
                      )}
                    </td>

                    {/* Description / Notes */}
                    <td className="desc-cell">
                      <p className="desc-text" title={record.description || "General maintenance"}>
                        {record.description || "General maintenance service"}
                      </p>
                    </td>

                    {/* Actions */}
                    {canManage && (
                      <td className="actions-col">
                        <div className="action-buttons-wrap">
                          <button
                            type="button"
                            className="btn-tbl-action btn-tbl-edit"
                            onClick={() => openEditModal(record)}
                            title="Edit this work order"
                          >
                            ✏️ Edit
                          </button>
                          <button
                            type="button"
                            className="btn-tbl-action btn-tbl-delete"
                            onClick={() => handleDelete(record.id)}
                            title="Delete this work order"
                          >
                            🗑️ Delete
                          </button>
                        </div>
                      </td>
                    )}
                  </tr>
                );
              })}

              {!loading && filteredRecords.length === 0 && (
                <tr>
                  <td colSpan={canManage ? 8 : 7} className="empty-state-cell">
                    <div className="empty-state-wrap">
                      <span className="empty-icon">🚗🔧</span>
                      <h4>No Maintenance Records Found</h4>
                      <p>
                        {searchQuery
                          ? "No records matched your search query. Try clearing the filter."
                          : "No vehicle maintenance work orders have been logged yet for this criteria."}
                      </p>
                      {canManage && !searchQuery && (
                        <button type="button" className="btn-log-service" onClick={openAddModal}>
                          + Log First Maintenance Work Order
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Footer */}
        {pagination.last_page > 1 && (
          <footer className="table-pagination-footer">
            <span className="pagination-info">
              Showing {records.length ? (pagination.current_page - 1) * 15 + 1 : 0} to{" "}
              {(pagination.current_page - 1) * 15 + records.length} of {pagination.total} records
            </span>
            <div className="pagination-controls">
              <button
                type="button"
                className="btn-pager"
                disabled={loading || pagination.current_page <= 1}
                onClick={() => setPage((c) => c - 1)}
              >
                ← Previous
              </button>
              <span className="pager-page-label">
                Page {pagination.current_page} of {pagination.last_page}
              </span>
              <button
                type="button"
                className="btn-pager"
                disabled={loading || pagination.current_page >= pagination.last_page}
                onClick={() => setPage((c) => c + 1)}
              >
                Next →
              </button>
            </div>
          </footer>
        )}
      </div>

      {/* 6. Add / Edit Maintenance Work Order Modal */}
      {isModalOpen && canManage && (
        <div className="m-modal-backdrop" onClick={closeModal} role="dialog" aria-modal="true">
          <div className="m-modal-card" onClick={(e) => e.stopPropagation()}>
            <header className="m-modal-header">
              <div>
                <h3>{editingRecord ? `Edit Work Order #${editingRecord.id}` : "Log Maintenance Work Order"}</h3>
                <p>Record vehicle garage service, odometer reading, costs, and upload the invoice.</p>
              </div>
              <button type="button" className="btn-close-modal" onClick={closeModal} aria-label="Close modal">
                ✕
              </button>
            </header>

            <form onSubmit={handleSubmit} className="m-modal-form">
              <div className="m-form-grid">
                {/* Select Taxi */}
                <div className="form-group">
                  <label htmlFor="modal-taxi-select">
                    Vehicle Taxi <span className="req">*</span>
                  </label>
                  <select
                    id="modal-taxi-select"
                    required
                    value={form.taxi_id}
                    onChange={(e) => handleFormTaxiChange(e.target.value)}
                  >
                    <option value="">Choose vehicle...</option>
                    {taxis.map((t) => (
                      <option key={t.id} value={t.id}>
                        {t.reg_number} — {t.make_model} (Current Odo: {t.odometer_reading || 0} km)
                      </option>
                    ))}
                  </select>
                </div>

                {/* Service Date */}
                <div className="form-group">
                  <label htmlFor="modal-service-date">
                    Service Date <span className="req">*</span>
                  </label>
                  <input
                    id="modal-service-date"
                    type="date"
                    required
                    value={form.service_date}
                    onChange={(e) => setForm((c) => ({ ...c, service_date: e.target.value }))}
                  />
                </div>

                {/* Odometer Reading */}
                <div className="form-group">
                  <label htmlFor="modal-odometer">
                    Odometer at Service (km) <span className="req">*</span>
                  </label>
                  <input
                    id="modal-odometer"
                    type="number"
                    min="0"
                    required
                    placeholder="e.g. 35000"
                    value={form.odometer_reading}
                    onChange={(e) => setForm((c) => ({ ...c, odometer_reading: e.target.value }))}
                  />
                </div>

                {/* Cost */}
                <div className="form-group">
                  <label htmlFor="modal-cost">
                    Service Cost ({currencySymbol})
                  </label>
                  <input
                    id="modal-cost"
                    type="number"
                    min="0"
                    step="0.01"
                    placeholder="0.00"
                    value={form.cost}
                    onChange={(e) => setForm((c) => ({ ...c, cost: e.target.value }))}
                  />
                </div>

                {/* Next Service Date with Quick Buttons */}
                <div className="form-group full-col">
                  <div className="label-with-actions">
                    <label htmlFor="modal-next-date">Next Scheduled Service Due Date</label>
                    <div className="quick-date-buttons">
                      <button type="button" onClick={() => setNextDateMonths(3)}>+3 Months</button>
                      <button type="button" onClick={() => setNextDateMonths(6)}>+6 Months</button>
                      <button type="button" onClick={() => setNextDateMonths(12)}>+1 Year</button>
                    </div>
                  </div>
                  <input
                    id="modal-next-date"
                    type="date"
                    value={form.next_service_date}
                    onChange={(e) => setForm((c) => ({ ...c, next_service_date: e.target.value }))}
                  />
                </div>

                {/* Service Preset Chips */}
                <div className="form-group full-col">
                  <label>Quick Service Presets (Click to add):</label>
                  <div className="preset-chips-row">
                    {commonServicePresets.map((preset) => (
                      <button
                        key={preset}
                        type="button"
                        className="preset-chip"
                        onClick={() => addPresetToDescription(preset)}
                      >
                        + {preset}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Issue / Description */}
                <div className="form-group full-col">
                  <label htmlFor="modal-description">Work Done / Garage Notes</label>
                  <textarea
                    id="modal-description"
                    rows="3"
                    placeholder="Describe parts replaced, garage remarks, mechanical issues..."
                    value={form.description}
                    onChange={(e) => setForm((c) => ({ ...c, description: e.target.value }))}
                  />
                </div>

                {/* Bill Receipt File Upload */}
                <div className="form-group full-col">
                  <label htmlFor="modal-bill">Invoice / Bill Receipt (PDF, JPG, PNG; max 5MB)</label>
                  <div className="file-dropzone">
                    <input
                      id="modal-bill"
                      key={billInputKey}
                      type="file"
                      accept=".pdf,.jpg,.jpeg,.png,application/pdf,image/jpeg,image/png"
                      onChange={(e) => setBillFile(e.target.files?.[0] ?? null)}
                    />
                    <div className="dropzone-label">
                      {billFile ? (
                        <span className="file-chosen">📎 Selected: {billFile.name}</span>
                      ) : editingRecord?.bill_path ? (
                        <span className="file-existing">📄 Current bill attached. Upload a new file to replace it.</span>
                      ) : (
                        <span>📁 Click or drag to attach invoice bill receipt</span>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {error && <div className="modal-error-text">{error}</div>}

              <footer className="m-modal-footer">
                <button type="button" className="btn-modal-cancel" onClick={closeModal} disabled={saving}>
                  Cancel
                </button>
                <button type="submit" className="btn-modal-save" disabled={saving}>
                  {saving ? "Saving Work Order..." : editingRecord ? "Update Work Order" : "Save Work Order"}
                </button>
              </footer>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
