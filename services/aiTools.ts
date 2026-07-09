import type { FileNode } from "@/types";

// ── Tool Definitions (OpenAI function-calling format) ────────────────

export const AI_TOOLS = [
  {
    type: "function" as const,
    function: {
      name: "list_files",
      description:
        "List all files and folders in the project. Returns a tree structure with names, types, and relative paths.",
      parameters: {
        type: "object",
        properties: {},
        required: [],
      },
    },
  },
  {
    type: "function" as const,
    function: {
      name: "read_file",
      description:
        "Read the full text content of a file by its relative path (e.g. 'level.lua' or 'lib/utils.lua').",
      parameters: {
        type: "object",
        properties: {
          path: {
            type: "string",
            description: "Relative path of the file to read.",
          },
        },
        required: ["path"],
      },
    },
  },
  {
    type: "function" as const,
    function: {
      name: "write_file",
      description:
        "Write content to a file. Creates the file if it doesn't exist, overwrites if it does. Parent directories are created automatically.",
      parameters: {
        type: "object",
        properties: {
          path: {
            type: "string",
            description: "Relative path of the file to write.",
          },
          content: {
            type: "string",
            description: "The full text content to write to the file.",
          },
        },
        required: ["path", "content"],
      },
    },
  },
];

// ── Flatten file tree to a readable string ───────────────────────────

function flattenTree(nodes: FileNode[], indent: string = ""): string {
  let result = "";
  for (const node of nodes) {
    if (node.type === "folder") {
      result += `${indent}📁 ${node.name}/\n`;
      if (node.children) {
        result += flattenTree(node.children, indent + "  ");
      }
    } else {
      result += `${indent}📄 ${node.name}\n`;
    }
  }
  return result;
}

// ── Undo Stack ───────────────────────────────────────────────────────

export type UndoEntry = {
  path: string;
  previousContent: string | null; // null means the file didn't exist before
};

export type UndoGroup = {
  messageId: string;
  entries: UndoEntry[];
};

// ── Tool Executor ────────────────────────────────────────────────────

import { getFileTree, readFileContent, writeFileContent, addFile } from "@/services/fileIO";
import * as FileSystem from "expo-file-system/legacy";
import { getProjectDir } from "@/services/fileIO";

export type ToolResult = {
  output: string;
  undoEntry?: UndoEntry;
};

export async function executeTool(
  projectId: string,
  toolName: string,
  args: Record<string, any>
): Promise<ToolResult> {
  switch (toolName) {
    case "list_files": {
      const tree = await getFileTree(projectId);
      if (tree.length === 0) {
        return { output: "(empty project — no files or folders)" };
      }
      return { output: flattenTree(tree) };
    }

    case "read_file": {
      const path = args.path as string;
      try {
        const content = await readFileContent(projectId, path);
        return { output: content };
      } catch (e: any) {
        return { output: `Error: file not found — ${path}` };
      }
    }

    case "write_file": {
      const path = args.path as string;
      const content = args.content as string;

      // Capture previous content for undo
      let previousContent: string | null = null;
      try {
        const uri = `${getProjectDir(projectId)}${path}`;
        const info = await FileSystem.getInfoAsync(uri);
        if (info.exists && !info.isDirectory) {
          previousContent = await readFileContent(projectId, path);
        }
      } catch {
        // File doesn't exist — that's fine, previousContent stays null
      }

      // Write the file
      try {
        // Ensure parent directories exist
        const parts = path.split("/");
        if (parts.length > 1) {
          const parentDir = parts.slice(0, -1).join("/");
          const parentUri = `${getProjectDir(projectId)}${parentDir}`;
          await FileSystem.makeDirectoryAsync(parentUri, { intermediates: true });
        }
        await writeFileContent(projectId, path, content);
        const verb = previousContent !== null ? "Updated" : "Created";
        return {
          output: `${verb} file: ${path}`,
          undoEntry: { path, previousContent },
        };
      } catch (e: any) {
        return { output: `Error writing file: ${e.message}` };
      }
    }

    default:
      return { output: `Unknown tool: ${toolName}` };
  }
}

// ── Undo Executor ────────────────────────────────────────────────────

export async function executeUndo(projectId: string, undoGroup: UndoGroup): Promise<string[]> {
  const results: string[] = [];

  // Undo in reverse order
  for (const entry of [...undoGroup.entries].reverse()) {
    try {
      if (entry.previousContent === null) {
        // File didn't exist before — delete it
        const uri = `${getProjectDir(projectId)}${entry.path}`;
        await FileSystem.deleteAsync(uri, { idempotent: true });
        results.push(`Deleted: ${entry.path}`);
      } else {
        // Restore previous content
        await writeFileContent(projectId, entry.path, entry.previousContent);
        results.push(`Restored: ${entry.path}`);
      }
    } catch (e: any) {
      results.push(`Failed to undo ${entry.path}: ${e.message}`);
    }
  }

  return results;
}
