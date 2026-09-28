import { lazy, Suspense, useCallback, useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { analyzeCropImage, fetchDiseaseHistory } from "../api/diseaseApi";
import { extractErrorMessage } from "../api/client";
import { useAuth } from "../context/AuthContext";
import AnalysisResult from "../components/AnalysisResult";
import useFarmLocation from "../hooks/useFarmLocation";
import { isSimulatable } from "../lib/cropSimulation";
import "../styles/diseaseDetection.css";

// The 3D simulation pulls in three.js, so it's only downloaded when a report needs it.
const DigitalTwin = lazy(() => import("../components/DigitalTwin"));

const ACCEPTED_TYPES = ["image/jpeg", "image/jpg", "image/png", "image/webp"];

const COMMON_CROPS = [
  "Tomato", "Potato", "Onion", "Chilli", "Brinjal", "Cotton", "Soybean", "Wheat", "Rice", "Maize",
  "Sugarcane", "Groundnut", "Grapes", "Pomegranate", "Banana", "Mango", "Cabbage", "Cauliflower",
];

const HOW_IT_WORKS = [
  { icon: "fa-camera", text: "Upload a photo" },
  { icon: "fa-wand-magic-sparkles", text: "AI detects crop, stage & problem" },
  { icon: "fa-file-medical", text: "Get your health report" },
];

const ANALYSIS_STEPS = [
  { icon: "fa-cloud-arrow-up", text: "Uploading photo" },
  { icon: "fa-cloud-sun-rain", text: "Checking local weather", needsLocation: true },
  { icon: "fa-leaf", text: "Identifying crop & growth stage" },
  { icon: "fa-microscope", text: "Checking leaves for symptoms" },
  { icon: "fa-file-medical", text: "Writing your health report" },
];

const TYPE_LABELS = {
  healthy: "Healthy",
  disease: "Disease",
  pest: "Pest",
  nutrient_deficiency: "Nutrient deficiency",
  unknown: "Unclear",
};

const TIPS = [
  { icon: "fa-sun", text: "Shoot in good natural daylight, avoid harsh shadows or flash." },
  { icon: "fa-up-right-and-down-left-from-center", text: "Get close — fill the frame with the affected leaf or area." },
  { icon: "fa-crop-simple", text: "Keep the photo in focus so spots, texture, and color are clear." },
];

function useGreeting() {
  const hour = new Date().getHours();
  if (hour < 12) return "Good morning";
  if (hour < 17) return "Good afternoon";
  return "Good evening";
}

export default function DiseaseDetection() {
  const { user } = useAuth();
  const greeting = useGreeting();
  const { coords, status: locationStatus, locate } = useFarmLocation();
  const galleryInputRef = useRef(null);
  const cameraInputRef = useRef(null);
  const digitalTwinRef = useRef(null);
  const resultRef = useRef(null);
  const [file, setFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState(null);
  const [cropName, setCropName] = useState("");
  const [additionalContext, setAdditionalContext] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState(null);
  const [dragging, setDragging] = useState(false);
  const [stepIndex, setStepIndex] = useState(0);
  const [recent, setRecent] = useState([]);

  const steps = ANALYSIS_STEPS.filter((s) => !s.needsLocation || coords);

  const loadRecent = useCallback(() => {
    fetchDiseaseHistory({ page: 1, perPage: 4 })
      .then((data) => setRecent(data.items || []))
      .catch(() => setRecent([]));
  }, []);

  useEffect(() => {
    loadRecent();
  }, [loadRecent]);

  useEffect(() => {
    if (!loading) return undefined;
    setStepIndex(0);
    const timer = setInterval(() => setStepIndex((i) => Math.min(i + 1, steps.length - 1)), 2500);
    return () => clearInterval(timer);
  }, [loading, steps.length]);

  useEffect(() => () => previewUrl && URL.revokeObjectURL(previewUrl), [previewUrl]);

  async function runAnalysis(imageFile) {
    setLoading(true);
    setError("");
    setResult(null);
    if (window.innerWidth < 800) {
      setTimeout(() => resultRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }), 50);
    }
    try {
      const data = await analyzeCropImage({ file: imageFile, cropName, additionalContext, coords });
      setResult(data);
      loadRecent();
    } catch (err) {
      setError(extractErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }

  // Picking a photo starts the whole check right away -- no extra button to press.
  function handleFileChange(selectedFile) {
    if (!selectedFile || loading) return;
    if (!ACCEPTED_TYPES.includes(selectedFile.type)) {
      setError("Unsupported file type. Please upload a JPG, JPEG, PNG, or WEBP image.");
      return;
    }
    setFile(selectedFile);
    setPreviewUrl(URL.createObjectURL(selectedFile));
    runAnalysis(selectedFile);
  }

  function resetForm() {
    setFile(null);
    setPreviewUrl(null);
    setResult(null);
    setError("");
  }

  return (
    <div className="container page disease-page">
      <div className="disease-hero">
        <div className="disease-hero-text">
          {user?.name && (
            <p className="disease-hero-greeting">
              {greeting}, {user.name.split(" ")[0]} 👋
            </p>
          )}
          <div className="badge">DISEASE &amp; PEST DETECTION</div>
          <h1>Check Your Crop Health</h1>
          <p>Just upload a photo of the leaf or plant — the AI does the rest and gives you a full health report.</p>
        </div>
        <div className="disease-hero-icon-wrap">
          <div className="disease-hero-ring"></div>
          <div className="disease-hero-icon">
            <i className="fa-solid fa-leaf"></i>
          </div>
          <div className="disease-hero-live">
            <span className="dot"></span> AI Ready
          </div>
        </div>
        <i className="fa-solid fa-seedling disease-hero-deco d1"></i>
        <i className="fa-solid fa-leaf disease-hero-deco d2"></i>
      </div>

      <div className="grid-2">
        <div className="card upload-card">
          <div className="upload-card-head">
            <div className="upload-card-title">
              <i className="fa-solid fa-camera"></i> Upload Photo
            </div>
            <LocationChip status={locationStatus} onRetry={locate} />
          </div>

          {error && <div className="error-banner">{error}</div>}

          <div
            className={`dz${dragging ? " dragging" : ""}${loading ? " busy" : ""}`}
            onClick={() => !loading && galleryInputRef.current?.click()}
            onDragOver={(e) => {
              e.preventDefault();
              setDragging(true);
            }}
            onDragLeave={() => setDragging(false)}
            onDrop={(e) => {
              e.preventDefault();
              setDragging(false);
              handleFileChange(e.dataTransfer.files?.[0]);
            }}
          >
            {previewUrl ? (
              <div className="dz-preview-wrap">
                <img src={previewUrl} alt="Selected crop preview" />
                {loading ? (
                  <div className="dz-scanning">
                    <div className="dz-scan-line"></div>
                    <span>
                      <i className="fa-solid fa-spinner fa-spin"></i> Analyzing...
                    </span>
                  </div>
                ) : (
                  <span className="dz-change-hint">
                    <i className="fa-solid fa-arrows-rotate"></i> Tap to check a different photo
                  </span>
                )}
              </div>
            ) : (
              <>
                <div className="dz-icon">
                  <i className="fa-solid fa-cloud-arrow-up"></i>
                </div>
                <div className="dz-title">Click or drag a photo here</div>
                <div className="dz-hint">The check starts automatically · JPG, PNG or WEBP</div>
              </>
            )}
          </div>

          {!file && (
            <div className="photo-source-row">
              <button type="button" className="btn btn-primary" onClick={() => cameraInputRef.current?.click()}>
                <i className="fa-solid fa-camera"></i> Take Photo
              </button>
              <button type="button" className="btn btn-ghost" onClick={() => galleryInputRef.current?.click()}>
                <i className="fa-solid fa-images"></i> Choose from Gallery
              </button>
            </div>
          )}

          <input
            ref={galleryInputRef}
            type="file"
            accept="image/jpeg,image/jpg,image/png,image/webp"
            style={{ display: "none" }}
            onChange={(e) => {
              handleFileChange(e.target.files?.[0]);
              e.target.value = "";
            }}
          />
          <input
            ref={cameraInputRef}
            type="file"
            accept="image/*"
            capture="environment"
            style={{ display: "none" }}
            onChange={(e) => {
              handleFileChange(e.target.files?.[0]);
              e.target.value = "";
            }}
          />

          <ol className="how-it-works">
            {HOW_IT_WORKS.map((step, i) => (
              <li key={step.text}>
                <span className="how-it-works-num">{i + 1}</span>
                <span>{step.text}</span>
              </li>
            ))}
          </ol>

          <details className="details-panel">
            <summary>
              <span>
                <i className="fa-solid fa-sliders"></i> Add details <em>(optional — improves accuracy)</em>
              </span>
              <i className="fa-solid fa-chevron-down details-chevron"></i>
            </summary>
            <div className="details-body">
              <div className="form-group">
                <label>Crop name</label>
                <div className="field-icon-group">
                  <i className="fa-solid fa-seedling"></i>
                  <input
                    value={cropName}
                    onChange={(e) => setCropName(e.target.value)}
                    placeholder="Detected automatically — e.g. Tomato"
                    list="common-crops"
                  />
                  <datalist id="common-crops">
                    {COMMON_CROPS.map((c) => (
                      <option key={c} value={c} />
                    ))}
                  </datalist>
                </div>
              </div>
              <div className="form-group">
                <label>What have you noticed?</label>
                <div className="field-icon-group">
                  <i className="fa-solid fa-note-sticky icon-top"></i>
                  <textarea
                    rows={3}
                    value={additionalContext}
                    onChange={(e) => setAdditionalContext(e.target.value)}
                    placeholder="e.g. Spots started 5 days ago after heavy rain, spreading to nearby plants"
                  />
                </div>
              </div>
              {file && (
                <button
                  type="button"
                  className="btn btn-secondary recheck-btn"
                  onClick={() => runAnalysis(file)}
                  disabled={loading}
                >
                  <i className="fa-solid fa-rotate"></i> Re-check with these details
                </button>
              )}
            </div>
          </details>

          {file && (
            <button type="button" className="btn btn-ghost new-check-btn" onClick={resetForm} disabled={loading}>
              <i className="fa-solid fa-plus"></i> Check another photo
            </button>
          )}
        </div>

        <div className="card result-card" ref={resultRef}>
          {loading && (
            <div className="result-loading">
              {previewUrl && <img className="result-loading-photo" src={previewUrl} alt="" />}
              <p className="result-loading-title">Checking your crop's health...</p>
              <p>This usually takes 10–20 seconds.</p>
              <ol className="analysis-steps">
                {steps.map((step, i) => (
                  <li key={step.text} className={i < stepIndex ? "done" : i === stepIndex ? "active" : ""}>
                    <span className="analysis-step-icon">
                      <i
                        className={`fa-solid ${
                          i < stepIndex ? "fa-check" : i === stepIndex ? "fa-spinner fa-spin" : step.icon
                        }`}
                      ></i>
                    </span>
                    {step.text}
                  </li>
                ))}
              </ol>
            </div>
          )}

          {!loading && !result && (
            <div className="result-empty">
              <div className="result-empty-icon">
                <i className="fa-solid fa-microscope"></i>
              </div>
              <p className="result-empty-title">{error ? "Let's try that again" : "Your report will appear here"}</p>
              <p className="result-empty-subtitle">
                {error
                  ? "Upload a clear, close-up photo of the affected leaf."
                  : "Upload a crop photo — the AI identifies the crop, spots any disease or pest, checks your local weather and writes a full treatment plan."}
              </p>

              <div className="tips-panel">
                <div className="tips-panel-title">
                  <i className="fa-solid fa-wand-magic-sparkles"></i> Tips for a great result
                </div>
                <ul className="tips-list">
                  {TIPS.map((tip) => (
                    <li key={tip.text}>
                      <span className="tips-icon">
                        <i className={`fa-solid ${tip.icon}`}></i>
                      </span>
                      <span>{tip.text}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          )}

          {!loading && result && (
            <AnalysisResult
              result={result}
              imageUrl={previewUrl}
              onSimulateIn3D={isSimulatable(result) ? () => digitalTwinRef.current?.show() : undefined}
            />
          )}
        </div>
      </div>

      {recent.length > 0 && (
        <section className="recent-checks">
          <div className="recent-checks-head">
            <h3>
              <i className="fa-solid fa-clock-rotate-left"></i> Your recent checks
            </h3>
            <Link to="/history">View all →</Link>
          </div>
          <div className="recent-checks-grid">
            {recent.map((item) => (
              <Link key={item.id} to={`/history/${item.id}`} className="recent-check">
                <div className="recent-check-top">
                  <span className={`tag tag-${item.analysis.type}`}>
                    {TYPE_LABELS[item.analysis.type] || item.analysis.type}
                  </span>
                  {item.report?.health_score != null && (
                    <span className="recent-check-score">{Math.round(item.report.health_score)}/100</span>
                  )}
                </div>
                <strong>{item.analysis.name || TYPE_LABELS[item.analysis.type]}</strong>
                <span className="recent-check-meta">
                  {item.crop?.name || "Unknown crop"} · {new Date(item.created_at).toLocaleDateString()}
                </span>
              </Link>
            ))}
          </div>
        </section>
      )}

      {!loading && isSimulatable(result) && (
        <Suspense fallback={null}>
          <DigitalTwin key={result.id} ref={digitalTwinRef} result={result} />
        </Suspense>
      )}
    </div>
  );
}

function LocationChip({ status, onRetry }) {
  if (status === "locating") {
    return (
      <span className="location-chip">
        <i className="fa-solid fa-spinner fa-spin"></i> Finding location
      </span>
    );
  }
  if (status === "on") {
    return (
      <span className="location-chip on" title="Local weather will be included in your report">
        <i className="fa-solid fa-location-dot"></i> Weather included
      </span>
    );
  }
  return (
    <button
      type="button"
      className="location-chip off"
      onClick={onRetry}
      title="Allow location access to include local weather in the report"
    >
      <i className="fa-solid fa-location-crosshairs"></i> Add weather
    </button>
  );
}
