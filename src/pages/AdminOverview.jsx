import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { fetchStats } from "../api/adminApi";
import { extractErrorMessage } from "../api/client";
import { RankedBars, TrendBars } from "../components/admin/AdminCharts";
import { Panel, StatCard, TYPE_LABELS } from "../components/admin/AdminUi";

const PLAN_ROWS = [
  { key: "crop_plans", label: "Crop plans", icon: "fa-seedling" },
  { key: "fertilizer_plans", label: "Fertilizer plans", icon: "fa-flask" },
  { key: "irrigation_plans", label: "Irrigation plans", icon: "fa-droplet" },
  { key: "yield_estimates", label: "Yield estimates", icon: "fa-chart-line" },
  { key: "farms", label: "Farms", icon: "fa-tractor" },
];

export default function AdminOverview() {
  const [stats, setStats] = useState(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  const load = useCallback(() => {
    setLoading(true);
    setError("");
    fetchStats()
      .then(setStats)
      .catch((err) => setError(extractErrorMessage(err)))
      .finally(() => setLoading(false));
  }, []);

  useEffect(load, [load]);

  if (!stats) {
    return (
      <>
        {error && <div className="error-banner">{error}</div>}
        {loading && <div className="spinner" />}
      </>
    );
  }

  const { totals, last_7_days: week } = stats;
  const savedPlans = PLAN_ROWS.slice(0, 4).reduce((sum, row) => sum + totals[row.key], 0);
  const byType = Object.entries(stats.health_checks_by_type)
    .map(([type, count]) => ({ name: TYPE_LABELS[type] || type, count }))
    .sort((a, b) => b.count - a.count);

  return (
    <div className="adm-stack">
      <div className="adm-page-actions">
        <p className="adm-muted">Live numbers across all farmers.</p>
        <button type="button" className="adm-btn ghost" onClick={load} disabled={loading}>
          <i className={`fa-solid fa-rotate${loading ? " fa-spin" : ""}`} aria-hidden="true"></i> Refresh
        </button>
      </div>
      {error && <div className="error-banner">{error}</div>}

      <div className="adm-stats">
        <StatCard icon="fa-users" label="Farmers" value={totals.users} note={`+${week.new_users} this week`} />
        <StatCard
          icon="fa-microscope"
          label="Health checks"
          value={totals.health_checks}
          note={`+${week.health_checks} this week`}
        />
        <StatCard
          icon="fa-heart-pulse"
          label="Average health score"
          value={stats.average_health_score ?? "—"}
          note="Out of 100"
        />
        <StatCard
          icon="fa-user-doctor"
          label="Need expert review"
          value={stats.needs_expert_review}
          tone={stats.needs_expert_review ? "attention" : ""}
          note={
            stats.needs_expert_review ? (
              <Link to="/admin/health-checks?review=1">Review them →</Link>
            ) : (
              "Nothing flagged"
            )
          }
        />
      </div>

      <div className="adm-grid-2">
        <Panel title="New farmers" subtitle="Sign-ups per day">
          <TrendBars series={stats.trend.signups} label="sign-ups" />
        </Panel>
        <Panel title="Health checks" subtitle="Photo analyses per day">
          <TrendBars series={stats.trend.health_checks} label="health checks" />
        </Panel>
      </div>

      <div className="adm-grid-3">
        <Panel title="Results" subtitle="What the checks found">
          <RankedBars items={byType} empty="No health checks yet." />
        </Panel>
        <Panel title="Top problems" subtitle="Most common diseases & pests">
          <RankedBars items={stats.top_conditions} empty="No problems found yet." />
        </Panel>
        <Panel title="Top crops" subtitle="Most checked crops">
          <RankedBars items={stats.top_crops} empty="No crops yet." />
        </Panel>
      </div>

      <Panel title="Saved plans" subtitle={`${savedPlans} plans saved from the farm tools`}>
        <div className="adm-plan-grid">
          {PLAN_ROWS.map((row) => (
            <div key={row.key} className="adm-plan">
              <i className={`fa-solid ${row.icon}`} aria-hidden="true"></i>
              <strong>{totals[row.key]}</strong>
              <span>{row.label}</span>
            </div>
          ))}
        </div>
      </Panel>
    </div>
  );
}
