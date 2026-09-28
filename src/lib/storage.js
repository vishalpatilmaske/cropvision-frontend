// localStorage that never throws (private mode, blocked storage, previews).

export function readStored(key, fallback = null) {
  try {
    return localStorage.getItem(key) ?? fallback;
  } catch {
    return fallback;
  }
}

export function writeStored(key, value) {
  try {
    localStorage.setItem(key, value);
  } catch {
    // Storage blocked -- the value just won't be remembered.
  }
}

// Keys shared across the farm tools, so a choice made once carries over.
export const STORAGE_KEYS = {
  crop: "cropvision_crop",
  soil: "cropvision_soil",
  water: "cropvision_water",
  acres: "cropvision_acres",
  price: (crop) => `cropvision_price_${crop}`,
};
