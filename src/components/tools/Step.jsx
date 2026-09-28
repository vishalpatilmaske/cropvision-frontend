export default function Step({ num, title, hint, children }) {
  return (
    <section className="tool-step">
      <div className="tool-step-head">
        <span className="tool-step-num">{num}</span>
        <h3>{title}</h3>
        {hint && <span className="tool-step-hint">{hint}</span>}
      </div>
      {children}
    </section>
  );
}
