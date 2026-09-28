import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { extractErrorMessage } from "../api/client";
import { fetchFarms, getCropRecommendation } from "../api/recommendationApi";
import { askKrishiMitra } from "../components/FarmAssistant";
import OptionCards from "../components/tools/OptionCards";
import SaveButton from "../components/tools/SaveButton";
import SeasonWeatherBox from "../components/tools/SeasonWeatherBox";
import Step from "../components/tools/Step";
import ToolHero from "../components/tools/ToolHero";
import useFarmLocation from "../hooks/useFarmLocation";
import useSeasonWeather from "../hooks/useSeasonWeather";
import { cropEmoji, SEASONS, SOILS, upcomingSeason, WATER } from "../lib/farmOptions";
import { readStored, STORAGE_KEYS, writeStored } from "../lib/storage";
import "../styles/analysisReport.css";
import "../styles/tools.css";
import "../styles/cropRecommendation.css";

const FACTOR_META = {
  season: { icon: "fa-calendar-days", label: "Season" },
  soil: { icon: "fa-mound", label: "Soil" },
  water: { icon: "fa-droplet", label: "Water" },
  temperature: { icon: "fa-temperature-half", label: "Temperature" },
};

const FIT_LABELS = { excellent: "Excellent fit", good: "Good fit", fair: "Fair fit", poor: "Poor fit" };

export default function CropRecommendation() {
  const suggestedSeason = useMemo(() => upcomingSeason(), []);
  const { coords, status: locationStatus, locate } = useFarmLocation();

  const [season, setSeason] = useState(suggestedSeason);
  const [soil, setSoil] = useState(() => readStored(STORAGE_KEYS.soil));
  const [water, setWater] = useState(() => readStored(STORAGE_KEYS.water));
  const weather = useSeasonWeather(coords, locationStatus, season);
  const { rainfall, avgTemp } = weather;

  const [results, setResults] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // Pre-fill soil from a saved farm the first time.
  useEffect(() => {
    if (soil) return;
    fetchFarms()
      .then((data) => {
        const farmSoil = data.farms?.find((f) => f.soil_type)?.soil_type?.toLowerCase();
        if (farmSoil && SOILS.some((s) => s.key === farmSoil)) setSoil(farmSoil);
      })
      .catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const ready = Boolean(soil && water);
  const inputs = { soil_type: soil, season, irrigation: water, rainfall_mm: rainfall, avg_temp_c: avgTemp };
  const inputsKey = JSON.stringify(inputs);

  // Re-rank live whenever a choice changes (preview only -- nothing saved).
  useEffect(() => {
    if (!ready) return undefined;
    let cancelled = false;
    const timer = setTimeout(() => {
      setLoading(true);
      setError("");
      getCropRecommendation({ ...inputs, save: false })
        .then((data) => !cancelled && setResults(data.recommended_crops))
        .catch((err) => !cancelled && setError(extractErrorMessage(err)))
        .finally(() => !cancelled && setLoading(false));
    }, 300);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready, inputsKey]);

  function chooseSoil(key) {
    setSoil(key);
    writeStored(STORAGE_KEYS.soil, key);
  }

  function chooseWater(key) {
    setWater(key);
    writeStored(STORAGE_KEYS.water, key);
  }

  const soilLabel = SOILS.find((s) => s.key === soil)?.label;
  const waterLabel = WATER.find((w) => w.key === water)?.label;
  const [top, ...others] = results || [];

  return (
    <div className="container page">
      <ToolHero badge="CROP RECOMMENDATION" title="What Should I Sow?" emoji="🌱">
        Tell us your soil and water — we use your location and last season's real weather to rank the crops that
        suit your field best.
      </ToolHero>

      <div className="tool-layout">
        <div className="card">
          <Step num={1} title="Season">
            <OptionCards
              label="Season"
              options={SEASONS.map((s) => ({ ...s, badge: s.key === suggestedSeason ? "Next sowing" : undefined }))}
              value={season}
              onChange={setSeason}
            />
          </Step>

          <Step num={2} title="Your soil">
            <OptionCards
              label="Soil"
              options={SOILS}
              value={soil}
              onChange={chooseSoil}
              columns={3}
            />
          </Step>

          <Step num={3} title="Water available">
            <OptionCards label="Water" options={WATER} value={water} onChange={chooseWater} />
          </Step>

          <SeasonWeatherBox weather={weather} locationStatus={locationStatus} onLocate={locate} />
        </div>

        <div className="card tool-results">
          {error && <div className="error-banner">{error}</div>}

          {!ready && (
            <div className="tool-empty">
              <div className="tool-empty-icon">🌾</div>
              <p className="tool-empty-title">Your best crops will appear here</p>
              <p>
                {!soil && !water
                  ? "Pick your soil and water to start."
                  : !soil
                    ? "Now pick your soil type."
                    : "Now tell us how much water you have."}
              </p>
            </div>
          )}

          {ready && !results && loading && (
            <div className="tool-empty">
              <div className="spinner" />
            </div>
          )}

          {ready && top && (
            <div className={loading ? "tool-updating" : ""}>
              <div className="tool-results-head">
                <h3>Best for your field</h3>
                <span>
                  {soilLabel} soil · {waterLabel} · {SEASONS.find((s) => s.key === season)?.label}
                </span>
              </div>

              <TopCrop crop={top} season={season} onAsk={askKrishiMitra} />

              {others.length > 0 && (
                <>
                  <h4 className="tool-section-title">Other good options</h4>
                  <div className="cr-others">
                    {others.map((c, i) => (
                      <OtherCrop key={c.name} crop={c} rank={i + 2} onAsk={askKrishiMitra} />
                    ))}
                  </div>
                </>
              )}

              <div className="tool-footer">
                <SaveButton resetKey={inputsKey} onSave={() => getCropRecommendation(inputs)} />
                <p>
                  Rule-based guidance from soil, water, season and weather ranges — check with your local KVK for
                  varieties that suit your area.
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function ScoreRing({ score, fit }) {
  const r = 26;
  const c = 2 * Math.PI * r;
  return (
    <div className={`cr-ring fit-${fit}`}>
      <svg viewBox="0 0 64 64" aria-hidden="true">
        <circle className="track" cx="32" cy="32" r={r} />
        <circle className="value" cx="32" cy="32" r={r} strokeDasharray={c} strokeDashoffset={c * (1 - score / 100)} />
      </svg>
      <strong>{Math.round(score)}</strong>
    </div>
  );
}

function FactorList({ factors }) {
  return (
    <ul className="cr-factors">
      {factors.map((f) => (
        <li key={f.factor} className={f.ok ? "ok" : "warn"}>
          <i className={`fa-solid ${FACTOR_META[f.factor]?.icon || "fa-circle"}`}></i>
          <div className="cr-factor-body">
            <div className="cr-factor-top">
              <strong>{FACTOR_META[f.factor]?.label || f.factor}</strong>
              <span>
                {f.points}/{f.max}
              </span>
            </div>
            <div className="cr-factor-bar">
              <div style={{ width: `${(f.points / f.max) * 100}%` }}></div>
            </div>
            <small>{f.note}</small>
          </div>
        </li>
      ))}
    </ul>
  );
}

function CropFacts({ crop }) {
  return (
    <div className="cr-facts">
      <span>
        <i className="fa-regular fa-clock"></i> ~{crop.duration_days} days
      </span>
      <span>
        <i className="fa-solid fa-droplet"></i> {crop.water_need_mm[0]}–{crop.water_need_mm[1]} mm water
      </span>
      {crop.yield_per_acre_quintal != null && (
        <span>
          <i className="fa-solid fa-wheat-awn"></i> ~{crop.yield_per_acre_quintal} qtl/acre
        </span>
      )}
    </div>
  );
}

function TopCrop({ crop, season, onAsk }) {
  return (
    <div className={`cr-top fit-${crop.fit}`}>
      <div className="cr-top-head">
        <div className="cr-top-emoji">{cropEmoji(crop.name)}</div>
        <div className="cr-top-title">
          <span className={`cr-fit fit-${crop.fit}`}>{FIT_LABELS[crop.fit]}</span>
          <h2>{crop.label}</h2>
          <CropFacts crop={crop} />
        </div>
        <ScoreRing score={crop.suitability_score} fit={crop.fit} />
      </div>

      <FactorList factors={crop.factors} />

      {crop.warnings.length > 0 && (
        <div className="cr-warnings">
          {crop.warnings.map((w) => (
            <span key={w}>
              <i className="fa-solid fa-triangle-exclamation"></i> {w}
            </span>
          ))}
        </div>
      )}

      <div className="cr-actions">
        <button
          type="button"
          className="ar-action primary"
          onClick={() =>
            onAsk(`How do I grow ${crop.label} this ${season} season on my farm? Give me a simple step-by-step plan.`)
          }
        >
          <i className="fa-solid fa-comment-dots"></i> Ask Krishi Mitra how to grow it
        </button>
        <Link to={`/fertilizer-recommendation?crop=${encodeURIComponent(crop.name)}`} className="ar-action">
          <i className="fa-solid fa-flask"></i> Fertilizer plan
        </Link>
      </div>
    </div>
  );
}

function OtherCrop({ crop, rank, onAsk }) {
  const [open, setOpen] = useState(false);
  return (
    <div className={`cr-other${open ? " open" : ""}`}>
      <button type="button" className="cr-other-head" onClick={() => setOpen((o) => !o)} aria-expanded={open}>
        <span className="cr-other-rank">{rank}</span>
        <span className="cr-other-emoji">{cropEmoji(crop.name)}</span>
        <span className="cr-other-name">
          <strong>{crop.label}</strong>
          <small>{FIT_LABELS[crop.fit]}</small>
        </span>
        <span className={`cr-other-score fit-${crop.fit}`}>{Math.round(crop.suitability_score)}</span>
        <i className="fa-solid fa-chevron-down cr-other-chevron"></i>
      </button>
      {open && (
        <div className="cr-other-body">
          <CropFacts crop={crop} />
          <FactorList factors={crop.factors} />
          {crop.warnings.length > 0 && (
            <div className="cr-warnings">
              {crop.warnings.map((w) => (
                <span key={w}>
                  <i className="fa-solid fa-triangle-exclamation"></i> {w}
                </span>
              ))}
            </div>
          )}
          <button
            type="button"
            className="tool-link"
            onClick={() => onAsk(`Compare ${crop.label} with other crops for my farm this season.`)}
          >
            <i className="fa-solid fa-comment-dots"></i> Ask Krishi Mitra about {crop.label}
          </button>
        </div>
      )}
    </div>
  );
}
