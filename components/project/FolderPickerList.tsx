import React from "react";
import { Pressable } from "react-native";
import { Text } from "@/components/ui/text";
import { Icon } from "@/components/ui/icon";
import { FolderIcon } from "lucide-react-native";
import type { FileNode } from "@/lib/fileSystem";

export function FolderPickerList({
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
