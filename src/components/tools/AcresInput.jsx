// Farm size with - / + buttons (0.5 acre steps).
export default function AcresInput({ value, onChange }) {
  const num = parseFloat(value) || 0;
  const set = (v) => onChange(String(Math.max(0.5, Math.round(v * 2) / 2)));
  return (
    <div className="acres-input">
      <button type="button" onClick={() => set(num - 0.5)} aria-label="Less">
        <i className="fa-solid fa-minus"></i>
      </button>
      <input
        type="number"
        min="0.1"
        step="0.5"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        aria-label="Farm size in acres"
      />
      <span>acres</span>
      <button type="button" onClick={() => set(num + 0.5)} aria-label="More">
        <i className="fa-solid fa-plus"></i>
      </button>
    </div>
  );
}
