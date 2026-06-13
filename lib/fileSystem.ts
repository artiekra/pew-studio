import * as FileSystem from "expo-file-system/legacy";

// ── Types ────────────────────────────────────────────────────────────

export type FileNode = {
  id: string; // The relative path from the project root, e.g., "level.lua", "folder/file.txt", "folder"
  name: string;
  type: "file" | "folder";
  content?: string; // Optional text content (not loaded by default)
  children?: FileNode[];
};

export type ProjectFileTree = FileNode[];

// ── Storage helpers ──────────────────────────────────────────────────

const PROJECTS_DIR = `${FileSystem.documentDirectory}projects/`;

function getProjectDir(projectId: string): string {
  return `${PROJECTS_DIR}${projectId}/`;
}

// ── Default template files ───────────────────────────────────────────

const DEFAULT_MANIFEST: string = JSON.stringify(
  {
    name: "Untitled",
    version: "1.0.0",
    entry_point: "level.lua",
  },
  null,
  2
);

const DEFAULT_LEVEL_LUA = `\
local mesh = require("simple_mesh")

function pewpew.on_start()
  -- Called once when the level starts
end

function pewpew.on_update()
  -- Called every tick (30 fps)
end
`;

const DEFAULT_SIMPLE_MESH_LUA = `\
local M = {}

function M.new_mesh()
  -- Create and return a simple mesh
end

return M
`;

// ── CRUD ─────────────────────────────────────────────────────────────

/** Retrieve the full file tree for a project. */
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

    // Sort folders first, then alphabetically
    return nodes.sort((a, b) => {
      if (a.type === "folder" && b.type === "file") return -1;
      if (a.type === "file" && b.type === "folder") return 1;
      return a.name.localeCompare(b.name);
    });
  }

  return readDirInfo(projectDir, "");
}

/** Initialize a project with the default template files. */
export async function initProjectFiles(projectId: string): Promise<void> {
  const projectDir = getProjectDir(projectId);
  await FileSystem.makeDirectoryAsync(projectDir, { intermediates: true });

  await FileSystem.writeAsStringAsync(`${projectDir}manifest.json`, DEFAULT_MANIFEST);
  await FileSystem.writeAsStringAsync(`${projectDir}level.lua`, DEFAULT_LEVEL_LUA);
  await FileSystem.writeAsStringAsync(`${projectDir}simple_mesh.lua`, DEFAULT_SIMPLE_MESH_LUA);
}

/** Remove all stored file data for a project. */
export async function deleteProjectFiles(projectId: string): Promise<void> {
  const projectDir = getProjectDir(projectId);
  const info = await FileSystem.getInfoAsync(projectDir);
  if (info.exists) {
    await FileSystem.deleteAsync(projectDir, { idempotent: true });
  }
}

// ── Tree mutations ───────────────────────────────────────────────────

/**
 * Add a new folder inside a parent.
 * Pass `null` as parentId to add at root level.
 */
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

/**
 * Remove a node (file or folder) by id.
 * If it's a folder, all its children are removed recursively.
 */
export async function removeNode(projectId: string, nodeId: string): Promise<ProjectFileTree> {
  const projectDir = getProjectDir(projectId);
  const targetUri = `${projectDir}${nodeId}`;

  const info = await FileSystem.getInfoAsync(targetUri);
  if (info.exists) {
    await FileSystem.deleteAsync(targetUri, { idempotent: true });
  }
  return getFileTree(projectId);
}

/** Add a new file inside a parent */
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

/** Read file content */
export async function readFileContent(projectId: string, fileId: string): Promise<string> {
  const uri = `${getProjectDir(projectId)}${fileId}`;
  return await FileSystem.readAsStringAsync(uri);
}

/** Write file content */
export async function writeFileContent(
  projectId: string,
  fileId: string,
  content: string
): Promise<void> {
  const uri = `${getProjectDir(projectId)}${fileId}`;
  await FileSystem.writeAsStringAsync(uri, content);
}

/** Rename a file or folder. Returns updated tree. */
export async function renameNode(
  projectId: string,
  nodeId: string,
  newName: string
): Promise<ProjectFileTree> {
  const projectDir = getProjectDir(projectId);
  const oldUri = `${projectDir}${nodeId}`;

  // Compute new relative path: replace the last path segment
  const parts = nodeId.split("/");
  parts[parts.length - 1] = newName;
  const newRelativePath = parts.join("/");
  const newUri = `${projectDir}${newRelativePath}`;

  await FileSystem.moveAsync({ from: oldUri, to: newUri });
  return getFileTree(projectId);
}

/**
 * Move a node (file or folder) to a new parent.
 * Pass `null` as newParentId to move to root level.
 */
export async function moveNode(
  projectId: string,
  nodeId: string,
  newParentId: string | null
): Promise<ProjectFileTree> {
  const projectDir = getProjectDir(projectId);
  const oldUri = `${projectDir}${nodeId}`;

  // Get just the file/folder name from the node id
  const name = nodeId.split("/").pop()!;
  const newRelativePath = newParentId ? `${newParentId}/${name}` : name;
  const newUri = `${projectDir}${newRelativePath}`;

  // Don't move if source and destination are the same
  if (nodeId === newRelativePath) return getFileTree(projectId);

  // Ensure target parent directory exists
  if (newParentId) {
    const parentUri = `${projectDir}${newParentId}`;
    await FileSystem.makeDirectoryAsync(parentUri, { intermediates: true });
  }

  await FileSystem.moveAsync({ from: oldUri, to: newUri });
  return getFileTree(projectId);
}
