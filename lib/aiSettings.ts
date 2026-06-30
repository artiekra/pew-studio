import * as FileSystem from "expo-file-system/legacy";

// ── Types ────────────────────────────────────────────────────────────

export type AiSettings = {
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
    // Consider it unconfigured if both fields are empty
    if (!parsed.apiUrl && !parsed.apiKey) return null;
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
  return settings !== null && !!settings.apiUrl && !!settings.apiKey;
}
