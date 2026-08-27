const API_BASE = "https://api.cursor.com";

export async function cursorRequest(
  apiKey,
  path,
  { method = "GET", body } = {},
) {
  if (!apiKey) {
    throw new Error("CURSOR_API_KEY is required");
  }
  const response = await fetch(`${API_BASE}${path}`, {
    method,
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const text = await response.text();
  let parsed;
  try {
    parsed = text ? JSON.parse(text) : {};
  } catch {
    parsed = { raw: text };
  }
  if (!response.ok) {
    throw new Error(
      `Cursor API ${method} ${path} ${response.status}: ${text.slice(0, 2000)}`,
    );
  }
  return parsed;
}

export function createAgent(apiKey, payload) {
  return cursorRequest(apiKey, "/v1/agents", {
    method: "POST",
    body: payload,
  });
}

export function createRun(apiKey, agentId, promptText) {
  return cursorRequest(apiKey, `/v1/agents/${agentId}/runs`, {
    method: "POST",
    body: { prompt: { text: promptText } },
  });
}
