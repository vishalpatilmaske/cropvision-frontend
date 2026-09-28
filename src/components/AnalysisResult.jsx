import { ASK_ASSISTANT_EVENT } from "./FarmAssistant";
import "../styles/analysisReport.css";

const ANALYSIS_TYPE_LABELS = {
  healthy: "Healthy",
  disease: "Disease Detected",
  pest: "Pest Detected",
  nutrient_deficiency: "Nutrient Deficiency",
  unknown: "Unable to Determine",
};

const ANALYSIS_TYPE_ICONS = {
  healthy: "fa-circle-check",
  disease: "fa-virus",
  pest: "fa-bug",
  nutrient_deficiency: "fa-flask",
  unknown: "fa-circle-question",
};

const ASSESSMENT_LABELS = {
  confirmed: "Confirmed",
  likely: "Likely",
  possible: "Possible",
  unknown: "Unknown",
};

const SEVERITY_ICONS = {
  none: "fa-shield",
  low: "fa-shield-halved",
  medium: "fa-triangle-exclamation",
  high: "fa-triangle-exclamation",
  critical: "fa-skull-crossbones",
};

const URGENCY = {
  none: { label: "No action needed", icon: "fa-circle-check", tone: "good" },
  monitor: { label: "Keep monitoring", icon: "fa-eye", tone: "calm" },
  within_week: { label: "Act this week", icon: "fa-calendar-week", tone: "warn" },
  immediate: { label: "Act today", icon: "fa-bolt", tone: "danger" },
};

const SPREAD_RISK_LABELS = { low: "Low", medium: "Medium", high: "High" };

function capitalize(value) {
  return value ? value[0].toUpperCase() + value.slice(1) : "N/A";
}

function scoreTone(score) {
  if (score >= 75) return "good";
  if (score >= 45) return "warn";
  return "danger";
}

export default function AnalysisResult({ result, imageUrl, onSimulateIn3D, showActions = true }) {
  const {
    crop,
    analysis,
    recommendations = {},
    additional_observations: observations,
    needs_expert_confirmation: needsExpert,
    report = {},
  } = result;

  const confidence = Math.round(analysis.confidence || 0);
  const healthScore = report.health_score != null ? Math.round(report.health_score) : null;
  const urgency = URGENCY[report.urgency];
  const title = analysis.name || ANALYSIS_TYPE_LABELS[analysis.type] || analysis.type;
  const showExpertNotice =
    needsExpert || analysis.assessment_level === "possible" || analysis.assessment_level === "unknown";

  function printReport() {
    document.body.classList.add("print-report");
    window.addEventListener("afterprint", () => document.body.classList.remove("print-report"), { once: true });
    window.print();
  }

  function askAssistant() {
    window.dispatchEvent(
      new CustomEvent(ASK_ASSISTANT_EVENT, {
        detail: {
          message: "Explain my crop health report in simple words and tell me exactly what to do next.",
          reportId: result.id,
        },
      })
    );
  }

  return (
    <article className="ar-report">
      <div className="ar-print-header">
        <strong>🌱 CropVision AI — Crop Health Report</strong>
        {result.created_at && <span>{new Date(result.created_at).toLocaleString()}</span>}
      </div>

      <div className={`ar-banner type-${analysis.type}`}>
        {imageUrl ? (
          <img className="ar-banner-photo" src={imageUrl} alt="Analyzed crop" />
        ) : (
          <div className="ar-banner-icon">
            <i className={`fa-solid ${ANALYSIS_TYPE_ICONS[analysis.type] || "fa-circle-question"}`}></i>
          </div>
        )}
        <div className="ar-banner-text">
          <span className="ar-banner-kicker">
            <i className={`fa-solid ${ANALYSIS_TYPE_ICONS[analysis.type] || "fa-circle-question"}`}></i>{" "}
            {ANALYSIS_TYPE_LABELS[analysis.type] || analysis.type}
          </span>
          <h2>{title}</h2>
          <p>
            Crop: <strong>{crop.name || "Not identified"}</strong>
            {crop.growth_stage && <> · {capitalize(crop.growth_stage)} stage</>}
          </p>
        </div>
        {healthScore != null && <HealthRing score={healthScore} />}
      </div>

      {report.summary && <p className="ar-summary">{report.summary}</p>}

      {urgency && (
        <div className={`ar-urgency tone-${urgency.tone}`}>
          <i className={`fa-solid ${urgency.icon}`}></i>
          <span>{urgency.label}</span>
        </div>
      )}

      <div className="ar-stats">
        <Stat label="Assessment" value={ASSESSMENT_LABELS[analysis.assessment_level] || analysis.assessment_level} />
        <Stat label="Confidence" value={`${confidence}%`}>
          <div className="ar-confidence-bar">
            <div className="ar-confidence-fill" style={{ width: `${confidence}%` }}></div>
          </div>
        </Stat>
        <Stat
          label="Severity"
          className={`severity-${analysis.severity}`}
          value={
            <>
              <i className={`fa-solid ${SEVERITY_ICONS[analysis.severity] || "fa-shield"}`}></i>{" "}
              {capitalize(analysis.severity)}
            </>
          }
        />
        {report.spread_risk && (
          <Stat
            label="Spread risk"
            className={`risk-${report.spread_risk}`}
            value={SPREAD_RISK_LABELS[report.spread_risk]}
          />
        )}
        {report.affected_area_pct != null && (
          <Stat label="Affected area" value={`~${Math.round(report.affected_area_pct)}%`}>
            <div className="ar-confidence-bar">
              <div
                className="ar-confidence-fill ar-affected-fill"
                style={{ width: `${Math.round(report.affected_area_pct)}%` }}
              ></div>
            </div>
          </Stat>
        )}
      </div>

      {showActions && (
        <div className="ar-actions">
          <button type="button" className="ar-action primary" onClick={askAssistant}>
            <i className="fa-solid fa-comment-dots"></i> Ask Krishi Mitra about this
          </button>
          <button type="button" className="ar-action" onClick={printReport}>
            <i className="fa-solid fa-file-arrow-down"></i> Download / Print
          </button>
          {onSimulateIn3D && (
            <button type="button" className="ar-action" onClick={onSimulateIn3D}>
              <i className="fa-solid fa-cube"></i> See 14-day 3D forecast
            </button>
          )}
        </div>
      )}

      <ResultList icon="fa-eye" title="What we can see" items={analysis.symptoms} />
      <ResultList icon="fa-magnifying-glass" title="Likely causes" items={analysis.possible_causes} />

      {(recommendations.immediate_action?.length > 0 ||
        recommendations.treatment?.length > 0 ||
        report.organic_options?.length > 0) && (
        <div className="ar-section">
          <div className="ar-section-title">
            <i className="fa-solid fa-list-check"></i> Action plan
          </div>
          <div className="ar-plan">
            <PlanStep tone="danger" icon="fa-bolt" title="Do today" items={recommendations.immediate_action} />
            <PlanStep tone="warn" icon="fa-mortar-pestle" title="Treatment" items={recommendations.treatment} />
            <PlanStep tone="good" icon="fa-leaf" title="Organic options" items={report.organic_options} />
          </div>
        </div>
      )}

      {(result.weather || report.weather_advice) && (
        <WeatherCard weather={result.weather} advice={report.weather_advice} />
      )}

      <ResultList icon="fa-shield-halved" title="Prevention" items={recommendations.prevention} />
      <ResultList icon="fa-calendar-check" title="Monitoring plan" items={report.monitoring_plan} checklist />
      <ResultList icon="fa-circle-info" title="Other observations" items={observations} />

      {report.recovery_outlook && (
        <div className="ar-outlook">
          <i className="fa-solid fa-seedling"></i>
          <div>
            <strong>Recovery outlook</strong>
            <p>{report.recovery_outlook}</p>
          </div>
        </div>
      )}

      {showExpertNotice && (
        <div className="notice-banner ar-expert-notice">
          <i className="fa-solid fa-triangle-exclamation"></i>
          <span>
            AI-based analysis is an initial assessment and should be confirmed by an agricultural expert when the
            condition is uncertain or severe.
          </span>
        </div>
      )}

      <p className="ar-footnote">
        AI visual assessment, not a lab diagnosis. Follow product labels for any chemical and wear protective gear.
      </p>
    </article>
  );
}

function WeatherCard({ weather, advice }) {
  const fmt = (value, unit) => (value == null ? "—" : `${Math.round(value)}${unit}`);
  return (
    <div className="ar-section ar-weather">
      <div className="ar-section-title">
        <i className="fa-solid fa-cloud-sun-rain"></i> Local weather & timing
      </div>
      {weather && (
        <div className="ar-weather-grid">
          <div>
            <i className="fa-solid fa-temperature-half"></i>
            <strong>{fmt(weather.temperature_c, "°C")}</strong>
            <span>Now</span>
          </div>
          <div>
            <i className="fa-solid fa-droplet"></i>
            <strong>{fmt(weather.humidity_pct, "%")}</strong>
            <span>Humidity</span>
          </div>
          <div>
            <i className="fa-solid fa-cloud-rain"></i>
            <strong>{weather.rain_next_3_days_mm == null ? "—" : `${weather.rain_next_3_days_mm} mm`}</strong>
            <span>Rain, next 3 days</span>
          </div>
        </div>
      )}
      {weather?.heavy_rain_alert && (
        <div className="ar-weather-alert">
          <i className="fa-solid fa-cloud-showers-heavy"></i> Heavy rain expected this week
        </div>
      )}
      {weather?.heatwave_alert && (
        <div className="ar-weather-alert">
          <i className="fa-solid fa-temperature-arrow-up"></i> Heatwave expected this week
        </div>
      )}
      {advice && <p className="ar-weather-advice">{advice}</p>}
    </div>
  );
}

function HealthRing({ score }) {
  const radius = 30;
  const circumference = 2 * Math.PI * radius;
  return (
    <div className={`ar-health-ring tone-${scoreTone(score)}`} title="Overall plant health score">
      <svg viewBox="0 0 72 72" aria-hidden="true">
        <circle className="track" cx="36" cy="36" r={radius} />
        <circle
          className="value"
          cx="36"
          cy="36"
          r={radius}
          strokeDasharray={circumference}
          strokeDashoffset={circumference * (1 - score / 100)}
        />
      </svg>
      <div className="ar-health-ring-label">
        <strong>{score}</strong>
        <span>health</span>
      </div>
    </div>
  );
}

function Stat({ label, value, className = "", children }) {
  return (
    <div className="ar-stat">
      <div className="ar-stat-label">{label}</div>
      <div className={`ar-stat-value ${className}`}>{value}</div>
      {children}
    </div>
  );
}

function PlanStep({ tone, icon, title, items }) {
  if (!items || items.length === 0) return null;
  return (
    <div className={`ar-plan-step tone-${tone}`}>
      <div className="ar-plan-step-title">
        <i className={`fa-solid ${icon}`}></i> {title}
      </div>
      <ul>
        {items.map((item, idx) => (
          <li key={idx}>{item}</li>
        ))}
      </ul>
    </div>
  );
}

function ResultList({ icon, title, items, checklist = false }) {
  if (!items || items.length === 0) return null;
  return (
    <div className="ar-section">
      <div className="ar-section-title">
        <i className={`fa-solid ${icon}`}></i>
        {title}
      </div>
      <ul className={`ar-list${checklist ? " ar-checklist" : ""}`}>
        {items.map((item, idx) => (
          <li key={idx}>
            <i className={`fa-${checklist ? "regular fa-square" : "solid fa-circle"}`}></i>
            <span>{item}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
