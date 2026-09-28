import { lazy, Suspense, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import HeroWeatherBadge from "../components/HeroWeatherBadge";
import useScrolled from "../hooks/useScrolled";
import "../styles/header.css";
import "../styles/landing.css";

// three.js is large; load the decorative 3D scene after the page itself.
const HeroCanvas = lazy(() => import("../components/HeroCanvas"));

const NAV_LINKS = [
  { href: "#home", label: "Home" },
  { href: "#analyze", label: "Analyze" },
  { href: "#how", label: "How It Works" },
  { href: "#about", label: "About" },
  { href: "#monitoring", label: "Crop Monitoring" },
  { href: "#history", label: "History" },
];

// Highlights the nav link of whichever section is in the middle of the screen.
function useActiveSection(ids) {
  const [active, setActive] = useState(ids[0]);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) setActive(entry.target.id);
        });
      },
      { rootMargin: "-45% 0px -50% 0px" }
    );
    ids.forEach((id) => {
      const el = document.getElementById(id);
      if (el) observer.observe(el);
    });
    return () => observer.disconnect();
  }, [ids]);

  return active;
}

const SECTION_IDS = NAV_LINKS.map((link) => link.href.slice(1));

export default function Home() {
  const [menuOpen, setMenuOpen] = useState(false);
  const scrolled = useScrolled();
  const activeSection = useActiveSection(SECTION_IDS);

  return (
    <div className="landing-page">
      <header className={`navbar site-header${scrolled ? " scrolled" : ""}`}>
        <a href="#home" className="logo">
          <span className="logo-mark" aria-hidden="true">🌱</span>
          <span>
            Crop<span className="logo-accent">Vision</span> AI
          </span>
        </a>
        <nav className={menuOpen ? "open" : ""}>
          {NAV_LINKS.map((link) => (
            <a
              key={link.href}
              href={link.href}
              className={activeSection === link.href.slice(1) ? "active" : ""}
              onClick={() => setMenuOpen(false)}
            >
              {link.label}
            </a>
          ))}
          <div className="nav-mobile-actions">
            <Link to="/register" className="header-btn filled" onClick={() => setMenuOpen(false)}>
              Try AI Free
            </Link>
            <Link to="/login" className="header-btn outline" onClick={() => setMenuOpen(false)}>
              Log In
            </Link>
          </div>
        </nav>
        <div className="nav-actions">
          <Link to="/register" className="header-btn filled">
            Try AI Free
          </Link>
          <Link to="/login" className="header-btn outline">
            Log In
          </Link>
        </div>
        <button
          type="button"
          className="mobile-menu-btn"
          aria-label={menuOpen ? "Close menu" : "Open menu"}
          aria-expanded={menuOpen}
          onClick={() => setMenuOpen((o) => !o)}
        >
          <i className={`fa-solid ${menuOpen ? "fa-xmark" : "fa-bars"}`}></i>
        </button>
      </header>

      <main>
        <section className="hero" id="home">
          <div>
            <div className="badge">✦ AI-POWERED CROP ANALYSIS</div>
            <h1>Smart Farming.<br /><span>Healthier Crops.</span></h1>
            <p>
              Upload a crop image and let CropVision AI help detect possible plant diseases and
              provide simple care recommendations, backed by live weather and soil data for your
              exact field.
            </p>
            <div className="hero-actions">
              <Link to="/register" className="primary-btn">Analyze Your Crop →</Link>
              <a href="#how" className="secondary-btn">Learn More</a>
            </div>
            <HeroWeatherBadge />
            <div className="trust">
              <div><b>AI</b><small>Vision Analysis</small></div>
              <div><b>24/7</b><small>Available</small></div>
              <div><b>🌿</b><small>Farmer Friendly</small></div>
            </div>
          </div>
          <div className="visual">
            <Suspense fallback={null}>
              <HeroCanvas />
            </Suspense>
            <div className="orb o1" />
            <div className="orb o2" />
            <div className="plant-card">
              <div className="plant-icon">🌿</div>
              <div><small>Crop Health</small><b>Healthy Plant</b></div><i />
            </div>
            <div className="float-card">
              ✓ <div><small>AI Detection</small><b>Ready to Analyze</b></div>
            </div>
            <div className="leaf l1">🍃</div>
            <div className="leaf l2">🌱</div>
          </div>
        </section>

        <section className="analyzer" id="analyze">
          <div className="heading">
            <div className="badge">CROP ANALYZER</div>
            <h2>Check Your Crop Health</h2>
            <p>Upload a leaf photo and get an instant, weather-aware AI advisory.</p>
          </div>

          <div className="signup-panel">
            <div className="signup-icon">
              <i className="fa-solid fa-seedling" />
            </div>
            <h3>Create a free account to analyze your crop</h3>
            <p>
              Sign up to upload a crop or leaf photo and get an AI-powered disease/pest assessment,
              plus fertilizer, irrigation, and yield guidance — all saved to your own history.
            </p>
            <div className="signup-panel-actions">
              <Link to="/register" className="primary-btn">Create free account →</Link>
              <Link to="/login" className="secondary-btn">Log in</Link>
            </div>
          </div>
        </section>

        <section className="features" id="how">
          <div className="heading">
            <div className="badge">HOW IT WORKS</div>
            <h2>From Image to Insight</h2>
            <p>A simple workflow designed for quick crop monitoring.</p>
          </div>
          <div className="steps">
            <article>
              <em>01</em>
              <div><i className="fa-solid fa-camera" /></div>
              <h3>Upload Image</h3>
              <p>Take a clear photo of the crop leaf and upload it once you've signed in.</p>
            </article>
            <article>
              <em>02</em>
              <div><i className="fa-solid fa-brain" /></div>
              <h3>AI + Weather Analysis</h3>
              <p>A vision-capable AI reads the leaf, while live weather and soil data are pulled for your exact coordinates.</p>
            </article>
            <article>
              <em>03</em>
              <div><i className="fa-solid fa-lightbulb" /></div>
              <h3>Get Insights</h3>
              <p>Receive condition, confidence assessment, and practical recommendations.</p>
            </article>
          </div>
        </section>

        <section className="about" id="about">
          <div className="about-content">
            <div className="about-text">
              <div className="badge">ABOUT CROPVISION AI</div>
              <h2>
                Smarter Crop Care
                <span>With Artificial Intelligence.</span>
              </h2>
              <p>
                CropVision AI is a smart agriculture platform designed to help farmers monitor crop
                health using computer vision and artificial intelligence.
              </p>
              <p>
                Upload an image of a crop leaf, or simply share your field's location, and the AI
                system analyzes it alongside live weather and soil conditions to give useful,
                actionable advice.
              </p>
              <div className="about-points">
                <div><span>✓</span><p>AI-powered crop analysis</p></div>
                <div><span>✓</span><p>Simple and farmer-friendly interface</p></div>
                <div><span>✓</span><p>Weather &amp; soil-aware advisories</p></div>
                <div><span>✓</span><p>Designed for smarter crop monitoring</p></div>
              </div>
            </div>

            <div className="about-card">
              <div className="about-icon">🌱</div>
              <h3>AI for Agriculture</h3>
              <p>Combining agriculture and computer vision to make crop monitoring easier and smarter.</p>
              <div className="about-stats">
                <div><b>AI</b><small>Technology</small></div>
                <div><b>24/7</b><small>Availability</small></div>
                <div><b>🌿</b><small>Crop Focus</small></div>
              </div>
            </div>
          </div>

          <section className="monitoring" id="monitoring">
            <div className="heading">
              <div className="badge">CROP MONITORING</div>
              <h2>Monitor Your Crops Smarter</h2>
              <p>Keep track of crop health and identify potential problems early.</p>
            </div>

            <div className="monitoring-grid">
              <article className="monitor-card">
                <div className="monitor-icon">🌿</div>
                <div className="monitor-info">
                  <span className="health-status">● No data yet</span>
                  <h3>Crop Health</h3>
                  <p>Monitor the overall condition of your crops using AI-powered image analysis.</p>
                  <small className="monitor-timestamp">Sign up and run an analysis to see live status here.</small>
                </div>
              </article>
              <article className="monitor-card">
                <div className="monitor-icon"><i className="fa-solid fa-magnifying-glass" /></div>
                <div className="monitor-info">
                  <span className="health-status">● Monitoring</span>
                  <h3>Disease Detection</h3>
                  <p>Detect possible disease symptoms from crop leaf images.</p>
                  <small className="monitor-timestamp">No checks yet.</small>
                </div>
              </article>
              <article className="monitor-card">
                <div className="monitor-icon"><i className="fa-regular fa-square-plus" /></div>
                <div className="monitor-info">
                  <span className="health-status">● Analysis</span>
                  <h3>Health Insights</h3>
                  <p>Get simple AI-generated insights to understand your crop condition.</p>
                  <small className="monitor-timestamp">No insights yet.</small>
                </div>
              </article>
              <article className="monitor-card">
                <div className="monitor-icon"><i className="fa-regular fa-lightbulb" /></div>
                <div className="monitor-info">
                  <span className="health-status">● Recommendations</span>
                  <h3>Smart Recommendations</h3>
                  <p>Use the detected condition to guide further crop-care decisions.</p>
                  <small className="monitor-timestamp">No recommendations yet.</small>
                </div>
              </article>
            </div>

            <div className="monitoring-note">
              <span>🌱</span>
              <div>
                <h3>Early Detection Can Help</h3>
                <p>Regularly checking crop images can help identify potential problems earlier and support better crop management.</p>
              </div>
            </div>
          </section>
        </section>

        <section className="history-section" id="history">
          <div className="heading">
            <div className="badge">RECENT CHECKS</div>
            <h2>Your Past Analyses</h2>
            <p>Sign in to see your saved crop checks, or run your first analysis to start building your history.</p>
          </div>

          <div className="history-empty">
            <div className="history-empty-icon"><i className="fa-solid fa-clock-rotate-left" /></div>
            <h3>No analyses yet</h3>
            <p>Create an account and run a crop check to see it show up here for quick reference.</p>
          </div>
        </section>

        <section className="cta">
          <div>
            <div className="badge light">CROPVISION AI</div>
            <h2>Give your crops a smarter check.</h2>
            <p>Create a free account and try an AI-powered crop analysis today.</p>
          </div>
          <Link to="/register" className="cta-btn white">Start Analysis →</Link>
        </section>
      </main>

      <footer className="footer">
        <div className="footer-container">
          <div className="footer-section brand">
            <a href="#home" className="footer-logo">
              <span className="footer-logo-mark">🌱</span> CropVision AI
            </a>
            <p>Empowering farmers with agricultural solutions for sustainable growth.</p>
          </div>

          <div className="footer-section">
            <h3>Quick Links</h3>
            <ul>
              <li><a href="#home">Home</a></li>
              <li><a href="#about">About Us</a></li>
              <li><Link to="/login">Log in</Link></li>
              <li><Link to="/admin/login">Admin Login</Link></li>
            </ul>
          </div>

          <div className="footer-section contact">
            <h3>Contact Us</h3>
            <p>
              P. R. Pote Patil College of Engineering and Management is located at{" "}
              <strong>Shri Gajanan Township, Pote Estate, Kathora Road, Amravati, Maharashtra, India - 444602</strong>
            </p>
          </div>

          <div className="footer-section newsletter">
            <h3>Newsletter</h3>
            <p>Subscribe for farming insights and updates</p>
            <div className="subscribe-box">
              <input type="email" placeholder="Enter your email" />
              <button type="button">Subscribe</button>
            </div>
          </div>
        </div>

        <div className="footer-bottom">
          <p>© 2026 CropVision AI. All Rights Reserved.</p>
          <p>🌱 Smart Farming • Better Tomorrow</p>
        </div>
      </footer>
    </div>
  );
}
