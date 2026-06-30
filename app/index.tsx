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
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Icon } from "@/components/ui/icon";
import { Text } from "@/components/ui/text";
import {
  createProject,
  deleteProject,
  getProjects,
  renameProject,
  updateProjectColor,
  type Project,
} from "@/lib/projects";
import { Stack, useRouter } from "expo-router";
import {
  DownloadIcon,
  FilePlusIcon,
  FolderIcon,
  FolderOpenIcon,
  GlobeIcon,
  MoreVerticalIcon,
  PencilIcon,
  PlusIcon,
  SettingsIcon,
  Trash2Icon,
} from "lucide-react-native";
import { useColorScheme } from "nativewind";
import * as React from "react";
import { FlatList, Modal, Pressable, TextInput, View } from "react-native";

// ── Screen options ───────────────────────────────────────────────────

function SettingsButton() {
  const router = useRouter();
  return (
    <Button
      onPress={() => router.push('/settings')}
      size="icon"
      variant="ghost"
      className="ios:size-9 rounded-full web:mx-4">
      <Icon as={SettingsIcon} className="size-5 text-foreground" />
    </Button>
  );
}

const SCREEN_OPTIONS = {
  title: "PewPew Studio",
  headerRight: () => <SettingsButton />,
};

// ── Helpers ──────────────────────────────────────────────────────────

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

// ── Main screen ──────────────────────────────────────────────────────

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

export default function ProjectsScreen() {
  const [projects, setProjects] = React.useState<Project[]>([]);
  const [loaded, setLoaded] = React.useState(false);
  const [modalVisible, setModalVisible] = React.useState(false);
  const [actionModalVisible, setActionModalVisible] = React.useState(false);
  const [newName, setNewName] = React.useState("");
  const [projectToDelete, setProjectToDelete] = React.useState<Project | null>(null);
  const [projectToRename, setProjectToRename] = React.useState<Project | null>(null);
  const [renameValue, setRenameValue] = React.useState("");

  // Load projects on mount
  React.useEffect(() => {
    getProjects().then((p) => {
      setProjects(p);
      setLoaded(true);
    });
  }, []);

  const handleCreate = React.useCallback(async () => {
    const trimmed = newName.trim();
    if (!trimmed) return;
    const project = await createProject(trimmed);
    setProjects((prev) => [project, ...prev]);
    setNewName("");
    setModalVisible(false);
  }, [newName]);

  const handleDelete = React.useCallback((project: Project) => {
    setProjectToDelete(project);
  }, []);

  const confirmDelete = React.useCallback(async () => {
    if (!projectToDelete) return;
    await deleteProject(projectToDelete.id);
    setProjects((prev) => prev.filter((p) => p.id !== projectToDelete.id));
    setProjectToDelete(null);
  }, [projectToDelete]);

  const handleRename = React.useCallback((project: Project) => {
    setRenameValue(project.name);
    setProjectToRename(project);
  }, []);

  const confirmRename = React.useCallback(async () => {
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

  const handleColorChange = React.useCallback(async (project: Project, color?: string) => {
    if (project.color !== color) {
      await updateProjectColor(project.id, color);
      setProjects((prev) =>
        prev.map((p) =>
          p.id === project.id ? { ...p, color, updatedAt: new Date().toISOString() } : p
        )
      );
    }
  }, []);

  if (!loaded) return null;

  return (
    <>
      <Stack.Screen options={SCREEN_OPTIONS} />

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
              <Text className="text-sm text-muted-foreground mt-1">
                Choose how you want to start your new level.
              </Text>
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
              onPress={() => {}}>
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

            <Pressable
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
            </Pressable>

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
            <View className="flex-row justify-end gap-3">
              <Button variant="ghost" onPress={() => setModalVisible(false)}>
                <Text>Cancel</Text>
              </Button>
              <Button onPress={handleCreate} disabled={!newName.trim()}>
                <Text>Create</Text>
              </Button>
            </View>
          </Pressable>
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

      {/* ── Delete-project alert dialog ───────────────────────────── */}
      <AlertDialog
        open={!!projectToDelete}
        onOpenChange={(open) => {
          if (!open) setProjectToDelete(null);
        }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Project</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{projectToDelete?.name}"? This cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>
              <Text>Cancel</Text>
            </AlertDialogCancel>
            <AlertDialogAction className="bg-destructive" onPress={confirmDelete}>
              <Text>Delete</Text>
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

// ── Project card ─────────────────────────────────────────────────────

function ProjectCard({
  project,
  onDelete,
  onRename,
  onColorChange,
}: {
  project: Project;
  onDelete: (project: Project) => void;
  onRename: (project: Project) => void;
  onColorChange: (project: Project, color?: string) => void;
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

