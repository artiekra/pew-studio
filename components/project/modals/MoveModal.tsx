import React from "react";
import { Modal, Pressable, ScrollView, View } from "react-native";
import { Text } from "@/components/ui/text";
import { Button } from "@/components/ui/button";
import { Icon } from "@/components/ui/icon";
import { FolderIcon } from "lucide-react-native";
import { FolderPickerList } from "../FolderPickerList";
import { useExplorerContext } from "@/hooks/useExplorerState";

export function MoveModal() {
  const { state, dispatch, move, fileTree } = useExplorerContext();

  const visible = state.mode === "moving";
  const node = state.mode === "moving" ? state.node : null;

  const handleMove = async (targetFolderId: string | null) => {
    if (!node) return;
    await move(node.id, targetFolderId);
    dispatch({ type: "CANCEL" });
  };

  const handleCancel = () => {
    dispatch({ type: "CANCEL" });
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={handleCancel}>
      <Pressable className="flex-1 items-center justify-center bg-black/50 p-6" onPress={handleCancel}>
        <Pressable className="w-full max-w-sm gap-2 rounded-2xl border border-border bg-card p-6" onPress={() => {}}>
          <Text className="mb-2 text-xl font-semibold text-foreground">Move to…</Text>
          <Text className="mb-3 text-sm text-muted-foreground">
            Select a destination for "{node?.name}"
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
              excludeId={node?.id ?? null}
              onSelect={handleMove}
            />
          </ScrollView>

          <View className="mt-3 flex-row justify-end">
            <Button variant="ghost" onPress={handleCancel}>
              <Text>Cancel</Text>
            </Button>
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}
