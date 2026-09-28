import { useEffect, useState } from "react";

const DEFAULT_WEATHER_LOC = { name: "Amravati", lat: 20.9333, lon: 77.75 };

const WEATHER_CODE_TEXT = {
  0: "Clear Sky", 1: "Mostly Clear", 2: "Partly Cloudy", 3: "Overcast",
  45: "Foggy", 48: "Foggy",
  51: "Light Drizzle", 53: "Drizzle", 55: "Heavy Drizzle",
  61: "Light Rain", 63: "Rain", 65: "Heavy Rain",
  71: "Light Snow", 73: "Snow", 75: "Heavy Snow",
  80: "Rain Showers", 81: "Rain Showers", 82: "Violent Showers",
  95: "Thunderstorm", 96: "Thunderstorm", 99: "Thunderstorm",
};

function weatherCodeToText(code) {
  return WEATHER_CODE_TEXT[code] || "Sunny";
}

export default function HeroWeatherBadge() {
  const [text, setText] = useState("Fetching local weather…");
  const [hidden, setHidden] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function load(lat, lon, label) {
      try {
        const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m,weather_code`;
        const res = await fetch(url);
        const data = await res.json();
        if (cancelled) return;
        const temp = Math.round(data.current?.temperature_2m ?? 0);
        const desc = weatherCodeToText(data.current?.weather_code);
        setText(`${label}: ${temp}°C, ${desc}`);
      } catch {
        if (!cancelled) setHidden(true);
      }
    }

    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => load(pos.coords.latitude.toFixed(4), pos.coords.longitude.toFixed(4), "Your Location"),
        () => load(DEFAULT_WEATHER_LOC.lat, DEFAULT_WEATHER_LOC.lon, DEFAULT_WEATHER_LOC.name),
        { timeout: 6000 }
      );
    } else {
      load(DEFAULT_WEATHER_LOC.lat, DEFAULT_WEATHER_LOC.lon, DEFAULT_WEATHER_LOC.name);
    }

    return () => {
      cancelled = true;
    };
  }, []);

  if (hidden) return null;

  return (
    <div className="weather-chip">
      <i className="fa-solid fa-cloud-sun" />
      <span>{text}</span>
    </div>
  );
}
