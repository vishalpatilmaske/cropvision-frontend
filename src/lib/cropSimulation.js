// 14-day spread / yield-loss projection for the 3D Digital Twin, built from a
// real crop health report. Every number here is a transparent rule of thumb
// (listed in `assumptions`) -- a planning aid, not a prediction.

export const SIM_DAYS = 14;

// Daily growth rate of the affected leaf area (logistic model), by AI-reported spread risk.
const SPREAD_RATE = { low: 0.06, medium: 0.12, high: 0.2 };

// When the report has no spread risk, fall back on severity.
const SEVERITY_TO_RISK = { none: "low", low: "low", medium: "medium", high: "high", critical: "high" };

// When the report has no affected-area estimate, fall back on severity.
const SEVERITY_TO_AREA = { none: 2, low: 10, medium: 25, high: 45, critical: 65 };

// Share of affected leaf area that turns into lost yield.
const LOSS_FACTOR = { disease: 0.6, pest: 0.5, nutrient_deficiency: 0.4 };

const WET_WEATHER_MULTIPLIER = 1.3;
const MAX_AFFECTED_PCT = 95;
const MAX_YIELD_LOSS_PCT = 90;
const DAYS_FOR_TREATMENT_TO_WORK = 2;

export function isSimulatable(result) {
  return ["disease", "pest", "nutrient_deficiency"].includes(result?.analysis?.type);
}

function isWet(weather) {
  if (!weather) return false;
  return (
    (weather.humidity_pct ?? 0) >= 80 ||
    (weather.rain_next_3_days_mm ?? 0) >= 10 ||
    (weather.max_rain_probability_pct ?? 0) >= 60 ||
    Boolean(weather.heavy_rain_alert)
  );
}

function logistic(startPct, rate, day) {
  const start = Math.max(startPct, 1);
  return MAX_AFFECTED_PCT / (1 + ((MAX_AFFECTED_PCT - start) / start) * Math.exp(-rate * day));
}

export function buildSimulation(result) {
  const { analysis, report = {}, weather } = result;
  const type = analysis.type;
  const severity = analysis.severity || "medium";

  const riskLevel = report.spread_risk || SEVERITY_TO_RISK[severity] || "medium";
  const startPct = report.affected_area_pct ?? SEVERITY_TO_AREA[severity] ?? 20;
  const wet = type !== "nutrient_deficiency" && isWet(weather);

  // Nutrient deficiency isn't contagious: it creeps slowly and recovers once corrected.
  let rate = type === "nutrient_deficiency" ? 0.04 : SPREAD_RATE[riskLevel];
  if (wet) rate *= WET_WEATHER_MULTIPLIER;

  const lossFactor = LOSS_FACTOR[type] ?? 0.5;
  const toLoss = (pct) => Math.min(MAX_YIELD_LOSS_PCT, pct * lossFactor);

  const days = [];
  for (let day = 0; day <= SIM_DAYS; day += 1) {
    const untreated = logistic(startPct, rate, day);
    let treated = logistic(startPct, rate, Math.min(day, DAYS_FOR_TREATMENT_TO_WORK));
    if (type === "nutrient_deficiency" && day > DAYS_FOR_TREATMENT_TO_WORK) {
      treated = Math.max(startPct * 0.5, treated - (day - DAYS_FOR_TREATMENT_TO_WORK) * 1.5);
    }
    days.push({
      day,
      untreatedPct: untreated,
      treatedPct: treated,
      untreatedLossPct: toLoss(untreated),
      treatedLossPct: toLoss(treated),
    });
  }

  const assumptions = [
    `Starts from ${Math.round(startPct)}% affected leaf area${
      report.affected_area_pct == null ? ` (estimated from "${severity}" severity)` : " (from your photo)"
    }.`,
    type === "nutrient_deficiency"
      ? "Nutrient deficiency isn't contagious: it worsens slowly and recovers after correction."
      : `Spreads at the "${riskLevel}" rate your report gave${wet ? ", 30% faster because your local weather is wet / humid" : ""}.`,
    `Treatment is assumed to stop new damage within ${DAYS_FOR_TREATMENT_TO_WORK} days.`,
    `Yield loss ≈ ${Math.round(lossFactor * 100)}% of the affected leaf area.`,
  ];

  return { days, startPct, riskLevel, wet, assumptions };
}

export function formatDayDate(createdAt, day) {
  const base = createdAt ? new Date(createdAt) : new Date();
  const date = new Date(base.getTime() + day * 24 * 60 * 60 * 1000);
  return date.toLocaleDateString(undefined, { day: "numeric", month: "short" });
}
