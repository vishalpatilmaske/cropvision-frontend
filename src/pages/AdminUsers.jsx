import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { createUser, deleteUser, downloadUsersCsv, fetchUser, fetchUsers, updateUser } from "../api/adminApi";
import { extractErrorMessage } from "../api/client";
import {
  Avatar,
  ConfirmDelete,
  Drawer,
  Pagination,
  Panel,
  ScoreBadge,
  TypeBadge,
  formatDate,
  timeAgo,
  useFlash,
} from "../components/admin/AdminUi";

const PER_PAGE = 10;
const EMPTY_FORM = { name: "", email: "", phone: "" };
const SORTS = [
  { key: "newest", label: "Newest first" },
  { key: "oldest", label: "Oldest first" },
  { key: "name", label: "Name A–Z" },
];
const ACTIVITY = [
  { key: "health_checks", label: "Health checks", icon: "fa-microscope" },
  { key: "crop_plans", label: "Crop plans", icon: "fa-seedling" },
  { key: "fertilizer_plans", label: "Fertilizer", icon: "fa-flask" },
  { key: "irrigation_plans", label: "Irrigation", icon: "fa-droplet" },
  { key: "yield_estimates", label: "Yield", icon: "fa-chart-line" },
  { key: "farms", label: "Farms", icon: "fa-tractor" },
];

export default function AdminUsers() {
  const [items, setItems] = useState([]);
  const [pagination, setPagination] = useState(null);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [query, setQuery] = useState("");
  const [sort, setSort] = useState("newest");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [exporting, setExporting] = useState(false);
  const [flash, setFlash] = useFlash();

  const [editing, setEditing] = useState(null); // null | "new" | user
  const [viewingId, setViewingId] = useState(null);

  const load = useCallback(() => {
    setLoading(true);
    setError("");
    fetchUsers({ page, perPage: PER_PAGE, search: query, sort })
      .then((data) => {
        setItems(data.items);
        setPagination(data.pagination);
      })
      .catch((err) => setError(extractErrorMessage(err)))
      .finally(() => setLoading(false));
  }, [page, query, sort]);

  useEffect(load, [load]);

  // Search once typing pauses, not on every keystroke.
  useEffect(() => {
    const timer = setTimeout(() => {
      setPage(1);
      setQuery(search.trim());
    }, 300);
    return () => clearTimeout(timer);
  }, [search]);

  async function exportCsv() {
    setExporting(true);
    try {
      await downloadUsersCsv();
    } catch (err) {
      setError(extractErrorMessage(err));
    } finally {
      setExporting(false);
    }
  }

  async function removeUser(user) {
    try {
      await deleteUser(user.id);
      setViewingId(null);
      setFlash(`${user.name} and all their records were deleted.`);
      if (items.length === 1 && page > 1) setPage((p) => p - 1);
      else load();
    } catch (err) {
      setError(extractErrorMessage(err));
    }
  }

  function saved(user, isNew) {
    setEditing(null);
    setViewingId(null);
    setFlash(isNew ? `${user.name} was added.` : `${user.name} was updated.`);
    load();
  }

  return (
    <div className="adm-stack">
      <div className="adm-toolbar">
        <div className="adm-search">
          <i className="fa-solid fa-magnifying-glass" aria-hidden="true"></i>
          <input
            type="search"
            placeholder="Search name, email or phone..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            aria-label="Search users"
          />
        </div>
        <select
          className="adm-select"
          value={sort}
          onChange={(e) => {
            setPage(1);
            setSort(e.target.value);
          }}
          aria-label="Sort users"
        >
          {SORTS.map((s) => (
            <option key={s.key} value={s.key}>
              {s.label}
            </option>
          ))}
        </select>
        <div className="adm-toolbar-end">
          <button type="button" className="adm-btn ghost" onClick={exportCsv} disabled={exporting}>
            <i className={`fa-solid ${exporting ? "fa-spinner fa-spin" : "fa-file-arrow-down"}`} aria-hidden="true"></i>{" "}
            Export CSV
          </button>
          <button type="button" className="adm-btn primary" onClick={() => setEditing("new")}>
            <i className="fa-solid fa-user-plus" aria-hidden="true"></i> Add user
          </button>
        </div>
      </div>

      {flash}
      {error && <div className="error-banner">{error}</div>}

      <Panel className="adm-table-panel">
        {loading && !items.length ? (
          <div className="spinner" />
        ) : items.length === 0 ? (
          <div className="adm-empty">
            <i className="fa-solid fa-users-slash" aria-hidden="true"></i>
            <p>{query ? `No users match "${query}".` : "No users yet."}</p>
          </div>
        ) : (
          <div className={`adm-table-wrap${loading ? " is-loading" : ""}`}>
            <table className="adm-table">
              <thead>
                <tr>
                  <th>Farmer</th>
                  <th>Phone</th>
                  <th>Joined</th>
                  <th className="num">Health checks</th>
                  <th>Last active</th>
                  <th aria-label="Actions"></th>
                </tr>
              </thead>
              <tbody>
                {items.map((u) => (
                  <tr key={u.id} className="clickable" onClick={() => setViewingId(u.id)}>
                    <td>
                      <div className="adm-person">
                        <Avatar name={u.name} />
                        <div>
                          <strong>{u.name}</strong>
                          <span>{u.email}</span>
                        </div>
                      </div>
                    </td>
                    <td>{u.phone || <span className="adm-muted">—</span>}</td>
                    <td>{formatDate(u.created_at)}</td>
                    <td className="num">
                      <span className={`adm-count${u.health_checks ? "" : " zero"}`}>{u.health_checks}</span>
                    </td>
                    <td title={u.last_active ? formatDate(u.last_active, true) : undefined}>{timeAgo(u.last_active)}</td>
                    <td className="adm-row-actions" onClick={(e) => e.stopPropagation()}>
                      <button type="button" className="adm-btn ghost" onClick={() => setEditing(u)} aria-label={`Edit ${u.name}`}>
                        <i className="fa-solid fa-pen" aria-hidden="true"></i>
                      </button>
                      <ConfirmDelete compact label={`Delete ${u.name}`} onConfirm={() => removeUser(u)} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        <Pagination pagination={pagination} onPage={setPage} noun="users" />
      </Panel>

      {viewingId && (
        <UserDrawer
          userId={viewingId}
          onClose={() => setViewingId(null)}
          onEdit={(user) => setEditing(user)}
          onDelete={removeUser}
        />
      )}
      {editing && <UserForm user={editing === "new" ? null : editing} onClose={() => setEditing(null)} onSaved={saved} />}
    </div>
  );
}

function UserDrawer({ userId, onClose, onEdit, onDelete }) {
  const [data, setData] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;
    setData(null);
    fetchUser(userId)
      .then((d) => !cancelled && setData(d))
      .catch((err) => !cancelled && setError(extractErrorMessage(err)));
    return () => {
      cancelled = true;
    };
  }, [userId]);

  const user = data?.user;
  const activity = data?.activity;

  return (
    <Drawer
      title="Farmer details"
      onClose={onClose}
      footer={
        user && (
          <>
            <ConfirmDelete label="Delete user" onConfirm={() => onDelete(user)} />
            <button type="button" className="adm-btn primary" onClick={() => onEdit(user)}>
              <i className="fa-solid fa-pen" aria-hidden="true"></i> Edit
            </button>
          </>
        )
      }
    >
      {error && <div className="error-banner">{error}</div>}
      {!user && !error && <div className="spinner" />}
      {user && (
        <>
          <div className="adm-profile">
            <Avatar name={user.name} size="large" />
            <div>
              <h3>{user.name}</h3>
              <a href={`mailto:${user.email}`}>{user.email}</a>
            </div>
          </div>
          <dl className="adm-facts">
            <div>
              <dt>Phone</dt>
              <dd>{user.phone || "—"}</dd>
            </div>
            <div>
              <dt>Joined</dt>
              <dd>{formatDate(user.created_at, true)}</dd>
            </div>
          </dl>

          <h4 className="adm-subhead">Activity</h4>
          <div className="adm-activity">
            {ACTIVITY.map((a) => (
              <div key={a.key}>
                <i className={`fa-solid ${a.icon}`} aria-hidden="true"></i>
                <strong>{activity.counts[a.key]}</strong>
                <span>{a.label}</span>
              </div>
            ))}
          </div>

          <h4 className="adm-subhead">
            Recent health checks
            {activity.counts.health_checks > 0 && (
              <Link to={`/admin/health-checks?user=${user.id}`}>View all →</Link>
            )}
          </h4>
          {activity.recent_health_checks.length === 0 ? (
            <p className="adm-empty-small">No health checks yet.</p>
          ) : (
            <ul className="adm-check-list">
              {activity.recent_health_checks.map((c) => (
                <li key={c.id}>
                  <Link to={`/admin/health-checks?check=${c.id}`}>
                    <TypeBadge type={c.type} />
                    <span className="adm-check-name">
                      <strong>{c.condition || c.crop || "Health check"}</strong>
                      <span>
                        {c.crop || "Unknown crop"} · {formatDate(c.created_at)}
                      </span>
                    </span>
                    <ScoreBadge score={c.health_score} />
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </>
      )}
    </Drawer>
  );
}

function UserForm({ user, onClose, onSaved }) {
  const [form, setForm] = useState(user ? { name: user.name, email: user.email, phone: user.phone || "" } : EMPTY_FORM);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const onKey = (e) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const set = (field) => (e) => setForm((f) => ({ ...f, [field]: e.target.value }));

  async function submit(e) {
    e.preventDefault();
    setError("");
    setSaving(true);
    const payload = { name: form.name.trim(), email: form.email.trim(), phone: form.phone.trim() || null };
    try {
      const result = user ? await updateUser(user.id, payload) : await createUser(payload);
      onSaved(result, !user);
    } catch (err) {
      setError(extractErrorMessage(err));
      setSaving(false);
    }
  }

  return (
    <div className="adm-modal-overlay" onClick={onClose}>
      <div className="adm-modal" role="dialog" aria-label={user ? "Edit user" : "Add user"} onClick={(e) => e.stopPropagation()}>
        <header className="adm-drawer-head">
          <h2>{user ? "Edit farmer" : "Add farmer"}</h2>
          <button type="button" className="adm-icon-btn" onClick={onClose} aria-label="Close">
            <i className="fa-solid fa-xmark"></i>
          </button>
        </header>
        {error && <div className="error-banner">{error}</div>}
        <form onSubmit={submit}>
          <div className="form-group">
            <label htmlFor="admName">Full name</label>
            <input id="admName" required autoFocus value={form.name} onChange={set("name")} />
          </div>
          <div className="form-group">
            <label htmlFor="admEmail">Email</label>
            <input id="admEmail" type="email" required value={form.email} onChange={set("email")} />
          </div>
          <div className="form-group">
            <label htmlFor="admPhone">Phone (optional)</label>
            <input id="admPhone" type="tel" value={form.phone} onChange={set("phone")} />
          </div>
          <p className="adm-muted adm-form-note">The farmer signs in with a code sent to this email.</p>
          <div className="adm-modal-actions">
            <button type="button" className="adm-btn ghost" onClick={onClose}>
              Cancel
            </button>
            <button type="submit" className="adm-btn primary" disabled={saving}>
              {saving ? "Saving..." : user ? "Save changes" : "Add farmer"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
