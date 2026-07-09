import { Asset } from "expo-asset";
import * as FileSystem from "expo-file-system/legacy";
import { getProjectDir } from "./fileIO";

export type ProjectTemplate = "basic" | "blank" | "pseudo-infinity";

export async function ensureAssetsAreCopied(
  projectId: string,
  template: ProjectTemplate = "basic"
): Promise<void> {
  if (template === "blank") {
    // Blank Level: create no files or folders in the project
    return;
  }

  const projectDir = getProjectDir(projectId);

  if (template === "pseudo-infinity") {
    const manifestData = require("../assets/project-templates/pseudo-infinity/manifest.json");
    const levelAsset = Asset.fromModule(
      require("../assets/project-templates/pseudo-infinity/level.lua")
    );

    await levelAsset.downloadAsync();

    await Promise.all([
      FileSystem.writeAsStringAsync(
        `${projectDir}manifest.json`,
        JSON.stringify(manifestData, null, 2)
      ),
      FileSystem.copyAsync({
        from: levelAsset.localUri || levelAsset.uri,
        to: `${projectDir}level.lua`,
      }),
    ]);
  } else {
    // Default to basic
    const manifestData = require("../assets/project-templates/basic-level/manifest.json");
    const levelAsset = Asset.fromModule(
      require("../assets/project-templates/basic-level/level.lua")
    );
    const meshAsset = Asset.fromModule(
      require("../assets/project-templates/basic-level/background_mesh.lua")
    );

    await Promise.all([levelAsset.downloadAsync(), meshAsset.downloadAsync()]);

    await Promise.all([
      FileSystem.writeAsStringAsync(
        `${projectDir}manifest.json`,
        JSON.stringify(manifestData, null, 2)
      ),
      FileSystem.copyAsync({
        from: levelAsset.localUri || levelAsset.uri,
        to: `${projectDir}level.lua`,
      }),
      FileSystem.copyAsync({
        from: meshAsset.localUri || meshAsset.uri,
        to: `${projectDir}background_mesh.lua`,
      }),
    ]);
  }
}
