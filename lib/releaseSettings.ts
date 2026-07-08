import * as FileSystem from "expo-file-system/legacy";

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
  // Stub for now. We will implement that later.
  return new Promise((resolve) => {
    setTimeout(() => {
      if (!email || !password) {
        resolve({ success: false, message: "Email and password are required." });
      } else {
        resolve({ success: true });
      }
    }, 1000);
  });
}
