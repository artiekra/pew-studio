import React, { useState, useEffect } from "react";
import { Modal, Pressable, TextInput, View } from "react-native";
import { Text } from "@/components/ui/text";
import { Button } from "@/components/ui/button";
import { useExplorerContext } from "@/hooks/useExplorerState";

export function CreateItemModal() {
  const { state, dispatch, createFolder, createFile } = useExplorerContext();
  const [inputValue, setInputValue] = useState("");

  const visible = state.mode === "creating";
  const itemType = state.mode === "creating" ? state.itemType : "file";
  const parentPath = state.mode === "creating" ? state.parentPath : null;

  useEffect(() => {
    if (visible) {
      setInputValue("");
    }
  }, [visible]);

  const handleCreate = async () => {
    const trimmed = inputValue.trim();
    if (!trimmed) return;
    
    if (itemType === "folder") {
      await createFolder(parentPath, trimmed);
    } else {
      await createFile(parentPath, trimmed);
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
            New {itemType === "folder" ? "Folder" : "File"}
          </Text>
          <TextInput
            className="rounded-lg border border-border bg-secondary px-4 py-3 text-base text-foreground"
            placeholder={itemType === "folder" ? "Folder name" : "File name (e.g. script.lua)"}
            placeholderTextColor="#888"
            value={inputValue}
            onChangeText={setInputValue}
            autoFocus
            onSubmitEditing={handleCreate}
            returnKeyType="done"
          />
          <View className="flex-row justify-end gap-3">
            <Button variant="ghost" onPress={handleCancel}>
              <Text>Cancel</Text>
            </Button>
            <Button onPress={handleCreate} disabled={!inputValue.trim()}>
              <Text>Create</Text>
            </Button>
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}
