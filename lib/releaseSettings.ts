import * as FileSystem from "expo-file-system/legacy";
import { getValidSession, clearSession } from "./pewpewAccount";

// ── Types ────────────────────────────────────────────────────────────

export type ReleaseSettings = {
  enabled: boolean;
  email: string;
  password?: string;
};

// ── Storage ──────────────────────────────────────────────────────────

const RELEASE_SETTINGS_FILE = `${FileSystem.documentDirectory}pewpew_release_settings.json`;

// ── Read / Write ─────────────────────────────────────────────────────

export async function getReleaseSettings(): Promise<ReleaseSettings | null> {
  try {
    const info = await FileSystem.getInfoAsync(RELEASE_SETTINGS_FILE);
    if (!info.exists) return null;
    const content = await FileSystem.readAsStringAsync(RELEASE_SETTINGS_FILE);
    const parsed = JSON.parse(content) as ReleaseSettings;
    if (parsed.enabled === undefined) {
      parsed.enabled = !!parsed.email && !!parsed.password;
    }
    return parsed;
  } catch (e) {
    console.error("Failed to read Release settings:", e);
    return null;
  }
}

export async function saveReleaseSettings(settings: ReleaseSettings): Promise<void> {
  await FileSystem.writeAsStringAsync(RELEASE_SETTINGS_FILE, JSON.stringify(settings, null, 2));
}

export async function isReleaseConfigured(): Promise<boolean> {
  const settings = await getReleaseSettings();
  return settings !== null && settings.enabled && !!settings.email && !!settings.password;
}

export async function testReleaseConnection(email: string, password?: string): Promise<{ success: boolean; message?: string }> {
  if (!email || !password) {
    return { success: false, message: "Email and password are required." };
  }

  try {
    // Clear any existing session to ensure we are testing these exact credentials
    await clearSession();
    await getValidSession(email, password);
    return { success: true };
  } catch (err: any) {
    return { success: false, message: err.message || "Failed to connect to PewPewLive." };
  }
}
