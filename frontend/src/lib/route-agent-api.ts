/**
 * Thin client for the existing FastAPI Route Agent backend.
 * The backend owns Gemini, geocoding, OSRM, TomTom and OpenTripMap —
 * no API keys or AI logic live in the frontend.
 */

export const API_URL = (
  (import.meta.env["VITE_API_URL"] as string | undefined) ?? "http://localhost:8000"
).replace(/\/+$/, "");

export interface ChatResponse {
  conversation_id: string;
  reply: string;
}

export class RouteAgentError extends Error {}

export async function sendChat(params: {
  message: string;
  conversationId: string;
  signal?: AbortSignal;
}): Promise<ChatResponse> {
  let response: Response;
  try {
    response = await fetch(`${API_URL}/chat`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        message: params.message,
        conversation_id: params.conversationId,
      }),
      signal: params.signal ?? null,
    });
  } catch {
    throw new RouteAgentError(
      `Couldn't reach the Route Agent server at ${API_URL}. Make sure it is running.`,
    );
  }

  const rawBody = await response.text();

  if (!response.ok) {
    let detail = rawBody.trim();
    try {
      const parsed = JSON.parse(rawBody) as { detail?: unknown; message?: unknown };
      detail =
        typeof parsed.detail === "string"
          ? parsed.detail
          : typeof parsed.message === "string"
            ? parsed.message
            : detail;
    } catch {
      // Keep the raw response when the backend did not return JSON.
    }

    throw new RouteAgentError(
      detail
        ? `Route Agent error (${response.status}): ${detail}`
        : `Route Agent server returned an error (${response.status}).`,
    );
  }

  let data: Partial<ChatResponse>;
  try {
    data = JSON.parse(rawBody) as Partial<ChatResponse>;
  } catch {
    throw new RouteAgentError("Route Agent returned an invalid response.");
  }
  if (!data || typeof data.reply !== "string") {
    throw new RouteAgentError("The Route Agent server sent an unexpected response.");
  }

  return {
    conversation_id: data.conversation_id ?? params.conversationId,
    reply: data.reply,
  };
}
