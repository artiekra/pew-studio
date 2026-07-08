import * as FileSystem from "expo-file-system/legacy";
import { getProjectDir } from "./fileIO";
import { getValidSession, getStoredSession } from "@/lib/pewpewAccount";
import { getReleaseSettings } from "@/lib/releaseSettings";

// ── Types ────────────────────────────────────────────────────────────

export type UploadResult = {
  success: boolean;
  message: string;
};

// ── Helpers ──────────────────────────────────────────────────────────

/**
 * Ensure we have a valid session, re-logging in from saved credentials
 * if necessary.
 */
async function ensureSession(): Promise<void> {
  const settings = await getReleaseSettings();
  if (!settings || !settings.enabled || !settings.email || !settings.password) {
    throw new Error("Release settings are not configured.");
  }
  await getValidSession(settings.email, settings.password);
}

/**
 * Build request headers for authenticated requests to pewpew.live.
 * If the session is OS-managed (cookie jar), we don't set Cookie manually.
 */
async function getAuthHeaders(): Promise<Record<string, string>> {
  const session = await getStoredSession();
  const headers: Record<string, string> = {
    "User-Agent": "Mozilla/5.0 (X11; Linux x86_64; rv:152.0) Gecko/20100101 Firefox/152.0",
    "Origin": "https://pewpew.live",
    "Referer": "https://pewpew.live/account/custom-levels",
  };
  if (session && session !== "OS_MANAGED_COOKIE") {
    headers["Cookie"] = `session=${session}`;
  }
  return headers;
}

// ── Collect project files ────────────────────────────────────────────

type ProjectFile = {
  /** Relative path within the project, e.g. "lib/helpers.lua" */
  relativePath: string;
  /** Absolute URI on disk */
  uri: string;
};

/**
 * Recursively walk a project directory and return a flat list of files.
 */
async function collectFiles(dirUri: string, basePath: string): Promise<ProjectFile[]> {
  const entries = await FileSystem.readDirectoryAsync(dirUri);
  const files: ProjectFile[] = [];

  for (const name of entries) {
    const fileUri = `${dirUri}${name}`;
    const info = await FileSystem.getInfoAsync(fileUri);

    if (info.isDirectory) {
      const subFiles = await collectFiles(`${fileUri}/`, basePath ? `${basePath}/${name}` : name);
      files.push(...subFiles);
    } else {
      files.push({
        relativePath: basePath ? `${basePath}/${name}` : name,
        uri: fileUri,
      });
    }
  }

  return files;
}

// ── Upload ───────────────────────────────────────────────────────────

/**
 * Upload a project's files to pewpew.live as a multipart/form-data POST,
 * mirroring the browser upload behaviour (flat list of files in a folder).
 */
export async function uploadLevel(projectId: string, projectName: string): Promise<UploadResult> {
  try {
    await ensureSession();

    const projectDir = getProjectDir(projectId);
    
    // Use the project name as the root folder name to simulate a folder upload
    const files = await collectFiles(projectDir, projectName);

    if (files.length === 0) {
      return { success: false, message: "Project has no files to upload." };
    }

    // Build a multipart/form-data body manually since React Native's
    // FormData doesn't support setting the webkitRelativePath.
    const boundary = `----pewpewstudio${Date.now()}${Math.random().toString(36).slice(2)}`;
    const parts: string[] = [];

    for (const file of files) {
      const content = await FileSystem.readAsStringAsync(file.uri, {
        encoding: FileSystem.EncodingType.Base64,
      });

      parts.push(`--${boundary}`);
      parts.push(
        `Content-Disposition: form-data; name="files"; filename="${file.relativePath}"`
      );
      parts.push("Content-Transfer-Encoding: base64");

      // Guess a reasonable content-type
      const ext = file.relativePath.split(".").pop()?.toLowerCase() ?? "";
      const mimeType = getMimeType(ext);
      parts.push(`Content-Type: ${mimeType}`);
      parts.push("");
      parts.push(content);
    }

    parts.push(`--${boundary}--`);
    const body = parts.join("\r\n");

    const headers = await getAuthHeaders();
    headers["Content-Type"] = `multipart/form-data; boundary=${boundary}`;
    headers["Accept"] = "*/*";

    const res = await fetch("https://pewpew.live/account/upload-level", {
      method: "POST",
      headers,
      body,
    });

    const text = await res.text();
    
    // Check if the response is JSON
    try {
      const json = JSON.parse(text);
      if (json && json.success === false) {
        return {
          success: false,
          message: json.error_message || "Upload failed.",
        };
      }
      if (json && json.success === true) {
         return { success: true, message: "Level uploaded successfully!" };
      }
    } catch (e) {
      // Not JSON, continue to other checks
    }

    if (res.ok || res.status === 302 || res.status === 301) {
      return { success: true, message: "Level uploaded successfully!" };
    }

    return {
      success: false,
      message: `Upload failed (HTTP ${res.status}): ${text.slice(0, 200)}`,
    };
  } catch (err: any) {
    return {
      success: false,
      message: err.message || "An unexpected error occurred during upload.",
    };
  }
}

// ── Mime helpers ──────────────────────────────────────────────────────

function getMimeType(ext: string): string {
  const map: Record<string, string> = {
    lua: "text/x-lua",
    json: "application/json",
    txt: "text/plain",
    png: "image/png",
    jpg: "image/jpeg",
    jpeg: "image/jpeg",
    gif: "image/gif",
    svg: "image/svg+xml",
    wav: "audio/wav",
    mp3: "audio/mpeg",
    ogg: "audio/ogg",
  };
  return map[ext] || "application/octet-stream";
}
