import * as React from "react";
import { FlatList, Modal, Pressable, TextInput, View } from "react-native";
import { useRouter } from "expo-router";
import { Text } from "@/components/ui/text";
import { Icon } from "@/components/ui/icon";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

import {
  CopyIcon,
  DownloadIcon,
  FilePlusIcon,
  FolderIcon,
  FolderOpenIcon,
  GlobeIcon,
  MoreVerticalIcon,
  PencilIcon,
  PlusIcon,
  Trash2Icon,
  ChevronDownIcon,
} from "lucide-react-native";
import { PortalHost } from "@rn-primitives/portal";
import { useProjects } from "@/hooks/useProjects";
import type { Project } from "@/types";

function formatDate(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60_000);
  if (mins < 1) return "Just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days}d ago`;
  return new Date(iso).toLocaleDateString();
}

const PROJECT_COLORS = [
  {
    name: "default",
    value: undefined,
    twBorder: "border-border",
    twBg: "bg-card",
    twIconBg: "bg-secondary",
    twIconText: "text-foreground",
    twCircle: "bg-secondary border-border",
  },
  {
    name: "red",
    value: "red",
    twBorder: "border-red-500/50",
    twBg: "bg-red-500/10",
    twIconBg: "bg-red-500/20",
    twIconText: "text-red-500",
    twCircle: "bg-red-500 border-red-600",
  },
  {
    name: "green",
    value: "green",
    twBorder: "border-green-500/50",
    twBg: "bg-green-500/10",
    twIconBg: "bg-green-500/20",
    twIconText: "text-green-500",
    twCircle: "bg-green-500 border-green-600",
  },
  {
    name: "blue",
    value: "blue",
    twBorder: "border-blue-500/50",
    twBg: "bg-blue-500/10",
    twIconBg: "bg-blue-500/20",
    twIconText: "text-blue-500",
    twCircle: "bg-blue-500 border-blue-600",
  },
  {
    name: "yellow",
    value: "yellow",
    twBorder: "border-yellow-500/50",
    twBg: "bg-yellow-500/10",
    twIconBg: "bg-yellow-500/20",
    twIconText: "text-yellow-500",
    twCircle: "bg-yellow-500 border-yellow-600",
  },
];

export function ProjectListScreen() {
  const {
    projects,
    loaded,
    modalVisible,
    setModalVisible,
    actionModalVisible,
    setActionModalVisible,
    newName,
    setNewName,
    selectedTemplate,
    setSelectedTemplate,
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
    handleDuplicate,
  } = useProjects();

  if (!loaded) return null;

  return (
    <>
      <View className="flex-1 bg-background">
        {projects.length === 0 ? (
          <View className="flex-1 items-center justify-center gap-3 p-8">
            <Icon as={FolderIcon} className="size-12 text-muted-foreground" size={48} />
            <Text className="text-center text-lg text-muted-foreground">No projects yet</Text>
            <Text className="text-center text-sm text-muted-foreground">
              Tap the + button to create your first project.
            </Text>
          </View>
        ) : (
          <FlatList
            data={projects}
            keyExtractor={(item) => item.id}
            contentContainerClassName="p-4 gap-3"
            renderItem={({ item }) => (
              <ProjectCard
                project={item}
                onDelete={handleDelete}
                onRename={handleRename}
                onColorChange={handleColorChange}
                onDuplicate={handleDuplicate}
              />
            )}
          />
        )}

        {/* Floating action button */}
        <View className="absolute bottom-6 right-6">
          <Button
            size="icon"
            className="h-14 w-14 rounded-full shadow-lg"
            onPress={() => setActionModalVisible(true)}>
            <Icon as={PlusIcon} className="size-6 text-primary-foreground" size={24} />
          </Button>
        </View>
      </View>

      {/* ── Action selection modal ───────────────────────────────── */}
      <Modal
        visible={actionModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setActionModalVisible(false)}>
        <Pressable
          className="flex-1 items-center justify-center bg-black/50 p-6"
          onPress={() => setActionModalVisible(false)}>
          <Pressable
            className="w-full max-w-md gap-4 rounded-2xl border border-border bg-card p-6"
            onPress={() => {}}>
            <View className="mb-2">
              <Text className="text-xl font-bold text-foreground">Create Project</Text>
            </View>

            <Pressable
              className="flex-row items-center gap-4 rounded-xl border border-border bg-secondary/50 p-4 active:opacity-80"
              onPress={() => {
                setActionModalVisible(false);
                setModalVisible(true);
              }}>
              <View className="h-12 w-12 items-center justify-center rounded-full bg-primary/10">
                <Icon as={FilePlusIcon} className="size-6 text-primary" size={24} />
              </View>
              <View className="flex-1">
                <Text className="text-base font-semibold text-foreground">Create new level</Text>
                <Text className="mt-0.5 text-sm text-muted-foreground">
                  Start a fresh level from scratch
                </Text>
              </View>
            </Pressable>

            <Pressable
              className="flex-row items-center gap-4 rounded-xl border border-border bg-secondary/50 p-4 active:opacity-80"
              onPress={handleImport}>
              <View className="h-12 w-12 items-center justify-center rounded-full bg-primary/10">
                <Icon as={DownloadIcon} className="size-6 text-primary" size={24} />
              </View>
              <View className="flex-1">
                <Text className="text-base font-semibold text-foreground">Import existing</Text>
                <Text className="mt-0.5 text-sm text-muted-foreground">
                  Load a level from your device
                </Text>
              </View>
            </Pressable>

            {/* <Pressable
              className="flex-row items-center gap-4 rounded-xl border border-border bg-secondary/50 p-4 active:opacity-80"
              onPress={() => {}}>
              <View className="h-12 w-12 items-center justify-center rounded-full bg-primary/10">
                <Icon as={GlobeIcon} className="size-6 text-primary" size={24} />
              </View>
              <View className="flex-1">
                <Text className="text-base font-semibold text-foreground">Community levels</Text>
                <Text className="mt-0.5 text-sm text-muted-foreground">
                  Browse open-source projects
                </Text>
              </View>
            </Pressable> */}

            <View className="mt-2 flex-row justify-end">
              <Button variant="ghost" onPress={() => setActionModalVisible(false)}>
                <Text>Cancel</Text>
              </Button>
            </View>
          </Pressable>
        </Pressable>
      </Modal>

      {/* ── Create-project modal ─────────────────────────────────── */}
      <Modal
        visible={modalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setModalVisible(false)}>
        <Pressable
          className="flex-1 items-center justify-center bg-black/50 p-6"
          onPress={() => setModalVisible(false)}>
          {/* Stop propagation so tapping the card doesn't close the modal */}
          <Pressable
            className="w-full max-w-sm gap-4 rounded-2xl border border-border bg-card p-6"
            onPress={() => {}}>
            <Text className="text-xl font-semibold text-foreground">New Project</Text>
            <TextInput
              className="rounded-lg border border-border bg-secondary px-4 py-3 text-base text-foreground"
              placeholder="Project name"
              placeholderTextColor="#888"
              value={newName}
              onChangeText={setNewName}
              autoFocus
              onSubmitEditing={handleCreate}
              returnKeyType="done"
            />

            <View className="z-50 gap-2">
              <Text className="text-sm font-medium text-muted-foreground">Template</Text>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Pressable className="flex-row items-center justify-between rounded-lg border border-border bg-secondary/50 px-4 py-3 active:opacity-80">
                    <Text className="text-base text-foreground">
                      {selectedTemplate === "blank"
                        ? "Empty Level"
                        : selectedTemplate === "basic"
                          ? "Basic Level"
                          : "Pseudo-Infinity"}
                    </Text>
                    <Icon as={ChevronDownIcon} className="size-5 text-muted-foreground" size={20} />
                  </Pressable>
                </DropdownMenuTrigger>
                <DropdownMenuContent className="w-64 p-1" portalHost="template-modal">
                  <DropdownMenuItem onPress={() => setSelectedTemplate("blank")}>
                    <Text>Empty Level</Text>
                  </DropdownMenuItem>
                  <DropdownMenuItem onPress={() => setSelectedTemplate("basic")}>
                    <Text>Basic Level</Text>
                  </DropdownMenuItem>
                  <DropdownMenuItem onPress={() => setSelectedTemplate("pseudo-infinity")}>
                    <Text>Pseudo-Infinity</Text>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </View>

            <View className="mt-2 flex-row justify-end gap-3">
              <Button variant="ghost" onPress={() => setModalVisible(false)}>
                <Text>Cancel</Text>
              </Button>
              <Button onPress={handleCreate} disabled={!newName.trim()}>
                <Text>Create</Text>
              </Button>
            </View>
          </Pressable>
          {/* Portal host inside modal so popups render above it */}
          <PortalHost name="template-modal" />
        </Pressable>
      </Modal>

      {/* ── Rename-project modal ─────────────────────────────────── */}
      <Modal
        visible={!!projectToRename}
        transparent
        animationType="fade"
        onRequestClose={() => setProjectToRename(null)}>
        <Pressable
          className="flex-1 items-center justify-center bg-black/50 p-6"
          onPress={() => setProjectToRename(null)}>
          <Pressable
            className="w-full max-w-sm gap-4 rounded-2xl border border-border bg-card p-6"
            onPress={() => {}}>
            <Text className="text-xl font-semibold text-foreground">Rename Project</Text>
            <TextInput
              className="rounded-lg border border-border bg-secondary px-4 py-3 text-base text-foreground"
              placeholder="Project name"
              placeholderTextColor="#888"
              value={renameValue}
              onChangeText={setRenameValue}
              autoFocus
              onSubmitEditing={confirmRename}
              returnKeyType="done"
            />
            <View className="flex-row justify-end gap-3">
              <Button variant="ghost" onPress={() => setProjectToRename(null)}>
                <Text>Cancel</Text>
              </Button>
              <Button onPress={confirmRename} disabled={!renameValue.trim()}>
                <Text>Rename</Text>
              </Button>
            </View>
          </Pressable>
        </Pressable>
      </Modal>

      {/* ── Delete-project modal ─────────────────────────────────── */}
      <Modal
        visible={!!projectToDelete}
        transparent
        animationType="fade"
        onRequestClose={() => setProjectToDelete(null)}>
        <Pressable
          className="flex-1 items-center justify-center bg-black/50 p-6"
          onPress={() => setProjectToDelete(null)}>
          <Pressable
            className="w-full max-w-sm gap-4 rounded-2xl border border-border bg-card p-6"
            onPress={() => {}}>
            <Text className="text-xl font-semibold text-foreground">Delete Project</Text>
            <Text className="text-base text-muted-foreground">
              Are you sure you want to delete "{projectToDelete?.name}"? This cannot be undone.
            </Text>
            <View className="mt-2 flex-row justify-end gap-3">
              <Button variant="ghost" onPress={() => setProjectToDelete(null)}>
                <Text>Cancel</Text>
              </Button>
              <Button variant="destructive" onPress={confirmDelete}>
                <Text>Delete</Text>
              </Button>
            </View>
          </Pressable>
        </Pressable>
      </Modal>
    </>
  );
}

// ── Project card ─────────────────────────────────────────────────────

function ProjectCard({
  project,
  onDelete,
  onRename,
  onColorChange,
  onDuplicate,
}: {
  project: Project;
  onDelete: (project: Project) => void;
  onRename: (project: Project) => void;
  onColorChange: (project: Project, color?: string) => void;
  onDuplicate: (project: Project) => void;
}) {
  const router = useRouter();
  const colorDef = PROJECT_COLORS.find((c) => c.value === project.color) || PROJECT_COLORS[0];

  return (
    <Pressable
      className={`flex-row items-center gap-4 rounded-xl border p-4 active:opacity-80 ${colorDef.twBorder} ${colorDef.twBg}`}
      onPress={() => router.push(`/project/${project.id}`)}>
      <View className={`h-11 w-11 items-center justify-center rounded-lg ${colorDef.twIconBg}`}>
        <Icon as={FolderIcon} className={`size-5 ${colorDef.twIconText}`} size={20} />
      </View>
      <View className="flex-1">
        <Text className="text-base font-semibold text-foreground">{project.name}</Text>
        <Text className="text-sm text-muted-foreground">
          Edited {formatDate(project.updatedAt)}
        </Text>
      </View>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button size="icon" variant="ghost" className="rounded-full">
            <Icon as={MoreVerticalIcon} className="size-5 text-muted-foreground" size={18} />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent className="w-48 p-1" align="end">
          <View className="mb-1 flex-row justify-between border-b border-border px-2 py-2">
            {PROJECT_COLORS.map((c) => (
              <Pressable
                key={c.name}
                onPress={() => onColorChange(project, c.value)}
                className={`size-6 items-center justify-center rounded-full border ${c.twCircle}`}>
                {project.color === c.value && (
                  <View className="size-2.5 rounded-full bg-background" />
                )}
              </Pressable>
            ))}
          </View>
          <DropdownMenuItem onPress={() => router.push(`/project/${project.id}`)}>
            <Icon as={FolderOpenIcon} className="mr-2 size-4" />
            <Text>Open Project</Text>
          </DropdownMenuItem>
          <DropdownMenuItem onPress={() => onDuplicate(project)}>
            <Icon as={CopyIcon} className="mr-2 size-4" />
            <Text>Duplicate</Text>
          </DropdownMenuItem>
          <DropdownMenuItem onPress={() => onRename(project)}>
            <Icon as={PencilIcon} className="mr-2 size-4" />
            <Text>Rename</Text>
          </DropdownMenuItem>
          <DropdownMenuItem variant="destructive" onPress={() => onDelete(project)}>
            <Icon as={Trash2Icon} className="mr-2 size-4" />
            <Text>Delete</Text>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </Pressable>
  );
}
