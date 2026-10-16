import React, { useEffect, useMemo, useState } from "react";
import { BookingAPI, DriverAPI, MaintenanceAPI, OfficeAPI, SettingAPI, TaxiAPI } from "../api/client.js";
import { formatDate } from "../utils/formatDate.js";
import "../styles/reports.css";

const sampleData = {
  bookings: [
    {
      id: 1,
      customer_name: "Aisha Rahman",
      pickup_date: "2026-09-20",
      return_date: "2026-09-22",
      pickup_location: "Airport Terminal",
      drop_location: "Downtown Hotel",
      status: "completed",
      taxi_id: 1,
      driver_id: 1,
      final_fare: 4500,
      estimated_fare: 4500,
      taxi: { id: 1, reg_number: "ABC-1024", make_model: "Maruti Dzire" },
      driver: { id: 1, name: "John Smith" },
    },
    {
      id: 2,
      customer_name: "Marcus Lee",
      pickup_date: "2026-09-24",
      return_date: "2026-09-26",
      pickup_location: "City Center",
      drop_location: "Harbor View",
      status: "confirmed",
      taxi_id: 2,
      driver_id: 2,
      final_fare: null,
      estimated_fare: 5200,
      taxi: { id: 2, reg_number: "XYZ-8841", make_model: "Kia Carens" },
      driver: { id: 2, name: "Ava Nolan" },
    },
    {
      id: 3,
      customer_name: "Priya Nair",
      pickup_date: "2026-09-10",
      return_date: "2026-09-12",
      pickup_location: "Old Town",
      drop_location: "School District",
      status: "completed",
      taxi_id: 1,
      driver_id: 1,
      final_fare: 3600,
      estimated_fare: 3600,
      taxi: { id: 1, reg_number: "ABC-1024", make_model: "Maruti Dzire" },
      driver: { id: 1, name: "John Smith" },
    },
  ],
  taxis: [
    { id: 1, reg_number: "ABC-1024", make_model: "Maruti Dzire", status: "available", daily_rate: 1800 },
    { id: 2, reg_number: "XYZ-8841", make_model: "Kia Carens", status: "available", daily_rate: 2600 },
  ],
  drivers: [
    { id: 1, name: "John Smith", phone: "+91 90000 10001", status: "active" },
    { id: 2, name: "Ava Nolan", phone: "+91 90000 10002", status: "active" },
  ],
  maintenance: [
    { id: 1, taxi_id: 1, taxi: { reg_number: "ABC-1024" }, cost: 1250, service_date: "2026-09-18", description: "Brake inspection & oil change" },
    { id: 2, taxi_id: 2, taxi: { reg_number: "XYZ-8841" }, cost: 2100, service_date: "2026-09-15", description: "Tyre replacement" },
  ],
  offices: [],
};

const rangeOptions = [
  { value: "7", label: "Last 7 days" },
  { value: "30", label: "Last 30 days" },
  { value: "90", label: "Last 90 days" },
  { value: "365", label: "Last 12 months" },
  { value: "custom", label: "Custom date range" },
  { value: "all", label: "All time" },
];

function toArray(value) {
  if (Array.isArray(value)) return value;
  if (Array.isArray(value?.data)) return value.data;
  return [];
}

function parseDate(value) {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

function normalizeDate(dateValue) {
  if (!dateValue) return null;
  const date = parseDate(dateValue);
  if (!date) return null;
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

function calculateTripDays(start, end) {
  const startDate = normalizeDate(start);
  const endDate = normalizeDate(end);
  if (!startDate || !endDate) return 1;
  const diff = Math.ceil((endDate - startDate) / (1000 * 60 * 60 * 24));
  return Math.max(1, diff + 1);
}

function exportCsv(filename, rows) {
  if (!rows || !rows.length) return;

  const headers = Object.keys(rows[0]);
  const csv = [
    headers.join(","),
    ...rows.map((row) =>
      headers
        .map((header) => {
          const value = row[header] ?? "";
          const safeValue = String(value).replace(/"/g, '""');
          return `"${safeValue}"`;
        })
        .join(","),
    ),
  ].join("\n");

  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url);
}

export default function Reports() {
  const [reportType, setReportType] = useState("overview"); // overview, revenue, utilization, drivers, maintenance
  const [range, setRange] = useState("30");
  const [customStart, setCustomStart] = useState("");
  const [customEnd, setCustomEnd] = useState("");
  const [selectedOffice, setSelectedOffice] = useState("");
  const [searchQuery, setSearchQuery] = useState("");

  const [bookings, setBookings] = useState(sampleData.bookings);
  const [taxis, setTaxis] = useState(sampleData.taxis);
  const [drivers, setDrivers] = useState(sampleData.drivers);
  const [maintenance, setMaintenance] = useState(sampleData.maintenance);
  const [offices, setOffices] = useState([]);
  const [settings, setSettings] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    async function loadReports() {
      try {
        setLoading(true);
        const [bookingResult, taxiResult, driverResult, maintenanceResult, officeResult, settingsResult] = await Promise.all([
          BookingAPI.list({ per_page: 1000 }),
          TaxiAPI.list({ per_page: 500 }),
          DriverAPI.list({ per_page: 500 }),
          MaintenanceAPI.list({ per_page: 1000 }),
          OfficeAPI.list({ per_page: 100 }).catch(() => ({ data: [] })),
          SettingAPI.get().catch(() => ({ settings: {} })),
        ]);

        setBookings(toArray(bookingResult));
        setTaxis(toArray(taxiResult));
        setDrivers(toArray(driverResult));
        setMaintenance(toArray(maintenanceResult));
        setOffices(toArray(officeResult));
        setSettings(settingsResult?.settings || settingsResult || {});
        setError("");
      } catch (requestError) {
        setBookings(sampleData.bookings);
        setTaxis(sampleData.taxis);
        setDrivers(sampleData.drivers);
        setMaintenance(sampleData.maintenance);
        setError("Live report data could not be loaded. Displaying local sample report figures.");
      } finally {
        setLoading(false);
      }
    }

    loadReports();
  }, []);

  const currencySymbol = settings.currency_symbol || "₹";

  const formatMoney = (amount) => {
    if (amount == null || Number.isNaN(Number(amount))) return `${currencySymbol}0.00`;
    return `${currencySymbol}${Number(amount).toLocaleString("en-IN", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })}`;
  };

  // Date Filtering Helper
  const checkInRange = (dateValue) => {
    if (!dateValue) return false;
    const date = normalizeDate(dateValue);
    if (!date) return false;

    if (range === "all") return true;

    if (range === "custom") {
      if (!customStart && !customEnd) return true;
      const start = customStart ? normalizeDate(customStart) : null;
      const end = customEnd ? normalizeDate(customEnd) : null;
      if (start && date < start) return false;
      if (end && date > end) return false;
      return true;
    }

    const days = Number(range) || 30;
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - days);
    return date >= cutoff;
  };

  // Filter Bookings by Date and Office
  const filteredBookings = useMemo(() => {
    return bookings.filter((booking) => {
      const inDate = checkInRange(booking.pickup_date || booking.return_date);
      const inOffice = !selectedOffice || String(booking.office_id) === String(selectedOffice);
      return inDate && inOffice;
    });
  }, [bookings, range, customStart, customEnd, selectedOffice]);

  // Filter Maintenance by Date and Office
  const filteredMaintenance = useMemo(() => {
    return maintenance.filter((record) => {
      const inDate = checkInRange(record.service_date);
      const inOffice = !selectedOffice || String(record.office_id) === String(selectedOffice) || String(record.taxi?.office_id) === String(selectedOffice);
      return inDate && inOffice;
    });
  }, [maintenance, range, customStart, customEnd, selectedOffice]);

  // Filter Taxis by Office
  const scopedTaxis = useMemo(() => {
    if (!selectedOffice) return taxis;
    return taxis.filter((taxi) => String(taxi.office_id) === String(selectedOffice));
  }, [taxis, selectedOffice]);

  // Filter Drivers by Office
  const scopedDrivers = useMemo(() => {
    if (!selectedOffice) return drivers;
    return drivers.filter((driver) => String(driver.office_id) === String(selectedOffice));
  }, [drivers, selectedOffice]);

  // Financial Metrics
  const finalizedRevenue = useMemo(() => {
    return filteredBookings.reduce((sum, b) => sum + (b.final_fare != null ? Number(b.final_fare) : 0), 0);
  }, [filteredBookings]);

  const estimatedPipeline = useMemo(() => {
    return filteredBookings.reduce((sum, b) => {
      if (b.final_fare != null) return sum;
      return sum + (b.estimated_fare != null ? Number(b.estimated_fare) : 0);
    }, 0);
  }, [filteredBookings]);

  const totalMaintenanceCost = useMemo(() => {
    return filteredMaintenance.reduce((sum, m) => sum + Number(m.cost ?? m.amount ?? 0), 0);
  }, [filteredMaintenance]);

  const totalTripExpenses = useMemo(() => {
    return filteredBookings.reduce((sum, b) => {
      if (b.total_expenses != null) return sum + Number(b.total_expenses);
      if (Array.isArray(b.expenses)) {
        return sum + b.expenses.filter((e) => e.status !== "rejected").reduce((s, e) => s + Number(e.amount || 0), 0);
      }
      return sum;
    }, 0);
  }, [filteredBookings]);

  const billableAddons = useMemo(() => {
    return filteredBookings.reduce((sum, b) => {
      if (b.billable_expenses != null) return sum + Number(b.billable_expenses);
      if (Array.isArray(b.expenses)) {
        return sum + b.expenses.filter((e) => e.status !== "rejected" && e.is_billable).reduce((s, e) => s + Number(e.amount || 0), 0);
      }
      return sum;
    }, 0);
  }, [filteredBookings]);

  const totalGrossRevenue = finalizedRevenue + billableAddons;
  const totalOperatingCosts = totalMaintenanceCost + totalTripExpenses;
  const netOperatingProfit = totalGrossRevenue - totalOperatingCosts;
  const operatingMargin = totalGrossRevenue > 0 ? (netOperatingProfit / totalGrossRevenue) * 100 : 0;

  // Revenue Rows
  const revenueRows = useMemo(() => {
    return filteredBookings
      .filter((b) => {
        if (!searchQuery) return true;
        const q = searchQuery.toLowerCase();
        return (
          b.customer_name?.toLowerCase().includes(q) ||
          b.customer_phone?.toLowerCase().includes(q) ||
          b.pickup_location?.toLowerCase().includes(q) ||
          b.taxi?.reg_number?.toLowerCase().includes(q) ||
          b.driver?.name?.toLowerCase().includes(q)
        );
      })
      .map((b) => ({
        id: b.id,
        customer: b.customer_name || "Unknown customer",
        phone: b.customer_phone || "—",
        pickup_date: b.pickup_date,
        return_date: b.return_date,
        trip_dates: `${formatDate(b.pickup_date)} → ${formatDate(b.return_date)}`,
        route: `${b.pickup_location || "—"} → ${b.drop_location || "—"}`,
        taxi: b.taxi?.reg_number || (b.taxi_id ? `Taxi #${b.taxi_id}` : "Unassigned"),
        driver: b.driver?.name || (b.driver_id ? `Driver #${b.driver_id}` : "Unassigned"),
        status: b.status || "pending",
        final_fare: b.final_fare != null ? Number(b.final_fare) : null,
        estimated_fare: b.estimated_fare != null ? Number(b.estimated_fare) : null,
      }));
  }, [filteredBookings, searchQuery]);

  // Utilization Rows
  const utilizationRows = useMemo(() => {
    const windowDays = range === "all" ? 365 : range === "custom" ? 30 : Number(range) || 30;

    return scopedTaxis
      .filter((t) => {
        if (!searchQuery) return true;
        const q = searchQuery.toLowerCase();
        return (
          t.reg_number?.toLowerCase().includes(q) ||
          t.make_model?.toLowerCase().includes(q) ||
          t.vehicle_type?.toLowerCase().includes(q)
        );
      })
      .map((taxi) => {
        const taxiBookings = filteredBookings.filter((b) => Number(b.taxi_id) === Number(taxi.id));
        const bookedDays = taxiBookings.reduce((sum, b) => sum + calculateTripDays(b.pickup_date, b.return_date), 0);
        const utilization = Math.min(100, (bookedDays / Math.max(windowDays, 1)) * 100);
        const revenueGenerated = taxiBookings.reduce(
          (sum, b) => sum + (b.final_fare != null ? Number(b.final_fare) : Number(b.estimated_fare || 0)),
          0,
        );

        return {
          id: taxi.id,
          reg_number: taxi.reg_number,
          vehicle: `${taxi.make_model || ""} (${taxi.vehicle_type || "sedan"})`,
          bookingsCount: taxiBookings.length,
          bookedDays,
          utilization,
          revenueGenerated,
          status: taxi.status || "available",
        };
      })
      .sort((a, b) => b.utilization - a.utilization);
  }, [scopedTaxis, filteredBookings, range, searchQuery]);

  // Driver Performance Rows
  const driverRows = useMemo(() => {
    return scopedDrivers
      .filter((d) => {
        if (!searchQuery) return true;
        const q = searchQuery.toLowerCase();
        return (
          d.name?.toLowerCase().includes(q) ||
          d.phone?.toLowerCase().includes(q) ||
          d.license_number?.toLowerCase().includes(q)
        );
      })
      .map((driver) => {
        const driverBookings = filteredBookings.filter((b) => Number(b.driver_id) === Number(driver.id));
        const completedTrips = driverBookings.filter((b) => b.status === "completed").length;
        const completionRate = driverBookings.length > 0 ? (completedTrips / driverBookings.length) * 100 : 0;
        const revenue = driverBookings.reduce(
          (sum, b) => sum + (b.final_fare != null ? Number(b.final_fare) : Number(b.estimated_fare || 0)),
          0,
        );
        const avgPerTrip = completedTrips > 0 ? revenue / completedTrips : 0;

        return {
          id: driver.id,
          name: driver.name,
          phone: driver.phone || "—",
          license: driver.license_number || "—",
          totalBookings: driverBookings.length,
          completedTrips,
          completionRate,
          revenue,
          avgPerTrip,
          status: driver.status || "active",
        };
      })
      .sort((a, b) => b.revenue - a.revenue);
  }, [scopedDrivers, filteredBookings, searchQuery]);

  // Maintenance Rows
  const maintenanceRows = useMemo(() => {
    return filteredMaintenance
      .filter((m) => {
        if (!searchQuery) return true;
        const q = searchQuery.toLowerCase();
        return (
          m.description?.toLowerCase().includes(q) ||
          m.taxi?.reg_number?.toLowerCase().includes(q) ||
          m.service_date?.toLowerCase().includes(q)
        );
      })
      .map((m) => ({
        id: m.id,
        taxi: m.taxi?.reg_number || (m.taxi_id ? `Taxi #${m.taxi_id}` : "Unassigned"),
        service_date: m.service_date,
        description: m.description || "General maintenance & servicing",
        odometer: m.odometer_at_service ? `${m.odometer_at_service} km` : "—",
        cost: Number(m.cost ?? m.amount ?? 0),
        hasBill: Boolean(m.bill_path),
      }))
      .sort((a, b) => new Date(b.service_date) - new Date(a.service_date));
  }, [filteredMaintenance, searchQuery]);

  // Monthly Revenue Trend (for Overview Bar Chart)
  const monthlyTrend = useMemo(() => {
    const monthMap = {};
    const now = new Date();
    // Initialize past 6 months
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
      const label = d.toLocaleString("default", { month: "short" });
      monthMap[key] = { label, revenue: 0, maintenance: 0 };
    }

    filteredBookings.forEach((b) => {
      const d = parseDate(b.pickup_date);
      if (d) {
        const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
        if (monthMap[key]) {
          monthMap[key].revenue += Number(b.final_fare ?? b.estimated_fare ?? 0);
        }
      }
    });

    filteredMaintenance.forEach((m) => {
      const d = parseDate(m.service_date);
      if (d) {
        const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
        if (monthMap[key]) {
          monthMap[key].maintenance += Number(m.cost ?? m.amount ?? 0);
        }
      }
    });

    return Object.values(monthMap);
  }, [filteredBookings, filteredMaintenance]);

  const maxTrendValue = useMemo(() => {
    const maxVal = Math.max(...monthlyTrend.map((m) => Math.max(m.revenue, m.maintenance)), 1000);
    return maxVal;
  }, [monthlyTrend]);

  // Export handlers
  const handleExportCsv = () => {
    const prefix = `ridedesk-${reportType}-report-${new Date().toISOString().slice(0, 10)}`;

    if (reportType === "overview" || reportType === "revenue") {
      exportCsv(`${prefix}.csv`, revenueRows.map((r) => ({
        "Booking ID": r.id,
        "Customer Name": r.customer,
        "Phone": r.phone,
        "Trip Dates": r.trip_dates,
        "Route": r.route,
        "Assigned Taxi": r.taxi,
        "Assigned Driver": r.driver,
        "Status": r.status,
        "Final Revenue": r.final_fare != null ? r.final_fare : "",
        "Estimated Fare": r.estimated_fare != null ? r.estimated_fare : "",
      })));
      return;
    }

    if (reportType === "utilization") {
      exportCsv(`${prefix}.csv`, utilizationRows.map((r) => ({
        "Registration Number": r.reg_number,
        "Vehicle Make/Model": r.vehicle,
        "Assigned Bookings": r.bookingsCount,
        "Trip Days Booked": r.bookedDays,
        "Utilization %": `${r.utilization.toFixed(1)}%`,
        "Revenue Generated": r.revenueGenerated,
        "Status": r.status,
      })));
      return;
    }

    if (reportType === "drivers") {
      exportCsv(`${prefix}.csv`, driverRows.map((r) => ({
        "Driver Name": r.name,
        "Phone": r.phone,
        "License Number": r.license,
        "Total Bookings": r.totalBookings,
        "Completed Trips": r.completedTrips,
        "Completion Rate %": `${r.completionRate.toFixed(1)}%`,
        "Total Revenue": r.revenue,
        "Avg Revenue / Trip": r.avgPerTrip.toFixed(2),
        "Status": r.status,
      })));
      return;
    }

    if (reportType === "maintenance") {
      exportCsv(`${prefix}.csv`, maintenanceRows.map((r) => ({
        "Taxi Registration": r.taxi,
        "Service Date": formatDate(r.service_date),
        "Description": r.description,
        "Odometer": r.odometer,
        "Cost": r.cost,
        "Has Receipt": r.hasBill ? "Yes" : "No",
      })));
    }
  };

  const reportNavItems = [
    { key: "overview", label: "Financial & P&L", icon: "📊" },
    { key: "revenue", label: "Booking Revenue", icon: "💰" },
    { key: "utilization", label: "Fleet Utilization", icon: "🚖" },
    { key: "drivers", label: "Driver Performance", icon: "👨‍✈️" },
    { key: "maintenance", label: "Maintenance Spend", icon: "🔧" },
  ];

  return (
    <div className="reports-redesign">
      {/* Top Header / Print Banner */}
      <header className="reports-header-card">
        <div className="reports-header-info">
          <h2>{settings.company_name || "RideDesk"} Operational Reports</h2>
          <p className="reports-subhead">
            Executive financial intelligence, fleet utilization metrics, and driver activity breakdowns.
          </p>
        </div>

        <div className="reports-meta-badges">
          <span className="badge office-badge">
            🏢 {selectedOffice ? offices.find((o) => String(o.id) === String(selectedOffice))?.name || "Selected Branch" : "All Branches"}
          </span>
          <span className="badge date-badge">
            📅 {range === "custom" && customStart && customEnd ? `${customStart} to ${customEnd}` : rangeOptions.find((r) => r.value === range)?.label}
          </span>
        </div>
      </header>

      {/* Main Filter & Navigation Toolbar */}
      <div className="reports-controls-bar">
        <nav className="reports-nav-pills" aria-label="Report Views">
          {reportNavItems.map((item) => (
            <button
              key={item.key}
              type="button"
              className={`pill-btn ${reportType === item.key ? "active" : ""}`}
              onClick={() => setReportType(item.key)}
            >
              <span className="pill-icon">{item.icon}</span>
              <span className="pill-text">{item.label}</span>
            </button>
          ))}
        </nav>

        <div className="reports-filter-tools">
          {/* Office Scoping Selector */}
          {offices.length > 0 && (
            <select
              value={selectedOffice}
              onChange={(e) => setSelectedOffice(e.target.value)}
              aria-label="Filter by branch office"
              className="control-select"
            >
              <option value="">🏢 All Offices</option>
              {offices.map((off) => (
                <option key={off.id} value={off.id}>{off.name}</option>
              ))}
            </select>
          )}

          {/* Date Range Selector */}
          <select
            value={range}
            onChange={(e) => setRange(e.target.value)}
            aria-label="Filter date range"
            className="control-select"
          >
            {rangeOptions.map((opt) => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
          </select>

          {/* Custom Date Pickers */}
          {range === "custom" && (
            <div className="custom-date-group">
              <input
                type="date"
                value={customStart}
                onChange={(e) => setCustomStart(e.target.value)}
                aria-label="Start Date"
                className="date-input"
              />
              <span className="to-divider">to</span>
              <input
                type="date"
                value={customEnd}
                onChange={(e) => setCustomEnd(e.target.value)}
                aria-label="End Date"
                className="date-input"
              />
            </div>
          )}

          {/* Action Buttons */}
          <button type="button" className="btn-action export-btn" onClick={handleExportCsv} title="Download CSV spreadsheet">
            📥 Export CSV
          </button>
          <button type="button" className="btn-action print-btn" onClick={() => window.print()} title="Print or save as PDF">
            🖨️ Print / PDF
          </button>
        </div>
      </div>

      {error && <div className="report-alert-banner">{error}</div>}
      {loading && <div className="report-loading-state">Loading real-time analytics data...</div>}

      {!loading && (
        <main className="reports-content-body">
          {/* Top Executive KPI Grid */}
          <section className="reports-kpi-grid">
            <div className="kpi-card revenue-card">
              <div className="kpi-icon-wrap">💰</div>
              <div className="kpi-details">
                <span className="kpi-label">Gross Realized Revenue</span>
                <strong className="kpi-value">{formatMoney(totalGrossRevenue)}</strong>
                <span className="kpi-subtext">
                  Base: {formatMoney(finalizedRevenue)} {billableAddons > 0 ? `+ Add-ons: ${formatMoney(billableAddons)}` : `(Pipeline: ${formatMoney(estimatedPipeline)})`}
                </span>
              </div>
            </div>

            <div className="kpi-card expense-card">
              <div className="kpi-icon-wrap">🧾</div>
              <div className="kpi-details">
                <span className="kpi-label">Fleet & Trip Expenses</span>
                <strong className="kpi-value">{formatMoney(totalOperatingCosts)}</strong>
                <span className="kpi-subtext">
                  Garage: {formatMoney(totalMaintenanceCost)} | Trip Exp: {formatMoney(totalTripExpenses)}
                </span>
              </div>
            </div>

            <div className={`kpi-card margin-card ${netOperatingProfit >= 0 ? "positive" : "negative"}`}>
              <div className="kpi-icon-wrap">{netOperatingProfit >= 0 ? "📈" : "📉"}</div>
              <div className="kpi-details">
                <span className="kpi-label">Net Operating Margin</span>
                <strong className="kpi-value">{formatMoney(netOperatingProfit)}</strong>
                <span className="kpi-subtext">
                  Operating margin: {operatingMargin.toFixed(1)}%
                </span>
              </div>
            </div>

            <div className="kpi-card fleet-card">
              <div className="kpi-icon-wrap">🚖</div>
              <div className="kpi-details">
                <span className="kpi-label">Active Fleet & Trips</span>
                <strong className="kpi-value">{scopedTaxis.length} Vehicles</strong>
                <span className="kpi-subtext">
                  {filteredBookings.length} total bookings handled
                </span>
              </div>
            </div>
          </section>

          {/* View 1: Financial & P&L Overview */}
          {reportType === "overview" && (
            <section className="overview-analytics-section">
              {/* Monthly Visual Bar Chart */}
              <div className="chart-card">
                <div className="chart-card-head">
                  <div>
                    <h3>Monthly Financial Trajectory</h3>
                    <p className="chart-subhead">Comparison of booking revenues versus fleet maintenance expenses</p>
                  </div>
                  <div className="chart-legend">
                    <span className="legend-item"><span className="legend-dot dot-revenue"></span> Revenue</span>
                    <span className="legend-item"><span className="legend-dot dot-maintenance"></span> Maintenance</span>
                  </div>
                </div>

                <div className="custom-bar-chart">
                  {monthlyTrend.map((bar) => {
                    const revHeight = Math.max(4, (bar.revenue / maxTrendValue) * 100);
                    const maintHeight = Math.max(4, (bar.maintenance / maxTrendValue) * 100);

                    return (
                      <div key={bar.label} className="chart-col">
                        <div className="bars-container">
                          <div
                            className="bar bar-revenue"
                            style={{ height: `${revHeight}%` }}
                            title={`Revenue: ${formatMoney(bar.revenue)}`}
                          >
                            {bar.revenue > 0 && <span className="bar-tag">{formatMoney(bar.revenue)}</span>}
                          </div>
                          <div
                            className="bar bar-maintenance"
                            style={{ height: `${maintHeight}%` }}
                            title={`Maintenance: ${formatMoney(bar.maintenance)}`}
                          >
                            {bar.maintenance > 0 && <span className="bar-tag">{formatMoney(bar.maintenance)}</span>}
                          </div>
                        </div>
                        <span className="chart-x-label">{bar.label}</span>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Profitability Breakdown Dual Cards */}
              <div className="profitability-dual-grid">
                <div className="breakdown-card">
                  <h4>Top Revenue Generating Vehicles</h4>
                  <div className="breakdown-list">
                    {utilizationRows.slice(0, 5).map((taxi) => (
                      <div key={taxi.id} className="breakdown-row">
                        <div className="breakdown-info">
                          <strong>{taxi.reg_number}</strong>
                          <small>{taxi.vehicle}</small>
                        </div>
                        <div className="breakdown-metrics">
                          <span className="metric-primary">{formatMoney(taxi.revenueGenerated)}</span>
                          <small>{taxi.bookingsCount} trips</small>
                        </div>
                      </div>
                    ))}
                    {utilizationRows.length === 0 && <p className="empty-hint">No vehicle revenue records found.</p>}
                  </div>
                </div>

                <div className="breakdown-card">
                  <h4>Top Performing Drivers</h4>
                  <div className="breakdown-list">
                    {driverRows.slice(0, 5).map((driver) => (
                      <div key={driver.id} className="breakdown-row">
                        <div className="breakdown-info">
                          <strong>{driver.name}</strong>
                          <small>{driver.phone}</small>
                        </div>
                        <div className="breakdown-metrics">
                          <span className="metric-primary">{formatMoney(driver.revenue)}</span>
                          <small>{driver.completedTrips} completed</small>
                        </div>
                      </div>
                    ))}
                    {driverRows.length === 0 && <p className="empty-hint">No driver performance records found.</p>}
                  </div>
                </div>
              </div>
            </section>
          )}

          {/* View 2: Booking Revenue Detailed Table */}
          {reportType === "revenue" && (
            <section className="report-table-section card">
              <div className="section-toolbar">
                <div className="section-title">
                  <h3>Booking Revenue Breakdown</h3>
                  <small>Individual reservations with finalized fares and estimated quotes</small>
                </div>
                <div className="table-search-wrap">
                  <input
                    type="search"
                    placeholder="Search customer, taxi, or driver..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="table-search-input"
                  />
                </div>
              </div>

              <div className="table-wrap">
                <table className="data-table report-data-table">
                  <thead>
                    <tr>
                      <th>Booking #</th>
                      <th>Customer Details</th>
                      <th>Trip Dates</th>
                      <th>Route / Location</th>
                      <th>Assigned Taxi</th>
                      <th>Assigned Driver</th>
                      <th>Status</th>
                      <th className="num-col">Final Fare</th>
                      <th className="num-col">Estimated Fare</th>
                    </tr>
                  </thead>
                  <tbody>
                    {revenueRows.map((r) => (
                      <tr key={r.id}>
                        <td><strong>#{r.id}</strong></td>
                        <td>
                          <strong>{r.customer}</strong>
                          <small className="sub-line">{r.phone}</small>
                        </td>
                        <td>
                          {formatDate(r.pickup_date)}
                          <small className="sub-line">to {formatDate(r.return_date)}</small>
                        </td>
                        <td>
                          <span className="route-text">{r.route}</span>
                        </td>
                        <td>
                          <span className="tag taxi-tag">{r.taxi}</span>
                        </td>
                        <td>
                          <span className="tag driver-tag">{r.driver}</span>
                        </td>
                        <td>
                          <span className={`badge ${r.status}`}>{r.status}</span>
                        </td>
                        <td className="num-col">
                          {r.final_fare != null ? (
                            <strong className="text-emerald">{formatMoney(r.final_fare)}</strong>
                          ) : (
                            <span className="text-muted">Unfinalized</span>
                          )}
                        </td>
                        <td className="num-col">
                          {r.estimated_fare != null ? (
                            <span>{formatMoney(r.estimated_fare)}</span>
                          ) : (
                            <span className="text-muted">—</span>
                          )}
                        </td>
                      </tr>
                    ))}
                    {revenueRows.length === 0 && (
                      <tr>
                        <td colSpan={9} className="empty">No matching booking revenue records found for this period.</td>
                      </tr>
                    )}
                  </tbody>
                  {revenueRows.length > 0 && (
                    <tfoot>
                      <tr className="table-summary-row">
                        <td colSpan={7}><strong>Total Revenue Realized ({revenueRows.length} bookings)</strong></td>
                        <td className="num-col"><strong className="text-emerald">{formatMoney(finalizedRevenue)}</strong></td>
                        <td className="num-col"><strong>{formatMoney(estimatedPipeline)}</strong></td>
                      </tr>
                    </tfoot>
                  )}
                </table>
              </div>
            </section>
          )}

          {/* View 3: Fleet Utilization Table */}
          {reportType === "utilization" && (
            <section className="report-table-section card">
              <div className="section-toolbar">
                <div className="section-title">
                  <h3>Taxi Fleet Utilization & Capacity</h3>
                  <small>Vehicle occupancy rate based on booked trip days in the active window</small>
                </div>
                <div className="table-search-wrap">
                  <input
                    type="search"
                    placeholder="Search registration or vehicle..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="table-search-input"
                  />
                </div>
              </div>

              <div className="table-wrap">
                <table className="data-table report-data-table">
                  <thead>
                    <tr>
                      <th>Taxi Reg.</th>
                      <th>Make & Model</th>
                      <th>Status</th>
                      <th className="num-col">Assigned Trips</th>
                      <th className="num-col">Trip Days Booked</th>
                      <th>Utilization Gauge</th>
                      <th className="num-col">Revenue Earned</th>
                    </tr>
                  </thead>
                  <tbody>
                    {utilizationRows.map((t) => {
                      const pct = Number(t.utilization.toFixed(1));
                      const progressColor = pct >= 70 ? "gauge-high" : pct >= 30 ? "gauge-mid" : "gauge-low";

                      return (
                        <tr key={t.id}>
                          <td><strong>{t.reg_number}</strong></td>
                          <td>{t.vehicle}</td>
                          <td><span className={`badge ${t.status}`}>{t.status}</span></td>
                          <td className="num-col">{t.bookingsCount}</td>
                          <td className="num-col">{t.bookedDays} days</td>
                          <td className="gauge-cell">
                            <div className="gauge-track">
                              <div className={`gauge-fill ${progressColor}`} style={{ width: `${Math.max(5, pct)}%` }}></div>
                            </div>
                            <span className="gauge-label">{pct}%</span>
                          </td>
                          <td className="num-col">
                            <strong>{formatMoney(t.revenueGenerated)}</strong>
                          </td>
                        </tr>
                      );
                    })}
                    {utilizationRows.length === 0 && (
                      <tr>
                        <td colSpan={7} className="empty">No vehicle utilization data available for this range.</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </section>
          )}

          {/* View 4: Driver Performance Table */}
          {reportType === "drivers" && (
            <section className="report-table-section card">
              <div className="section-toolbar">
                <div className="section-title">
                  <h3>Driver Activity & Revenue Contribution</h3>
                  <small>Fulfillment rates, trip assignments, and completed revenue per chauffeur</small>
                </div>
                <div className="table-search-wrap">
                  <input
                    type="search"
                    placeholder="Search driver name, phone, or license..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="table-search-input"
                  />
                </div>
              </div>

              <div className="table-wrap">
                <table className="data-table report-data-table">
                  <thead>
                    <tr>
                      <th>Driver Name</th>
                      <th>Contact / License</th>
                      <th>Status</th>
                      <th className="num-col">Total Trips</th>
                      <th className="num-col">Completed Trips</th>
                      <th>Completion Rate</th>
                      <th className="num-col">Avg. Per Trip</th>
                      <th className="num-col">Total Generated</th>
                    </tr>
                  </thead>
                  <tbody>
                    {driverRows.map((d) => {
                      const rate = Number(d.completionRate.toFixed(1));
                      return (
                        <tr key={d.id}>
                          <td><strong>{d.name}</strong></td>
                          <td>
                            <span>{d.phone}</span>
                            <small className="sub-line">License: {d.license}</small>
                          </td>
                          <td><span className={`badge ${d.status}`}>{d.status}</span></td>
                          <td className="num-col">{d.totalBookings}</td>
                          <td className="num-col">{d.completedTrips}</td>
                          <td className="gauge-cell">
                            <div className="gauge-track">
                              <div className="gauge-fill gauge-high" style={{ width: `${Math.max(5, rate)}%` }}></div>
                            </div>
                            <span className="gauge-label">{rate}%</span>
                          </td>
                          <td className="num-col">{formatMoney(d.avgPerTrip)}</td>
                          <td className="num-col"><strong className="text-emerald">{formatMoney(d.revenue)}</strong></td>
                        </tr>
                      );
                    })}
                    {driverRows.length === 0 && (
                      <tr>
                        <td colSpan={8} className="empty">No driver activity found for this timeframe.</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </section>
          )}

          {/* View 5: Maintenance Cost Table */}
          {reportType === "maintenance" && (
            <section className="report-table-section card">
              <div className="section-toolbar">
                <div className="section-title">
                  <h3>Vehicle Maintenance & Servicing Cost Log</h3>
                  <small>Complete cost ledger of garage repairs, scheduled services, and parts</small>
                </div>
                <div className="table-search-wrap">
                  <input
                    type="search"
                    placeholder="Search description, taxi, or date..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="table-search-input"
                  />
                </div>
              </div>

              <div className="table-wrap">
                <table className="data-table report-data-table">
                  <thead>
                    <tr>
                      <th>Work Order #</th>
                      <th>Taxi Registration</th>
                      <th>Service Date</th>
                      <th>Service Description</th>
                      <th>Odometer Reading</th>
                      <th>Invoice Receipt</th>
                      <th className="num-col">Service Cost</th>
                    </tr>
                  </thead>
                  <tbody>
                    {maintenanceRows.map((m) => (
                      <tr key={m.id}>
                        <td><strong>#{m.id}</strong></td>
                        <td><span className="tag taxi-tag">{m.taxi}</span></td>
                        <td>{formatDate(m.service_date)}</td>
                        <td>{m.description}</td>
                        <td>{m.odometer}</td>
                        <td>
                          {m.hasBill ? (
                            <span className="badge badge-has-bill">📄 Receipt On File</span>
                          ) : (
                            <span className="text-muted">No Receipt</span>
                          )}
                        </td>
                        <td className="num-col">
                          <strong className="text-amber">{formatMoney(m.cost)}</strong>
                        </td>
                      </tr>
                    ))}
                    {maintenanceRows.length === 0 && (
                      <tr>
                        <td colSpan={7} className="empty">No maintenance records logged for this timeframe.</td>
                      </tr>
                    )}
                  </tbody>
                  {maintenanceRows.length > 0 && (
                    <tfoot>
                      <tr className="table-summary-row">
                        <td colSpan={6}><strong>Total Fleet Maintenance Expenditure</strong></td>
                        <td className="num-col"><strong className="text-amber">{formatMoney(totalMaintenanceCost)}</strong></td>
                      </tr>
                    </tfoot>
                  )}
                </table>
              </div>
            </section>
          )}
        </main>
      )}
    </div>
  );
}
