import { useState, useEffect, useCallback } from "react";
import {
  addFile,
  addFolder,
  getFileTree,
  moveNode,
  removeNode,
  renameNode,
} from "@/services/fileIO";
import type { ProjectFileTree } from "@/types";

export function useProjectFileSystem(projectId: string | undefined) {
  const [fileTree, setFileTree] = useState<ProjectFileTree>([]);
  const [expandedFolders, setExpandedFolders] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (!projectId) return;
    (async () => {
      const tree = await getFileTree(projectId);
      setFileTree(tree);
    })();
  }, [projectId]);

  const toggleFolder = useCallback((folderId: string) => {
    setExpandedFolders((prev) => {
      const next = new Set(prev);
      if (next.has(folderId)) next.delete(folderId);
      else next.add(folderId);
      return next;
    });
  }, []);

  const createFolder = useCallback(
    async (parentId: string | null, name: string) => {
      if (!projectId) return;
      const updatedTree = await addFolder(projectId, parentId, name);
      setFileTree(updatedTree);
      if (parentId) setExpandedFolders((prev) => new Set(prev).add(parentId));
    },
    [projectId]
  );

  const createFile = useCallback(
    async (parentId: string | null, name: string) => {
      if (!projectId) return;
      const updatedTree = await addFile(projectId, parentId, name);
      setFileTree(updatedTree);
      if (parentId) setExpandedFolders((prev) => new Set(prev).add(parentId));
    },
    [projectId]
  );

  const rename = useCallback(
    async (nodeId: string, newName: string) => {
      if (!projectId) return;
      const updatedTree = await renameNode(projectId, nodeId, newName);
      setFileTree(updatedTree);
    },
    [projectId]
  );

  const move = useCallback(
    async (nodeId: string, targetFolderId: string | null) => {
      if (!projectId) return;
      const updatedTree = await moveNode(projectId, nodeId, targetFolderId);
      setFileTree(updatedTree);
      if (targetFolderId) setExpandedFolders((prev) => new Set(prev).add(targetFolderId));
    },
    [projectId]
  );

  const remove = useCallback(
    async (nodeId: string) => {
      if (!projectId) return;
      const updatedTree = await removeNode(projectId, nodeId);
      setFileTree(updatedTree);
    },
    [projectId]
  );

  return {
    fileTree,
    expandedFolders,
    toggleFolder,
    createFolder,
    createFile,
    rename,
    move,
    remove,
  };
}
