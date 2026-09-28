import { Link } from "react-router-dom";
import "../styles/auth.css";

const FEATURES = [
  "AI Leaf Disease & Pest Detection",
  "Real-time Weather Data per Field",
  "Personal Saved Check History",
  "Crop, Fertilizer & Irrigation Advisories",
];

export default function AuthLayout({ activeTab, title, subtitle, children }) {
  return (
    <div className="auth-page">
      <div className="auth-container">
        <aside className="auth-banner">
          <Link to="/" className="auth-brand-logo">
            🌱 <span>Crop<span>Vision</span> AI</span>
          </Link>

          <div className="auth-banner-content">
            <div className="auth-banner-badge">
              <i className="fa-solid fa-shield-halved"></i> SECURE FARMER PORTAL
            </div>
            <h1>
              Smart Farming.
              <br />
              <span>Secured for You.</span>
            </h1>
            <p>
              Sign in to save your farm's crop disease analyses, track health trends over time, and get
              customized recommendations.
            </p>

            <div className="auth-features-list">
              {FEATURES.map((feature) => (
                <div className="auth-feature-item" key={feature}>
                  <i className="fa-solid fa-check"></i>
                  <span>{feature}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="auth-banner-footer">
            <i className="fa-solid fa-leaf"></i>
            <span>CropVision AI • Built for Indian Agriculture</span>
          </div>
        </aside>

        <main className="auth-form-panel">
          <div className="auth-nav-top">
            <Link to="/" className="back-link">
              <i className="fa-solid fa-arrow-left"></i> Back to Home
            </Link>
          </div>

          <div className="auth-tabs-toggle">
            <Link to="/login" className={`auth-tab-btn${activeTab === "signin" ? " active" : ""}`}>
              <i className="fa-solid fa-right-to-bracket"></i> Sign In
            </Link>
            <Link to="/register" className={`auth-tab-btn${activeTab === "signup" ? " active" : ""}`}>
              <i className="fa-solid fa-user-plus"></i> Create Account
            </Link>
          </div>

          <div className="auth-header">
            <h2>{title}</h2>
            <p>{subtitle}</p>
          </div>

          {children}
        </main>
      </div>
    </div>
  );
}
