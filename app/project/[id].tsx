import React, { useEffect, useState, useCallback } from "react";
import { View, Pressable, Alert } from "react-native";
import { Stack, useLocalSearchParams, useRouter } from "expo-router";
import { Text } from "@/components/ui/text";
import { Icon } from "@/components/ui/icon";
import { Button } from "@/components/ui/button";
import {
  ArrowLeftIcon,
  FileIcon,
  FilePlusIcon,
  FolderIcon,
  FolderPlusIcon,
  PlayIcon,
  RocketIcon,
  PackageIcon,
} from "lucide-react-native";
import Animated, { useAnimatedStyle } from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { getProjects, type Project } from "@/lib/projects";
import { exportProjectAsZip, type FileNode } from "@/lib/fileSystem";

import { useProjectFileSystem } from "@/hooks/useProjectFileSystem";
import { useProjectModals } from "@/hooks/useProjectModals";
import { useTreeDragAndDrop } from "@/hooks/useTreeDragAndDrop";

import { DragContext } from "@/components/project/DragContext";
import { FileTreeNode } from "@/components/project/FileTreeNode";
import { ProjectModals } from "@/components/project/ProjectModals";

export default function ProjectScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const [project, setProject] = useState<Project | null>(null);
  const insets = useSafeAreaInsets();

  // File system state & operations
  const {
    fileTree,
    expandedFolders,
    toggleFolder,
    createFolder,
    createFile,
    rename,
    move,
    remove,
  } = useProjectFileSystem(id);

  // Modals state & operations
  const { activeModal, closeModals, openNewFolder, openNewFile, openRename, openMove, openDelete } =
    useProjectModals();

  // Drag and drop state & operations
  const {
    draggedNode,
    dropTargetId,
    dragY,
    dragOpacity,
    dragScale,
    treeContainerRef,
    panResponder,
    registerLayout,
    startDrag,
    onTreeLayout,
  } = useTreeDragAndDrop(fileTree, expandedFolders, move);

  const dragPreviewStyle = useAnimatedStyle(() => ({
    position: "absolute" as const,
    left: 24,
    right: 24,
    top: dragY.value - 24,
    opacity: dragOpacity.value,
    transform: [{ scale: dragScale.value }],
    zIndex: 9999,
  }));

  // Load project details
  useEffect(() => {
    (async () => {
      const projects = await getProjects();
      const found = projects.find((p) => p.id === id);
      setProject(found ?? null);
    })();
  }, [id]);

  const handleOpenFile = useCallback(
    (node: FileNode) => {
      router.push({
        pathname: "/editor",
        params: { projectId: id, fileId: node.id },
      });
    },
    [id, router]
  );

  if (!project) return null;

  // Compute drop target label for the preview
  let dropLabel = "";
  if (draggedNode) {
    if (dropTargetId === undefined) {
      dropLabel = "";
    } else if (dropTargetId === null) {
      dropLabel = "→ / (root)";
    } else {
      const name = dropTargetId.split("/").pop() ?? dropTargetId;
      dropLabel = `→ ${name}/`;
    }
  }

  return (
    <>
      <Stack.Screen
        options={{
          title: project.name,
          headerLeft: () => (
            <Pressable onPress={() => router.back()} className="ios:ml-0 ml-2 mr-6 p-1" hitSlop={8}>
              <Icon as={ArrowLeftIcon} className="size-6 text-foreground" size={24} />
            </Pressable>
          ),
        }}
      />

      <View className="flex-1 bg-background" {...panResponder.panHandlers}>
        {/* ── File tree ─────────────────────────────────────────── */}
        <View className="flex-1 p-4" ref={treeContainerRef} onLayout={onTreeLayout}>
          <View className="mb-2 flex-row gap-2">
            <Pressable
              className="flex-row items-center gap-2 rounded-lg px-3 py-2 active:opacity-70"
              onPress={() => openNewFile(null)}>
              <Icon as={FilePlusIcon} className="size-4 text-muted-foreground" size={16} />
              <Text className="text-sm text-muted-foreground">New file</Text>
            </Pressable>
            <Pressable
              className="flex-row items-center gap-2 rounded-lg px-3 py-2 active:opacity-70"
              onPress={() => openNewFolder(null)}>
              <Icon as={FolderPlusIcon} className="size-4 text-muted-foreground" size={16} />
              <Text className="text-sm text-muted-foreground">New folder</Text>
            </Pressable>
          </View>

          <DragContext.Provider
            value={{
              draggedNodeId: draggedNode?.id ?? null,
              dropTargetId,
              registerLayout,
              startDrag,
            }}>
            {fileTree.map((node) => (
              <FileTreeNode
                key={node.id}
                node={node}
                depth={0}
                expandedFolders={expandedFolders}
                onToggle={toggleFolder}
                onNewFolder={openNewFolder}
                onNewFile={openNewFile}
                onDelete={openDelete}
                onRename={openRename}
                onMove={openMove}
                onOpenFile={handleOpenFile}
              />
            ))}
          </DragContext.Provider>

          {/* ── Root drop zone ──────────────────────────────────── */}
          {draggedNode && (
            <View
              className={`mt-1 rounded-lg border-2 border-dashed px-4 py-4 ${
                dropTargetId === null ? "border-primary bg-primary/10" : "border-transparent"
              }`}>
              <Text
                className={`text-center text-sm ${
                  dropTargetId === null ? "text-primary" : "text-muted-foreground/50"
                }`}>
                Drop here to move to root
              </Text>
            </View>
          )}
        </View>

        {/* ── Bottom action bar ─────────────────────────────────── */}
        <View
          className="border-t border-border bg-card px-4 pt-4"
          style={{ paddingBottom: Math.max(insets.bottom, 16) }}>
          <View className="flex-row gap-3">
            <Button
              className="flex-1 flex-row items-center justify-center gap-2"
              onPress={() => router.push({ pathname: "/play", params: { projectId: id } })}>
              <Icon as={PlayIcon} className="size-4 text-primary-foreground" size={16} />
              <Text className="font-semibold text-primary-foreground">Play</Text>
            </Button>
            <Button
              variant="secondary"
              className="flex-1 flex-row items-center justify-center gap-2">
              <Icon as={RocketIcon} className="size-4 text-secondary-foreground" size={16} />
              <Text className="font-semibold text-secondary-foreground">Release</Text>
            </Button>
            <Button
              variant="outline"
              className="flex-1 flex-row items-center justify-center gap-2"
              onPress={async () => {
                try {
                  await exportProjectAsZip(id, project.name);
                  Alert.alert("Export Successful", "Your level has been successfully exported.");
                } catch (err) {
                  Alert.alert("Export Failed", String(err));
                }
              }}>
              <Icon as={PackageIcon} className="size-4 text-foreground" size={16} />
              <Text className="font-semibold text-foreground">Export</Text>
            </Button>
          </View>
        </View>

        {/* ── Drag preview overlay ──────────────────────────────── */}
        <Animated.View style={dragPreviewStyle} pointerEvents="none">
          <View className="flex-row items-center gap-3 rounded-xl border border-primary bg-card px-4 py-3 shadow-lg shadow-black/20">
            <Icon
              as={draggedNode?.type === "folder" ? FolderIcon : FileIcon}
              className="size-5 text-primary"
              size={20}
            />
            <View className="flex-1">
              <Text className="text-base font-medium text-foreground" numberOfLines={1}>
                {draggedNode?.name}
              </Text>
              {dropLabel ? (
                <Text className="text-xs text-primary" numberOfLines={1}>
                  {dropLabel}
                </Text>
              ) : null}
            </View>
          </View>
        </Animated.View>
      </View>

      <ProjectModals
        activeModal={activeModal}
        closeModals={closeModals}
        onCreateFolder={createFolder}
        onCreateFile={createFile}
        onRename={rename}
        onMove={move}
        onDelete={remove}
        fileTree={fileTree}
      />
    </>
  );
}
