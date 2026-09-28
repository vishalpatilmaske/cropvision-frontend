export default function ToolHero({ badge, title, children, emoji }) {
  return (
    <div className="tool-hero">
      <div>
        <div className="badge">{badge}</div>
        <h1>{title}</h1>
        <p>{children}</p>
      </div>
      {emoji && (
        <div className="tool-hero-emoji" aria-hidden="true">
          {emoji}
        </div>
      )}
    </div>
  );
}
