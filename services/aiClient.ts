import { getAiSettings } from "@/lib/aiSettings";
import { AI_TOOLS } from "@/services/aiTools";

// ── Types ────────────────────────────────────────────────────────────

export type ApiMessage = {
  role: "system" | "user" | "assistant" | "tool";
  content: string | null;
  tool_calls?: ApiToolCall[];
  tool_call_id?: string;
};

export type ApiToolCall = {
  id: string;
  type: "function";
  function: {
    name: string;
    arguments: string; // JSON-encoded
  };
};

export type ApiResponse = {
  message: ApiMessage;
  finishReason: string;
};

// ── Build headers for the configured provider ────────────────────────

function buildHeaders(apiKey: string, provider?: string): Record<string, string> {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };

  if (provider === "anthropic") {
    headers["x-api-key"] = apiKey;
    headers["anthropic-version"] = "2023-06-01";
  } else if (provider === "gemini") {
    // Gemini OpenAI-compat layer uses Bearer token or key param
    headers["Authorization"] = `Bearer ${apiKey}`;
  } else {
    headers["Authorization"] = `Bearer ${apiKey}`;
  }

  return headers;
}

// ── Build the chat completions URL ───────────────────────────────────

function buildChatUrl(apiUrl: string, provider?: string): string {
  let base = apiUrl.replace(/\/+$/, "");

  if (provider === "gemini") {
    // Gemini OpenAI compatibility endpoint
    if (!base.includes("/v1beta/openai")) {
      base = `${base}/v1beta/openai`;
    }
    return `${base}/chat/completions`;
  }

  // Standard OpenAI-compatible: append /chat/completions
  if (base.endsWith("/chat/completions")) return base;
  return `${base}/chat/completions`;
}

// ── Send a single chat completion request ────────────────────────────

export async function sendChatCompletion(
  messages: ApiMessage[],
  model: string
): Promise<ApiResponse> {
  const settings = await getAiSettings();
  if (!settings || !settings.enabled || !settings.apiUrl || !settings.apiKey) {
    throw new Error("AI is not configured. Please set up your API provider in settings.");
  }

  const url = buildChatUrl(settings.apiUrl, settings.provider);
  const headers = buildHeaders(settings.apiKey, settings.provider);

  const body: Record<string, any> = {
    model,
    messages,
    tools: AI_TOOLS,
    tool_choice: "auto",
  };

  const res = await fetch(url, {
    method: "POST",
    headers,
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    const msg =
      errorData?.error?.message ||
      errorData?.message ||
      `API returned HTTP ${res.status}`;
    throw new Error(msg);
  }

  const data = await res.json();

  // Handle OpenAI-compatible response format
  const choice = data.choices?.[0];
  if (!choice) {
    throw new Error("No response from the AI model.");
  }

  return {
    message: choice.message as ApiMessage,
    finishReason: choice.finish_reason || "stop",
  };
}

// ── Fetch available models from provider ─────────────────────────────

export async function fetchAvailableModels(): Promise<string[]> {
  const settings = await getAiSettings();
  if (!settings || !settings.enabled || !settings.apiUrl || !settings.apiKey) {
    return [];
  }

  let base = settings.apiUrl.replace(/\/+$/, "");
  let url = "";

  if (settings.provider === "gemini") {
    if (!base.includes("/v1beta/openai")) {
      base = `${base}/v1beta/openai`;
    }
    url = `${base}/models`;
  } else {
    url = base.endsWith("/models") ? base : `${base}/models`;
  }

  const headers = buildHeaders(settings.apiKey, settings.provider);

  try {
    const res = await fetch(url, { method: "GET", headers });
    if (!res.ok) return [];
    
    const data = await res.json();
    if (data && data.data && Array.isArray(data.data)) {
      return data.data.map((m: any) => m.id).filter(Boolean);
    }
    if (data && data.models && Array.isArray(data.models)) {
      return data.models.map((m: any) => m.name.replace("models/", "")).filter(Boolean);
    }
    return [];
  } catch (e) {
    return [];
  }
}

