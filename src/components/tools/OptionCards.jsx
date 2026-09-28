// A row/grid of tappable cards for one choice (soil, water, method, ...).
// options: [{ key, label, hint?, icon?, swatch?, badge? }]
export default function OptionCards({ options, value, onChange, columns = 3, label }) {
  return (
    <div
      className="option-cards"
      style={{ "--option-cols": columns }}
      role="radiogroup"
      aria-label={label}
    >
      {options.map((o) => (
        <button
          key={o.key}
          type="button"
          role="radio"
          aria-checked={value === o.key}
          className={`option-card${value === o.key ? " active" : ""}`}
          onClick={() => onChange(o.key)}
        >
          {o.swatch && <span className="option-swatch" style={{ background: o.swatch }}></span>}
          {o.icon && <i className={`fa-solid ${o.icon}`}></i>}
          <strong>{o.label}</strong>
          {o.hint && <span>{o.hint}</span>}
          {o.badge && <em>{o.badge}</em>}
        </button>
      ))}
    </div>
  );
}
