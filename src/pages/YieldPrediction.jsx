import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { extractErrorMessage } from "../api/client";
import { getYieldPrediction } from "../api/recommendationApi";
import { askKrishiMitra } from "../components/FarmAssistant";
import AcresInput from "../components/tools/AcresInput";
import CropPicker from "../components/tools/CropPicker";
import OptionCards from "../components/tools/OptionCards";
import SaveButton from "../components/tools/SaveButton";
import SeasonWeatherBox from "../components/tools/SeasonWeatherBox";
import Step from "../components/tools/Step";
import ToolHero from "../components/tools/ToolHero";
import useFarmLocation from "../hooks/useFarmLocation";
import useSeasonWeather from "../hooks/useSeasonWeather";
import { CROP_BY_KEY, cropEmoji, cropLabel, formatNumber, SOILS, upcomingSeason, WATER } from "../lib/farmOptions";
import { readStored, STORAGE_KEYS, writeStored } from "../lib/storage";
import "../styles/analysisReport.css";
import "../styles/tools.css";
import "../styles/farmTools.css";

const CARE = [
  { key: "basic", label: "Basic", hint: "Little fertilizer or weeding" },
  { key: "average", label: "Average", hint: "Some inputs, not always on time" },
  { key: "good", label: "Good", hint: "Timely seed, fertilizer, weeding, pest control" },
];

const FACTOR_META = {
  soil: { icon: "fa-mound", label: "Soil" },
  water: { icon: "fa-droplet", label: "Water" },
  care: { icon: "fa-hand-holding-heart", label: "Care" },
  health: { icon: "fa-heart-pulse", label: "Crop health" },
};

// What to do about the factor holding yield back the most.
const IMPROVE_TIPS = {
  water: { text: "Water is your biggest limit. Plan irrigation for critical stages (flowering, grain filling).", link: "/irrigation-recommendation", cta: "Plan irrigation" },
  care: { text: "Timely fertilizer and weeding can add the most. Start with a proper fertilizer schedule.", link: "/fertilizer-recommendation", cta: "Get fertilizer plan" },
  health: { text: "Crop health is pulling yield down. Treat the problem from your latest health check.", link: "/disease-detection", cta: "Check crop health" },
  soil: { text: "Your soil type limits yield. Add compost / farmyard manure to improve it over time.", link: null },
};

export default function YieldPrediction() {
  const season = useMemo(() => upcomingSeason(), []);
  const { coords, status: locationStatus, locate } = useFarmLocation();
  const weather = useSeasonWeather(coords, locationStatus, season);

  const storedCrop = readStored(STORAGE_KEYS.crop);
  const [crop, setCrop] = useState(CROP_BY_KEY[storedCrop] ? storedCrop : "wheat");
  const [acres, setAcres] = useState(() => readStored(STORAGE_KEYS.acres, "1"));
  const [soil, setSoil] = useState(() => readStored(STORAGE_KEYS.soil));
  const [water, setWater] = useState(() => readStored(STORAGE_KEYS.water));
  const [care, setCare] = useState(() => readStored("cropvision_care", "average"));
  const [price, setPrice] = useState(() => readStored(STORAGE_KEYS.price(crop), ""));

  const [estimate, setEstimate] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    setPrice(readStored(STORAGE_KEYS.price(crop), ""));
  }, [crop]);

  const inputs = {
    crop_name: crop,
    area_acres: parseFloat(acres) || 1,
    soil_type: soil,
    irrigation: water,
    management: care,
    season,
    rainfall_mm: weather.rainfall,
    use_health_check: true,
  };
  const inputsKey = JSON.stringify(inputs);

  useEffect(() => {
    let cancelled = false;
    const timer = setTimeout(() => {
      setLoading(true);
      setError("");
      getYieldPrediction({ ...inputs, save: false })
        .then((data) => !cancelled && setEstimate(data.estimated_yield))
        .catch((err) => !cancelled && setError(extractErrorMessage(err)))
        .finally(() => !cancelled && setLoading(false));
    }, 300);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [inputsKey]);

  function remember(key, setter) {
    return (value) => {
      setter(value);
      writeStored(key, value);
    };
  }

  const label = cropLabel(crop);
  const days = CROP_BY_KEY[crop]?.days;
  const priceNum = parseFloat(price) || 0;
  const worst = estimate?.factors?.length
    ? [...estimate.factors].sort((a, b) => a.multiplier - b.multiplier)[0]
    : null;
  const tip = worst && worst.multiplier < 0.95 ? IMPROVE_TIPS[worst.factor] : null;
  const rangePos = estimate?.value
    ? ((estimate.value - estimate.range_low) / (estimate.range_high - estimate.range_low)) * 100
    : 50;

  return (
    <div className="container page">
      <ToolHero badge="YIELD ESTIMATE" title="How Much Will I Harvest?" emoji="📈">
        An estimate built from your crop, soil, water, care and your latest crop health check — with what's holding
        your yield back and how to fix it.
      </ToolHero>

      <div className="tool-layout">
        <div className="card">
          <Step num={1} title="Crop">
            <CropPicker value={crop} onChange={remember(STORAGE_KEYS.crop, setCrop)} />
          </Step>

          <Step num={2} title="Farm size">
            <AcresInput value={acres} onChange={remember(STORAGE_KEYS.acres, setAcres)} />
          </Step>

          <Step num={3} title="Soil" hint="optional">
            <OptionCards label="Soil" options={SOILS} value={soil} onChange={remember(STORAGE_KEYS.soil, setSoil)} />
          </Step>

          <Step num={4} title="Water available" hint="optional">
            <OptionCards label="Water" options={WATER} value={water} onChange={remember(STORAGE_KEYS.water, setWater)} />
          </Step>

          <Step num={5} title="How well is the crop looked after?">
            <OptionCards label="Care level" options={CARE} value={care} onChange={remember("cropvision_care", setCare)} />
          </Step>

          <SeasonWeatherBox weather={weather} locationStatus={locationStatus} onLocate={locate} />
        </div>

        <div className="card tool-results">
          {error && <div className="error-banner">{error}</div>}
          {!estimate && loading && (
            <div className="tool-empty">
              <div className="spinner" />
            </div>
          )}

          {estimate && estimate.value == null && <div className="notice-banner">{estimate.notes}</div>}

          {estimate?.value != null && (
            <div className={loading ? "tool-updating" : ""}>
              <div className="yield-hero">
                <span className="yield-kicker">
                  {cropEmoji(crop)} {label} · {estimate.area_acres} acre{estimate.area_acres === 1 ? "" : "s"}
                </span>
                <div className="yield-big">
                  <strong>{formatNumber(estimate.value, 1)}</strong>
                  <span>quintals expected</span>
                </div>
                <p className="yield-per-acre">≈ {estimate.per_acre} quintals per acre</p>
                <div className="yield-range">
                  <div className="yield-range-bar">
                    <span className="yield-range-marker" style={{ left: `${rangePos}%` }}></span>
                  </div>
                  <div className="yield-range-labels">
                    <span>Low {formatNumber(estimate.range_low, 1)}</span>
                    <span>High {formatNumber(estimate.range_high, 1)}</span>
                  </div>
                </div>
              </div>

              <h4 className="tool-section-title">
                <i className="fa-solid fa-scale-balanced"></i> How we got this
              </h4>
              <ul className="yield-steps">
                <li>
                  <span>Typical well-managed {label}</span>
                  <strong>{estimate.baseline_per_acre} qtl/acre</strong>
                </li>
                {estimate.factors.map((f) => (
                  <li key={f.factor} className={f.change_pct < 0 ? "down" : f.change_pct > 0 ? "up" : ""}>
                    <span>
                      <i className={`fa-solid ${FACTOR_META[f.factor]?.icon || "fa-circle"}`}></i>{" "}
                      {FACTOR_META[f.factor]?.label}: {f.note}
                    </span>
                    <strong>
                      {f.change_pct > 0 ? "+" : ""}
                      {f.change_pct}%
                    </strong>
                  </li>
                ))}
                <li className="total">
                  <span>Your estimate</span>
                  <strong>{estimate.per_acre} qtl/acre</strong>
                </li>
              </ul>

              {estimate.health_check ? (
                <p className="tool-muted">
                  Includes your health check from {new Date(estimate.health_check.date).toLocaleDateString()} (
                  {estimate.health_check.condition}, {Math.round(estimate.health_check.health_score)}/100).{" "}
                  <Link to={`/history/${estimate.health_check.id}`}>View report</Link>
                </p>
              ) : (
                <p className="tool-muted">
                  No recent health check for {label}.{" "}
                  <Link to="/disease-detection">Check crop health</Link> to include it.
                </p>
              )}

              {tip && (
                <div className="tool-banner info">
                  <i className="fa-solid fa-arrow-trend-up"></i>
                  <span>
                    <strong>Biggest gain:</strong> {tip.text} {tip.link && <Link to={tip.link}>{tip.cta} →</Link>}
                  </span>
                </div>
              )}

              <h4 className="tool-section-title">
                <i className="fa-solid fa-indian-rupee-sign"></i> Income
              </h4>
              <div className="income-row">
                <label>
                  Mandi price
                  <span>
                    ₹
                    <input
                      type="number"
                      min="0"
                      step="50"
                      value={price}
                      placeholder="per quintal"
                      onChange={(e) => {
                        setPrice(e.target.value);
                        writeStored(STORAGE_KEYS.price(crop), e.target.value);
                      }}
                    />
                    / qtl
                  </span>
                </label>
                {priceNum > 0 ? (
                  <div className="income-value">
                    <strong>₹{formatNumber(estimate.value * priceNum)}</strong>
                    <span>
                      ₹{formatNumber(estimate.range_low * priceNum)} – ₹{formatNumber(estimate.range_high * priceNum)}
                    </span>
                  </div>
                ) : (
                  <p className="tool-muted">Enter today's price at your mandi to see your expected income.</p>
                )}
              </div>

              {days && (
                <p className="tool-muted">
                  <i className="fa-regular fa-clock"></i> {label} is usually ready about {days} days after sowing.
                </p>
              )}

              <div className="tool-actions">
                <button
                  type="button"
                  className="ar-action primary"
                  onClick={() =>
                    askKrishiMitra(
                      `My ${label} yield estimate is ${estimate.per_acre} quintals per acre. How can I increase it this season?`
                    )
                  }
                >
                  <i className="fa-solid fa-comment-dots"></i> Ask how to increase yield
                </button>
              </div>

              <div className="tool-footer">
                <SaveButton resetKey={inputsKey} onSave={() => getYieldPrediction(inputs)} />
                <p>{estimate.notes}</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
