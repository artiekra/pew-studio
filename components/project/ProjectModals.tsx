import React from "react";
import { CreateItemModal } from "./modals/CreateItemModal";
import { RenameModal } from "./modals/RenameModal";
import { MoveModal } from "./modals/MoveModal";
import { DeleteModal } from "./modals/DeleteModal";

export function ProjectModals() {
  return (
    <>
      <CreateItemModal />
      <RenameModal />
      <MoveModal />
      <DeleteModal />
    </>
  );
}
