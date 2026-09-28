import { useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { extractErrorMessage } from "../api/client";
import { fetchDiseaseHistory } from "../api/diseaseApi";
import { fetchToolHistory } from "../api/recommendationApi";
import ToolHero from "../components/tools/ToolHero";
import { cropEmoji, cropLabel, formatNumber } from "../lib/farmOptions";
import "../styles/tools.css";
import "../styles/farmTools.css";

const TABS = [
  { key: "health", label: "Health checks", icon: "fa-heart-pulse", empty: "No health checks yet.", cta: ["/disease-detection", "Check crop health"] },
  { key: "crop", label: "Crop plans", icon: "fa-seedling", empty: "No saved crop plans.", cta: ["/crop-recommendation", "Find the right crop"] },
  { key: "fertilizer", label: "Fertilizer", icon: "fa-flask", empty: "No saved fertilizer plans.", cta: ["/fertilizer-recommendation", "Make a fertilizer plan"] },
  { key: "irrigation", label: "Irrigation", icon: "fa-droplet", empty: "No saved irrigation plans.", cta: ["/irrigation-recommendation", "Plan watering"] },
  { key: "yield", label: "Yield", icon: "fa-chart-line", empty: "No saved yield estimates.", cta: ["/yield-prediction", "Estimate yield"] },
];

const TYPE_LABELS = {
  healthy: "Healthy",
  disease: "Disease",
  pest: "Pest",
  nutrient_deficiency: "Nutrient deficiency",
  unknown: "Unclear",
};

const PRODUCT_LABELS = { urea: "Urea", dap: "DAP", mop: "MOP" };

function formatDate(iso) {
  return new Date(iso).toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" });
}

export default function History() {
  const [params, setParams] = useSearchParams();
  const tab = TABS.some((t) => t.key === params.get("tab")) ? params.get("tab") : "health";
  const [counts, setCounts] = useState({});

  useEffect(() => {
    const load = (key, promise) =>
      promise.then((d) => setCounts((c) => ({ ...c, [key]: d.pagination.total_items }))).catch(() => {});
    load("health", fetchDiseaseHistory({ page: 1, perPage: 1 }));
    ["crop", "fertilizer", "irrigation", "yield"].forEach((t) => load(t, fetchToolHistory(t, { perPage: 1 })));
  }, []);

  return (
    <div className="container page">
      <ToolHero badge="MY FARM RECORDS" title="Everything You've Checked and Planned" emoji="📒">
        Your crop health checks and saved plans in one place — nothing here re-runs the AI.
      </ToolHero>

      <div className="records-tabs" role="tablist">
        {TABS.map((t) => (
          <button
            key={t.key}
            type="button"
            role="tab"
            aria-selected={tab === t.key}
            className={`records-tab${tab === t.key ? " active" : ""}`}
            onClick={() => setParams({ tab: t.key })}
          >
            <i className={`fa-solid ${t.icon}`}></i> {t.label}
            {counts[t.key] != null && <span className="records-count">{counts[t.key]}</span>}
          </button>
        ))}
      </div>

      {tab === "health" ? <HealthTab /> : <PlansTab key={tab} tab={TABS.find((t) => t.key === tab)} />}
    </div>
  );
}

function HealthTab() {
  const [items, setItems] = useState([]);
  const [pagination, setPagination] = useState(null);
  const [page, setPage] = useState(1);
  const [cropFilter, setCropFilter] = useState("");
  const [typeFilter, setTypeFilter] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [stats, setStats] = useState(null);

  // Summary over the latest 100 checks.
  useEffect(() => {
    fetchDiseaseHistory({ page: 1, perPage: 100 })
      .then((data) => {
        const all = data.items;
        if (!all.length) return;
        const scores = all.map((i) => i.report?.health_score).filter((s) => s != null);
        const problems = {};
        all.forEach((i) => {
          if (i.analysis.type !== "healthy" && i.analysis.name) problems[i.analysis.name] = (problems[i.analysis.name] || 0) + 1;
        });
        const common = Object.entries(problems).sort((a, b) => b[1] - a[1])[0];
        setStats({
          total: data.pagination.total_items,
          healthyPct: Math.round((100 * all.filter((i) => i.analysis.type === "healthy").length) / all.length),
          avgScore: scores.length ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length) : null,
          common: common ? `${common[0]} (${common[1]}×)` : "None",
        });
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError("");
    const timer = setTimeout(() => {
      fetchDiseaseHistory({ page, perPage: 12, cropName: cropFilter || undefined, analysisType: typeFilter || undefined })
        .then((data) => {
          if (cancelled) return;
          setItems(data.items);
          setPagination(data.pagination);
        })
        .catch((err) => !cancelled && setError(extractErrorMessage(err)))
        .finally(() => !cancelled && setLoading(false));
    }, 250);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [page, cropFilter, typeFilter]);

  return (
    <>
      {stats && (
        <div className="records-stats">
          <div>
            <strong>{stats.total}</strong>
            <span>health checks</span>
          </div>
          <div>
            <strong>{stats.healthyPct}%</strong>
            <span>found healthy</span>
          </div>
          <div>
            <strong>{stats.avgScore ?? "—"}</strong>
            <span>average health score</span>
          </div>
          <div>
            <strong className="records-stat-text">{stats.common}</strong>
            <span>most common problem</span>
          </div>
        </div>
      )}

      <div className="records-filters">
        <div className="records-chips">
          {["", "healthy", "disease", "pest", "nutrient_deficiency", "unknown"].map((t) => (
            <button
              key={t || "all"}
              type="button"
              className={`crop-chip${typeFilter === t ? " active" : ""}`}
              onClick={() => {
                setPage(1);
                setTypeFilter(t);
              }}
            >
              {t ? TYPE_LABELS[t] : "All"}
            </button>
          ))}
        </div>
        <div className="records-search">
          <i className="fa-solid fa-magnifying-glass"></i>
          <input
            value={cropFilter}
            onChange={(e) => {
              setPage(1);
              setCropFilter(e.target.value);
            }}
            placeholder="Search crop, e.g. Tomato"
          />
        </div>
      </div>

      {error && <div className="error-banner">{error}</div>}
      {loading && <div className="spinner" />}

      {!loading && items.length === 0 && <EmptyRecords tab={TABS[0]} filtered={Boolean(cropFilter || typeFilter)} />}

      {!loading && items.length > 0 && (
        <div className="records-grid">
          {items.map((item) => {
            const score = item.report?.health_score;
            return (
              <Link key={item.id} to={`/history/${item.id}`} className="record-card">
                <div className="record-card-top">
                  <span className={`tag tag-${item.analysis.type}`}>{TYPE_LABELS[item.analysis.type] || item.analysis.type}</span>
                  {score != null && <span className={`record-score score-${score >= 75 ? "good" : score >= 45 ? "warn" : "bad"}`}>{Math.round(score)}</span>}
                </div>
                <strong>{item.analysis.name || TYPE_LABELS[item.analysis.type]}</strong>
                <span className="record-meta">
                  {cropEmoji((item.crop?.name || "").toLowerCase())} {item.crop?.name || "Unknown crop"} ·{" "}
                  {formatDate(item.created_at)}
                </span>
                {item.analysis.severity && item.analysis.type !== "healthy" && (
                  <span className={`record-severity severity-${item.analysis.severity}`}>
                    {item.analysis.severity} severity
                  </span>
                )}
              </Link>
            );
          })}
        </div>
      )}

      <Pagination pagination={pagination} onPage={setPage} />
    </>
  );
}

function PlansTab({ tab }) {
  const [items, setItems] = useState([]);
  const [pagination, setPagination] = useState(null);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError("");
    fetchToolHistory(tab.key, { page, perPage: 12 })
      .then((data) => {
        if (cancelled) return;
        setItems(data.items);
        setPagination(data.pagination);
      })
      .catch((err) => !cancelled && setError(extractErrorMessage(err)))
      .finally(() => !cancelled && setLoading(false));
    return () => {
      cancelled = true;
    };
  }, [tab.key, page]);

  const Card = { crop: CropPlanCard, fertilizer: FertilizerCard, irrigation: IrrigationCard, yield: YieldCard }[tab.key];

  return (
    <>
      {error && <div className="error-banner">{error}</div>}
      {loading && <div className="spinner" />}
      {!loading && items.length === 0 && <EmptyRecords tab={tab} />}
      {!loading && items.length > 0 && (
        <div className="records-grid">
          {items.map((item) => (
            <div key={item.id} className="record-card static">
              <Card item={item} />
              <span className="record-date">Saved {formatDate(item.created_at)}</span>
            </div>
          ))}
        </div>
      )}
      <Pagination pagination={pagination} onPage={setPage} />
    </>
  );
}

function CropPlanCard({ item }) {
  const { inputs = {}, recommended_crops: crops = [] } = item;
  return (
    <>
      <div className="record-chips">
        {inputs.season && <span>{inputs.season}</span>}
        {inputs.soil_type && <span>{inputs.soil_type} soil</span>}
        {inputs.irrigation && <span>{{ none: "rain only", limited: "some irrigation", full: "full irrigation" }[inputs.irrigation]}</span>}
      </div>
      <ol className="record-crops">
        {crops.slice(0, 3).map((c) => (
          <li key={c.name}>
            <span>
              {cropEmoji(c.name)} {c.label || cropLabel(c.name)}
            </span>
            <strong>{Math.round(c.suitability_score)}</strong>
          </li>
        ))}
      </ol>
    </>
  );
}

function FertilizerCard({ item }) {
  const rec = item.recommendation || {};
  const crop = rec.crop || item.inputs?.crop_name;
  return (
    <>
      <strong>
        {cropEmoji(crop)} {cropLabel(crop)}
        {rec.area_acres && <span className="record-light"> · {rec.area_acres} acres</span>}
      </strong>
      {rec.shopping_list ? (
        <>
          <div className="record-chips">
            {rec.shopping_list.map((s) => (
              <span key={s.product}>
                {PRODUCT_LABELS[s.product]} {s.bags ? `${s.bags} bag${s.bags > 1 ? "s" : ""}` : ""}
                {s.loose_kg ? ` ${s.bags ? "+ " : ""}${s.loose_kg} kg` : ""}
              </span>
            ))}
          </div>
          <span className="record-meta">~₹{formatNumber(rec.approx_total_cost_rs)} · {rec.schedule?.length} applications</span>
        </>
      ) : (
        <ul className="record-lines">
          {(rec.fertilizer_plan || []).map((line) => (
            <li key={line}>{line}</li>
          ))}
        </ul>
      )}
    </>
  );
}

function IrrigationCard({ item }) {
  const plan = item.plan;
  const advisory = item.advisory || {};
  const title = plan?.today
    ? { irrigate: "💧 Water that day", none: "✅ No watering needed", rain: "🌧 Rain watered the field", wait: "⏳ Waited for rain" }[plan.today.action]
    : advisory.should_irrigate
      ? "💧 Water that day"
      : "✅ No watering needed";
  return (
    <>
      <strong>{title}</strong>
      {plan ? (
        <>
          <div className="record-chips">
            <span>{plan.crop ? cropLabel(plan.crop) : "Any crop"}</span>
            <span>{plan.method}</span>
            <span>{plan.stage} stage</span>
          </div>
          <span className="record-meta">
            {plan.irrigations_this_week} waterings planned that week · {formatNumber(plan.week_litres_total)} L
          </span>
        </>
      ) : (
        <span className="record-meta">{advisory.reason}</span>
      )}
    </>
  );
}

function YieldCard({ item }) {
  const est = item.estimated_yield || {};
  const crop = item.inputs?.crop_name;
  return (
    <>
      <strong>
        {cropEmoji(crop)} {cropLabel(crop)}
        <span className="record-light"> · {item.inputs?.area_acres} acres</span>
      </strong>
      {est.value != null ? (
        <>
          <span className="record-big">{formatNumber(est.value, 1)} qtl</span>
          <span className="record-meta">
            Range {formatNumber(est.range_low, 1)} – {formatNumber(est.range_high, 1)} · {est.per_acre} qtl/acre
          </span>
          {est.factors?.length > 0 && (
            <div className="record-chips">
              {est.factors.map((f) => (
                <span key={f.factor} className={f.change_pct < 0 ? "down" : ""}>
                  {f.factor} {f.change_pct > 0 ? "+" : ""}
                  {f.change_pct}%
                </span>
              ))}
            </div>
          )}
        </>
      ) : (
        <span className="record-meta">{est.notes}</span>
      )}
    </>
  );
}

function EmptyRecords({ tab, filtered = false }) {
  return (
    <div className="tool-empty records-empty">
      <div className="tool-empty-icon">
        <i className={`fa-solid ${tab.icon}`}></i>
      </div>
      <p className="tool-empty-title">{filtered ? "Nothing matches these filters." : tab.empty}</p>
      {!filtered && (
        <>
          {tab.key !== "health" && <p>Use "Save to My Records" on the tool to keep a plan here.</p>}
          <Link to={tab.cta[0]} className="btn btn-primary">
            {tab.cta[1]}
          </Link>
        </>
      )}
    </div>
  );
}

function Pagination({ pagination, onPage }) {
  if (!pagination || pagination.total_pages <= 1) return null;
  return (
    <div className="pagination">
      <button className="btn btn-ghost" disabled={!pagination.has_prev} onClick={() => onPage((p) => p - 1)}>
        Previous
      </button>
      <span style={{ alignSelf: "center", color: "var(--muted)" }}>
        Page {pagination.page} of {pagination.total_pages}
      </span>
      <button className="btn btn-ghost" disabled={!pagination.has_next} onClick={() => onPage((p) => p + 1)}>
        Next
      </button>
    </div>
  );
}
