export type FileNode = {
  id: string; // The relative path from the project root, e.g., "level.lua", "folder/file.txt", "folder"
  name: string;
  type: "file" | "folder";
  content?: string; // Optional text content (not loaded by default)
  children?: FileNode[];
};

export type ProjectFileTree = FileNode[];

export type Project = {
  id: string;
  name: string;
  color?: string;
  createdAt: string; // ISO 8601
  updatedAt: string; // ISO 8601
};
