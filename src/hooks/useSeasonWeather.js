import { useEffect, useState } from "react";
import { fetchCropConditions } from "../api/recommendationApi";

// Last season's rain + average temperature at the farmer's location, with a
// manual override (typed values) when location is off or they want to edit.
export default function useSeasonWeather(coords, locationStatus, season) {
  const [climate, setClimate] = useState(null);
  const [status, setStatus] = useState("idle");
  const [manual, setManual] = useState(false);
  const [manualRain, setManualRain] = useState("");
  const [manualTemp, setManualTemp] = useState("");

  useEffect(() => {
    if (!coords) {
      if (locationStatus === "off") setStatus("unavailable");
      return undefined;
    }
    let cancelled = false;
    setStatus("loading");
    fetchCropConditions({ ...coords, season })
      .then((data) => {
        if (cancelled) return;
        setClimate(data.climate);
        setStatus(data.climate ? "ready" : "unavailable");
      })
      .catch(() => !cancelled && setStatus("unavailable"));
    return () => {
      cancelled = true;
    };
  }, [coords, season, locationStatus]);

  const useManual = manual || status === "unavailable";
  const rainfall = useManual ? (manualRain === "" ? null : Number(manualRain)) : climate?.rainfall_mm ?? null;
  const avgTemp = useManual ? (manualTemp === "" ? null : Number(manualTemp)) : climate?.avg_temp_c ?? null;

  function toggleManual() {
    if (!manual && climate) {
      setManualRain(String(climate.rainfall_mm));
      setManualTemp(String(climate.avg_temp_c));
    }
    setManual((m) => !m);
  }

  return {
    climate, status, manual, useManual, toggleManual,
    manualRain, setManualRain, manualTemp, setManualTemp,
    rainfall, avgTemp,
  };
}
