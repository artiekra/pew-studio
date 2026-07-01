import React, { useState, useEffect } from "react";
import { Modal, Pressable, TextInput, View, ScrollView } from "react-native";
import { Text } from "@/components/ui/text";
import { Button } from "@/components/ui/button";
import { Icon } from "@/components/ui/icon";
import { FolderIcon } from "lucide-react-native";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import type { ModalState } from "@/hooks/useProjectModals";
import { FolderPickerList } from "./FolderPickerList";
import type { ProjectFileTree } from "@/types";

export function ProjectModals({
  activeModal,
  closeModals,
  onCreateFolder,
  onCreateFile,
  onRename,
  onMove,
  onDelete,
  fileTree,
}: {
  activeModal: ModalState;
  closeModals: () => void;
  onCreateFolder: (parentId: string | null, name: string) => Promise<void>;
  onCreateFile: (parentId: string | null, name: string) => Promise<void>;
  onRename: (nodeId: string, newName: string) => Promise<void>;
  onMove: (nodeId: string, targetId: string | null) => Promise<void>;
  onDelete: (nodeId: string) => Promise<void>;
  fileTree: ProjectFileTree;
}) {
  const [inputValue, setInputValue] = useState("");

  useEffect(() => {
    if (activeModal?.type === "rename") {
      setInputValue(activeModal.node.name);
    } else {
      setInputValue("");
    }
  }, [activeModal]);

  const handleCreateFolder = async () => {
    const trimmed = inputValue.trim();
    if (!trimmed || activeModal?.type !== "new-folder") return;
    await onCreateFolder(activeModal.parentId, trimmed);
    closeModals();
  };

  const handleCreateFile = async () => {
    const trimmed = inputValue.trim();
    if (!trimmed || activeModal?.type !== "new-file") return;
    await onCreateFile(activeModal.parentId, trimmed);
    closeModals();
  };

  const handleRename = async () => {
    const trimmed = inputValue.trim();
    if (!trimmed || activeModal?.type !== "rename") return;
    if (trimmed !== activeModal.node.name) {
      await onRename(activeModal.node.id, trimmed);
    }
    closeModals();
  };

  const handleMove = async (targetFolderId: string | null) => {
    if (activeModal?.type !== "move") return;
    await onMove(activeModal.node.id, targetFolderId);
    closeModals();
  };

  const confirmDelete = async () => {
    if (activeModal?.type !== "delete") return;
    await onDelete(activeModal.node.id);
    closeModals();
  };

  return (
    <>
      {/* ── New folder modal ────────────────────────────────────── */}
      <Modal
        visible={activeModal?.type === "new-folder"}
        transparent
        animationType="fade"
        onRequestClose={closeModals}>
        <Pressable
          className="flex-1 items-center justify-center bg-black/50 p-6"
          onPress={closeModals}>
          <Pressable
            className="w-full max-w-sm gap-4 rounded-2xl border border-border bg-card p-6"
            onPress={() => {}}>
            <Text className="text-xl font-semibold text-foreground">New Folder</Text>
            <TextInput
              className="rounded-lg border border-border bg-secondary px-4 py-3 text-base text-foreground"
              placeholder="Folder name"
              placeholderTextColor="#888"
              value={inputValue}
              onChangeText={setInputValue}
              autoFocus
              onSubmitEditing={handleCreateFolder}
              returnKeyType="done"
            />
            <View className="flex-row justify-end gap-3">
              <Button variant="ghost" onPress={closeModals}>
                <Text>Cancel</Text>
              </Button>
              <Button onPress={handleCreateFolder} disabled={!inputValue.trim()}>
                <Text>Create</Text>
              </Button>
            </View>
          </Pressable>
        </Pressable>
      </Modal>

      {/* ── New file modal ──────────────────────────────────────── */}
      <Modal
        visible={activeModal?.type === "new-file"}
        transparent
        animationType="fade"
        onRequestClose={closeModals}>
        <Pressable
          className="flex-1 items-center justify-center bg-black/50 p-6"
          onPress={closeModals}>
          <Pressable
            className="w-full max-w-sm gap-4 rounded-2xl border border-border bg-card p-6"
            onPress={() => {}}>
            <Text className="text-xl font-semibold text-foreground">New File</Text>
            <TextInput
              className="rounded-lg border border-border bg-secondary px-4 py-3 text-base text-foreground"
              placeholder="File name (e.g. script.lua)"
              placeholderTextColor="#888"
              value={inputValue}
              onChangeText={setInputValue}
              autoFocus
              onSubmitEditing={handleCreateFile}
              returnKeyType="done"
            />
            <View className="flex-row justify-end gap-3">
              <Button variant="ghost" onPress={closeModals}>
                <Text>Cancel</Text>
              </Button>
              <Button onPress={handleCreateFile} disabled={!inputValue.trim()}>
                <Text>Create</Text>
              </Button>
            </View>
          </Pressable>
        </Pressable>
      </Modal>

      {/* ── Rename modal ────────────────────────────────────────── */}
      <Modal
        visible={activeModal?.type === "rename"}
        transparent
        animationType="fade"
        onRequestClose={closeModals}>
        <Pressable
          className="flex-1 items-center justify-center bg-black/50 p-6"
          onPress={closeModals}>
          <Pressable
            className="w-full max-w-sm gap-4 rounded-2xl border border-border bg-card p-6"
            onPress={() => {}}>
            <Text className="text-xl font-semibold text-foreground">
              Rename{" "}
              {activeModal?.type === "rename"
                ? activeModal.node.type === "folder"
                  ? "Folder"
                  : "File"
                : ""}
            </Text>
            <TextInput
              className="rounded-lg border border-border bg-secondary px-4 py-3 text-base text-foreground"
              placeholder="New name"
              placeholderTextColor="#888"
              value={inputValue}
              onChangeText={setInputValue}
              autoFocus
              onSubmitEditing={handleRename}
              returnKeyType="done"
              selectTextOnFocus
            />
            <View className="flex-row justify-end gap-3">
              <Button variant="ghost" onPress={closeModals}>
                <Text>Cancel</Text>
              </Button>
              <Button onPress={handleRename} disabled={!inputValue.trim()}>
                <Text>Rename</Text>
              </Button>
            </View>
          </Pressable>
        </Pressable>
      </Modal>

      {/* ── Move-to modal (folder picker) ───────────────────────── */}
      <Modal
        visible={activeModal?.type === "move"}
        transparent
        animationType="fade"
        onRequestClose={closeModals}>
        <Pressable
          className="flex-1 items-center justify-center bg-black/50 p-6"
          onPress={closeModals}>
          <Pressable
            className="w-full max-w-sm gap-2 rounded-2xl border border-border bg-card p-6"
            onPress={() => {}}>
            <Text className="mb-2 text-xl font-semibold text-foreground">Move to…</Text>
            <Text className="mb-3 text-sm text-muted-foreground">
              Select a destination for "{activeModal?.type === "move" ? activeModal.node.name : ""}"
            </Text>

            <ScrollView className="max-h-72" bounces={false}>
              <Pressable
                className="flex-row items-center gap-3 rounded-lg border border-border bg-secondary px-4 py-3 active:opacity-80"
                style={{ marginBottom: 4 }}
                onPress={() => handleMove(null)}>
                <Icon as={FolderIcon} className="size-5 text-muted-foreground" size={20} />
                <Text className="text-base text-foreground">/ (root)</Text>
              </Pressable>

              <FolderPickerList
                nodes={fileTree}
                depth={0}
                excludeId={activeModal?.type === "move" ? activeModal.node.id : null}
                onSelect={handleMove}
              />
            </ScrollView>

            <View className="mt-3 flex-row justify-end">
              <Button variant="ghost" onPress={closeModals}>
                <Text>Cancel</Text>
              </Button>
            </View>
          </Pressable>
        </Pressable>
      </Modal>

      {/* ── Delete confirmation dialog ──────────────────────────── */}
      <AlertDialog
        open={activeModal?.type === "delete"}
        onOpenChange={(open) => {
          if (!open && activeModal?.type === "delete") closeModals();
        }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              Delete{" "}
              {activeModal?.type === "delete"
                ? activeModal.node.type === "folder"
                  ? "Folder"
                  : "File"
                : ""}
            </AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "
              {activeModal?.type === "delete" ? activeModal.node.name : ""}"?
              {activeModal?.type === "delete" && activeModal.node.type === "folder"
                ? " All contents inside this folder will also be deleted."
                : ""}{" "}
              This cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>
              <Text>Cancel</Text>
            </AlertDialogCancel>
            <AlertDialogAction className="bg-destructive" onPress={confirmDelete}>
              <Text>Delete</Text>
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
