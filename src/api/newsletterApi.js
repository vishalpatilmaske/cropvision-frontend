import apiClient from "./client";

// Returns { status: "subscribed" | "already_subscribed" } plus the server's message.
export async function subscribeToNewsletter(email) {
  const res = await apiClient.post("/api/newsletter/subscribe", { email });
  return { ...res.data.data, message: res.data.message };
}
