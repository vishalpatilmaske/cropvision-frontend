import compressImage from "../lib/compressImage";
import apiClient from "./client";

export async function analyzeCropImage({
  file,
  cropName,
  location,
  growthStage,
  additionalContext,
  farmId,
  cropId,
  coords,
}) {
  const formData = new FormData();
  formData.append("image", await compressImage(file));
  if (cropName) formData.append("crop_name", cropName);
  if (location) formData.append("location", location);
  if (growthStage) formData.append("growth_stage", growthStage);
  if (additionalContext) formData.append("additional_context", additionalContext);
  if (farmId) formData.append("farm_id", farmId);
  if (cropId) formData.append("crop_id", cropId);
  if (coords) {
    formData.append("latitude", coords.latitude);
    formData.append("longitude", coords.longitude);
  }

  const response = await apiClient.post("/api/disease/analyze", formData, {
    headers: { "Content-Type": "multipart/form-data" },
    timeout: 90000,
  });
  return response.data.data;
}

export async function fetchDiseaseHistory({ page = 1, perPage = 10, cropName, analysisType } = {}) {
  const response = await apiClient.get("/api/disease/history", {
    params: { page, per_page: perPage, crop_name: cropName, analysis_type: analysisType },
  });
  return response.data.data;
}

export async function fetchDiseaseHistoryDetail(id) {
  const response = await apiClient.get(`/api/disease/history/${id}`);
  return response.data.data;
}
