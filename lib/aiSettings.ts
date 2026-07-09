import * as FileSystem from "expo-file-system/legacy";

// ── Types ────────────────────────────────────────────────────────────

export type AiSettings = {
  enabled: boolean;
  provider?: string;
  apiUrl: string;
  apiKey: string;
};

// ── Storage ──────────────────────────────────────────────────────────

const AI_SETTINGS_FILE = `${FileSystem.documentDirectory}pewpew_ai_settings.json`;

// ── Read / Write ─────────────────────────────────────────────────────

export async function getAiSettings(): Promise<AiSettings | null> {
  try {
    const info = await FileSystem.getInfoAsync(AI_SETTINGS_FILE);
    if (!info.exists) return null;
    const content = await FileSystem.readAsStringAsync(AI_SETTINGS_FILE);
    const parsed = JSON.parse(content) as AiSettings;
    // Default enabled to true for backward compatibility if it's missing but we have url/key
    if (parsed.enabled === undefined) {
      parsed.enabled = !!parsed.apiUrl && !!parsed.apiKey;
    }
    return parsed;
  } catch (e) {
    console.error("Failed to read AI settings:", e);
    return null;
  }
}

export async function saveAiSettings(settings: AiSettings): Promise<void> {
  await FileSystem.writeAsStringAsync(AI_SETTINGS_FILE, JSON.stringify(settings, null, 2));
}

export async function isAiConfigured(): Promise<boolean> {
  const settings = await getAiSettings();
  return settings !== null && settings.enabled && !!settings.apiUrl && !!settings.apiKey;
}

export async function testAiConnection(
  apiUrl: string,
  apiKey: string,
  provider: string
): Promise<{ success: boolean; message?: string }> {
  try {
    let url = apiUrl;

    // Auto-detect known provider URLs if they use Custom
    if (provider === "custom") {
      if (url.includes("generativelanguage.googleapis.com")) {
        provider = "gemini";
      } else if (url.includes("api.anthropic.com")) {
        provider = "anthropic";
      }
    }

    if (provider === "gemini") {
      // Gemini uses a different URL structure for authentication
      // If it already contains v1beta/openai, it might be testing the OpenAI compatibility layer, but let's just test the root models endpoint to be safe
      const baseUrl = url.replace(/\/v1beta\/openai\/?$/, "");
      const testUrl = `${baseUrl}/v1beta/models?key=${apiKey}`;
      const res = await fetch(testUrl);
      if (res.ok) return { success: true };
      const data = await res.json().catch(() => ({}));
      return { success: false, message: data?.error?.message || `HTTP error ${res.status}` };
    }

    // For OpenAI compatible endpoints (and Anthropic which supports GET /v1/models)
    if (!url.endsWith("/models")) {
      url = url.endsWith("/") ? `${url}models` : `${url}/models`;
    }

    const headers: Record<string, string> = {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    };

    if (provider === "anthropic") {
      headers["x-api-key"] = apiKey;
      headers["anthropic-version"] = "2023-06-01";
    }

    const res = await fetch(url, { method: "GET", headers });

    // If it's Anthropic and returns 404, but not 401, the key is valid (since 401 would be returned for invalid keys)
    if (res.ok || (provider === "anthropic" && res.status === 404)) {
      return { success: true };
    }

    const data = await res.json().catch(() => ({}));
    const errorMsg = data?.error?.message || data?.message || `HTTP error ${res.status}`;
    return { success: false, message: errorMsg };
  } catch (e: any) {
    console.error("Test connection failed:", e);
    return { success: false, message: e.message || "Network error" };
  }
}
