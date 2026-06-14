import { useState, useCallback } from 'react';
import type { FileNode } from "@/lib/fileSystem";

export type ModalState =
  | { type: "new-folder"; parentId: string | null }
  | { type: "new-file"; parentId: string | null }
  | { type: "rename"; node: FileNode }
  | { type: "move"; node: FileNode }
  | { type: "delete"; node: FileNode }
  | null;

export function useProjectModals() {
  const [activeModal, setActiveModal] = useState<ModalState>(null);

  const closeModals = useCallback(() => setActiveModal(null), []);

  const openNewFolder = useCallback((parentId: string | null) => {
    setActiveModal({ type: "new-folder", parentId });
  }, []);

  const openNewFile = useCallback((parentId: string | null) => {
    setActiveModal({ type: "new-file", parentId });
  }, []);

  const openRename = useCallback((node: FileNode) => {
    setActiveModal({ type: "rename", node });
  }, []);

  const openMove = useCallback((node: FileNode) => {
    setActiveModal({ type: "move", node });
  }, []);

  const openDelete = useCallback((node: FileNode) => {
    setActiveModal({ type: "delete", node });
  }, []);

  return {
    activeModal,
    closeModals,
    openNewFolder,
    openNewFile,
    openRename,
    openMove,
    openDelete,
  };
}
