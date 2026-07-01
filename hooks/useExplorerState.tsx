import React, { createContext, useContext, useReducer } from "react";
import type { FileNode, ProjectFileTree } from "@/types";

export type ExplorerState =
  | { mode: "idle" }
  | { mode: "creating"; itemType: "file" | "folder"; parentPath: string | null }
  | { mode: "renaming"; node: FileNode }
  | { mode: "moving"; node: FileNode }
  | { mode: "deleting"; node: FileNode };

export type ExplorerAction =
  | { type: "START_CREATE"; itemType: "file" | "folder"; parentPath: string | null }
  | { type: "START_RENAME"; node: FileNode }
  | { type: "START_MOVE"; node: FileNode }
  | { type: "START_DELETE"; node: FileNode }
  | { type: "CANCEL" };

function explorerReducer(state: ExplorerState, action: ExplorerAction): ExplorerState {
  switch (action.type) {
    case "START_CREATE":
      return { mode: "creating", itemType: action.itemType, parentPath: action.parentPath };
    case "START_RENAME":
      return { mode: "renaming", node: action.node };
    case "START_MOVE":
      return { mode: "moving", node: action.node };
    case "START_DELETE":
      return { mode: "deleting", node: action.node };
    case "CANCEL":
      return { mode: "idle" };
    default:
      return state;
  }
}

export type ExplorerContextType = {
  state: ExplorerState;
  dispatch: React.Dispatch<ExplorerAction>;
  createFolder: (parentId: string | null, name: string) => Promise<void>;
  createFile: (parentId: string | null, name: string) => Promise<void>;
  rename: (nodeId: string, newName: string) => Promise<void>;
  move: (nodeId: string, targetId: string | null) => Promise<void>;
  remove: (nodeId: string) => Promise<void>;
  fileTree: ProjectFileTree;
};

export const ExplorerContext = createContext<ExplorerContextType | null>(null);

export function useExplorerContext() {
  const context = useContext(ExplorerContext);
  if (!context) throw new Error("useExplorerContext must be used within ExplorerProvider");
  return context;
}

export function useExplorerState() {
  const [state, dispatch] = useReducer(explorerReducer, { mode: "idle" });
  return { state, dispatch };
}

export function ExplorerProvider({
  children,
  createFolder,
  createFile,
  rename,
  move,
  remove,
  fileTree,
}: {
  children: React.ReactNode;
  createFolder: (parentId: string | null, name: string) => Promise<void>;
  createFile: (parentId: string | null, name: string) => Promise<void>;
  rename: (nodeId: string, newName: string) => Promise<void>;
  move: (nodeId: string, targetId: string | null) => Promise<void>;
  remove: (nodeId: string) => Promise<void>;
  fileTree: ProjectFileTree;
}) {
  const { state, dispatch } = useExplorerState();
  return (
    <ExplorerContext.Provider
      value={{
        state,
        dispatch,
        createFolder,
        createFile,
        rename,
        move,
        remove,
        fileTree,
      }}>
      {children}
    </ExplorerContext.Provider>
  );
}
