import React, { useState, useEffect } from "react";
import { Modal, Pressable, TextInput, View } from "react-native";
import { Text } from "@/components/ui/text";
import { Button } from "@/components/ui/button";
import { useExplorerContext } from "@/hooks/useExplorerState";

export function RenameModal() {
  const { state, dispatch, rename } = useExplorerContext();
  const [inputValue, setInputValue] = useState("");

  const visible = state.mode === "renaming";
  const node = state.mode === "renaming" ? state.node : null;

  useEffect(() => {
    if (visible && node) {
      setInputValue(node.name);
    }
  }, [visible, node]);

  const handleRename = async () => {
    const trimmed = inputValue.trim();
    if (!trimmed || !node) return;
    if (trimmed !== node.name) {
      await rename(node.id, trimmed);
    }
    dispatch({ type: "CANCEL" });
  };

  const handleCancel = () => {
    dispatch({ type: "CANCEL" });
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={handleCancel}>
      <Pressable className="flex-1 items-center justify-center bg-black/50 p-6" onPress={handleCancel}>
        <Pressable className="w-full max-w-sm gap-4 rounded-2xl border border-border bg-card p-6" onPress={() => {}}>
          <Text className="text-xl font-semibold text-foreground">
            Rename {node?.type === "folder" ? "Folder" : "File"}
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
            <Button variant="ghost" onPress={handleCancel}>
              <Text>Cancel</Text>
            </Button>
            <Button onPress={handleRename} disabled={!inputValue.trim()}>
              <Text>Rename</Text>
            </Button>
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}
