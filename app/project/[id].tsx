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
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Icon } from "@/components/ui/icon";
import { Text } from "@/components/ui/text";
import {
  addFile,
  addFolder,
  getFileTree,
  moveNode,
  removeNode,
  renameNode,
  type FileNode,
  type ProjectFileTree,
} from "@/lib/fileSystem";
import { getProjects, type Project } from "@/lib/projects";
import { Stack, useLocalSearchParams, useRouter } from "expo-router";
import {
  ArrowLeftIcon,
  ChevronDownIcon,
  ChevronRightIcon,
  EllipsisVerticalIcon,
  FileIcon,
  FilePlusIcon,
  FolderIcon,
  FolderPlusIcon,
  GripVerticalIcon,
  MoveIcon,
  PackageIcon,
  PencilIcon,
  PlayIcon,
  RocketIcon,
  Trash2Icon,
} from "lucide-react-native";
import * as React from "react";
import {
  type GestureResponderEvent,
  type LayoutChangeEvent,
  Modal,
  PanResponder,
  type PanResponderGestureState,
  Pressable,
  ScrollView,
  TextInput,
  View,
} from "react-native";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from "react-native-reanimated";

// ── Drag context ────────────────────────────────────────────────────

type FlatNode = {
  node: FileNode;
  depth: number;
  parentId: string | null;
};

function flattenVisibleTree(
  nodes: FileNode[],
  depth: number,
  expandedFolders: Set<string>,
  parentId: string | null
): FlatNode[] {
  const result: FlatNode[] = [];
  for (const node of nodes) {
    result.push({ node, depth, parentId });
    if (node.type === "folder" && expandedFolders.has(node.id) && node.children) {
      result.push(...flattenVisibleTree(node.children, depth + 1, expandedFolders, node.id));
    }
  }
  return result;
}

type DragContextType = {
  draggedNodeId: string | null;
  dropTargetId: string | null | undefined; // null = root, undefined = none, string = folder id
  registerLayout: (nodeId: string, absoluteY: number, height: number) => void;
  startDrag: (node: FileNode, pageY: number) => void;
};

const DragContext = React.createContext<DragContextType>({
  draggedNodeId: null,
  dropTargetId: undefined,
  registerLayout: () => {},
  startDrag: () => {},
});

// ── Screen ──────────────────────────────────────────────────────────

export default function ProjectScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const [project, setProject] = React.useState<Project | null>(null);
  const [fileTree, setFileTree] = React.useState<ProjectFileTree>([]);
  const [expandedFolders, setExpandedFolders] = React.useState<Set<string>>(new Set());

  // New-folder modal state
  const [folderModalVisible, setFolderModalVisible] = React.useState(false);
  const [folderParentId, setFolderParentId] = React.useState<string | null>(null);
  const [newFolderName, setNewFolderName] = React.useState("");

  // New-file modal state
  const [fileModalVisible, setFileModalVisible] = React.useState(false);
  const [fileParentId, setFileParentId] = React.useState<string | null>(null);
  const [newFileName, setNewFileName] = React.useState("");

  // Rename modal state
  const [renameModalVisible, setRenameModalVisible] = React.useState(false);
  const [nodeToRename, setNodeToRename] = React.useState<FileNode | null>(null);
  const [renameValue, setRenameValue] = React.useState("");

  // Move modal state (from dropdown menu)
  const [moveModalVisible, setMoveModalVisible] = React.useState(false);
  const [nodeToMove, setNodeToMove] = React.useState<FileNode | null>(null);

  // Deletion state
  const [nodeToDelete, setNodeToDelete] = React.useState<FileNode | null>(null);

  // ── Drag state ──────────────────────────────────────────────────
  const [draggedNode, setDraggedNode] = React.useState<FileNode | null>(null);
  const [dropTargetId, setDropTargetId] = React.useState<string | null | undefined>(undefined);

  const dragY = useSharedValue(0);
  const dragOpacity = useSharedValue(0);
  const dragScale = useSharedValue(0.95);

  // Store tree container's absolute Y for coordinate mapping
  const treeAbsoluteYRef = React.useRef(0);
  const treeContainerRef = React.useRef<View>(null);

  // Store each node's absolute Y + height for hit-testing
  const nodeLayoutsRef = React.useRef<Map<string, { absoluteY: number; height: number }>>(
    new Map()
  );

  // Flat node list for parent lookups during drop target computation
  const flatNodesRef = React.useRef<FlatNode[]>([]);

  // Keep flat nodes in sync
  React.useEffect(() => {
    flatNodesRef.current = flattenVisibleTree(fileTree, 0, expandedFolders, null);
  }, [fileTree, expandedFolders]);

  const registerLayout = React.useCallback((nodeId: string, absoluteY: number, height: number) => {
    nodeLayoutsRef.current.set(nodeId, { absoluteY, height });
  }, []);

  // ── Drag pan responder ──────────────────────────────────────────
  // This is attached to the tree container. It only tracks movement
  // AFTER a drag is started (via long-press on a row's drag handle).
  const dragActiveRef = React.useRef(false);
  const draggedNodeRef = React.useRef<FileNode | null>(null);

  const startDrag = React.useCallback((node: FileNode, pageY: number) => {
    draggedNodeRef.current = node;
    dragActiveRef.current = true;
    setDraggedNode(node);
    setDropTargetId(undefined);
    dragY.value = pageY;
    dragOpacity.value = withTiming(1, { duration: 150 });
    dragScale.value = withSpring(1.03);
  }, []);

  const updateDragPosition = React.useCallback((pageY: number) => {
    if (!dragActiveRef.current || !draggedNodeRef.current) return;

    dragY.value = pageY;

    // Determine drop target by finding which row the finger is over
    const draggedId = draggedNodeRef.current.id;
    let foundTarget: string | null | undefined = null; // default to root

    for (const [nodeId, layout] of nodeLayoutsRef.current) {
      if (pageY >= layout.absoluteY && pageY < layout.absoluteY + layout.height) {
        // Finger is over this node
        if (nodeId === draggedId) {
          foundTarget = undefined; // over self — no target
          break;
        }
        // Don't allow dropping into own descendants
        if (nodeId.startsWith(`${draggedId}/`)) {
          foundTarget = undefined;
          break;
        }
        // Find the flat node to determine if it's a folder or file
        const flat = flatNodesRef.current.find((f) => f.node.id === nodeId);
        if (flat) {
          if (flat.node.type === "folder") {
            foundTarget = flat.node.id; // drop into this folder
          } else {
            foundTarget = flat.parentId; // drop as sibling (same parent)
          }
        }
        break;
      }
    }

    setDropTargetId(foundTarget);
  }, []);

  const endDrag = React.useCallback(async () => {
    const dragged = draggedNodeRef.current;
    const target = dropTargetId;

    dragActiveRef.current = false;
    draggedNodeRef.current = null;
    dragOpacity.value = withTiming(0, { duration: 150 });
    dragScale.value = withTiming(0.95, { duration: 150 });

    // Perform the move if we have a valid target
    if (dragged && target !== undefined && id) {
      // Check: don't move to same parent
      const currentParent = dragged.id.includes("/")
        ? dragged.id.substring(0, dragged.id.lastIndexOf("/"))
        : null;
      if (target !== currentParent) {
        const updatedTree = await moveNode(id, dragged.id, target);
        setFileTree(updatedTree);
        if (target) {
          setExpandedFolders((prev) => new Set(prev).add(target));
        }
      }
    }

    setDraggedNode(null);
    setDropTargetId(undefined);
  }, [id, dropTargetId]);

  // We need a ref to endDrag since PanResponder captures the initial closure
  const endDragRef = React.useRef(endDrag);
  endDragRef.current = endDrag;

  const updateDragRef = React.useRef(updateDragPosition);
  updateDragRef.current = updateDragPosition;

  // PanResponder for the whole tree area — handles move/release after drag starts
  const panResponder = React.useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => dragActiveRef.current,
        onMoveShouldSetPanResponder: () => dragActiveRef.current,
        onPanResponderMove: (_: GestureResponderEvent, gestureState: PanResponderGestureState) => {
          updateDragRef.current(gestureState.moveY);
        },
        onPanResponderRelease: () => {
          endDragRef.current();
        },
        onPanResponderTerminate: () => {
          endDragRef.current();
        },
      }),
    []
  );

  // Drag preview animated style
  const dragPreviewStyle = useAnimatedStyle(() => ({
    position: "absolute" as const,
    left: 24,
    right: 24,
    top: dragY.value - 24,
    opacity: dragOpacity.value,
    transform: [{ scale: dragScale.value }],
    zIndex: 9999,
  }));

  // ── Load data ───────────────────────────────────────────────────
  React.useEffect(() => {
    (async () => {
      const projects = await getProjects();
      const found = projects.find((p) => p.id === id);
      setProject(found ?? null);

      if (found) {
        const tree = await getFileTree(found.id);
        setFileTree(tree);
      }
    })();
  }, [id]);

  // ── Handlers ────────────────────────────────────────────────────
  const toggleFolder = React.useCallback((folderId: string) => {
    setExpandedFolders((prev) => {
      const next = new Set(prev);
      if (next.has(folderId)) next.delete(folderId);
      else next.add(folderId);
      return next;
    });
  }, []);

  // -- New folder --
  const handleNewFolderOpen = React.useCallback((parentId: string | null) => {
    setFolderParentId(parentId);
    setNewFolderName("");
    setFolderModalVisible(true);
  }, []);

  const handleCreateFolder = React.useCallback(async () => {
    const trimmed = newFolderName.trim();
    if (!trimmed || !id) return;
    const updatedTree = await addFolder(id, folderParentId, trimmed);
    setFileTree(updatedTree);
    if (folderParentId) {
      setExpandedFolders((prev) => new Set(prev).add(folderParentId));
    }
    setFolderModalVisible(false);
  }, [id, folderParentId, newFolderName]);

  // -- New file --
  const handleNewFileOpen = React.useCallback((parentId: string | null) => {
    setFileParentId(parentId);
    setNewFileName("");
    setFileModalVisible(true);
  }, []);

  const handleCreateFile = React.useCallback(async () => {
    const trimmed = newFileName.trim();
    if (!trimmed || !id) return;
    const updatedTree = await addFile(id, fileParentId, trimmed);
    setFileTree(updatedTree);
    if (fileParentId) {
      setExpandedFolders((prev) => new Set(prev).add(fileParentId));
    }
    setFileModalVisible(false);
  }, [id, fileParentId, newFileName]);

  // -- Rename --
  const handleRenameOpen = React.useCallback((node: FileNode) => {
    setNodeToRename(node);
    setRenameValue(node.name);
    setRenameModalVisible(true);
  }, []);

  const handleRename = React.useCallback(async () => {
    const trimmed = renameValue.trim();
    if (!trimmed || !nodeToRename || !id) return;
    if (trimmed === nodeToRename.name) {
      setRenameModalVisible(false);
      return;
    }
    const updatedTree = await renameNode(id, nodeToRename.id, trimmed);
    setFileTree(updatedTree);
    setRenameModalVisible(false);
  }, [id, nodeToRename, renameValue]);

  // -- Move (from dropdown) --
  const handleMoveOpen = React.useCallback((node: FileNode) => {
    setNodeToMove(node);
    setMoveModalVisible(true);
  }, []);

  const handleMove = React.useCallback(
    async (targetFolderId: string | null) => {
      if (!nodeToMove || !id) return;
      const updatedTree = await moveNode(id, nodeToMove.id, targetFolderId);
      setFileTree(updatedTree);
      if (targetFolderId) {
        setExpandedFolders((prev) => new Set(prev).add(targetFolderId));
      }
      setMoveModalVisible(false);
      setNodeToMove(null);
    },
    [id, nodeToMove]
  );

  // -- Delete --
  const confirmDelete = React.useCallback(async () => {
    if (!nodeToDelete || !id) return;
    const updatedTree = await removeNode(id, nodeToDelete.id);
    setFileTree(updatedTree);
    setNodeToDelete(null);
  }, [id, nodeToDelete]);

  // -- Measure tree container --
  const onTreeLayout = React.useCallback(() => {
    treeContainerRef.current?.measureInWindow((_x, y) => {
      treeAbsoluteYRef.current = y;
    });
  }, []);

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
          {/* Root-level action buttons */}
          <View className="mb-2 flex-row gap-2">
            <Pressable
              className="flex-row items-center gap-2 rounded-lg px-3 py-2 active:opacity-70"
              onPress={() => handleNewFileOpen(null)}>
              <Icon as={FilePlusIcon} className="size-4 text-muted-foreground" size={16} />
              <Text className="text-sm text-muted-foreground">New file</Text>
            </Pressable>
            <Pressable
              className="flex-row items-center gap-2 rounded-lg px-3 py-2 active:opacity-70"
              onPress={() => handleNewFolderOpen(null)}>
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
                onNewFolder={handleNewFolderOpen}
                onNewFile={handleNewFileOpen}
                onDelete={setNodeToDelete}
                onRename={handleRenameOpen}
                onMove={handleMoveOpen}
              />
            ))}
          </DragContext.Provider>

          {/* ── Root drop zone ──────────────────────────────────── */}
          {draggedNode && (
            <View
              className={`mt-1 rounded-lg border-2 border-dashed px-4 py-4 ${
                dropTargetId === null
                  ? "border-primary bg-primary/10"
                  : "border-transparent"
              }`}
              onLayout={(e) => {
                // Register root zone for drop targeting — handled by the
                // "not over any node" fallback in updateDragPosition
              }}>
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
        <View className="border-t border-border bg-card px-4 pb-9 pt-4">
          <View className="flex-row gap-3">
            <Button className="flex-1 flex-row items-center justify-center gap-2">
              <Icon as={PlayIcon} className="size-4 text-primary-foreground" size={16} />
              <Text className="font-semibold text-primary-foreground">Play</Text>
            </Button>
            <Button
              variant="secondary"
              className="flex-1 flex-row items-center justify-center gap-2">
              <Icon as={RocketIcon} className="size-4 text-secondary-foreground" size={16} />
              <Text className="font-semibold text-secondary-foreground">Release</Text>
            </Button>
            <Button variant="outline" className="flex-1 flex-row items-center justify-center gap-2">
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

      {/* ── New folder modal ────────────────────────────────────── */}
      <Modal
        visible={folderModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setFolderModalVisible(false)}>
        <Pressable
          className="flex-1 items-center justify-center bg-black/50 p-6"
          onPress={() => setFolderModalVisible(false)}>
          <Pressable
            className="w-full max-w-sm gap-4 rounded-2xl border border-border bg-card p-6"
            onPress={() => {}}>
            <Text className="text-xl font-semibold text-foreground">New Folder</Text>
            <TextInput
              className="rounded-lg border border-border bg-secondary px-4 py-3 text-base text-foreground"
              placeholder="Folder name"
              placeholderTextColor="#888"
              value={newFolderName}
              onChangeText={setNewFolderName}
              autoFocus
              onSubmitEditing={handleCreateFolder}
              returnKeyType="done"
            />
            <View className="flex-row justify-end gap-3">
              <Button variant="ghost" onPress={() => setFolderModalVisible(false)}>
                <Text>Cancel</Text>
              </Button>
              <Button onPress={handleCreateFolder} disabled={!newFolderName.trim()}>
                <Text>Create</Text>
              </Button>
            </View>
          </Pressable>
        </Pressable>
      </Modal>

      {/* ── New file modal ──────────────────────────────────────── */}
      <Modal
        visible={fileModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setFileModalVisible(false)}>
        <Pressable
          className="flex-1 items-center justify-center bg-black/50 p-6"
          onPress={() => setFileModalVisible(false)}>
          <Pressable
            className="w-full max-w-sm gap-4 rounded-2xl border border-border bg-card p-6"
            onPress={() => {}}>
            <Text className="text-xl font-semibold text-foreground">New File</Text>
            <TextInput
              className="rounded-lg border border-border bg-secondary px-4 py-3 text-base text-foreground"
              placeholder="File name (e.g. script.lua)"
              placeholderTextColor="#888"
              value={newFileName}
              onChangeText={setNewFileName}
              autoFocus
              onSubmitEditing={handleCreateFile}
              returnKeyType="done"
            />
            <View className="flex-row justify-end gap-3">
              <Button variant="ghost" onPress={() => setFileModalVisible(false)}>
                <Text>Cancel</Text>
              </Button>
              <Button onPress={handleCreateFile} disabled={!newFileName.trim()}>
                <Text>Create</Text>
              </Button>
            </View>
          </Pressable>
        </Pressable>
      </Modal>

      {/* ── Rename modal ────────────────────────────────────────── */}
      <Modal
        visible={renameModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setRenameModalVisible(false)}>
        <Pressable
          className="flex-1 items-center justify-center bg-black/50 p-6"
          onPress={() => setRenameModalVisible(false)}>
          <Pressable
            className="w-full max-w-sm gap-4 rounded-2xl border border-border bg-card p-6"
            onPress={() => {}}>
            <Text className="text-xl font-semibold text-foreground">
              Rename {nodeToRename?.type === "folder" ? "Folder" : "File"}
            </Text>
            <TextInput
              className="rounded-lg border border-border bg-secondary px-4 py-3 text-base text-foreground"
              placeholder="New name"
              placeholderTextColor="#888"
              value={renameValue}
              onChangeText={setRenameValue}
              autoFocus
              onSubmitEditing={handleRename}
              returnKeyType="done"
              selectTextOnFocus
            />
            <View className="flex-row justify-end gap-3">
              <Button variant="ghost" onPress={() => setRenameModalVisible(false)}>
                <Text>Cancel</Text>
              </Button>
              <Button onPress={handleRename} disabled={!renameValue.trim()}>
                <Text>Rename</Text>
              </Button>
            </View>
          </Pressable>
        </Pressable>
      </Modal>

      {/* ── Move-to modal (folder picker) ───────────────────────── */}
      <Modal
        visible={moveModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setMoveModalVisible(false)}>
        <Pressable
          className="flex-1 items-center justify-center bg-black/50 p-6"
          onPress={() => setMoveModalVisible(false)}>
          <Pressable
            className="w-full max-w-sm gap-2 rounded-2xl border border-border bg-card p-6"
            onPress={() => {}}>
            <Text className="mb-2 text-xl font-semibold text-foreground">Move to…</Text>
            <Text className="mb-3 text-sm text-muted-foreground">
              Select a destination for "{nodeToMove?.name}"
            </Text>

            <ScrollView className="max-h-72" bounces={false}>
              {/* Root option */}
              <Pressable
                className="flex-row items-center gap-3 rounded-lg border border-border bg-secondary px-4 py-3 active:opacity-80"
                style={{ marginBottom: 4 }}
                onPress={() => handleMove(null)}>
                <Icon as={FolderIcon} className="size-5 text-muted-foreground" size={20} />
                <Text className="text-base text-foreground">/ (root)</Text>
              </Pressable>

              {/* Folder options */}
              <FolderPickerList
                nodes={fileTree}
                depth={0}
                excludeId={nodeToMove?.id ?? null}
                onSelect={handleMove}
              />
            </ScrollView>

            <View className="mt-3 flex-row justify-end">
              <Button variant="ghost" onPress={() => setMoveModalVisible(false)}>
                <Text>Cancel</Text>
              </Button>
            </View>
          </Pressable>
        </Pressable>
      </Modal>

      {/* ── Delete confirmation dialog ──────────────────────────── */}
      <AlertDialog
        open={!!nodeToDelete}
        onOpenChange={(open) => {
          if (!open) setNodeToDelete(null);
        }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              Delete {nodeToDelete?.type === "folder" ? "Folder" : "File"}
            </AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{nodeToDelete?.name}"?
              {nodeToDelete?.type === "folder"
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

// ── Recursive file tree node ─────────────────────────────────────────

function FileTreeNode({
  node,
  depth,
  expandedFolders,
  onToggle,
  onNewFolder,
  onNewFile,
  onDelete,
  onRename,
  onMove,
}: {
  node: FileNode;
  depth: number;
  expandedFolders: Set<string>;
  onToggle: (id: string) => void;
  onNewFolder: (parentId: string | null) => void;
  onNewFile: (parentId: string | null) => void;
  onDelete: (node: FileNode) => void;
  onRename: (node: FileNode) => void;
  onMove: (node: FileNode) => void;
}) {
  const isFolder = node.type === "folder";
  const isExpanded = expandedFolders.has(node.id);
  const indent = depth * 20;

  const { draggedNodeId, dropTargetId, registerLayout, startDrag } =
    React.useContext(DragContext);

  const isBeingDragged = draggedNodeId === node.id;
  const isDropTarget =
    draggedNodeId !== null && dropTargetId === node.id && node.type === "folder";

  const rowRef = React.useRef<View>(null);

  // Measure absolute position on layout for drag hit-testing
  const handleLayout = React.useCallback(() => {
    rowRef.current?.measureInWindow((_x, y, _w, h) => {
      registerLayout(node.id, y, h);
    });
  }, [node.id, registerLayout]);

  // Long-press on drag handle initiates drag
  const longPressTimer = React.useRef<ReturnType<typeof setTimeout> | null>(null);
  const touchStartY = React.useRef(0);

  const handleDragHandleTouchStart = React.useCallback(
    (e: GestureResponderEvent) => {
      touchStartY.current = e.nativeEvent.pageY;
      longPressTimer.current = setTimeout(() => {
        startDrag(node, touchStartY.current);
      }, 350);
    },
    [node, startDrag]
  );

  const handleDragHandleTouchMove = React.useCallback((e: GestureResponderEvent) => {
    // Cancel long press if finger moves too much before activation
    const dy = Math.abs(e.nativeEvent.pageY - touchStartY.current);
    if (dy > 10 && longPressTimer.current) {
      clearTimeout(longPressTimer.current);
      longPressTimer.current = null;
    }
  }, []);

  const handleDragHandleTouchEnd = React.useCallback(() => {
    if (longPressTimer.current) {
      clearTimeout(longPressTimer.current);
      longPressTimer.current = null;
    }
  }, []);

  // Clean up timer on unmount
  React.useEffect(() => {
    return () => {
      if (longPressTimer.current) {
        clearTimeout(longPressTimer.current);
      }
    };
  }, []);

  return (
    <>
      <View
        ref={rowRef}
        onLayout={handleLayout}
        className={`flex-row items-center rounded-lg border bg-card ${
          isDropTarget
            ? "border-primary bg-primary/10"
            : isBeingDragged
              ? "border-border opacity-30"
              : "border-border"
        }`}
        style={{ marginLeft: indent, marginBottom: 4 }}>
        {/* ── Drag handle ────────────────────────────────────────── */}
        <View
          className="items-center justify-center pl-2 py-3"
          onTouchStart={handleDragHandleTouchStart}
          onTouchMove={handleDragHandleTouchMove}
          onTouchEnd={handleDragHandleTouchEnd}
          onTouchCancel={handleDragHandleTouchEnd}>
          <Icon
            as={GripVerticalIcon}
            className="size-4 text-muted-foreground/40"
            size={16}
          />
        </View>

        {/* ── Main row content (tap to toggle folder) ────────────── */}
        <Pressable
          className="flex-1 flex-row items-center gap-3 px-2 py-3 active:opacity-80"
          disabled={isBeingDragged}
          onPress={() => {
            if (isFolder) onToggle(node.id);
          }}>
          {/* Chevron for folders */}
          {isFolder ? (
            <Icon
              as={isExpanded ? ChevronDownIcon : ChevronRightIcon}
              className="size-4 text-muted-foreground"
              size={16}
            />
          ) : (
            <View style={{ width: 16 }} />
          )}

          {/* Icon */}
          <Icon
            as={isFolder ? FolderIcon : FileIcon}
            className="size-5 text-muted-foreground"
            size={20}
          />

          {/* Name */}
          <Text className="flex-1 text-base text-foreground">{node.name}</Text>
        </Pressable>

        {/* ── Context menu ─────────────────────────────────────── */}
        {!draggedNodeId && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Pressable hitSlop={8} className="px-3 py-3">
                <Icon
                  as={EllipsisVerticalIcon}
                  className="size-4 text-muted-foreground"
                  size={16}
                />
              </Pressable>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
              {isFolder && (
                <>
                  <DropdownMenuItem
                    onPress={() => {
                      onNewFile(node.id);
                    }}>
                    <Icon as={FilePlusIcon} className="size-4 text-muted-foreground" size={16} />
                    <Text>New file</Text>
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onPress={() => {
                      onNewFolder(node.id);
                    }}>
                    <Icon
                      as={FolderPlusIcon}
                      className="size-4 text-muted-foreground"
                      size={16}
                    />
                    <Text>New folder</Text>
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                </>
              )}
              <DropdownMenuItem
                onPress={() => {
                  onRename(node);
                }}>
                <Icon as={PencilIcon} className="size-4 text-muted-foreground" size={16} />
                <Text>Rename</Text>
              </DropdownMenuItem>
              <DropdownMenuItem
                onPress={() => {
                  onMove(node);
                }}>
                <Icon as={MoveIcon} className="size-4 text-muted-foreground" size={16} />
                <Text>Move to…</Text>
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                variant="destructive"
                onPress={() => {
                  onDelete(node);
                }}>
                <Icon as={Trash2Icon} className="size-4 text-destructive" size={16} />
                <Text>Delete</Text>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </View>

      {/* Render children when expanded */}
      {isFolder &&
        isExpanded &&
        node.children?.map((child) => (
          <FileTreeNode
            key={child.id}
            node={child}
            depth={depth + 1}
            expandedFolders={expandedFolders}
            onToggle={onToggle}
            onNewFolder={onNewFolder}
            onNewFile={onNewFile}
            onDelete={onDelete}
            onRename={onRename}
            onMove={onMove}
          />
        ))}
    </>
  );
}

// ── Folder picker for the "Move to…" modal ──────────────────────────

function FolderPickerList({
  nodes,
  depth,
  excludeId,
  onSelect,
}: {
  nodes: FileNode[];
  depth: number;
  excludeId: string | null;
  onSelect: (folderId: string) => void;
}) {
  return (
    <>
      {nodes
        .filter((n) => n.type === "folder")
        .filter((n) => {
          // Exclude the node being moved and any of its descendants
          if (!excludeId) return true;
          return n.id !== excludeId && !n.id.startsWith(`${excludeId}/`);
        })
        .map((folder) => (
          <React.Fragment key={folder.id}>
            <Pressable
              className="flex-row items-center gap-3 rounded-lg border border-border bg-secondary px-4 py-3 active:opacity-80"
              style={{ marginLeft: depth * 16, marginBottom: 4 }}
              onPress={() => onSelect(folder.id)}>
              <Icon as={FolderIcon} className="size-5 text-muted-foreground" size={20} />
              <Text className="text-base text-foreground">{folder.name}</Text>
            </Pressable>
            {folder.children && (
              <FolderPickerList
                nodes={folder.children}
                depth={depth + 1}
                excludeId={excludeId}
                onSelect={onSelect}
              />
            )}
          </React.Fragment>
        ))}
    </>
  );
}
