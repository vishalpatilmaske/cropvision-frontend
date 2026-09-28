import { useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { extractErrorMessage } from "../api/client";
import { fetchDiseaseHistory } from "../api/diseaseApi";
import { getFertilizerRecommendation } from "../api/recommendationApi";
import { askKrishiMitra } from "../components/FarmAssistant";
import AcresInput from "../components/tools/AcresInput";
import CropPicker from "../components/tools/CropPicker";
import SaveButton from "../components/tools/SaveButton";
import Step from "../components/tools/Step";
import ToolHero from "../components/tools/ToolHero";
import { CROP_BY_KEY, cropEmoji, cropLabel, formatNumber } from "../lib/farmOptions";
import { readStored, STORAGE_KEYS, writeStored } from "../lib/storage";
import "../styles/analysisReport.css";
import "../styles/tools.css";
import "../styles/farmTools.css";

const PRODUCTS = {
  urea: { label: "Urea", formula: "46% N", color: "#e3f2fd", ink: "#0d47a1" },
  dap: { label: "DAP", formula: "18-46-0", color: "#fff3e0", ink: "#a2530a" },
  mop: { label: "MOP (Potash)", formula: "60% K₂O", color: "#fce4ec", ink: "#ad1457" },
};

const NUTRIENTS = [
  { key: "n", label: "Nitrogen (N)", placeholder: "e.g. 250" },
  { key: "p", label: "Phosphorus (P)", placeholder: "e.g. 18" },
  { key: "k", label: "Potassium (K)", placeholder: "e.g. 220" },
];

const RATING_STYLE = { low: "rating-low", medium: "rating-medium", high: "rating-high" };

function bagsText({ bags, loose_kg: loose, bag_kg: size }) {
  if (!bags) return `${loose} kg`;
  return `${bags} bag${bags > 1 ? "s" : ""}${loose ? ` + ${loose} kg` : ""} (${size} kg bags)`;
}

export default function FertilizerRecommendation() {
  const [params] = useSearchParams();
  const initialCrop = (params.get("crop") || readStored(STORAGE_KEYS.crop) || "wheat").toLowerCase();

  const [crop, setCrop] = useState(CROP_BY_KEY[initialCrop] ? initialCrop : "wheat");
  const [acres, setAcres] = useState(() => readStored(STORAGE_KEYS.acres, "1"));
  const [hasSoilCard, setHasSoilCard] = useState(false);
  const [soil, setSoil] = useState({ n: "", p: "", k: "" });

  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [deficiencyCheck, setDeficiencyCheck] = useState(null);

  const inputs = {
    crop_name: crop,
    area_acres: parseFloat(acres) || 1,
    soil_n: hasSoilCard && soil.n !== "" ? Number(soil.n) : null,
    soil_p: hasSoilCard && soil.p !== "" ? Number(soil.p) : null,
    soil_k: hasSoilCard && soil.k !== "" ? Number(soil.k) : null,
  };
  const inputsKey = JSON.stringify(inputs);

  useEffect(() => {
    let cancelled = false;
    const timer = setTimeout(() => {
      setLoading(true);
      setError("");
      getFertilizerRecommendation({ ...inputs, save: false })
        .then((data) => !cancelled && setResult(data.recommendation))
        .catch((err) => !cancelled && setError(extractErrorMessage(err)))
        .finally(() => !cancelled && setLoading(false));
    }, 300);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [inputsKey]);

  // Link to a recent health check that found a nutrient problem on this crop.
  useEffect(() => {
    let cancelled = false;
    setDeficiencyCheck(null);
    fetchDiseaseHistory({ page: 1, perPage: 1, cropName: crop, analysisType: "nutrient_deficiency" })
      .then((data) => {
        const item = data.items?.[0];
        const recent = item && Date.now() - new Date(item.created_at).getTime() < 30 * 24 * 3600 * 1000;
        if (!cancelled && recent) setDeficiencyCheck(item);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [crop]);

  function chooseCrop(key) {
    setCrop(key);
    writeStored(STORAGE_KEYS.crop, key);
  }

  function changeAcres(value) {
    setAcres(value);
    writeStored(STORAGE_KEYS.acres, value);
  }

  const label = cropLabel(crop);

  return (
    <div className="container page">
      <ToolHero badge="FERTILIZER PLAN" title="How Much Fertilizer to Buy?" emoji="🧪">
        Pick your crop and farm size — get the bags of Urea, DAP and Potash to buy, and exactly when to apply them.
      </ToolHero>

      <div className="tool-layout">
        <div className="card">
          <Step num={1} title="Crop">
            <CropPicker value={crop} onChange={chooseCrop} />
          </Step>

          <Step num={2} title="Farm size">
            <AcresInput value={acres} onChange={changeAcres} />
          </Step>

          <Step num={3} title="Soil Health Card" hint="optional">
            <label className="toggle-row">
              <input type="checkbox" checked={hasSoilCard} onChange={(e) => setHasSoilCard(e.target.checked)} />
              <span>
                I have a Soil Health Card / soil test report
                <small>Adjusts each nutrient ±25% to match your soil.</small>
              </span>
            </label>
            {hasSoilCard && (
              <>
                <div className="tool-input-row soil-card-inputs">
                  {NUTRIENTS.map((n) => {
                    const rating = result?.soil?.[n.key]?.rating;
                    return (
                      <label key={n.key}>
                        {n.label}
                        <input
                          type="number"
                          min="0"
                          value={soil[n.key]}
                          placeholder={n.placeholder}
                          onChange={(e) => setSoil((s) => ({ ...s, [n.key]: e.target.value }))}
                        />
                        {rating && <span className={`rating-chip ${RATING_STYLE[rating]}`}>{rating}</span>}
                      </label>
                    );
                  })}
                </div>
                <p className="tool-muted">Enter the "available" values in kg/ha, as printed on the card.</p>
              </>
            )}
          </Step>

          {deficiencyCheck && (
            <div className="tool-banner info">
              <i className="fa-solid fa-flask"></i>
              <span>
                Your health check on {new Date(deficiencyCheck.created_at).toLocaleDateString()} found{" "}
                <strong>{deficiencyCheck.analysis.name || "a nutrient deficiency"}</strong> on this crop.{" "}
                <Link to={`/history/${deficiencyCheck.id}`}>See the report</Link> — fix that first.
              </span>
            </div>
          )}
        </div>

        <div className="card tool-results">
          {error && <div className="error-banner">{error}</div>}
          {!result && loading && (
            <div className="tool-empty">
              <div className="spinner" />
            </div>
          )}

          {result && !result.shopping_list && <div className="notice-banner">{result.notes}</div>}

          {result?.shopping_list && (
            <div className={loading ? "tool-updating" : ""}>
              <div className="tool-results-head">
                <h3>
                  {cropEmoji(crop)} {label} · {result.area_acres} acre{result.area_acres === 1 ? "" : "s"}
                </h3>
                <span>{result.soil_test_used ? "Adjusted for your soil test" : "Standard recommended dose"}</span>
              </div>

              <h4 className="tool-section-title">
                <i className="fa-solid fa-cart-shopping"></i> What to buy
              </h4>
              <div className="shop-list">
                {result.shopping_list.map((item) => {
                  const meta = PRODUCTS[item.product];
                  return (
                    <div key={item.product} className="shop-item" style={{ "--chip": meta.color, "--ink": meta.ink }}>
                      <div className="shop-item-name">
                        <strong>{meta.label}</strong>
                        <span>{meta.formula}</span>
                      </div>
                      <div className="shop-item-qty">
                        <strong>{bagsText(item)}</strong>
                        <span>{formatNumber(item.kg_total, 1)} kg total</span>
                      </div>
                      <div className="shop-item-cost">~₹{formatNumber(item.approx_cost_rs)}</div>
                    </div>
                  );
                })}
                <div className="shop-total">
                  <span>Approximate cost</span>
                  <strong>~₹{formatNumber(result.approx_total_cost_rs)}</strong>
                </div>
              </div>

              <h4 className="tool-section-title">
                <i className="fa-solid fa-calendar-check"></i> When to apply
              </h4>
              <ol className="schedule">
                {result.schedule.map((step, i) => (
                  <li key={step.stage}>
                    <span className="schedule-dot">{i + 1}</span>
                    <div>
                      <strong>{step.stage}</strong>
                      <span className="schedule-when">{step.timing}</span>
                      <div className="schedule-products">
                        {step.products.map((p) => (
                          <span key={p.product} style={{ "--chip": PRODUCTS[p.product].color, "--ink": PRODUCTS[p.product].ink }}>
                            {PRODUCTS[p.product].label} {formatNumber(p.kg_total, 1)} kg
                            <small> ({formatNumber(p.kg_per_acre, 1)} kg/acre)</small>
                          </span>
                        ))}
                      </div>
                    </div>
                  </li>
                ))}
              </ol>

              <div className="nutrient-row">
                <span>Per acre:</span>
                <strong>N {result.nutrients_kg_per_acre.n} kg</strong>
                <strong>P₂O₅ {result.nutrients_kg_per_acre.p2o5} kg</strong>
                <strong>K₂O {result.nutrients_kg_per_acre.k2o} kg</strong>
              </div>

              <h4 className="tool-section-title">
                <i className="fa-solid fa-lightbulb"></i> Tips
              </h4>
              <ul className="tool-tips">
                {result.tips.map((t) => (
                  <li key={t}>{t}</li>
                ))}
              </ul>

              <div className="tool-actions">
                <button
                  type="button"
                  className="ar-action primary"
                  onClick={() =>
                    askKrishiMitra(
                      `I'm growing ${label} on ${result.area_acres} acres. Explain my fertilizer plan simply and any organic alternatives.`
                    )
                  }
                >
                  <i className="fa-solid fa-comment-dots"></i> Ask Krishi Mitra
                </button>
              </div>

              <div className="tool-footer">
                <SaveButton resetKey={inputsKey} onSave={() => getFertilizerRecommendation(inputs)} />
                <p>{result.notes}</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
