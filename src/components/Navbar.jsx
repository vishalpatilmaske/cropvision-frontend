import { useState } from "react";
import { NavLink, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import useScrolled from "../hooks/useScrolled";
import "../styles/header.css";

export default function Navbar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [menuOpen, setMenuOpen] = useState(false);
  const scrolled = useScrolled();
  const firstName = user?.name?.split(" ")[0] || "Farmer";

  function closeMenu() {
    setMenuOpen(false);
  }

  function handleLogout() {
    closeMenu();
    logout();
    navigate("/");
  }

  return (
    <header className={`navbar site-header${scrolled ? " scrolled" : ""}`}>
      <NavLink to="/" className="logo" onClick={closeMenu}>
        <span className="logo-mark" aria-hidden="true">🌱</span>
        <span>
          Crop<span className="logo-accent">Vision</span> AI
        </span>
      </NavLink>

      <div className={`navbar-collapse${menuOpen ? " open" : ""}`}>
        {user && (
          <nav>
            <NavLink to="/disease-detection" onClick={closeMenu}>Disease &amp; Pest</NavLink>
            <NavLink to="/crop-recommendation" onClick={closeMenu}>Crop Recommendation</NavLink>
            <NavLink to="/fertilizer-recommendation" onClick={closeMenu}>Fertilizer</NavLink>
            <NavLink to="/irrigation-recommendation" onClick={closeMenu}>Irrigation</NavLink>
            <NavLink to="/yield-prediction" onClick={closeMenu}>Yield</NavLink>
            <NavLink to="/history" onClick={closeMenu}>My Records</NavLink>
          </nav>
        )}
        <div className="actions">
          {user ? (
            <>
              <span className="header-account" title={user.email}>
                <span className="header-avatar" aria-hidden="true">
                  {firstName.charAt(0).toUpperCase()}
                </span>
                <span className="header-account-name">{firstName}</span>
              </span>
              <button type="button" className="header-btn outline header-logout" onClick={handleLogout}>
                <i className="fa-solid fa-right-from-bracket" aria-hidden="true"></i> Log Out
              </button>
            </>
          ) : (
            <>
              <NavLink to="/register" className="header-btn filled" onClick={closeMenu}>
                Sign Up
              </NavLink>
              <NavLink to="/login" className="header-btn outline" onClick={closeMenu}>
                Log In
              </NavLink>
            </>
          )}
        </div>
      </div>

      {user && (
        <button
          type="button"
          className="mobile-menu-btn"
          aria-label={menuOpen ? "Close menu" : "Open menu"}
          aria-expanded={menuOpen}
          onClick={() => setMenuOpen((o) => !o)}
        >
          <i className={`fa-solid ${menuOpen ? "fa-xmark" : "fa-bars"}`}></i>
        </button>
      )}
    </header>
  );
}
