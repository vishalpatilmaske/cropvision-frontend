import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { createUser, deleteUser, fetchStats, fetchUsers, updateUser } from "../api/adminApi";
import { extractErrorMessage } from "../api/client";
import { useAdminAuth } from "../context/AdminAuthContext";
import "../styles/admin.css";

const EMPTY_FORM = { name: "", email: "", phone: "" };

export default function AdminUsers() {
  const { admin, logout } = useAdminAuth();
  const navigate = useNavigate();

  const [stats, setStats] = useState(null);
  const [items, setItems] = useState([]);
  const [pagination, setPagination] = useState(null);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [modalMode, setModalMode] = useState(null); // null | "create" | "edit"
  const [form, setForm] = useState(EMPTY_FORM);
  const [editingUser, setEditingUser] = useState(null);
  const [formError, setFormError] = useState("");
  const [saving, setSaving] = useState(false);

  const [confirmDeleteId, setConfirmDeleteId] = useState(null);
  const [deleting, setDeleting] = useState(false);

  function handleLogout() {
    logout();
    navigate("/admin/login");
  }

  function loadUsers() {
    setLoading(true);
    setError("");
    fetchUsers({ page, perPage: 10, search: query })
      .then((data) => {
        setItems(data.items);
        setPagination(data.pagination);
      })
      .catch((err) => setError(extractErrorMessage(err)))
      .finally(() => setLoading(false));
  }

  // Search once typing pauses, not on every keystroke.
  useEffect(() => {
    const timer = setTimeout(() => {
      setPage(1);
      setQuery(search.trim());
    }, 300);
    return () => clearTimeout(timer);
  }, [search]);

  useEffect(() => {
    loadUsers();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, query]);

  useEffect(() => {
    fetchStats().then(setStats).catch(() => {});
  }, [items.length]);

  function openCreateModal() {
    setForm(EMPTY_FORM);
    setEditingUser(null);
    setFormError("");
    setModalMode("create");
  }

  function openEditModal(user) {
    setForm({ name: user.name, email: user.email, phone: user.phone || "" });
    setEditingUser(user);
    setFormError("");
    setModalMode("edit");
  }

  function closeModal() {
    setModalMode(null);
    setForm(EMPTY_FORM);
    setEditingUser(null);
    setFormError("");
  }

  async function handleFormSubmit(e) {
    e.preventDefault();
    setFormError("");
    setSaving(true);
    try {
      if (modalMode === "create") {
        await createUser({
          name: form.name.trim(),
          email: form.email.trim(),
          phone: form.phone.trim() || undefined,
        });
      } else if (modalMode === "edit" && editingUser) {
        await updateUser(editingUser.id, {
          name: form.name.trim(),
          email: form.email.trim(),
          phone: form.phone.trim() || null,
        });
      }
      closeModal();
      loadUsers();
    } catch (err) {
      setFormError(extractErrorMessage(err));
    } finally {
      setSaving(false);
    }
  }

  async function handleConfirmDelete(id) {
    setDeleting(true);
    try {
      await deleteUser(id);
      setConfirmDeleteId(null);
      if (items.length === 1 && page > 1) {
        setPage((p) => p - 1);
      } else {
        loadUsers();
      }
    } catch (err) {
      setError(extractErrorMessage(err));
    } finally {
      setDeleting(false);
    }
  }

  return (
    <div className="admin-page">
      <header className="admin-header">
        <div className="admin-header-brand">
          <i className="fa-solid fa-shield-halved"></i>
          <span>CropVision AI Admin</span>
        </div>
        <div className="admin-header-actions">
          <span className="admin-header-email">{admin?.email}</span>
          <button className="btn btn-ghost" onClick={handleLogout}>
            <i className="fa-solid fa-right-from-bracket"></i> Log out
          </button>
        </div>
      </header>

      <div className="container admin-content">
        <div className="admin-stats-row">
          <div className="admin-stat-card">
            <div className="admin-stat-icon"><i className="fa-solid fa-users"></i></div>
            <div>
              <div className="admin-stat-value">{stats ? stats.total_users : "—"}</div>
              <div className="admin-stat-label">Registered Users</div>
            </div>
          </div>
          <div className="admin-stat-card">
            <div className="admin-stat-icon"><i className="fa-solid fa-microscope"></i></div>
            <div>
              <div className="admin-stat-value">{stats ? stats.total_analyses : "—"}</div>
              <div className="admin-stat-label">Total Analyses</div>
            </div>
          </div>
        </div>

        <div className="admin-toolbar">
          <div className="admin-search">
            <i className="fa-solid fa-magnifying-glass"></i>
            <input
              type="text"
              placeholder="Search by name or email..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <button className="btn btn-primary" onClick={openCreateModal}>
            <i className="fa-solid fa-user-plus"></i> Add User
          </button>
        </div>

        {error && <div className="error-banner">{error}</div>}

        <div className="admin-table-card">
          {loading ? (
            <div className="spinner" />
          ) : items.length === 0 ? (
            <p className="admin-empty">No users found.</p>
          ) : (
            <table className="admin-table">
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Email</th>
                  <th>Phone</th>
                  <th>Joined</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {items.map((u) => (
                  <tr key={u.id}>
                    <td>{u.name}</td>
                    <td>{u.email}</td>
                    <td>{u.phone || "—"}</td>
                    <td>{u.created_at ? new Date(u.created_at).toLocaleDateString() : "—"}</td>
                    <td className="admin-table-actions">
                      {confirmDeleteId === u.id ? (
                        <>
                          <button
                            className="btn-icon-text danger"
                            disabled={deleting}
                            onClick={() => handleConfirmDelete(u.id)}
                          >
                            Confirm delete
                          </button>
                          <button className="btn-icon-text" onClick={() => setConfirmDeleteId(null)}>
                            Cancel
                          </button>
                        </>
                      ) : (
                        <>
                          <button className="btn-icon-text" onClick={() => openEditModal(u)}>
                            <i className="fa-solid fa-pen"></i> Edit
                          </button>
                          <button className="btn-icon-text danger" onClick={() => setConfirmDeleteId(u.id)}>
                            <i className="fa-solid fa-trash"></i> Delete
                          </button>
                        </>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {pagination && pagination.total_pages > 1 && (
          <div className="pagination">
            <button className="btn btn-ghost" disabled={!pagination.has_prev} onClick={() => setPage((p) => p - 1)}>
              Previous
            </button>
            <span style={{ alignSelf: "center", color: "var(--muted)" }}>
              Page {pagination.page} of {pagination.total_pages}
            </span>
            <button className="btn btn-ghost" disabled={!pagination.has_next} onClick={() => setPage((p) => p + 1)}>
              Next
            </button>
          </div>
        )}
      </div>

      {modalMode && (
        <div className="admin-modal-overlay" onClick={closeModal}>
          <div className="admin-modal" onClick={(e) => e.stopPropagation()}>
            <div className="admin-modal-header">
              <h3>{modalMode === "create" ? "Add User" : "Edit User"}</h3>
              <button className="admin-modal-close" onClick={closeModal} aria-label="Close">
                &times;
              </button>
            </div>
            {formError && <div className="error-banner">{formError}</div>}
            <form onSubmit={handleFormSubmit}>
              <div className="form-group">
                <label>Full name</label>
                <input
                  required
                  value={form.name}
                  onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                />
              </div>
              <div className="form-group">
                <label>Email</label>
                <input
                  type="email"
                  required
                  value={form.email}
                  onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
                />
              </div>
              <div className="form-group">
                <label>Phone (optional)</label>
                <input
                  value={form.phone}
                  onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))}
                />
              </div>
              <p className="admin-form-note">The farmer signs in with a code sent to this email.</p>
              <div className="admin-modal-actions">
                <button type="button" className="btn btn-ghost" onClick={closeModal}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary" disabled={saving}>
                  {saving ? "Saving..." : modalMode === "create" ? "Create User" : "Save Changes"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
