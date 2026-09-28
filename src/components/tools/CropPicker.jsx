import { CROPS } from "../../lib/farmOptions";

// Compact emoji chips for the 17 supported crops. `allowAny` adds an
// "Any crop" chip (value null) for tools that work without a crop.
export default function CropPicker({ value, onChange, allowAny = false }) {
  const options = allowAny ? [{ key: null, label: "Any crop", emoji: "🌱" }, ...CROPS] : CROPS;
  return (
    <div className="crop-picker" role="radiogroup" aria-label="Crop">
      {options.map((c) => (
        <button
          key={c.key ?? "any"}
          type="button"
          role="radio"
          aria-checked={value === c.key}
          className={`crop-chip${value === c.key ? " active" : ""}`}
          onClick={() => onChange(c.key)}
        >
          <span aria-hidden="true">{c.emoji}</span> {c.label}
        </button>
      ))}
    </div>
  );
}
