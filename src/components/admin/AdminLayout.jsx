import { useEffect, useState } from "react";
import { NavLink, Outlet, useLocation, useNavigate } from "react-router-dom";
import { useAdminAuth } from "../../context/AdminAuthContext";
import "../../styles/admin.css";

const NAV = [
  { to: "/admin", end: true, icon: "fa-chart-pie", label: "Overview" },
  { to: "/admin/users", icon: "fa-users", label: "Users" },
  { to: "/admin/health-checks", icon: "fa-microscope", label: "Health checks" },
];

// Shell for every admin page: sidebar navigation + top bar. On small screens
// the sidebar slides in from a menu button.
export default function AdminLayout() {
  const { admin, logout } = useAdminAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => setMenuOpen(false), [location.pathname]);

  const current =
    NAV.find((item) => (item.end ? location.pathname === item.to : location.pathname.startsWith(item.to))) || NAV[0];

  function handleLogout() {
    logout();
    navigate("/admin/login");
  }

  return (
    <div className="adm">
      <aside className={`adm-sidebar${menuOpen ? " open" : ""}`}>
        <div className="adm-brand">
          <span className="adm-brand-mark" aria-hidden="true">🌱</span>
          <div>
            <strong>CropVision AI</strong>
            <span>Admin console</span>
          </div>
        </div>

        <nav className="adm-nav" aria-label="Admin sections">
          {NAV.map((item) => (
            <NavLink key={item.to} to={item.to} end={item.end}>
              <i className={`fa-solid ${item.icon}`} aria-hidden="true"></i>
              {item.label}
            </NavLink>
          ))}
        </nav>

        <div className="adm-sidebar-footer">
          <a href="/" target="_blank" rel="noreferrer" className="adm-side-link">
            <i className="fa-solid fa-arrow-up-right-from-square" aria-hidden="true"></i> Open website
          </a>
          <div className="adm-admin">
            <span className="adm-avatar small" aria-hidden="true">
              {(admin?.email || "A").charAt(0).toUpperCase()}
            </span>
            <span className="adm-admin-email" title={admin?.email}>
              {admin?.email}
            </span>
          </div>
          <button type="button" className="adm-logout" onClick={handleLogout}>
            <i className="fa-solid fa-right-from-bracket" aria-hidden="true"></i> Log out
          </button>
        </div>
      </aside>

      {menuOpen && <div className="adm-backdrop" onClick={() => setMenuOpen(false)} aria-hidden="true" />}

      <div className="adm-main">
        <header className="adm-topbar">
          <button
            type="button"
            className="adm-menu-btn"
            onClick={() => setMenuOpen(true)}
            aria-label="Open admin menu"
          >
            <i className="fa-solid fa-bars"></i>
          </button>
          <h1>
            <i className={`fa-solid ${current.icon}`} aria-hidden="true"></i> {current.label}
          </h1>
        </header>
        <main className="adm-content">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
