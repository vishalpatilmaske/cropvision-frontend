import { useCallback, useEffect, useState } from "react";

// The browser's location, so the backend can use local weather.
// status: "idle" -> "locating" -> "on" | "off". With { auto: false } nothing is
// requested until locate() is called. Never blocks the caller.
export default function useFarmLocation({ auto = true } = {}) {
  const [coords, setCoords] = useState(null);
  const [status, setStatus] = useState(auto ? "locating" : "idle");

  const locate = useCallback(() => {
    if (!navigator.geolocation) {
      setStatus("off");
      return;
    }
    setStatus("locating");
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setCoords({
          latitude: Number(pos.coords.latitude.toFixed(4)),
          longitude: Number(pos.coords.longitude.toFixed(4)),
        });
        setStatus("on");
      },
      () => setStatus("off"),
      { timeout: 10000, maximumAge: 10 * 60 * 1000 }
    );
  }, []);

  useEffect(() => {
    if (auto) locate();
  }, [auto, locate]);

  return { coords, status, locate };
}
