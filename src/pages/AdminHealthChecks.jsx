import { useCallback, useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { deleteHealthCheck, fetchHealthCheck, fetchHealthChecks } from "../api/adminApi";
import { extractErrorMessage } from "../api/client";
import AnalysisResult from "../components/AnalysisResult";
import {
  Avatar,
  ConfirmDelete,
  Drawer,
  Pagination,
  Panel,
  ScoreBadge,
  TYPE_LABELS,
  TypeBadge,
  formatDate,
  useFlash,
} from "../components/admin/AdminUi";

const PER_PAGE = 12;

// Every farmer's photo health checks. URL params make views linkable:
//   ?check=<id>  open one report   ?user=<id>  one farmer's checks   ?review=1  flagged only
export default function AdminHealthChecks() {
  const [params, setParams] = useSearchParams();
  const checkId = params.get("check");
  const userId = params.get("user");
  const needsReview = params.get("review") === "1";

  const [items, setItems] = useState([]);
  const [pagination, setPagination] = useState(null);
  const [page, setPage] = useState(1);
  const [type, setType] = useState("");
  const [cropInput, setCropInput] = useState("");
  const [crop, setCrop] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [flash, setFlash] = useFlash();

  const load = useCallback(() => {
    setLoading(true);
    setError("");
    fetchHealthChecks({ page, perPage: PER_PAGE, analysisType: type, cropName: crop, userId, needsReview })
      .then((data) => {
        setItems(data.items);
        setPagination(data.pagination);
      })
      .catch((err) => setError(extractErrorMessage(err)))
      .finally(() => setLoading(false));
  }, [page, type, crop, userId, needsReview]);

  useEffect(load, [load]);

  useEffect(() => {
    const timer = setTimeout(() => {
      setPage(1);
      setCrop(cropInput.trim());
    }, 300);
    return () => clearTimeout(timer);
  }, [cropInput]);

  function setParam(key, value) {
    const next = new URLSearchParams(params);
    if (value) next.set(key, value);
    else next.delete(key);
    setParams(next);
    if (key !== "check") setPage(1);
  }

  async function remove(id) {
    try {
      await deleteHealthCheck(id);
      setParam("check", null);
      setFlash("Health check deleted.");
      if (items.length === 1 && page > 1) setPage((p) => p - 1);
      else load();
    } catch (err) {
      setError(extractErrorMessage(err));
    }
  }

  const ownerName = userId && items[0]?.user?.id === userId ? items[0].user.name : null;

  return (
    <div className="adm-stack">
      <div className="adm-toolbar wrap">
        <div className="adm-chips" role="group" aria-label="Filter by result">
          {["", ...Object.keys(TYPE_LABELS)].map((t) => (
            <button
              key={t || "all"}
              type="button"
              className={`adm-chip${type === t ? " active" : ""}`}
              aria-pressed={type === t}
              onClick={() => {
                setPage(1);
                setType(t);
              }}
            >
              {t ? TYPE_LABELS[t] : "All"}
            </button>
          ))}
        </div>
        <div className="adm-search small">
          <i className="fa-solid fa-seedling" aria-hidden="true"></i>
          <input
            type="search"
            placeholder="Filter by crop..."
            value={cropInput}
            onChange={(e) => setCropInput(e.target.value)}
            aria-label="Filter by crop"
          />
        </div>
        <label className="adm-toggle">
          <input type="checkbox" checked={needsReview} onChange={(e) => setParam("review", e.target.checked ? "1" : null)} />
          Needs expert review
        </label>
      </div>

      {userId && (
        <div className="adm-filter-note">
          <i className="fa-solid fa-user" aria-hidden="true"></i> Showing checks by {ownerName || "one farmer"}
          <button type="button" onClick={() => setParam("user", null)}>
            Show everyone
          </button>
        </div>
      )}

      {flash}
      {error && <div className="error-banner">{error}</div>}

      <Panel className="adm-table-panel">
        {loading && !items.length ? (
          <div className="spinner" />
        ) : items.length === 0 ? (
          <div className="adm-empty">
            <i className="fa-solid fa-microscope" aria-hidden="true"></i>
            <p>No health checks match these filters.</p>
          </div>
        ) : (
          <div className={`adm-table-wrap${loading ? " is-loading" : ""}`}>
            <table className="adm-table">
              <thead>
                <tr>
                  <th>Result</th>
                  <th>Crop</th>
                  <th>Farmer</th>
                  <th>Severity</th>
                  <th className="num">Score</th>
                  <th>Date</th>
                  <th aria-label="Actions"></th>
                </tr>
              </thead>
              <tbody>
                {items.map((c) => (
                  <tr key={c.id} className="clickable" onClick={() => setParam("check", c.id)}>
                    <td>
                      <div className="adm-result">
                        <TypeBadge type={c.type} />
                        <strong title={c.condition || undefined}>{c.condition || TYPE_LABELS[c.type]}</strong>
                        {c.needs_expert_confirmation && (
                          <span className="adm-flag" title="Needs expert review">
                            <i className="fa-solid fa-user-doctor" aria-hidden="true"></i>
                            <span className="sr-only">Needs expert review</span>
                          </span>
                        )}
                      </div>
                    </td>
                    <td>{c.crop || <span className="adm-muted">Unknown</span>}</td>
                    <td>
                      {c.user ? (
                        <div className="adm-person compact">
                          <Avatar name={c.user.name} size="small" />
                          <div>
                            <strong>{c.user.name}</strong>
                            <span>{c.user.email}</span>
                          </div>
                        </div>
                      ) : (
                        <span className="adm-muted">Deleted user</span>
                      )}
                    </td>
                    <td>
                      {c.type === "healthy" || !c.severity || c.severity === "none" ? (
                        <span className="adm-muted">—</span>
                      ) : (
                        <span className={`adm-severity sev-${c.severity}`}>{c.severity}</span>
                      )}
                    </td>
                    <td className="num">
                      <ScoreBadge score={c.health_score} />
                    </td>
                    <td>{formatDate(c.created_at)}</td>
                    <td className="adm-row-actions" onClick={(e) => e.stopPropagation()}>
                      <ConfirmDelete compact label="Delete health check" onConfirm={() => remove(c.id)} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        <Pagination pagination={pagination} onPage={setPage} noun="health checks" />
      </Panel>

      {checkId && <CheckDrawer id={checkId} onClose={() => setParam("check", null)} onDelete={remove} />}
    </div>
  );
}

function CheckDrawer({ id, onClose, onDelete }) {
  const [record, setRecord] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;
    setRecord(null);
    setError("");
    fetchHealthCheck(id)
      .then((r) => !cancelled && setRecord(r))
      .catch((err) => !cancelled && setError(extractErrorMessage(err)));
    return () => {
      cancelled = true;
    };
  }, [id]);

  return (
    <Drawer
      title="Health check report"
      onClose={onClose}
      footer={record && <ConfirmDelete label="Delete this check" onConfirm={() => onDelete(record.id)} />}
    >
      {error && <div className="error-banner">{error}</div>}
      {!record && !error && <div className="spinner" />}
      {record && (
        <>
          <div className="adm-check-meta">
            {record.user ? (
              <div className="adm-person">
                <Avatar name={record.user.name} />
                <div>
                  <strong>{record.user.name}</strong>
                  <span>{record.user.email}</span>
                </div>
              </div>
            ) : (
              <span className="adm-muted">Farmer account deleted</span>
            )}
            <span className="adm-muted">{formatDate(record.created_at, true)}</span>
          </div>
          <AnalysisResult result={record} showActions={false} customer={record.user} />
        </>
      )}
    </Drawer>
  );
}
