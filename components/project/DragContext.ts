import * as React from "react";
import type { FileNode } from "@/types";

export type DragContextType = {
  draggedNodeId: string | null;
  dropTargetId: string | null | undefined;
  registerLayout: (nodeId: string, relativeY: number, height: number) => void;
  startDrag: (node: FileNode, pageY: number) => void;
};

export const DragContext = React.createContext<DragContextType>({
  draggedNodeId: null,
  dropTargetId: undefined,
  registerLayout: () => {},
  startDrag: () => {},
});
