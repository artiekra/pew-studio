import * as FileSystem from "expo-file-system/legacy";
import type { FileNode, ProjectFileTree } from "@/types";

const PROJECTS_DIR = `${FileSystem.documentDirectory}projects/`;

export function getProjectDir(projectId: string): string {
  return `${PROJECTS_DIR}${projectId}/`;
}

export async function getFileTree(projectId: string): Promise<ProjectFileTree> {
  const projectDir = getProjectDir(projectId);
  const info = await FileSystem.getInfoAsync(projectDir);
  if (!info.exists) return [];

  async function readDirInfo(dirUri: string, basePath: string): Promise<FileNode[]> {
    const contents = await FileSystem.readDirectoryAsync(dirUri);
    const nodes: FileNode[] = [];

    for (const name of contents) {
      const fileUri = `${dirUri}${name}`;
      const fileInfo = await FileSystem.getInfoAsync(fileUri);
      const relativePath = basePath ? `${basePath}/${name}` : name;

      if (fileInfo.isDirectory) {
        nodes.push({
          id: relativePath,
          name,
          type: "folder",
          children: await readDirInfo(`${fileUri}/`, relativePath),
        });
      } else {
        nodes.push({
          id: relativePath,
          name,
          type: "file",
        });
      }
    }

    return nodes.sort((a, b) => {
      if (a.type === "folder" && b.type === "file") return -1;
      if (a.type === "file" && b.type === "folder") return 1;
      return a.name.localeCompare(b.name);
    });
  }

  return readDirInfo(projectDir, "");
}

export async function addFolder(
  projectId: string,
  parentId: string | null,
  folderName: string
): Promise<ProjectFileTree> {
  const projectDir = getProjectDir(projectId);
  const relativePath = parentId ? `${parentId}/${folderName}` : folderName;
  const targetDir = `${projectDir}${relativePath}`;

  await FileSystem.makeDirectoryAsync(targetDir, { intermediates: true });
  return getFileTree(projectId);
}

export async function removeNode(projectId: string, nodeId: string): Promise<ProjectFileTree> {
  const projectDir = getProjectDir(projectId);
  const targetUri = `${projectDir}${nodeId}`;

  const info = await FileSystem.getInfoAsync(targetUri);
  if (info.exists) {
    await FileSystem.deleteAsync(targetUri, { idempotent: true });
  }
  return getFileTree(projectId);
}

export async function addFile(
  projectId: string,
  parentId: string | null,
  fileName: string,
  content: string = ""
): Promise<ProjectFileTree> {
  const projectDir = getProjectDir(projectId);
  const relativePath = parentId ? `${parentId}/${fileName}` : fileName;
  const targetFile = `${projectDir}${relativePath}`;

  await FileSystem.writeAsStringAsync(targetFile, content);
  return getFileTree(projectId);
}

export async function readFileContent(projectId: string, fileId: string): Promise<string> {
  const uri = `${getProjectDir(projectId)}${fileId}`;
  return await FileSystem.readAsStringAsync(uri);
}

export async function writeFileContent(
  projectId: string,
  fileId: string,
  content: string
): Promise<void> {
  const uri = `${getProjectDir(projectId)}${fileId}`;
  await FileSystem.writeAsStringAsync(uri, content);
}

export async function renameNode(
  projectId: string,
  nodeId: string,
  newName: string
): Promise<ProjectFileTree> {
  const projectDir = getProjectDir(projectId);
  const oldUri = `${projectDir}${nodeId}`;

  const parts = nodeId.split("/");
  parts[parts.length - 1] = newName;
  const newRelativePath = parts.join("/");
  const newUri = `${projectDir}${newRelativePath}`;

  await FileSystem.moveAsync({ from: oldUri, to: newUri });
  return getFileTree(projectId);
}

export async function moveNode(
  projectId: string,
  nodeId: string,
  newParentId: string | null
): Promise<ProjectFileTree> {
  const projectDir = getProjectDir(projectId);
  const oldUri = `${projectDir}${nodeId}`;

  const name = nodeId.split("/").pop()!;
  const newRelativePath = newParentId ? `${newParentId}/${name}` : name;
  const newUri = `${projectDir}${newRelativePath}`;

  if (nodeId === newRelativePath) return getFileTree(projectId);

  if (newParentId) {
    const parentUri = `${projectDir}${newParentId}`;
    await FileSystem.makeDirectoryAsync(parentUri, { intermediates: true });
  }

  await FileSystem.moveAsync({ from: oldUri, to: newUri });
  return getFileTree(projectId);
}
