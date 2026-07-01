import { Asset } from "expo-asset";
import * as FileSystem from "expo-file-system/legacy";
import { getProjectDir } from "./fileIO";

export async function ensureAssetsAreCopied(projectId: string): Promise<void> {
  const projectDir = getProjectDir(projectId);

  const manifestData = require("../assets/basic-level/manifest.json");
  const levelAsset = Asset.fromModule(require("../assets/basic-level/level.lua"));
  const meshAsset = Asset.fromModule(require("../assets/basic-level/background_mesh.lua"));

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
