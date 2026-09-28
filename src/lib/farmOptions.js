// Choices shared by the farm tools. Crop keys match the backend engines.

export const CROPS = [
  { key: "wheat", label: "Wheat", emoji: "🌾", days: 120 },
  { key: "rice", label: "Rice", emoji: "🌾", days: 120 },
  { key: "maize", label: "Maize", emoji: "🌽", days: 100 },
  { key: "cotton", label: "Cotton", emoji: "☁️", days: 170 },
  { key: "sugarcane", label: "Sugarcane", emoji: "🎋", days: 330 },
  { key: "soybean", label: "Soybean", emoji: "🫘", days: 100 },
  { key: "groundnut", label: "Groundnut", emoji: "🥜", days: 110 },
  { key: "chickpea", label: "Chickpea", emoji: "🫛", days: 110 },
  { key: "pigeon pea", label: "Tur", emoji: "🫛", days: 170 },
  { key: "green gram", label: "Moong", emoji: "🫛", days: 65 },
  { key: "mustard", label: "Mustard", emoji: "🌼", days: 115 },
  { key: "sorghum", label: "Jowar", emoji: "🌾", days: 110 },
  { key: "pearl millet", label: "Bajra", emoji: "🌾", days: 80 },
  { key: "tomato", label: "Tomato", emoji: "🍅", days: 120 },
  { key: "onion", label: "Onion", emoji: "🧅", days: 130 },
  { key: "potato", label: "Potato", emoji: "🥔", days: 100 },
  { key: "chilli", label: "Chilli", emoji: "🌶️", days: 150 },
];

export const CROP_BY_KEY = Object.fromEntries(CROPS.map((c) => [c.key, c]));

export function cropLabel(key) {
  return CROP_BY_KEY[(key || "").toLowerCase()]?.label || key || "";
}

export function cropEmoji(key) {
  return CROP_BY_KEY[(key || "").toLowerCase()]?.emoji || "🌱";
}

export const SOILS = [
  { key: "black", label: "Black", hint: "Dark, sticky when wet, cracks when dry", swatch: "#3b3632" },
  { key: "alluvial", label: "Alluvial", hint: "Soft, fertile river soil", swatch: "#b8a27c" },
  { key: "loamy", label: "Loamy", hint: "Crumbly brown soil, drains well", swatch: "#7a5639" },
  { key: "clay", label: "Clay", hint: "Heavy; water stands after rain", swatch: "#a3522c" },
  { key: "sandy", label: "Sandy", hint: "Loose and gritty, dries fast", swatch: "#d8ae7a" },
];

export const WATER = [
  { key: "none", icon: "fa-cloud-rain", label: "Rain only", hint: "No well, canal or pump" },
  { key: "limited", icon: "fa-droplet", label: "Some irrigation", hint: "Well or pond, a few waterings" },
  { key: "full", icon: "fa-faucet-drip", label: "Full irrigation", hint: "Canal or borewell, any time" },
];

export const SEASONS = [
  { key: "kharif", label: "Kharif", hint: "Jun – Oct · monsoon" },
  { key: "rabi", label: "Rabi", hint: "Nov – Mar · winter" },
  { key: "zaid", label: "Zaid", hint: "Mar – Jun · summer" },
];

// Mirrors the backend's upcoming_sowing_season.
export function upcomingSeason(date = new Date()) {
  const m = date.getMonth() + 1;
  if (m >= 4 && m <= 7) return "kharif";
  if (m >= 8 && m <= 11) return "rabi";
  return "zaid";
}

export function formatNumber(value, digits = 0) {
  return Number(value).toLocaleString("en-IN", { maximumFractionDigits: digits });
}
