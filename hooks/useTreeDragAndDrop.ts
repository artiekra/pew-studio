import * as React from "react";
import { PanResponder, View } from "react-native";
import { useSharedValue, withSpring, withTiming } from "react-native-reanimated";
import type { FileNode, ProjectFileTree } from "@/types";

export type FlatNode = {
  node: FileNode;
  depth: number;
  parentId: string | null;
};

export function flattenVisibleTree(
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

export function useTreeDragAndDrop(
  fileTree: ProjectFileTree,
  expandedFolders: Set<string>,
  onMove: (nodeId: string, targetId: string | null) => Promise<void>
) {
  const [draggedNode, setDraggedNode] = React.useState<FileNode | null>(null);
  const [dropTargetId, setDropTargetId] = React.useState<string | null | undefined>(undefined);

  const dragY = useSharedValue(0);
  const dragOpacity = useSharedValue(0);
  const dragScale = useSharedValue(0.95);

  const treeAbsoluteYRef = React.useRef(0);
  const treeContainerRef = React.useRef<View>(null);
  const nodeLayoutsRef = React.useRef<Map<string, { relativeY: number; height: number }>>(
    new Map()
  );
  const flatNodesRef = React.useRef<FlatNode[]>([]);

  React.useEffect(() => {
    flatNodesRef.current = flattenVisibleTree(fileTree, 0, expandedFolders, null);
  }, [fileTree, expandedFolders]);

  const registerLayout = React.useCallback((nodeId: string, relativeY: number, height: number) => {
    nodeLayoutsRef.current.set(nodeId, { relativeY, height });
  }, []);

  const dragActiveRef = React.useRef(false);
  const draggedNodeRef = React.useRef<FileNode | null>(null);

  const startDrag = React.useCallback(
    (node: FileNode, pageY: number) => {
      treeContainerRef.current?.measureInWindow((_x, y) => {
        treeAbsoluteYRef.current = y;
      });

      draggedNodeRef.current = node;
      dragActiveRef.current = true;
      setDraggedNode(node);
      setDropTargetId(undefined);
      dragY.value = pageY;
      dragOpacity.value = withTiming(1, { duration: 150 });
      dragScale.value = withSpring(1.03);
    },
    [dragY, dragOpacity, dragScale]
  );

  const updateDragPosition = React.useCallback(
    (pageY: number) => {
      if (!dragActiveRef.current || !draggedNodeRef.current) return;

      dragY.value = pageY;
      const draggedId = draggedNodeRef.current.id;
      let foundTarget: string | null | undefined = null;

      for (const [nodeId, layout] of nodeLayoutsRef.current) {
        const absoluteY = treeAbsoluteYRef.current + layout.relativeY;
        if (pageY >= absoluteY && pageY < absoluteY + layout.height) {
          if (nodeId === draggedId) {
            foundTarget = undefined;
            break;
          }
          if (nodeId.startsWith(`${draggedId}/`)) {
            foundTarget = undefined;
            break;
          }
          const flat = flatNodesRef.current.find((f) => f.node.id === nodeId);
          if (flat) {
            if (flat.node.type === "folder") {
              foundTarget = flat.node.id;
            } else {
              foundTarget = flat.parentId;
            }
          }
          break;
        }
      }
      setDropTargetId(foundTarget);
    },
    [dragY]
  );

  const endDrag = React.useCallback(async () => {
    const dragged = draggedNodeRef.current;
    const target = dropTargetId;

    dragActiveRef.current = false;
    draggedNodeRef.current = null;
    dragOpacity.value = withTiming(0, { duration: 150 });
    dragScale.value = withTiming(0.95, { duration: 150 });

    if (dragged && target !== undefined) {
      const currentParent = dragged.id.includes("/")
        ? dragged.id.substring(0, dragged.id.lastIndexOf("/"))
        : null;
      if (target !== currentParent) {
        await onMove(dragged.id, target);
      }
    }

    setDraggedNode(null);
    setDropTargetId(undefined);
  }, [dropTargetId, onMove, dragOpacity, dragScale]);

  const endDragRef = React.useRef(endDrag);
  endDragRef.current = endDrag;

  const updateDragRef = React.useRef(updateDragPosition);
  updateDragRef.current = updateDragPosition;

  const panResponder = React.useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => dragActiveRef.current,
        onMoveShouldSetPanResponder: () => dragActiveRef.current,
        onPanResponderMove: (_, gestureState) => {
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

  const onTreeLayout = React.useCallback(() => {
    treeContainerRef.current?.measureInWindow((_x, y) => {
      treeAbsoluteYRef.current = y;
    });
  }, []);

  return {
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
  };
}
