import { ADMIN_TOKEN_KEY, createApiClient } from "./client";

export const adminApiClient = createApiClient(ADMIN_TOKEN_KEY);

export async function adminLogin(email, password) {
  const res = await adminApiClient.post("/api/admin/login", { email, password });
  return res.data.data;
}

export async function fetchStats() {
  const res = await adminApiClient.get("/api/admin/stats");
  return res.data.data;
}

export async function fetchUsers({ page = 1, perPage = 10, search } = {}) {
  const res = await adminApiClient.get("/api/admin/users", {
    params: { page, per_page: perPage, search: search || undefined },
  });
  return res.data.data;
}

export async function createUser(payload) {
  const res = await adminApiClient.post("/api/admin/users", payload);
  return res.data.data.user;
}

export async function updateUser(id, payload) {
  const res = await adminApiClient.put(`/api/admin/users/${id}`, payload);
  return res.data.data.user;
}

export async function deleteUser(id) {
  await adminApiClient.delete(`/api/admin/users/${id}`);
}
