import React from "react";
import { Text } from "@/components/ui/text";
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
import { useExplorerContext } from "@/hooks/useExplorerState";

export function DeleteModal() {
  const { state, dispatch, remove } = useExplorerContext();

  const visible = state.mode === "deleting";
  const node = state.mode === "deleting" ? state.node : null;

  const handleConfirm = async () => {
    if (!node) return;
    await remove(node.id);
    dispatch({ type: "CANCEL" });
  };

  const handleCancel = () => {
    dispatch({ type: "CANCEL" });
  };

  return (
    <AlertDialog open={visible} onOpenChange={(open) => { if (!open) handleCancel(); }}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>
            Delete {node?.type === "folder" ? "Folder" : "File"}
          </AlertDialogTitle>
          <AlertDialogDescription>
            Are you sure you want to delete "{node?.name}"?
            {node?.type === "folder" ? " All contents inside this folder will also be deleted." : ""} This cannot be undone.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel onPress={handleCancel}>
            <Text>Cancel</Text>
          </AlertDialogCancel>
          <AlertDialogAction className="bg-destructive" onPress={handleConfirm}>
            <Text>Delete</Text>
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
