import { useState, useEffect, useCallback } from "react";
import * as DocumentPicker from "expo-document-picker";
import {
  createProject,
  deleteProject,
  getProjects,
  renameProject,
  updateProjectColor,
  importProject,
} from "@/services/projectRepository";
import type { Project } from "@/types";

export function useProjects() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [actionModalVisible, setActionModalVisible] = useState(false);
  const [newName, setNewName] = useState("");
  const [projectToDelete, setProjectToDelete] = useState<Project | null>(null);
  const [projectToRename, setProjectToRename] = useState<Project | null>(null);
  const [renameValue, setRenameValue] = useState("");

  useEffect(() => {
    getProjects().then((p) => {
      setProjects(p);
      setLoaded(true);
    });
  }, []);

  const handleCreate = useCallback(async () => {
    const trimmed = newName.trim();
    if (!trimmed) return;
    const project = await createProject(trimmed);
    setProjects((prev) => [project, ...prev]);
    setNewName("");
    setModalVisible(false);
  }, [newName]);

  const handleImport = useCallback(async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: ["application/zip", "application/x-zip-compressed", "multipart/x-zip"],
        copyToCacheDirectory: true,
      });

      if (result.canceled || !result.assets.length) return;

      const asset = result.assets[0];
      const name = asset.name ? asset.name.replace(/\.zip$/i, "") : "Imported Project";

      setActionModalVisible(false);

      const project = await importProject(name, asset.uri);
      setProjects((prev) => [project, ...prev]);
    } catch (e) {
      console.error("Import failed:", e);
    }
  }, []);

  const handleDelete = useCallback((project: Project) => {
    setProjectToDelete(project);
  }, []);

  const confirmDelete = useCallback(async () => {
    if (!projectToDelete) return;
    await deleteProject(projectToDelete.id);
    setProjects((prev) => prev.filter((p) => p.id !== projectToDelete.id));
    setProjectToDelete(null);
  }, [projectToDelete]);

  const handleRename = useCallback((project: Project) => {
    setRenameValue(project.name);
    setProjectToRename(project);
  }, []);

  const confirmRename = useCallback(async () => {
    if (!projectToRename) return;
    const trimmed = renameValue.trim();
    if (trimmed && trimmed !== projectToRename.name) {
      await renameProject(projectToRename.id, trimmed);
      setProjects((prev) =>
        prev.map((p) =>
          p.id === projectToRename.id
            ? { ...p, name: trimmed, updatedAt: new Date().toISOString() }
            : p
        )
      );
    }
    setProjectToRename(null);
    setRenameValue("");
  }, [projectToRename, renameValue]);

  const handleColorChange = useCallback(async (project: Project, color?: string) => {
    if (project.color !== color) {
      await updateProjectColor(project.id, color);
      setProjects((prev) =>
        prev.map((p) =>
          p.id === project.id ? { ...p, color, updatedAt: new Date().toISOString() } : p
        )
      );
    }
  }, []);

  return {
    projects,
    loaded,
    modalVisible,
    setModalVisible,
    actionModalVisible,
    setActionModalVisible,
    newName,
    setNewName,
    projectToDelete,
    setProjectToDelete,
    projectToRename,
    setProjectToRename,
    renameValue,
    setRenameValue,
    handleCreate,
    handleImport,
    handleDelete,
    confirmDelete,
    handleRename,
    confirmRename,
    handleColorChange,
  };
}
