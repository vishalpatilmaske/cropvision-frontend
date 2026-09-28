import { useState } from "react";
import { extractErrorMessage } from "../../api/client";
import { searchPlaces } from "../../api/recommendationApi";

// Shows where the forecast is for. Uses the browser location; if that's off,
// the farmer can search their village instead.
export default function LocationBox({ status, place, onRetry, onPickPlace }) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState(null);
  const [error, setError] = useState("");
  const [searching, setSearching] = useState(false);

  async function search(e) {
    e.preventDefault();
    if (query.trim().length < 2) return;
    setSearching(true);
    setError("");
    try {
      const data = await searchPlaces(query.trim());
      setResults(data.places);
    } catch (err) {
      setError(extractErrorMessage(err));
    } finally {
      setSearching(false);
    }
  }

  if (place) {
    return (
      <div className="location-box on">
        <i className="fa-solid fa-location-dot"></i>
        <span>{place.label}</span>
        <button type="button" className="tool-link" onClick={() => onPickPlace(null)}>
          Change
        </button>
      </div>
    );
  }

  if (status === "on") {
    return (
      <div className="location-box on">
        <i className="fa-solid fa-location-dot"></i>
        <span>Using your current location</span>
      </div>
    );
  }

  if (status === "locating" || status === "idle") {
    return (
      <div className="location-box">
        <i className="fa-solid fa-spinner fa-spin"></i>
        <span>Finding your location...</span>
      </div>
    );
  }

  return (
    <div className="location-box off">
      <p>
        Location is off.{" "}
        <button type="button" className="tool-link" onClick={onRetry}>
          Use my location
        </button>{" "}
        or search your village:
      </p>
      <form className="place-search" onSubmit={search}>
        <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="e.g. Lasalgaon" />
        <button type="submit" className="btn btn-secondary" disabled={searching || query.trim().length < 2}>
          {searching ? <i className="fa-solid fa-spinner fa-spin"></i> : "Search"}
        </button>
      </form>
      {error && <p className="save-error">{error}</p>}
      {results && results.length === 0 && <p className="tool-muted">No place found — try a nearby town.</p>}
      {results && results.length > 0 && (
        <ul className="place-results">
          {results.map((p) => (
            <li key={`${p.latitude},${p.longitude}`}>
              <button
                type="button"
                onClick={() =>
                  onPickPlace({
                    latitude: p.latitude,
                    longitude: p.longitude,
                    label: [p.name, p.district, p.state].filter(Boolean).join(", "),
                  })
                }
              >
                <i className="fa-solid fa-location-dot"></i> {[p.name, p.district, p.state].filter(Boolean).join(", ")}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
