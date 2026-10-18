import React, { lazy, Suspense, useEffect, useState } from "react";
import { AuthAPI, hasAuthToken } from "./api/client.js";
import Login from "./components/Login.jsx";
import NotificationDropdown from "./components/NotificationDropdown.jsx";
import ProfileModal from "./components/ProfileModal.jsx";

const DashboardOverview = lazy(() => import("./pages/DashboardOverview.jsx"));
const Taxis = lazy(() => import("./pages/Taxis.jsx"));
const Drivers = lazy(() => import("./pages/Drivers.jsx"));
const Users = lazy(() => import("./pages/Users.jsx"));
const Maintenance = lazy(() => import("./pages/Maintenance.jsx"));
const Bookings = lazy(() => import("./pages/Bookings.jsx"));
const Reports = lazy(() => import("./pages/Reports.jsx"));
const Offices = lazy(() => import("./pages/Offices.jsx"));
const ImportData = lazy(() => import("./pages/ImportData.jsx"));
const Settings = lazy(() => import("./pages/Settings.jsx"));
const DocumentsPanel = lazy(() => import("./components/DocumentsPanel.jsx"));

export const APP_VERSION = "1.6.0";

const pageMeta = {
  overview: {
    title: "Operations overview",
    description: "Track fleet health, driver availability, and the next bookings at a glance.",
  },
  taxis: {
    title: "Taxi fleet",
    description: "Keep every vehicle ready for its next journey.",
  },
  drivers: {
    title: "Driver roster",
    description: "Manage availability and keep your team moving.",
  },
  users: {
    title: "User management",
    description: "Create, update, and manage admin, staff, and driver accounts.",
  },
  offices: {
    title: "Office locations",
    description: "Manage multi-location office branches and branch access.",
  },
  import: {
    title: "Data Import",
    description: "Upload Excel & CSV historical data for customers, taxis, drivers, and bookings.",
  },
  settings: {
    title: "System settings",
    description: "Configure business details, operational alert thresholds, tax rates, and booking policies.",
  },
  documents: {
    title: "Document center",
    description: "Upload and review persistent taxi and driver compliance records.",
  },
  maintenance: {
    title: "Maintenance desk",
    description: "Track service history, upcoming checks, and fleet upkeep costs.",
  },
  bookings: {
    title: "Rental bookings",
    description: "Plan reservations, assignments, and customer pickups.",
  },
  reports: {
    title: "Operational reports",
    description: "Review fleet performance, booking revenue, driver activity, and maintenance spend.",
  },
};

function NavIcon({ name }) {
  switch (name) {
    case "overview":
      return (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <rect x="3" y="3" width="7" height="7" rx="1" />
          <rect x="14" y="3" width="7" height="7" rx="1" />
          <rect x="14" y="14" width="7" height="7" rx="1" />
          <rect x="3" y="14" width="7" height="7" rx="1" />
        </svg>
      );
    case "bookings":
      return (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
          <line x1="16" y1="2" x2="16" y2="6" />
          <line x1="8" y1="2" x2="8" y2="6" />
          <line x1="3" y1="10" x2="21" y2="10" />
        </svg>
      );
    case "taxis":
      return (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="M5 17H3a2 2 0 0 1-2-2V9a2 2 0 0 1 2-2h1.5L6.8 3.5A2 2 0 0 1 8.5 2h7a2 2 0 0 1 1.7 1.5L19.5 7H21a2 2 0 0 1 2 2v6a2 2 0 0 1-2 2h-2" />
          <circle cx="7" cy="17" r="2.5" />
          <circle cx="17" cy="17" r="2.5" />
          <line x1="5" y1="11" x2="19" y2="11" />
        </svg>
      );
    case "drivers":
      return (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
          <circle cx="12" cy="7" r="4" />
        </svg>
      );
    case "maintenance":
      return (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z" />
        </svg>
      );
    case "documents":
      return (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
          <polyline points="14 2 14 8 20 8" />
          <line x1="16" y1="13" x2="8" y2="13" />
          <line x1="16" y1="17" x2="8" y2="17" />
          <polyline points="10 9 9 9 8 9" />
        </svg>
      );
    case "reports":
      return (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <line x1="18" y1="20" x2="18" y2="10" />
          <line x1="12" y1="20" x2="12" y2="4" />
          <line x1="6" y1="20" x2="6" y2="14" />
        </svg>
      );
    case "offices":
      return (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <rect x="4" y="2" width="16" height="20" rx="2" ry="2" />
          <path d="M9 22v-4h6v4" />
          <line x1="8" y1="6" x2="10" y2="6" />
          <line x1="14" y1="6" x2="16" y2="6" />
          <line x1="8" y1="10" x2="10" y2="10" />
          <line x1="14" y1="10" x2="16" y2="10" />
          <line x1="8" y1="14" x2="10" y2="14" />
          <line x1="14" y1="14" x2="16" y2="14" />
        </svg>
      );
    case "users":
      return (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
          <circle cx="9" cy="7" r="4" />
          <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
          <path d="M16 3.13a4 4 0 0 1 0 7.75" />
        </svg>
      );
    case "import":
      return (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
          <polyline points="7 10 12 15 17 10" />
          <line x1="12" y1="15" x2="12" y2="3" />
        </svg>
      );
    case "settings":
      return (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <circle cx="12" cy="12" r="3" />
          <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z" />
        </svg>
      );
    default:
      return null;
  }
}

export default function App() {
  const [tab, setTab] = useState("overview");
  const [user, setUser] = useState(null);
  const [checkingAuth, setCheckingAuth] = useState(true);
  const [showProfile, setShowProfile] = useState(false);

  const role = user?.role || "staff";
  const isAdmin = role === "admin";
  const isStaff = role === "staff";
  const isDriver = role === "driver";
  const canManage = isAdmin || isStaff;
  const activePage = pageMeta[tab] ?? pageMeta.overview;

  useEffect(() => {
    if (!hasAuthToken()) {
      setCheckingAuth(false);
      return;
    }

    AuthAPI.me()
      .then(setUser)
      .finally(() => setCheckingAuth(false));
  }, []);

  const navSections = [
    {
      title: "Fleet Operations",
      items: [
        { id: "overview", label: "Overview", icon: "overview", visible: !isDriver },
        { id: "bookings", label: "Bookings", icon: "bookings", visible: true },
        { id: "taxis", label: "Taxis", icon: "taxis", visible: !isDriver },
        { id: "drivers", label: "Drivers", icon: "drivers", visible: !isDriver },
        { id: "maintenance", label: "Maintenance", icon: "maintenance", visible: !isDriver },
        { id: "documents", label: isDriver ? "My Documents" : "Documents", icon: "documents", visible: true },
        { id: "reports", label: "Reports", icon: "reports", visible: !isDriver },
      ],
    },
    {
      title: "Administration",
      items: [
        { id: "offices", label: "Offices", icon: "offices", visible: !isDriver },
        { id: "users", label: "Users", icon: "users", visible: isAdmin },
        { id: "import", label: "Data Import", icon: "import", visible: isAdmin },
        { id: "settings", label: "Settings", icon: "settings", visible: isAdmin },
      ],
    },
  ];

  const allNavItems = navSections.flatMap((s) => s.items);

  useEffect(() => {
    if (!user) return;
    if (isDriver && tab !== "bookings" && tab !== "documents") {
      setTab("bookings");
      return;
    }
    const currentItem = allNavItems.find((item) => item.id === tab);
    if (!currentItem || !currentItem.visible) {
      setTab(isDriver ? "bookings" : "overview");
    }
  }, [user, isDriver, isAdmin, tab]);

  if (checkingAuth) return <p>Loading...</p>;
  if (!user) {
    return (
      <Login
        onLogin={({ user: loggedInUser }) => {
          setUser(loggedInUser);
          setTab(loggedInUser?.role === "driver" ? "bookings" : "overview");
        }}
      />
    );
  }

  async function logout() {
    await AuthAPI.logout();
    setUser(null);
    setTab("overview");
  }

  const sectionTitle = isDriver
    ? (tab === "documents" ? "My documents & credentials" : "Assigned bookings")
    : activePage.title;
  const sectionDescription = isDriver
    ? (tab === "documents" ? "Review and download your verified license, insurance, and compliance records." : "Review your assigned trips, route details, and trip progress.")
    : activePage.description;

  return (
    <div className="dashboard-shell">
      <aside className="dashboard-sidebar">
        <div className="brand-lockup">
          <span className="brand-mark">RR</span>
          <div>
            <strong>Rent A Ride</strong>
            <span>Desk</span>
          </div>
        </div>

        <nav className="dashboard-nav" aria-label="Main navigation">
          {navSections.map((section) => {
            const visibleItems = section.items.filter((item) => item.visible);
            if (visibleItems.length === 0) return null;
            return (
              <div key={section.title} className="sidebar-nav-group">
                <div className="sidebar-section-label">{section.title}</div>
                {visibleItems.map(({ id, icon, label }) => (
                  <button
                    key={id}
                    type="button"
                    className={tab === id ? "active" : ""}
                    onClick={() => setTab(id)}
                  >
                    <span className="nav-icon"><NavIcon name={icon} /></span>
                    <span className="nav-label">{label}</span>
                  </button>
                ))}
              </div>
            );
          })}
        </nav>

        <div className="sidebar-footer">
          <span className="role-label">Signed in as</span>
          <strong>{user.role} {user.office ? `(${user.office.name})` : ""}</strong>
        </div>
      </aside>

      <div className="dashboard-content">
        <header className="app-header">
          <div>
            <span className="eyebrow">{isDriver ? "Driver workspace" : isAdmin ? "Admin workspace" : "Operations workspace"}</span>
            <h1>{sectionTitle}</h1>
            <p>{sectionDescription}</p>
          </div>
          <div className="session" style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
            <NotificationDropdown />
            <button type="button" className="secondary" onClick={() => setShowProfile(true)}>
              👤 {user.name}
            </button>
            <button type="button" className="btn-logout" onClick={logout}>🚪 Log out</button>
          </div>
        </header>

        <main>
          <Suspense fallback={<p role="status">Loading section…</p>}>
            {tab === "overview" && !isDriver
              ? <DashboardOverview onNavigate={setTab} currentUser={user} />
              : tab === "bookings"
                ? <Bookings canManage={canManage} />
                : tab === "taxis" && !isDriver
                  ? <Taxis canManage={canManage} />
                  : tab === "drivers" && !isDriver
                    ? <Drivers canManage={canManage} />
                    : tab === "maintenance" && !isDriver
                      ? <Maintenance canManage={canManage} />
                      : tab === "documents"
                        ? <DocumentsPanel canManage={canManage} currentUser={user} />
                        : tab === "reports" && !isDriver
                          ? <Reports />
                          : tab === "offices" && !isDriver
                            ? <Offices userRole={role} />
                            : tab === "users" && isAdmin
                              ? <Users canManage={isAdmin} />
                              : tab === "import" && isAdmin
                                ? <ImportData />
                                : tab === "settings" && isAdmin
                                  ? <Settings />
                                  : <DashboardOverview onNavigate={setTab} currentUser={user} />}
          </Suspense>
        </main>

        {showProfile && (
          <ProfileModal
            user={user}
            onClose={() => setShowProfile(false)}
            onUserUpdate={(updatedUser) => setUser(updatedUser)}
          />
        )}

        <footer className="app-footer">
          <span>Rent A Ride Desk</span>
          <span>Taxi &amp; Driver Management</span>
          <span>v{APP_VERSION}</span>
        </footer>
      </div>
    </div>
  );
}
