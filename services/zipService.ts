import * as FileSystem from "expo-file-system/legacy";
import JSZip from "jszip";
import * as Sharing from "expo-sharing";
import { Platform } from "react-native";
import { getProjectDir } from "./fileIO";

export async function exportProjectAsZip(projectId: string, projectName: string): Promise<boolean> {
  const projectDir = getProjectDir(projectId);
  const zip = new JSZip();

  async function addFilesToZip(dirUri: string, zipFolder: JSZip) {
    const contents = await FileSystem.readDirectoryAsync(dirUri);
    for (const name of contents) {
      const fileUri = `${dirUri}${name}`;
      const info = await FileSystem.getInfoAsync(fileUri);
      if (info.isDirectory) {
        const newFolder = zipFolder.folder(name);
        if (newFolder) {
          await addFilesToZip(`${fileUri}/`, newFolder);
        }
      } else {
        const content = await FileSystem.readAsStringAsync(fileUri, {
          encoding: FileSystem.EncodingType.Base64,
        });
        zipFolder.file(name, content, { base64: true });
      }
    }
  }

  await addFilesToZip(projectDir, zip);
  const base64Data = await zip.generateAsync({ type: "base64" });

  if (Platform.OS === "android") {
    const permissions = await FileSystem.StorageAccessFramework.requestDirectoryPermissionsAsync();
    if (!permissions.granted) {
      return false;
    }
    const uri = await FileSystem.StorageAccessFramework.createFileAsync(
      permissions.directoryUri,
      `${projectName}.zip`,
      "application/zip"
    );
    await FileSystem.writeAsStringAsync(uri, base64Data, {
      encoding: FileSystem.EncodingType.Base64,
    });
  } else if (Platform.OS === "web") {
    const blob = await zip.generateAsync({ type: "blob" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${projectName}.zip`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  } else {
    // iOS and others
    const safeName = projectName.replace(/[^a-zA-Z0-9_-]/g, "_");
    const tempUri = `${FileSystem.cacheDirectory}${safeName}.zip`;
    await FileSystem.writeAsStringAsync(tempUri, base64Data, {
      encoding: FileSystem.EncodingType.Base64,
    });
    const canShare = await Sharing.isAvailableAsync();
    if (canShare) {
      await Sharing.shareAsync(tempUri, {
        UTI: "public.zip-archive",
        mimeType: "application/zip",
        dialogTitle: "Export Project",
      });
    }
  }
  return true;
}

export async function importProjectFromZip(projectId: string, zipUri: string): Promise<void> {
  const projectDir = getProjectDir(projectId);
  await FileSystem.makeDirectoryAsync(projectDir, { intermediates: true });

  const zipContent = await FileSystem.readAsStringAsync(zipUri, {
    encoding: FileSystem.EncodingType.Base64,
  });

  const zip = await JSZip.loadAsync(zipContent, { base64: true });

  const keys = Object.keys(zip.files);
  const isSingleLevelFolder = keys.length > 0 && keys.every(k => k === "level/" || k.startsWith("level/"));

  for (let [relativePath, file] of Object.entries(zip.files)) {
    if (isSingleLevelFolder) {
      if (relativePath === "level/") continue;
      relativePath = relativePath.substring(6); // remove "level/"
    }

    if (file.dir) {
      await FileSystem.makeDirectoryAsync(`${projectDir}${relativePath}`, { intermediates: true });
    } else {
      const content = await file.async("base64");
      // Make sure the parent directory exists
      const parts = relativePath.split("/");
      parts.pop(); // remove file name
      if (parts.length > 0) {
        await FileSystem.makeDirectoryAsync(`${projectDir}${parts.join("/")}`, {
          intermediates: true,
        });
      }
      await FileSystem.writeAsStringAsync(`${projectDir}${relativePath}`, content, {
        encoding: FileSystem.EncodingType.Base64,
      });
    }
  }
}
