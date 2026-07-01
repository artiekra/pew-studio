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

export type ChatToolCall = {
  name: string;
  args: Record<string, any>;
  result: string;
};

export type ChatUndoGroup = {
  entries: {
    path: string;
    previousContent: string | null;
  }[];
  undone?: boolean; // true if user has already undone this group
};

export type ChatMessage = {
  id: string;
  role: "user" | "assistant" | "system";
  content: string;
  toolCalls?: ChatToolCall[];
  undoGroup?: ChatUndoGroup;
  createdAt: string; // ISO 8601
};

export type Chat = {
  id: string;
  projectId: string;
  title: string;
  messages: ChatMessage[];
  createdAt: string; // ISO 8601
  updatedAt: string; // ISO 8601
};
