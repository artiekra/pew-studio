import * as React from "react";
import { View, Pressable, type LayoutChangeEvent, type GestureResponderEvent } from "react-native";
import { Text } from "@/components/ui/text";
import { Icon } from "@/components/ui/icon";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  EllipsisVerticalIcon,
  FileIcon,
  FileJsonIcon,
  FilePlusIcon,
  FolderIcon,
  FolderOpenIcon,
  FolderPlusIcon,
  GripVerticalIcon,
  MoveIcon,
  PencilIcon,
  Trash2Icon,
} from "lucide-react-native";
import { LuaIcon } from "@/components/ui/icons/LuaIcon";
import type { FileNode } from "@/lib/fileSystem";
import { DragContext } from "./DragContext";

export function FileTreeNode({
  node,
  depth,
  expandedFolders,
  onToggle,
  onNewFolder,
  onNewFile,
  onDelete,
  onRename,
  onMove,
  onOpenFile,
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
  onOpenFile: (node: FileNode) => void;
}) {
  const isFolder = node.type === "folder";
  const isExpanded = expandedFolders.has(node.id);
  const indent = depth * 20;

  const { draggedNodeId, dropTargetId, registerLayout, startDrag } = React.useContext(DragContext);

  const isBeingDragged = draggedNodeId === node.id;
  const isDropTarget = draggedNodeId !== null && dropTargetId === node.id && node.type === "folder";

  const rowRef = React.useRef<View>(null);

  const handleLayout = React.useCallback(
    (e: LayoutChangeEvent) => {
      registerLayout(node.id, e.nativeEvent.layout.y, e.nativeEvent.layout.height);
    },
    [node.id, registerLayout]
  );

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
        <View
          className="items-center justify-center py-3 pl-2"
          onTouchStart={handleDragHandleTouchStart}
          onTouchMove={handleDragHandleTouchMove}
          onTouchEnd={handleDragHandleTouchEnd}
          onTouchCancel={handleDragHandleTouchEnd}>
          <Icon as={GripVerticalIcon} className="size-4 text-muted-foreground/40" size={16} />
        </View>

        <Pressable
          className="flex-1 flex-row items-center gap-3 px-2 py-3 active:opacity-80"
          disabled={isBeingDragged}
          onPress={() => {
            if (isFolder) onToggle(node.id);
            else onOpenFile(node);
          }}>
          <Icon
            as={
              isFolder
                ? isExpanded
                  ? FolderOpenIcon
                  : FolderIcon
                : node.name.endsWith(".lua")
                  ? LuaIcon
                  : node.name.endsWith(".json")
                    ? FileJsonIcon
                    : FileIcon
            }
            className="size-5 text-muted-foreground"
            size={20}
          />
          <Text className="flex-1 text-base text-foreground">{node.name}</Text>
        </Pressable>

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
                  <DropdownMenuItem onPress={() => onNewFile(node.id)}>
                    <Icon as={FilePlusIcon} className="size-4 text-muted-foreground" size={16} />
                    <Text>New file</Text>
                  </DropdownMenuItem>
                  <DropdownMenuItem onPress={() => onNewFolder(node.id)}>
                    <Icon as={FolderPlusIcon} className="size-4 text-muted-foreground" size={16} />
                    <Text>New folder</Text>
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                </>
              )}
              <DropdownMenuItem onPress={() => onRename(node)}>
                <Icon as={PencilIcon} className="size-4 text-muted-foreground" size={16} />
                <Text>Rename</Text>
              </DropdownMenuItem>
              <DropdownMenuItem onPress={() => onMove(node)}>
                <Icon as={MoveIcon} className="size-4 text-muted-foreground" size={16} />
                <Text>Move to…</Text>
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem variant="destructive" onPress={() => onDelete(node)}>
                <Icon as={Trash2Icon} className="size-4 text-destructive" size={16} />
                <Text>Delete</Text>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </View>

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
            onOpenFile={onOpenFile}
          />
        ))}
    </>
  );
}
