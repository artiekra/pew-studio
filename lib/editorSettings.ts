import * as FileSystem from "expo-file-system/legacy";

export type EditorTheme = 
  | "system" 
  | "light" 
  | "dark" 
  | "amy" 
  | "ayuLight" 
  | "barf" 
  | "bespin" 
  | "birdsOfParadise" 
  | "boysAndGirls" 
  | "clouds" 
  | "cobalt" 
  | "coolGlow" 
  | "dracula" 
  | "espresso" 
  | "noctisLilac" 
  | "rosePineDawn" 
  | "smoothy" 
  | "solarizedLight" 
  | "tomorrow";

export type EditorSettings = {
  theme: EditorTheme;
};

const EDITOR_SETTINGS_FILE = `${FileSystem.documentDirectory}pewpew_editor_settings.json`;

export async function getEditorSettings(): Promise<EditorSettings> {
  try {
    const info = await FileSystem.getInfoAsync(EDITOR_SETTINGS_FILE);
    if (!info.exists) return { theme: "system" };
    const content = await FileSystem.readAsStringAsync(EDITOR_SETTINGS_FILE);
    return JSON.parse(content) as EditorSettings;
  } catch (e) {
    console.error("Failed to read editor settings:", e);
    return { theme: "system" };
  }
}

export async function saveEditorSettings(settings: EditorSettings): Promise<void> {
  await FileSystem.writeAsStringAsync(EDITOR_SETTINGS_FILE, JSON.stringify(settings, null, 2));
}
