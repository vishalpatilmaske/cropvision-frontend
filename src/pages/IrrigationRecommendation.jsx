import { useEffect, useState } from "react";
import { extractErrorMessage } from "../api/client";
import { getIrrigationRecommendation } from "../api/recommendationApi";
import { askKrishiMitra } from "../components/FarmAssistant";
import AcresInput from "../components/tools/AcresInput";
import CropPicker from "../components/tools/CropPicker";
import LocationBox from "../components/tools/LocationBox";
import OptionCards from "../components/tools/OptionCards";
import SaveButton from "../components/tools/SaveButton";
import Step from "../components/tools/Step";
import ToolHero from "../components/tools/ToolHero";
import useFarmLocation from "../hooks/useFarmLocation";
import { CROP_BY_KEY, cropLabel, formatNumber } from "../lib/farmOptions";
import { readStored, STORAGE_KEYS, writeStored } from "../lib/storage";
import "../styles/analysisReport.css";
import "../styles/tools.css";
import "../styles/farmTools.css";

const STAGES = [
  { key: "initial", label: "Just sown", hint: "Seedlings, first weeks" },
  { key: "development", label: "Growing", hint: "Leaves spreading fast" },
  { key: "mid", label: "Flowering / fruiting", hint: "Needs the most water" },
  { key: "late", label: "Ripening", hint: "Close to harvest" },
];

const METHODS = [
  { key: "flood", icon: "fa-water", label: "Flood / furrow", hint: "Water flows in channels" },
  { key: "sprinkler", icon: "fa-shower", label: "Sprinkler", hint: "Sprayed from above" },
  { key: "drip", icon: "fa-droplet", label: "Drip", hint: "Drops at each plant" },
];

const ACTION = {
  irrigate: { title: "Water today", icon: "fa-faucet-drip", tone: "irrigate" },
  none: { title: "No need to water today", icon: "fa-circle-check", tone: "ok" },
  rain: { title: "Rain will water the field", icon: "fa-cloud-showers-heavy", tone: "rain" },
  wait: { title: "Wait — rain is coming", icon: "fa-hourglass-half", tone: "wait" },
};

const DAY_BADGE = {
  irrigate: { label: "Water", icon: "fa-faucet-drip" },
  rain: { label: "Rain", icon: "fa-cloud-rain" },
  wait: { label: "Wait", icon: "fa-hourglass-half" },
  none: { label: "OK", icon: "fa-check" },
};

function weekday(iso, index) {
  if (index === 0) return "Today";
  if (index === 1) return "Tomorrow";
  // "YYYY-MM-DD" alone parses as UTC midnight; add a time so it stays on the local day.
  return new Date(`${iso}T00:00`).toLocaleDateString(undefined, { weekday: "short", day: "numeric" });
}

function litres(value) {
  if (value >= 100000) return `${formatNumber(value / 100000, 1)} lakh L`;
  return `${formatNumber(value)} L`;
}

export default function IrrigationRecommendation() {
  const { coords, status: locationStatus, locate } = useFarmLocation();
  const [place, setPlace] = useState(null);
  const storedCrop = readStored(STORAGE_KEYS.crop);
  const [crop, setCrop] = useState(CROP_BY_KEY[storedCrop] ? storedCrop : null);
  const [stage, setStage] = useState("mid");
  const [method, setMethod] = useState(() => readStored("cropvision_irrigation_method", "flood"));
  const [acres, setAcres] = useState(() => readStored(STORAGE_KEYS.acres, "1"));

  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const point = place || coords;
  const inputs = point
    ? {
        latitude: point.latitude,
        longitude: point.longitude,
        crop_name: crop,
        stage,
        method,
        area_acres: parseFloat(acres) || 1,
      }
    : null;
  const inputsKey = JSON.stringify(inputs);

  useEffect(() => {
    if (!inputs) return undefined;
    let cancelled = false;
    const timer = setTimeout(() => {
      setLoading(true);
      setError("");
      getIrrigationRecommendation({ ...inputs, save: false })
        .then((res) => !cancelled && setData(res))
        .catch((err) => !cancelled && setError(extractErrorMessage(err)))
        .finally(() => !cancelled && setLoading(false));
    }, 400);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [inputsKey]);

  function chooseCrop(key) {
    setCrop(key);
    if (key) writeStored(STORAGE_KEYS.crop, key);
  }

  function chooseMethod(key) {
    setMethod(key);
    writeStored("cropvision_irrigation_method", key);
  }

  function changeAcres(value) {
    setAcres(value);
    writeStored(STORAGE_KEYS.acres, value);
  }

  const plan = data?.plan;
  const today = plan?.today;
  const action = ACTION[today?.action] || ACTION.none;
  const maxUse = plan ? Math.max(1, ...plan.days.map((d) => Math.max(d.crop_water_use_mm, d.rain_mm))) : 1;

  return (
    <div className="container page">
      <ToolHero badge="IRRIGATION PLANNER" title="Should I Water Today?" emoji="💧">
        Uses the live weather forecast at your farm and your crop's water need to tell you when to water, and how
        much — for today and the whole week.
      </ToolHero>

      <div className="tool-layout">
        <div className="card">
          <Step num={1} title="Your farm">
            <LocationBox status={locationStatus} place={place} onRetry={locate} onPickPlace={setPlace} />
          </Step>

          <Step num={2} title="Crop">
            <CropPicker value={crop} onChange={chooseCrop} allowAny />
          </Step>

          <Step num={3} title="Crop stage">
            <OptionCards label="Crop stage" options={STAGES} value={stage} onChange={setStage} columns={2} />
          </Step>

          <Step num={4} title="How you water">
            <OptionCards label="Watering method" options={METHODS} value={method} onChange={chooseMethod} />
          </Step>

          <Step num={5} title="Farm size">
            <AcresInput value={acres} onChange={changeAcres} />
          </Step>
        </div>

        <div className="card tool-results">
          {error && <div className="error-banner">{error}</div>}

          {!point && (
            <div className="tool-empty">
              <div className="tool-empty-icon">📍</div>
              <p className="tool-empty-title">Where is your farm?</p>
              <p>Allow location or search your village to get your watering plan.</p>
            </div>
          )}

          {point && !data && loading && (
            <div className="tool-empty">
              <div className="spinner" />
              <p>Checking the forecast for your farm...</p>
            </div>
          )}

          {plan && today && (
            <div className={loading ? "tool-updating" : ""}>
              <div className={`today-card tone-${action.tone}`}>
                <i className={`fa-solid ${action.icon}`}></i>
                <div>
                  <span className="today-kicker">
                    Today · {crop ? cropLabel(crop) : "Any crop"} · {METHODS.find((m) => m.key === method)?.label}
                  </span>
                  <h2>{action.title}</h2>
                  <p>{today.note}</p>
                  {today.action === "irrigate" && (
                    <div className="today-amount">
                      <div>
                        <strong>{today.gross_mm} mm</strong>
                        <span>of water</span>
                      </div>
                      <div>
                        <strong>{litres(today.litres_per_acre)}</strong>
                        <span>per acre</span>
                      </div>
                      <div>
                        <strong>{litres(today.litres_total)}</strong>
                        <span>for {plan.area_acres} acres</span>
                      </div>
                    </div>
                  )}
                  {today.action === "irrigate" && <p className="today-time">🕕 {plan.best_time}</p>}
                </div>
              </div>

              {data.current && (
                <div className="now-row">
                  <span>
                    <i className="fa-solid fa-temperature-half"></i> {Math.round(data.current.temperature_c)}°C
                  </span>
                  <span>
                    <i className="fa-solid fa-droplet"></i> {data.current.relative_humidity_pct}% humidity
                  </span>
                  <span>
                    <i className="fa-solid fa-seedling"></i> Root zone {today.root_zone_dryness_pct}% dry
                  </span>
                </div>
              )}

              {(data.advisory.heatwave_alert || data.advisory.heavy_rain_alert) && (
                <div className="tool-banner">
                  <i className="fa-solid fa-triangle-exclamation"></i>
                  <span>
                    {data.advisory.heatwave_alert && "Heatwave expected this week — water early morning and check more often. "}
                    {data.advisory.heavy_rain_alert && "Heavy rain expected this week — keep drainage channels clear."}
                  </span>
                </div>
              )}

              <h4 className="tool-section-title">
                <i className="fa-solid fa-calendar-week"></i> This week
              </h4>
              <div className="week-grid">
                {plan.days.map((d, i) => {
                  const badge = DAY_BADGE[d.action] || DAY_BADGE.none;
                  return (
                    <div key={d.date} className={`week-day action-${d.action}`}>
                      <span className="week-day-name">{weekday(d.date, i)}</span>
                      <div className="week-bars" title={`Crop uses ${d.crop_water_use_mm} mm · rain ${d.rain_mm} mm`}>
                        <div className="bar use" style={{ height: `${(d.crop_water_use_mm / maxUse) * 100}%` }}></div>
                        <div className="bar rain" style={{ height: `${(d.rain_mm / maxUse) * 100}%` }}></div>
                      </div>
                      <span className="week-badge">
                        <i className={`fa-solid ${badge.icon}`}></i> {badge.label}
                      </span>
                      {d.action === "irrigate" && <span className="week-mm">{d.gross_mm} mm</span>}
                      {d.rain_probability_pct != null && (
                        <span className="week-rain-chance">🌧 {d.rain_probability_pct}%</span>
                      )}
                    </div>
                  );
                })}
              </div>
              <div className="week-legend">
                <span>
                  <i className="legend use"></i> Crop water use
                </span>
                <span>
                  <i className="legend rain"></i> Rain
                </span>
              </div>

              <div className="week-summary">
                <div>
                  <strong>{plan.irrigations_this_week}</strong>
                  <span>waterings this week</span>
                </div>
                <div>
                  <strong>{litres(plan.week_litres_total)}</strong>
                  <span>water for your farm</span>
                </div>
                <div>
                  <strong>
                    {plan.week_crop_water_use_mm} / {plan.week_useful_rain_mm} mm
                  </strong>
                  <span>crop needs / useful rain</span>
                </div>
              </div>

              <div className="tool-actions">
                <button
                  type="button"
                  className="ar-action primary"
                  onClick={() =>
                    askKrishiMitra(
                      `Help me plan watering for my ${crop ? cropLabel(crop) : "crop"} this week using ${method} irrigation.`
                    )
                  }
                >
                  <i className="fa-solid fa-comment-dots"></i> Ask Krishi Mitra
                </button>
              </div>

              <div className="tool-footer">
                <SaveButton resetKey={inputsKey} onSave={() => getIrrigationRecommendation(inputs)} />
                <p>{plan.notes}</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
