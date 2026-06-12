import AsyncStorage from '@react-native-async-storage/async-storage';

// ── Types ────────────────────────────────────────────────────────────

export type FileNode = {
  id: string;
  name: string;
  type: 'file' | 'folder';
  /** Only meaningful for files – stores the text content. */
  content?: string;
  children?: FileNode[];
};

export type ProjectFileTree = FileNode[];

// ── Storage helpers ──────────────────────────────────────────────────

function storageKey(projectId: string): string {
  return `pewpew_fs_${projectId}`;
}

function generateNodeId(): string {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
}

// ── Default template files ───────────────────────────────────────────

const DEFAULT_MANIFEST: string = JSON.stringify(
  {
    name: 'Untitled',
    version: '1.0.0',
    entry_point: 'level.lua',
  },
  null,
  2,
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

export function createDefaultTree(): ProjectFileTree {
  return [
    {
      id: generateNodeId(),
      name: 'manifest.json',
      type: 'file',
      content: DEFAULT_MANIFEST,
    },
    {
      id: generateNodeId(),
      name: 'level.lua',
      type: 'file',
      content: DEFAULT_LEVEL_LUA,
    },
    {
      id: generateNodeId(),
      name: 'simple_mesh.lua',
      type: 'file',
      content: DEFAULT_SIMPLE_MESH_LUA,
    },
  ];
}

// ── CRUD ─────────────────────────────────────────────────────────────

/** Retrieve the full file tree for a project. */
export async function getFileTree(projectId: string): Promise<ProjectFileTree> {
  const raw = await AsyncStorage.getItem(storageKey(projectId));
  if (!raw) return [];
  return JSON.parse(raw) as ProjectFileTree;
}

/** Persist a file tree. */
export async function saveFileTree(
  projectId: string,
  tree: ProjectFileTree,
): Promise<void> {
  await AsyncStorage.setItem(storageKey(projectId), JSON.stringify(tree));
}

/** Initialize a project with the default template files. */
export async function initProjectFiles(projectId: string): Promise<void> {
  await saveFileTree(projectId, createDefaultTree());
}

/** Remove all stored file data for a project. */
export async function deleteProjectFiles(projectId: string): Promise<void> {
  await AsyncStorage.removeItem(storageKey(projectId));
}

// ── Tree mutations ───────────────────────────────────────────────────

/**
 * Add a new folder inside a parent.
 * Pass `null` as parentId to add at root level.
 */
export async function addFolder(
  projectId: string,
  parentId: string | null,
  folderName: string,
): Promise<ProjectFileTree> {
  const tree = await getFileTree(projectId);

  const newFolder: FileNode = {
    id: generateNodeId(),
    name: folderName,
    type: 'folder',
    children: [],
  };

  if (parentId === null) {
    tree.push(newFolder);
  } else {
    const parent = findNode(tree, parentId);
    if (parent && parent.type === 'folder') {
      if (!parent.children) parent.children = [];
      parent.children.push(newFolder);
    }
  }

  await saveFileTree(projectId, tree);
  return tree;
}

/**
 * Remove a node (file or folder) by id.
 * If it's a folder, all its children are removed recursively.
 */
export async function removeNode(
  projectId: string,
  nodeId: string,
): Promise<ProjectFileTree> {
  const tree = await getFileTree(projectId);
  const filtered = removeFromTree(tree, nodeId);
  await saveFileTree(projectId, filtered);
  return filtered;
}

// ── Internal helpers ─────────────────────────────────────────────────

function findNode(nodes: FileNode[], id: string): FileNode | null {
  for (const node of nodes) {
    if (node.id === id) return node;
    if (node.children) {
      const found = findNode(node.children, id);
      if (found) return found;
    }
  }
  return null;
}

function removeFromTree(nodes: FileNode[], id: string): FileNode[] {
  return nodes
    .filter((n) => n.id !== id)
    .map((n) => {
      if (n.children) {
        return { ...n, children: removeFromTree(n.children, id) };
      }
      return n;
    });
}
