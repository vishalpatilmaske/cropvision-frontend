function formatMonth(iso) {
  return new Date(iso).toLocaleDateString(undefined, { month: "short", year: "numeric" });
}

// Displays / edits the season rain + temperature from useSeasonWeather.
export default function SeasonWeatherBox({ weather, locationStatus, onLocate }) {
  const { climate, status, manual, useManual, toggleManual, manualRain, setManualRain, manualTemp, setManualTemp } =
    weather;

  return (
    <section className="season-weather">
      <div className="season-weather-head">
        <span>
          <i className="fa-solid fa-cloud-sun-rain"></i> Season weather at your farm
        </span>
        {status === "ready" && (
          <button type="button" className="tool-link" onClick={toggleManual}>
            {manual ? "Use my location" : "Edit"}
          </button>
        )}
      </div>

      {locationStatus === "locating" || status === "loading" ? (
        <p className="tool-muted">
          <i className="fa-solid fa-spinner fa-spin"></i> Looking up last season's weather...
        </p>
      ) : !useManual && climate ? (
        <>
          <div className="season-weather-values">
            <div>
              <strong>{climate.rainfall_mm} mm</strong>
              <span>rain over the season</span>
            </div>
            <div>
              <strong>{climate.avg_temp_c}°C</strong>
              <span>average temperature</span>
            </div>
          </div>
          <p className="tool-muted">
            Actual weather at your location, {formatMonth(climate.window.start)} – {formatMonth(climate.window.end)}.
          </p>
        </>
      ) : (
        <>
          {status === "unavailable" && (
            <p className="tool-muted">
              {locationStatus === "off" ? (
                <>
                  Location is off.{" "}
                  <button type="button" className="tool-link" onClick={onLocate}>
                    Use my location
                  </button>{" "}
                  or enter rough values (optional):
                </>
              ) : (
                "Couldn't load past weather — enter rough values (optional):"
              )}
            </p>
          )}
          <div className="tool-input-row season-manual">
            <label>
              Season rain (mm)
              <input
                type="number"
                min="0"
                value={manualRain}
                onChange={(e) => setManualRain(e.target.value)}
                placeholder="e.g. 800"
              />
            </label>
            <label>
              Avg. temperature (°C)
              <input
                type="number"
                value={manualTemp}
                onChange={(e) => setManualTemp(e.target.value)}
                placeholder="e.g. 25"
              />
            </label>
          </div>
        </>
      )}
    </section>
  );
}
