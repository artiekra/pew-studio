import React, { useEffect, useState, useCallback } from "react";
import { View, Pressable, Alert, Modal, TextInput } from "react-native";
import { Stack, useLocalSearchParams, useRouter, useFocusEffect } from "expo-router";
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
  SparklesIcon,
  AlertCircleIcon,
  CheckCircleIcon,
  XCircleIcon,
} from "lucide-react-native";
import Animated, { useAnimatedStyle } from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { isAiConfigured } from "@/lib/aiSettings";

import { getProjects } from "@/services/projectRepository";
import { exportProjectAsZip } from "@/services/zipService";
import type { Project, FileNode } from "@/types";

import { useProjectFileSystem } from "@/hooks/useProjectFileSystem";
import { useExplorerState, ExplorerContext } from "@/hooks/useExplorerState";
import { useTreeDragAndDrop } from "@/hooks/useTreeDragAndDrop";

import { DragContext } from "@/components/project/DragContext";
import { FileTreeNode } from "@/components/project/FileTreeNode";
import { ProjectModals } from "@/components/project/ProjectModals";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

export default function ProjectScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const [project, setProject] = useState<Project | null>(null);
  const [exportStatus, setExportStatus] = useState<{
    status: "success" | "error";
    message: string;
  } | null>(null);
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

  // Explorer state (modals)
  const { state, dispatch } = useExplorerState();

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
          headerRight: () => (
            <Pressable
              onPress={() => {
                router.push({ pathname: "/ai/[projectId]", params: { projectId: id } });
              }}
              className="ios:mr-0 mr-2 p-1"
              hitSlop={8}>
              <View className="flex-row items-center">
                <Icon as={SparklesIcon} className="size-6 text-foreground" size={24} />
              </View>
            </Pressable>
          ),
        }}
      />

      <ExplorerContext.Provider value={{ state, dispatch, createFolder, createFile, rename, move, remove, fileTree }}>
      <View className="flex-1 bg-background" {...panResponder.panHandlers}>
        {/* ── File tree ─────────────────────────────────────────── */}
        <View className="flex-1 p-4" ref={treeContainerRef} onLayout={onTreeLayout}>
          <View className="mb-2 flex-row gap-2">
            <Pressable
              className="flex-row items-center gap-2 rounded-lg px-3 py-2 active:opacity-70"
              onPress={() => dispatch({ type: "START_CREATE", itemType: "file", parentPath: null })}>
              <Icon as={FilePlusIcon} className="size-4 text-muted-foreground" size={16} />
              <Text className="text-sm text-muted-foreground">New file</Text>
            </Pressable>
            <Pressable
              className="flex-row items-center gap-2 rounded-lg px-3 py-2 active:opacity-70"
              onPress={() => dispatch({ type: "START_CREATE", itemType: "folder", parentPath: null })}>
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
                  const exported = await exportProjectAsZip(id, project.name);
                  if (exported) {
                    setExportStatus({
                      status: "success",
                      message: "Your level has been successfully exported.",
                    });
                  }
                } catch (err) {
                  setExportStatus({
                    status: "error",
                    message: String(err),
                  });
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

      <ProjectModals />

      {/* ── Export Result Alert ───────────────────────────────── */}
      <AlertDialog
        open={exportStatus !== null}
        onOpenChange={(open) => {
          if (!open) setExportStatus(null);
        }}>
        <AlertDialogContent>
          <AlertDialogHeader className="items-center sm:items-center">
            {/* {exportStatus?.status === "success" ? ( */}
            {/*   <Icon as={CheckCircleIcon} className="mb-2 size-12 text-green-500" size={48} /> */}
            {/* ) : ( */}
            {/*   <Icon as={XCircleIcon} className="mb-2 size-12 text-destructive" size={48} /> */}
            {/* )} */}
            <AlertDialogTitle
              className={exportStatus?.status === "success" ? "text-green-500" : ""}>
              {exportStatus?.status === "success" ? "Export Successful" : "Export Failed"}
            </AlertDialogTitle>
            <AlertDialogDescription className="text-center">
              {exportStatus?.message}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="sm:justify-center">
            <AlertDialogAction
              className={
                exportStatus?.status === "success"
                  ? "bg-green-500 hover:bg-green-600 active:bg-green-600/90"
                  : ""
              }
              onPress={() => setExportStatus(null)}>
              <Text className={exportStatus?.status === "success" ? "text-white" : ""}>
                Dismiss
              </Text>
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      </ExplorerContext.Provider>
    </>
  );
}
