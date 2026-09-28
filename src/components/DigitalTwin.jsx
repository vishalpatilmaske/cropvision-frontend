import { forwardRef, useEffect, useImperativeHandle, useMemo, useRef, useState } from "react";
import * as THREE from "three";
import { fetchYieldBaseline } from "../api/recommendationApi";
import { buildSimulation, formatDayDate, SIM_DAYS } from "../lib/cropSimulation";
import "../styles/digitalTwin.css";

// How the 3D leaf looks for the problem in the report.
const LOOKS = {
  leaf_spot: { rate: 1.0, lesionColor: "#3e2723", haloColor: "#ffeb3b" },
  rust: { rate: 1.1, lesionColor: "#8d3002", haloColor: "#ffa726" },
  blight: { rate: 1.2, lesionColor: "#212121", haloColor: "#fff176" },
  mildew: { rate: 1.0, lesionColor: "#f5f5f5", haloColor: "#e8f5e9" },
  pest: { rate: 0.8, lesionColor: "#4e342e", haloColor: "#d7ccc8" },
  chlorosis: { rate: 1.0, lesionColor: null, haloColor: "#fff59d" },
};

const SPORE_SITES = [
  { x: 0.45, y: 0.35, s: 1.0 },
  { x: 0.6, y: 0.45, s: 0.85 },
  { x: 0.38, y: 0.55, s: 1.1 },
  { x: 0.65, y: 0.6, s: 0.75 },
  { x: 0.48, y: 0.72, s: 0.9 },
  { x: 0.32, y: 0.3, s: 0.6 },
  { x: 0.62, y: 0.26, s: 0.7 },
  { x: 0.5, y: 0.82, s: 0.5 },
  { x: 0.28, y: 0.42, s: 0.8 },
  { x: 0.7, y: 0.38, s: 0.75 },
];

const TICK_DAYS = [0, 3, 7, 14];

const URGENCY_TEXT = {
  immediate: { value: "Act today", tone: "text-red" },
  within_week: { value: "This week", tone: "text-red" },
  monitor: { value: "Monitor", tone: "" },
  none: { value: "No action", tone: "text-green" },
};

function lookForAnalysis(analysis) {
  if (analysis.type === "pest") return "pest";
  if (analysis.type === "nutrient_deficiency") return "chlorosis";
  const name = (analysis.name || "").toLowerCase();
  if (name.includes("rust")) return "rust";
  if (name.includes("blight") || name.includes("anthracnose")) return "blight";
  if (name.includes("mildew") || name.includes("powdery")) return "mildew";
  return "leaf_spot";
}

function stageLabel(pct) {
  if (pct < 15) return "Early stage";
  if (pct < 40) return "Spreading";
  if (pct < 70) return "Severe";
  return "Critical";
}

function readStored(key, fallback) {
  try {
    return localStorage.getItem(key) ?? fallback;
  } catch {
    return fallback;
  }
}

function writeStored(key, value) {
  try {
    localStorage.setItem(key, value);
  } catch {
    // Storage blocked -- the value just won't be remembered.
  }
}

function redrawLeafTexture(engine, { affectedPct, isTreated, lookKey }) {
  if (!engine) return;
  const { ctx, texCanvas, dynamicTexture } = engine;
  const W = texCanvas.width;
  const H = texCanvas.height;

  const baseGrad = ctx.createLinearGradient(0, 0, 0, H);
  baseGrad.addColorStop(0, "#81c784");
  baseGrad.addColorStop(0.5, "#388e3c");
  baseGrad.addColorStop(1, "#2e7d32");
  ctx.fillStyle = baseGrad;
  ctx.fillRect(0, 0, W, H);

  ctx.strokeStyle = "#a5d6a7";
  ctx.lineWidth = 5;
  ctx.beginPath();
  ctx.moveTo(W / 2, H);
  ctx.lineTo(W / 2, 20);
  ctx.stroke();

  ctx.lineWidth = 2.5;
  ctx.strokeStyle = "rgba(165, 214, 167, 0.7)";
  for (let y = 80; y < H - 50; y += 45) {
    ctx.beginPath();
    ctx.moveTo(W / 2, y);
    ctx.quadraticCurveTo(W * 0.35, y - 25, W * 0.15, y - 45);
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(W / 2, y);
    ctx.quadraticCurveTo(W * 0.65, y - 25, W * 0.85, y - 45);
    ctx.stroke();
  }

  const look = LOOKS[lookKey] || LOOKS.leaf_spot;
  const pct = Math.max(0, Math.min(100, affectedPct));

  // Overall yellowing grows with the affected area.
  const chlorosisOpacity = Math.min(0.7, (pct / 100) * (lookKey === "chlorosis" ? 1.1 : 0.8));
  ctx.fillStyle = `rgba(230, 238, 156, ${chlorosisOpacity})`;
  ctx.fillRect(0, 0, W, H);

  // More sites and bigger lesions as the affected area grows.
  const visibleSites = SPORE_SITES.slice(0, Math.max(1, Math.min(SPORE_SITES.length, Math.ceil(pct / 9))));
  visibleSites.forEach((site) => {
    const cx = site.x * W;
    const cy = site.y * H;
    const baseRadius = (6 + pct * 0.55) * site.s * look.rate;

    const haloGrad = ctx.createRadialGradient(cx, cy, baseRadius * 0.3, cx, cy, baseRadius * 1.5);
    haloGrad.addColorStop(0, look.haloColor);
    haloGrad.addColorStop(0.6, "rgba(255, 235, 59, 0.4)");
    haloGrad.addColorStop(1, "rgba(255, 235, 59, 0)");
    ctx.fillStyle = haloGrad;
    ctx.beginPath();
    ctx.arc(cx, cy, baseRadius * 1.5, 0, Math.PI * 2);
    ctx.fill();

    if (lookKey === "mildew") {
      ctx.fillStyle = "rgba(255, 255, 255, 0.85)";
      ctx.beginPath();
      ctx.arc(cx, cy, baseRadius * 0.8, 0, Math.PI * 2);
      ctx.fill();
    } else if (lookKey === "pest") {
      // Chewed holes with ragged brown edges.
      ctx.fillStyle = look.lesionColor;
      ctx.beginPath();
      ctx.ellipse(cx, cy, baseRadius * 0.75, baseRadius * 0.5, site.s, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = "#0b1a0e";
      ctx.beginPath();
      ctx.ellipse(cx, cy, baseRadius * 0.55, baseRadius * 0.32, site.s, 0, Math.PI * 2);
      ctx.fill();
    } else if (look.lesionColor) {
      ctx.fillStyle = look.lesionColor;
      ctx.beginPath();
      ctx.arc(cx, cy, baseRadius * 0.7, 0, Math.PI * 2);
      ctx.fill();

      ctx.strokeStyle = "rgba(0, 0, 0, 0.4)";
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.arc(cx, cy, baseRadius * 0.4, 0, Math.PI * 2);
      ctx.stroke();
    }

    if (isTreated) {
      ctx.strokeStyle = "#4caf50";
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(cx, cy, baseRadius * 0.8, 0, Math.PI * 2);
      ctx.stroke();
    }
  });

  dynamicTexture.needsUpdate = true;
}

// A 14-day projection built from a real crop health report (`result`):
// no report, no simulation. See lib/cropSimulation.js for the model.
const DigitalTwin = forwardRef(function DigitalTwin({ result }, ref) {
  const containerRef = useRef(null);
  const canvasRef = useRef(null);
  const sectionRef = useRef(null);
  const engineRef = useRef(null);
  const autoRotateRef = useRef(true);

  const { analysis, crop, report = {}, weather } = result;
  const cropKey = (crop?.name || "").trim().toLowerCase();

  const [currentDay, setCurrentDay] = useState(7);
  const [isTreated, setIsTreated] = useState(false);
  const [autoRotate, setAutoRotate] = useState(true);
  const [farmAcres, setFarmAcres] = useState(() => readStored("cropvision_acres", "1"));
  const [pricePerQuintal, setPricePerQuintal] = useState(() => readStored(`cropvision_price_${cropKey}`, ""));
  const [yieldPerAcre, setYieldPerAcre] = useState("");

  const sim = useMemo(() => buildSimulation(result), [result]);
  const point = sim.days[currentDay];
  const lookKey = lookForAnalysis(analysis);
  const affectedPct = isTreated ? point.treatedPct : point.untreatedPct;

  const drawStateRef = useRef(null);
  drawStateRef.current = { affectedPct, isTreated, lookKey };

  useImperativeHandle(ref, () => ({
    show() {
      sectionRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    },
  }));

  // Pre-fill the usual yield for the detected crop (farmer can edit it).
  useEffect(() => {
    setYieldPerAcre("");
    if (!cropKey) return undefined;
    let cancelled = false;
    fetchYieldBaseline(cropKey)
      .then((data) => {
        if (!cancelled && data.per_acre_quintal != null) setYieldPerAcre(String(data.per_acre_quintal));
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [cropKey]);

  useEffect(() => {
    setPricePerQuintal(readStored(`cropvision_price_${cropKey}`, ""));
  }, [cropKey]);

  // Mount the Three.js scene once. Setup is deferred by one animation frame
  // and cancellable: React 18 StrictMode double-invokes this effect
  // synchronously in dev (mount -> cleanup -> mount again, same canvas
  // element), and creating a WebGLRenderer immediately on mount races with
  // the context teardown from that first cleanup, intermittently leaving
  // the canvas blank. Deferring means the first (StrictMode-only) mount's
  // setup never actually runs -- its cleanup cancels the pending frame
  // before the canvas is ever touched -- so only one real renderer is ever
  // created.
  useEffect(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return undefined;

    let cancelled = false;
    let teardown = null;

    const setupFrame = requestAnimationFrame(() => {
      if (cancelled) return;
      teardown = setupScene();
    });

    function setupScene() {
      const scene = new THREE.Scene();
      const camera = new THREE.PerspectiveCamera(40, container.clientWidth / container.clientHeight, 0.1, 100);
      camera.position.set(0, 0, 16);

      let renderer;
      try {
        renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: true, preserveDrawingBuffer: true });
        renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
        renderer.setSize(container.clientWidth, container.clientHeight);
      } catch {
        return undefined;
      }

      scene.add(new THREE.AmbientLight(0xffffff, 0.9));
      const dirLight = new THREE.DirectionalLight(0xfff8e7, 1.2);
      dirLight.position.set(6, 12, 10);
      scene.add(dirLight);
      const backLight = new THREE.DirectionalLight(0x81c784, 0.4);
      backLight.position.set(-6, -8, -6);
      scene.add(backLight);

      const leafGroup = new THREE.Group();
      scene.add(leafGroup);

      const leafWidth = 7.5;
      const leafHeight = 11.5;
      const leafGeo = new THREE.PlaneGeometry(leafWidth, leafHeight, 32, 40);
      const posAttr = leafGeo.attributes.position;

      for (let i = 0; i < posAttr.count; i++) {
        let x = posAttr.getX(i);
        const y = posAttr.getY(i);
        const normY = (y + leafHeight / 2) / leafHeight;
        let widthProfile;
        if (normY < 0.38) widthProfile = Math.sin((normY / 0.38) * (Math.PI / 2));
        else widthProfile = Math.cos(((normY - 0.38) / 0.62) * (Math.PI / 2));
        x *= Math.max(0.04, widthProfile);
        posAttr.setX(i, x);

        const distFromCenter = Math.abs(x) / (leafWidth / 2);
        const zCurve = -(distFromCenter ** 2) * 0.85 + Math.sin(normY * Math.PI) * 0.45;
        posAttr.setZ(i, zCurve);
      }
      leafGeo.computeVertexNormals();

      const texCanvas = document.createElement("canvas");
      texCanvas.width = 512;
      texCanvas.height = 512;
      const ctx = texCanvas.getContext("2d");
      const dynamicTexture = new THREE.CanvasTexture(texCanvas);
      if (THREE.SRGBColorSpace) dynamicTexture.colorSpace = THREE.SRGBColorSpace;

      const leafMat = new THREE.MeshStandardMaterial({
        map: dynamicTexture,
        roughness: 0.65,
        metalness: 0.05,
        side: THREE.DoubleSide,
      });
      const leafMesh = new THREE.Mesh(leafGeo, leafMat);
      leafGroup.add(leafMesh);

      const stemGeo = new THREE.CylinderGeometry(0.12, 0.22, leafHeight * 1.12, 12);
      const stemMat = new THREE.MeshStandardMaterial({ color: 0x388e3c, roughness: 0.6 });
      const stemMesh = new THREE.Mesh(stemGeo, stemMat);
      stemMesh.position.set(0, -0.6, 0.08);
      leafGroup.add(stemMesh);

      engineRef.current = { scene, camera, renderer, leafGroup, texCanvas, ctx, dynamicTexture };
      // The separate redraw effect (below) already ran once synchronously on
      // mount, before this deferred setup existed -- draw the initial texture
      // now so the leaf isn't left blank until the next state change.
      redrawLeafTexture(engineRef.current, drawStateRef.current);

      // Drag to rotate
      let isDragging = false;
      let prevX = 0;
      let prevY = 0;

      function onDragStart(x, y) {
        isDragging = true;
        prevX = x;
        prevY = y;
      }
      function onDragMove(x, y) {
        if (!isDragging) return;
        leafGroup.rotation.y += (x - prevX) * 0.008;
        leafGroup.rotation.x += (y - prevY) * 0.008;
        prevX = x;
        prevY = y;
      }
      function onDragEnd() {
        isDragging = false;
      }

      const onMouseDown = (e) => onDragStart(e.clientX, e.clientY);
      const onMouseMove = (e) => onDragMove(e.clientX, e.clientY);
      const onMouseUp = () => onDragEnd();
      const onTouchStart = (e) => {
        if (e.touches.length === 1) onDragStart(e.touches[0].clientX, e.touches[0].clientY);
      };
      const onTouchMove = (e) => {
        if (isDragging && e.touches.length === 1) onDragMove(e.touches[0].clientX, e.touches[0].clientY);
      };
      const onTouchEnd = () => onDragEnd();
      const onWheel = (e) => {
        e.preventDefault();
        camera.position.z = Math.max(10, Math.min(26, camera.position.z + e.deltaY * 0.015));
      };

      container.addEventListener("mousedown", onMouseDown);
      window.addEventListener("mousemove", onMouseMove);
      window.addEventListener("mouseup", onMouseUp);
      container.addEventListener("touchstart", onTouchStart, { passive: true });
      window.addEventListener("touchmove", onTouchMove, { passive: true });
      window.addEventListener("touchend", onTouchEnd);
      container.addEventListener("wheel", onWheel, { passive: false });

      function onResize() {
        if (!container.clientWidth || !container.clientHeight) return;
        camera.aspect = container.clientWidth / container.clientHeight;
        camera.updateProjectionMatrix();
        renderer.setSize(container.clientWidth, container.clientHeight);
      }
      window.addEventListener("resize", onResize);

      const clock = new THREE.Clock();
      let frameId;
      function animate() {
        frameId = requestAnimationFrame(animate);
        const delta = clock.getDelta();
        if (autoRotateRef.current && !isDragging) {
          leafGroup.rotation.y += delta * 0.45;
          leafGroup.rotation.x = Math.sin(clock.getElapsedTime() * 0.8) * 0.08;
        }
        renderer.render(scene, camera);
      }
      animate();

      return () => {
        cancelAnimationFrame(frameId);
        container.removeEventListener("mousedown", onMouseDown);
        window.removeEventListener("mousemove", onMouseMove);
        window.removeEventListener("mouseup", onMouseUp);
        container.removeEventListener("touchstart", onTouchStart);
        window.removeEventListener("touchmove", onTouchMove);
        window.removeEventListener("touchend", onTouchEnd);
        container.removeEventListener("wheel", onWheel);
        window.removeEventListener("resize", onResize);
        leafGeo.dispose();
        leafMat.dispose();
        stemGeo.dispose();
        stemMat.dispose();
        dynamicTexture.dispose();
        renderer.dispose();
        renderer.forceContextLoss();
        engineRef.current = null;
      };
    }

    return () => {
      cancelled = true;
      cancelAnimationFrame(setupFrame);
      teardown?.();
    };
  }, []);

  useEffect(() => {
    autoRotateRef.current = autoRotate;
  }, [autoRotate]);

  useEffect(() => {
    redrawLeafTexture(engineRef.current, { affectedPct, isTreated, lookKey });
  }, [affectedPct, isTreated, lookKey]);

  function resetCamera() {
    const engine = engineRef.current;
    if (!engine) return;
    engine.leafGroup.rotation.set(0, 0, 0);
    engine.camera.position.set(0, 0, 16);
  }

  // Money / quantity figures only when we know the yield (and price, for rupees).
  const acres = parseFloat(farmAcres) || 0;
  const perAcre = parseFloat(yieldPerAcre) || 0;
  const price = parseFloat(pricePerQuintal) || 0;
  const expectedQuintals = acres * perAcre;
  const lossPct = isTreated ? point.treatedLossPct : point.untreatedLossPct;
  const lossQuintals = (expectedQuintals * lossPct) / 100;
  const savedQuintals = (expectedQuintals * (point.untreatedLossPct - point.treatedLossPct)) / 100;
  const fmtQ = (q) => `${q < 10 ? q.toFixed(1) : Math.round(q).toLocaleString("en-IN")} qtl`;
  const fmtRs = (q) => `₹${Math.round(q * price).toLocaleString("en-IN")}`;

  const dateLabel = formatDayDate(result.created_at, currentDay);
  const urgency = URGENCY_TEXT[report.urgency] || URGENCY_TEXT.monitor;
  const conditionName = analysis.name || "this problem";
  const cropName = crop?.name || "your crop";
  const final = sim.days[SIM_DAYS];

  return (
    <section className="digital-twin" ref={sectionRef}>
      <div className="digital-twin-heading">
        <div className="badge">BASED ON YOUR HEALTH REPORT</div>
      </div>
      <h2>3D Crop Digital Twin 🌿🔬</h2>
      <p className="digital-twin-subtitle">
        A 14-day projection of <strong>{conditionName}</strong> on your <strong>{cropName}</strong>, starting from
        what your photo showed today. Compare doing nothing with treating now.
      </p>

      <div className="twin-container">
        <div className="twin-viewport-card">
          <div className="twin-viewport-top">
            <div className="twin-status-chip">
              <span className="pulsing-dot"></span>
              <span>
                {dateLabel} · {isTreated && currentDay > 2 ? "Held by treatment" : stageLabel(affectedPct)}
              </span>
            </div>
            <div className="twin-camera-controls">
              <button
                type="button"
                className={`twin-icon-btn${autoRotate ? " active" : ""}`}
                title="Toggle Auto-Rotate"
                onClick={() => setAutoRotate((r) => !r)}
              >
                <i className="fa-solid fa-arrows-rotate"></i>
              </button>
              <button type="button" className="twin-icon-btn" title="Reset View" onClick={resetCamera}>
                <i className="fa-solid fa-crosshairs"></i>
              </button>
            </div>
          </div>

          <div className="twin-canvas-wrapper" ref={containerRef}>
            <canvas ref={canvasRef}></canvas>
            <div className="twin-overlay-hint">
              <i className="fa-solid fa-hand-pointer"></i> Drag to rotate 3D leaf · Scroll to zoom
            </div>
          </div>

          <div className="twin-preset-bar twin-farm-inputs">
            <div className="twin-field-inline">
              <label htmlFor="twinAcres">
                <i className="fa-solid fa-chart-area"></i> Farm area
              </label>
              <input
                id="twinAcres"
                type="number"
                min="0.1"
                step="0.5"
                value={farmAcres}
                onChange={(e) => {
                  setFarmAcres(e.target.value);
                  writeStored("cropvision_acres", e.target.value);
                }}
              />
              <span>acres</span>
            </div>
            <div className="twin-field-inline">
              <label htmlFor="twinYield">
                <i className="fa-solid fa-wheat-awn"></i> Usual yield
              </label>
              <input
                id="twinYield"
                type="number"
                min="0"
                step="1"
                placeholder="?"
                value={yieldPerAcre}
                onChange={(e) => setYieldPerAcre(e.target.value)}
              />
              <span>qtl/acre</span>
            </div>
            <div className="twin-field-inline">
              <label htmlFor="twinPrice">
                <i className="fa-solid fa-indian-rupee-sign"></i> Mandi price
              </label>
              <input
                id="twinPrice"
                type="number"
                min="0"
                step="50"
                placeholder="₹ per qtl"
                value={pricePerQuintal}
                onChange={(e) => {
                  setPricePerQuintal(e.target.value);
                  writeStored(`cropvision_price_${cropKey}`, e.target.value);
                }}
              />
              <span>₹/qtl</span>
            </div>
          </div>
        </div>

        <div className="twin-control-card">
          <div className="twin-treatment-switch">
            <button
              type="button"
              className={`twin-mode-pill${!isTreated ? " active" : ""}`}
              onClick={() => setIsTreated(false)}
            >
              <i className="fa-solid fa-triangle-exclamation"></i> If not treated
            </button>
            <button
              type="button"
              className={`twin-mode-pill treated-pill${isTreated ? " active" : ""}`}
              onClick={() => setIsTreated(true)}
            >
              <i className="fa-solid fa-shield-heart"></i> If treated now
            </button>
          </div>

          <div className="twin-slider-box">
            <div className="twin-slider-header">
              <span className="twin-slider-title">
                <i className="fa-solid fa-timeline"></i> Next 14 days
              </span>
              <span className={`twin-slider-val${isTreated ? " treated" : ""}`}>
                {currentDay === 0 ? "Today" : `Day ${currentDay}`} · {dateLabel}
              </span>
            </div>
            <input
              type="range"
              className="twin-range"
              min="0"
              max={SIM_DAYS}
              step="1"
              value={currentDay}
              onChange={(e) => setCurrentDay(parseInt(e.target.value, 10))}
              aria-label="Day"
            />
            <div className="twin-slider-ticks">
              {TICK_DAYS.map((d, i) => (
                <button
                  key={d}
                  type="button"
                  className={`tick${currentDay >= d && (i === TICK_DAYS.length - 1 || currentDay < TICK_DAYS[i + 1]) ? " active" : ""}`}
                  onClick={() => setCurrentDay(d)}
                >
                  {d === 0 ? "Today" : `Day ${d}`}
                  <small>{formatDayDate(result.created_at, d)}</small>
                </button>
              ))}
            </div>
          </div>

          <div className="twin-telemetry-grid">
            <div className="twin-metric-card">
              <div className="metric-top">
                <span className="metric-icon">🍃</span>
                <small>Leaf area affected</small>
              </div>
              <div className="metric-val">{Math.round(affectedPct)}%</div>
              <div className="metric-bar-wrap">
                <div className="metric-bar-fill" style={{ width: `${affectedPct}%` }}></div>
              </div>
              <small className="metric-sub">Today: {Math.round(sim.startPct)}% (from your photo)</small>
            </div>

            <div className="twin-metric-card">
              <div className="metric-top">
                <span className="metric-icon">📉</span>
                <small>Yield loss</small>
              </div>
              <div className="metric-val">{Math.round(lossPct)}%</div>
              <div className="metric-bar-wrap">
                <div className="metric-bar-fill warning" style={{ width: `${lossPct}%` }}></div>
              </div>
              <small className="metric-sub">
                {expectedQuintals > 0 ? `≈ ${fmtQ(lossQuintals)} of ${fmtQ(expectedQuintals)}` : "Enter your usual yield"}
              </small>
            </div>

            <div className={`twin-metric-card${!isTreated ? " highlight" : ""}`}>
              <div className="metric-top">
                <span className="metric-icon">{isTreated ? "💚" : "💸"}</span>
                <small>{isTreated ? "Saved by treating now" : "Money at risk"}</small>
              </div>
              <div className={`metric-val ${isTreated ? "text-green" : "text-red"}`}>
                {expectedQuintals > 0 && price > 0
                  ? fmtRs(isTreated ? savedQuintals : lossQuintals)
                  : expectedQuintals > 0
                    ? fmtQ(isTreated ? savedQuintals : lossQuintals)
                    : "—"}
              </div>
              <small className="metric-sub">
                {price > 0 ? `${farmAcres} acres @ ₹${price.toLocaleString("en-IN")}/qtl` : "Add your mandi price for ₹"}
              </small>
            </div>

            <div className="twin-metric-card">
              <div className="metric-top">
                <span className="metric-icon">⏳</span>
                <small>When to act</small>
              </div>
              <div className={`metric-val ${urgency.tone}`}>{urgency.value}</div>
              <small className="metric-sub">From your health report</small>
            </div>
          </div>

          <div className="twin-narrative-box">
            <div className="narrative-badge">
              <i className="fa-solid fa-seedling"></i> What this means
            </div>
            <p>
              {analysis.type === "nutrient_deficiency" ? (
                <>
                  <b>If not corrected</b>, yellowing could reach about {Math.round(final.untreatedPct)}% of the leaves by{" "}
                  {formatDayDate(result.created_at, SIM_DAYS)}. <b>If corrected now</b>, new leaves should recover and
                  damage fall to about {Math.round(final.treatedPct)}%.
                </>
              ) : (
                <>
                  <b>If not treated</b>, {conditionName} could affect about {Math.round(final.untreatedPct)}% of the
                  leaves by {formatDayDate(result.created_at, SIM_DAYS)}
                  {sim.wet ? " — the wet weather at your farm speeds up spreading" : ""}. <b>If treated now</b>, it
                  should stay near {Math.round(final.treatedPct)}%.
                </>
              )}
            </p>
            {report.weather_advice && <p className="twin-weather-note">🌦️ {report.weather_advice}</p>}
          </div>

          <details className="twin-assumptions">
            <summary>How this estimate works</summary>
            <ul>
              {sim.assumptions.map((a) => (
                <li key={a}>{a}</li>
              ))}
              <li>
                {yieldPerAcre
                  ? `Usual yield ${yieldPerAcre} qtl/acre (average for ${cropName}; change it to your own).`
                  : `No average yield known for ${cropName}: enter your usual yield to see quantities.`}
              </li>
              <li>A planning aid from rules of thumb — not a guarantee. Real outcomes depend on variety, weather and care.</li>
            </ul>
          </details>
        </div>
      </div>
    </section>
  );
});

export default DigitalTwin;
