import apiClient from "./client";

// messages: [{ role: "user" | "assistant", content: string }, ...] -- the last one must be the user's.
// location: optional { latitude, longitude } so the agent's weather tools work without asking.
export async function sendAssistantMessage(messages, { reportId, location } = {}) {
  const response = await apiClient.post(
    "/api/assistant/chat",
    { messages, report_id: reportId || undefined, location: location || undefined },
    { timeout: 90000 }
  );
  return response.data.data;
}
