// Two small, single-series charts for the admin overview. One hue (the chart
// green, 3:1 against the card) -- identity is always in the text labels, and
// each chart carries a visually hidden table for screen readers.

function shortDate(iso) {
  return new Date(`${iso}T00:00`).toLocaleDateString(undefined, { day: "numeric", month: "short" });
}

// Daily counts as vertical bars, with a hover tooltip per day.
export function TrendBars({ series, label }) {
  const max = Math.max(1, ...series.map((d) => d.count));
  const total = series.reduce((sum, d) => sum + d.count, 0);
  const last = series.length - 1;

  return (
    <figure className="adm-trend">
      <div className="adm-trend-total">
        <strong>{total}</strong> in the last {series.length} days
      </div>
      <div className="adm-trend-plot">
        <span className="adm-trend-max" aria-hidden="true">
          {max}
        </span>
        <div className="adm-trend-bars">
          {series.map((d, i) => (
            <div
              key={d.date}
              className="adm-trend-col"
              tabIndex={0}
              aria-label={`${shortDate(d.date)}: ${d.count} ${label}`}
            >
              <div
                className={`adm-trend-bar${d.count === 0 ? " zero" : ""}`}
                style={{ height: `${(d.count / max) * 100}%` }}
              />
              <span className="adm-tip" role="tooltip">
                <strong>{d.count}</strong> {label}
                <br />
                {i === last ? "Today" : shortDate(d.date)}
              </span>
            </div>
          ))}
        </div>
      </div>
      <div className="adm-trend-axis" aria-hidden="true">
        <span>{shortDate(series[0]?.date)}</span>
        <span>Today</span>
      </div>
      <table className="sr-only">
        <caption>{label} per day</caption>
        <tbody>
          {series.map((d) => (
            <tr key={d.date}>
              <th scope="row">{d.date}</th>
              <td>{d.count}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </figure>
  );
}

// Ranked horizontal bars: label, bar, value.
export function RankedBars({ items, empty = "No data yet." }) {
  if (!items.length) return <p className="adm-empty-small">{empty}</p>;
  const max = Math.max(1, ...items.map((item) => item.count));
  return (
    <ul className="adm-ranked">
      {items.map((item) => (
        <li key={item.name} title={`${item.name}: ${item.count}`}>
          <span className="adm-ranked-label">{item.name}</span>
          <span className="adm-ranked-track">
            <span className="adm-ranked-bar" style={{ width: `${(item.count / max) * 100}%` }} />
          </span>
          <span className="adm-ranked-value">{item.count}</span>
        </li>
      ))}
    </ul>
  );
}
