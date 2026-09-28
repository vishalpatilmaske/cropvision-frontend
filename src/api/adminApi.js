import { ADMIN_TOKEN_KEY, createApiClient } from "./client";

export const adminApiClient = createApiClient(ADMIN_TOKEN_KEY);

const data = (res) => res.data.data;

export async function adminLogin(email, password) {
  return data(await adminApiClient.post("/api/admin/login", { email, password }));
}

export async function fetchStats() {
  return data(await adminApiClient.get("/api/admin/stats"));
}

// --- Users ---

export async function fetchUsers({ page = 1, perPage = 10, search, sort = "newest" } = {}) {
  return data(
    await adminApiClient.get("/api/admin/users", {
      params: { page, per_page: perPage, search: search || undefined, sort },
    })
  );
}

export async function fetchUser(id) {
  return data(await adminApiClient.get(`/api/admin/users/${id}`));
}

export async function createUser(payload) {
  return data(await adminApiClient.post("/api/admin/users", payload)).user;
}

export async function updateUser(id, payload) {
  return data(await adminApiClient.put(`/api/admin/users/${id}`, payload)).user;
}

export async function deleteUser(id) {
  await adminApiClient.delete(`/api/admin/users/${id}`);
}

// CSV downloads need the admin token, so they're fetched as a blob rather
// than opened as a plain link.
async function downloadCsv(path, fallbackName) {
  const res = await adminApiClient.get(path, { responseType: "blob" });
  const match = /filename="([^"]+)"/.exec(res.headers["content-disposition"] || "");
  const url = URL.createObjectURL(res.data);
  const link = document.createElement("a");
  link.href = url;
  link.download = match ? match[1] : fallbackName;
  link.click();
  URL.revokeObjectURL(url);
}

export const downloadUsersCsv = () => downloadCsv("/api/admin/users/export", "cropvision-users.csv");
export const downloadNewsletterCsv = () => downloadCsv("/api/admin/newsletter/export", "cropvision-newsletter.csv");

// --- Health checks (all farmers) ---

export async function fetchHealthChecks({ page = 1, perPage = 12, analysisType, cropName, userId, needsReview } = {}) {
  return data(
    await adminApiClient.get("/api/admin/health-checks", {
      params: {
        page,
        per_page: perPage,
        analysis_type: analysisType || undefined,
        crop_name: cropName || undefined,
        user_id: userId || undefined,
        needs_review: needsReview ? "true" : undefined,
      },
    })
  );
}

export async function fetchHealthCheck(id) {
  return data(await adminApiClient.get(`/api/admin/health-checks/${id}`));
}

export async function deleteHealthCheck(id) {
  await adminApiClient.delete(`/api/admin/health-checks/${id}`);
}
