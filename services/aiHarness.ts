import { sendChatCompletion, type ApiMessage } from "@/services/aiClient";
import { executeTool, type UndoEntry, type UndoGroup } from "@/services/aiTools";
import { getFileTree } from "@/services/fileIO";
import type { ChatMessage } from "@/types";

// ── Types ────────────────────────────────────────────────────────────

export type ToolCallInfo = {
  name: string;
  args: Record<string, any>;
  result: string;
};

export type HarnessResult = {
  assistantContent: string;
  toolCalls: ToolCallInfo[];
  undoGroup: UndoGroup | null; // null if no file writes happened
};

// ── Build system prompt with project context ─────────────────────────

function buildSystemPrompt(projectName: string, fileTreeStr: string): string {
  return `You are an AI coding assistant integrated into PewPew Studio, a game development IDE for PewPew Live (a Lua-based game engine).

You are working on the project "${projectName}".

Current project file structure:
${fileTreeStr || "(empty project)"}

You have these tools available:
- list_files: List all files and folders in the project
- read_file: Read file content by path
- write_file: Create or update a file

Guidelines:
- When the user asks you to edit code, read the file first, then write the updated version.
- Write complete file contents when using write_file (not partial patches).
- Be concise in explanations but thorough in code.
- The project uses Lua for game logic (PewPew Live API).
- When the user mentions a file with @filename, that refers to a project file.`;
}

// ── Flatten file tree for the system prompt ──────────────────────────

import type { FileNode } from "@/types";

function flattenTree(nodes: FileNode[], indent: string = ""): string {
  let result = "";
  for (const node of nodes) {
    if (node.type === "folder") {
      result += `${indent}${node.name}/\n`;
      if (node.children) {
        result += flattenTree(node.children, indent + "  ");
      }
    } else {
      result += `${indent}${node.name}\n`;
    }
  }
  return result;
}

// ── Convert ChatMessage[] to ApiMessage[] ────────────────────────────

function toApiMessages(messages: ChatMessage[]): ApiMessage[] {
  return messages
    .filter((m) => m.role === "user" || m.role === "assistant")
    .map((m) => ({
      role: m.role as "user" | "assistant",
      content: m.content,
    }));
}

// ── Resolve @file references in user input ───────────────────────────

export function resolveFileReferences(
  text: string,
  allPaths: string[]
): { resolvedText: string; mentionedFiles: string[] } {
  const mentionedFiles: string[] = [];

  // Match @filename patterns (supports paths like @lib/utils.lua)
  const resolved = text.replace(/@([\w./-]+)/g, (match, ref) => {
    // Try exact match first
    const exact = allPaths.find((p) => p === ref);
    if (exact) {
      mentionedFiles.push(exact);
      return `\`${exact}\``;
    }
    // Try matching just the filename
    const byName = allPaths.find((p) => p.endsWith(`/${ref}`) || p === ref);
    if (byName) {
      mentionedFiles.push(byName);
      return `\`${byName}\``;
    }
    return match; // Leave as-is if no match
  });

  return { resolvedText: resolved, mentionedFiles };
}

// ── Collect all file paths from a tree ───────────────────────────────

function collectPaths(nodes: FileNode[]): string[] {
  const paths: string[] = [];
  for (const node of nodes) {
    paths.push(node.id);
    if (node.children) {
      paths.push(...collectPaths(node.children));
    }
  }
  return paths;
}

// ── The main harness: orchestrates the conversation loop ─────────────

const MAX_TOOL_ROUNDS = 10; // Safety limit to prevent infinite loops

export async function runHarness(
  projectId: string,
  projectName: string,
  chatMessages: ChatMessage[],
  userText: string,
  model: string,
  onToolCall?: (info: ToolCallInfo) => void
): Promise<HarnessResult> {
  // 1. Build context
  const fileTree = await getFileTree(projectId);
  const fileTreeStr = flattenTree(fileTree);
  const allPaths = collectPaths(fileTree);

  // 2. Resolve @file references
  const { resolvedText, mentionedFiles } = resolveFileReferences(userText, allPaths);

  // 3. If files were mentioned, auto-attach their content
  let contextPrefix = "";
  for (const filePath of mentionedFiles) {
    try {
      const { readFileContent } = await import("@/services/fileIO");
      const content = await readFileContent(projectId, filePath);
      contextPrefix += `\n\n--- Content of ${filePath} ---\n${content}\n--- End of ${filePath} ---\n`;
    } catch {
      // File couldn't be read, skip
    }
  }

  const finalUserText =
    contextPrefix.length > 0
      ? `${resolvedText}\n${contextPrefix}`
      : resolvedText;

  // 4. Build API messages
  const systemMessage: ApiMessage = {
    role: "system",
    content: buildSystemPrompt(projectName, fileTreeStr),
  };

  const historyMessages = toApiMessages(chatMessages);
  const userMessage: ApiMessage = { role: "user", content: finalUserText };

  let conversation: ApiMessage[] = [
    systemMessage,
    ...historyMessages,
    userMessage,
  ];

  // 5. Tool-calling loop
  const allToolCalls: ToolCallInfo[] = [];
  const undoEntries: UndoEntry[] = [];

  for (let round = 0; round < MAX_TOOL_ROUNDS; round++) {
    const response = await sendChatCompletion(conversation, model);
    const msg = response.message;

    // Add assistant message to conversation
    conversation.push(msg);

    // If no tool calls, we're done
    if (!msg.tool_calls || msg.tool_calls.length === 0) {
      const undoGroup: UndoGroup | null =
        undoEntries.length > 0
          ? { messageId: "", entries: undoEntries } // messageId filled by caller
          : null;

      return {
        assistantContent: msg.content || "",
        toolCalls: allToolCalls,
        undoGroup,
      };
    }

    // Execute each tool call
    for (const tc of msg.tool_calls) {
      let args: Record<string, any> = {};
      try {
        args = JSON.parse(tc.function.arguments);
      } catch {
        args = {};
      }

      const result = await executeTool(projectId, tc.function.name, args);

      const info: ToolCallInfo = {
        name: tc.function.name,
        args,
        result: result.output,
      };
      allToolCalls.push(info);

      if (result.undoEntry) {
        undoEntries.push(result.undoEntry);
      }

      // Notify the UI about this tool call
      onToolCall?.(info);

      // Append the tool result to the conversation
      conversation.push({
        role: "tool",
        content: result.output,
        tool_call_id: tc.id,
      });
    }
  }

  // If we exhausted rounds, return what we have
  return {
    assistantContent:
      "I've reached the maximum number of tool-calling rounds. Here's what I did so far.",
    toolCalls: allToolCalls,
    undoGroup:
      undoEntries.length > 0
        ? { messageId: "", entries: undoEntries }
        : null,
  };
}
