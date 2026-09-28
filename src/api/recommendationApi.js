import apiClient from "./client";

export async function getCropRecommendation(payload) {
  const response = await apiClient.post("/api/crop-recommendation", payload);
  return response.data.data;
}

export async function getFertilizerRecommendation(payload) {
  const response = await apiClient.post("/api/fertilizer-recommendation", payload);
  return response.data.data;
}

export async function getIrrigationRecommendation(payload) {
  const response = await apiClient.post("/api/irrigation-recommendation", payload);
  return response.data.data;
}

export async function getYieldPrediction(payload) {
  const response = await apiClient.post("/api/yield-prediction", payload);
  return response.data.data;
}

// Read-only: average quintals/acre for a crop (null when unknown). Nothing is saved.
export async function fetchYieldBaseline(cropName) {
  const response = await apiClient.get("/api/yield-baseline", { params: { crop_name: cropName } });
  return response.data.data;
}

// Season rain + temperature at a location, from last year's actual weather.
export async function fetchCropConditions({ latitude, longitude, season }) {
  const response = await apiClient.get("/api/crop-conditions", { params: { latitude, longitude, season } });
  return response.data.data;
}

export async function fetchFarms() {
  const response = await apiClient.get("/api/farms");
  return response.data.data;
}

export async function searchPlaces(name) {
  const response = await apiClient.get("/api/weather/places", { params: { name } });
  return response.data.data;
}

export async function fetchToolHistory(tool, { page = 1, perPage = 10 } = {}) {
  const paths = {
    crop: "/api/crop-recommendation/history",
    fertilizer: "/api/fertilizer-recommendation/history",
    irrigation: "/api/irrigation-recommendation/history",
    yield: "/api/yield-prediction/history",
  };
  const response = await apiClient.get(paths[tool], { params: { page, per_page: perPage } });
  return response.data.data;
}
