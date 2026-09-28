import { useEffect, useState } from "react";

// Small building blocks shared by the admin pages.

export const TYPE_LABELS = {
  healthy: "Healthy",
  disease: "Disease",
  pest: "Pest",
  nutrient_deficiency: "Nutrient deficiency",
  unknown: "Unclear",
};

export function formatDate(iso, withTime = false) {
  if (!iso) return "—";
  return new Date(iso).toLocaleString(undefined, {
    day: "numeric",
    month: "short",
    year: "numeric",
    ...(withTime ? { hour: "2-digit", minute: "2-digit" } : {}),
  });
}

// "3 days ago" -- recent activity reads better relative than as a date.
export function timeAgo(iso) {
  if (!iso) return "Never";
  const minutes = Math.round((Date.now() - new Date(iso).getTime()) / 60000);
  if (minutes < 1) return "Just now";
  if (minutes < 60) return `${minutes} min ago`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours} h ago`;
  const days = Math.round(hours / 24);
  if (days < 30) return `${days} day${days === 1 ? "" : "s"} ago`;
  return formatDate(iso);
}

export function Avatar({ name, size = "" }) {
  return (
    <span className={`adm-avatar ${size}`} aria-hidden="true">
      {(name || "?").trim().charAt(0).toUpperCase()}
    </span>
  );
}

export function StatCard({ icon, label, value, note, tone = "" }) {
  return (
    <div className={`adm-stat ${tone}`}>
      <span className="adm-stat-icon" aria-hidden="true">
        <i className={`fa-solid ${icon}`}></i>
      </span>
      <div>
        <div className="adm-stat-value">{value ?? "—"}</div>
        <div className="adm-stat-label">{label}</div>
        {note && <div className="adm-stat-note">{note}</div>}
      </div>
    </div>
  );
}

export function Panel({ title, subtitle, actions, children, className = "" }) {
  return (
    <section className={`adm-panel ${className}`}>
      {(title || actions) && (
        <header className="adm-panel-head">
          <div>
            {title && <h2>{title}</h2>}
            {subtitle && <p>{subtitle}</p>}
          </div>
          {actions}
        </header>
      )}
      {children}
    </section>
  );
}

export function TypeBadge({ type }) {
  return <span className={`tag tag-${type}`}>{TYPE_LABELS[type] || type || "—"}</span>;
}

export function ScoreBadge({ score }) {
  if (score == null) return <span className="adm-muted">—</span>;
  const tone = score >= 75 ? "good" : score >= 45 ? "warn" : "bad";
  return <span className={`adm-score ${tone}`}>{Math.round(score)}</span>;
}

export function Pagination({ pagination, onPage, noun = "items" }) {
  if (!pagination || !pagination.total_items) return null;
  const { page, per_page: perPage, total_items: total, total_pages: pages } = pagination;
  const from = (page - 1) * perPage + 1;
  const to = Math.min(page * perPage, total);
  return (
    <div className="adm-pagination">
      <span>
        {from}–{to} of {total} {noun}
      </span>
      {pages > 1 && (
        <div>
          <button type="button" disabled={!pagination.has_prev} onClick={() => onPage(page - 1)} aria-label="Previous page">
            <i className="fa-solid fa-chevron-left"></i>
          </button>
          <span>
            Page {page} of {pages}
          </span>
          <button type="button" disabled={!pagination.has_next} onClick={() => onPage(page + 1)} aria-label="Next page">
            <i className="fa-solid fa-chevron-right"></i>
          </button>
        </div>
      )}
    </div>
  );
}

// Side panel for details. Closes on Escape or a click on the backdrop.
export function Drawer({ title, onClose, children, footer }) {
  useEffect(() => {
    const onKey = (e) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <div className="adm-drawer-overlay" onClick={onClose}>
      <aside className="adm-drawer" role="dialog" aria-label={title} onClick={(e) => e.stopPropagation()}>
        <header className="adm-drawer-head">
          <h2>{title}</h2>
          <button type="button" className="adm-icon-btn" onClick={onClose} aria-label="Close">
            <i className="fa-solid fa-xmark"></i>
          </button>
        </header>
        <div className="adm-drawer-body">{children}</div>
        {footer && <footer className="adm-drawer-foot">{footer}</footer>}
      </aside>
    </div>
  );
}

// Delete in two clicks, so nothing is removed by accident. No browser dialogs.
export function ConfirmDelete({ label = "Delete", onConfirm, compact = false }) {
  const [asking, setAsking] = useState(false);
  const [busy, setBusy] = useState(false);

  async function confirm() {
    setBusy(true);
    try {
      await onConfirm();
    } finally {
      setBusy(false);
      setAsking(false);
    }
  }

  if (!asking) {
    return (
      <button type="button" className="adm-btn danger ghost" onClick={() => setAsking(true)}>
        <i className="fa-solid fa-trash" aria-hidden="true"></i>
        {!compact && ` ${label}`}
        {compact && <span className="sr-only">{label}</span>}
      </button>
    );
  }
  return (
    <span className="adm-confirm">
      <button type="button" className="adm-btn danger" onClick={confirm} disabled={busy}>
        {busy ? "Deleting..." : "Confirm"}
      </button>
      <button type="button" className="adm-btn ghost" onClick={() => setAsking(false)} disabled={busy}>
        Cancel
      </button>
    </span>
  );
}

// A success message that disappears after a few seconds.
export function useFlash() {
  const [message, setMessage] = useState("");
  useEffect(() => {
    if (!message) return undefined;
    const timer = setTimeout(() => setMessage(""), 3500);
    return () => clearTimeout(timer);
  }, [message]);
  const flash = message ? (
    <div className="adm-flash" role="status">
      <i className="fa-solid fa-circle-check" aria-hidden="true"></i> {message}
    </div>
  ) : null;
  return [flash, setMessage];
}
