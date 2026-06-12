import { Button } from '@/components/ui/button';
import { Icon } from '@/components/ui/icon';
import { Text } from '@/components/ui/text';
import {
  createProject,
  deleteProject,
  getProjects,
  type Project,
} from '@/lib/projects';
import { Stack } from 'expo-router';
import {
  FolderIcon,
  MoonStarIcon,
  PlusIcon,
  SunIcon,
  Trash2Icon,
} from 'lucide-react-native';
import { useColorScheme } from 'nativewind';
import * as React from 'react';
import {
  Alert,
  FlatList,
  Modal,
  Pressable,
  TextInput,
  View,
} from 'react-native';

// ── Screen options ───────────────────────────────────────────────────

const SCREEN_OPTIONS = {
  title: 'PewPew Studio',
  headerRight: () => <ThemeToggle />,
};

// ── Helpers ──────────────────────────────────────────────────────────

function formatDate(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60_000);
  if (mins < 1) return 'Just now';
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days}d ago`;
  return new Date(iso).toLocaleDateString();
}

// ── Main screen ──────────────────────────────────────────────────────

export default function ProjectsScreen() {
  const [projects, setProjects] = React.useState<Project[]>([]);
  const [loaded, setLoaded] = React.useState(false);
  const [modalVisible, setModalVisible] = React.useState(false);
  const [newName, setNewName] = React.useState('');

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
    setNewName('');
    setModalVisible(false);
  }, [newName]);

  const handleDelete = React.useCallback((project: Project) => {
    Alert.alert(
      'Delete Project',
      `Are you sure you want to delete "${project.name}"? This cannot be undone.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            await deleteProject(project.id);
            setProjects((prev) => prev.filter((p) => p.id !== project.id));
          },
        },
      ]
    );
  }, []);

  if (!loaded) return null;

  return (
    <>
      <Stack.Screen options={SCREEN_OPTIONS} />

      <View className="flex-1 bg-background">
        {projects.length === 0 ? (
          <View className="flex-1 items-center justify-center gap-3 p-8">
            <Icon as={FolderIcon} className="text-muted-foreground size-12" size={48} />
            <Text className="text-muted-foreground text-center text-lg">
              No projects yet
            </Text>
            <Text className="text-muted-foreground text-center text-sm">
              Tap the + button to create your first project.
            </Text>
          </View>
        ) : (
          <FlatList
            data={projects}
            keyExtractor={(item) => item.id}
            contentContainerClassName="p-4 gap-3"
            renderItem={({ item }) => (
              <ProjectCard project={item} onDelete={handleDelete} />
            )}
          />
        )}

        {/* Floating action button */}
        <View className="absolute bottom-6 right-6">
          <Button
            size="icon"
            className="h-14 w-14 rounded-full shadow-lg"
            onPress={() => setModalVisible(true)}
          >
            <Icon as={PlusIcon} className="text-primary-foreground size-6" size={24} />
          </Button>
        </View>
      </View>

      {/* ── Create-project modal ─────────────────────────────────── */}
      <Modal
        visible={modalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setModalVisible(false)}
      >
        <Pressable
          className="flex-1 items-center justify-center bg-black/50 p-6"
          onPress={() => setModalVisible(false)}
        >
          {/* Stop propagation so tapping the card doesn't close the modal */}
          <Pressable
            className="bg-card border-border w-full max-w-sm gap-4 rounded-2xl border p-6"
            onPress={() => {}}
          >
            <Text className="text-foreground text-xl font-semibold">New Project</Text>
            <TextInput
              className="bg-secondary text-foreground border-border rounded-lg border px-4 py-3 text-base"
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
    </>
  );
}

// ── Project card ─────────────────────────────────────────────────────

function ProjectCard({
  project,
  onDelete,
}: {
  project: Project;
  onDelete: (project: Project) => void;
}) {
  return (
    <Pressable className="bg-card border-border flex-row items-center gap-4 rounded-xl border p-4 active:opacity-80">
      <View className="bg-secondary h-11 w-11 items-center justify-center rounded-lg">
        <Icon as={FolderIcon} className="text-foreground size-5" size={20} />
      </View>
      <View className="flex-1">
        <Text className="text-foreground text-base font-semibold">{project.name}</Text>
        <Text className="text-muted-foreground text-sm">
          Edited {formatDate(project.updatedAt)}
        </Text>
      </View>
      <Button
        size="icon"
        variant="ghost"
        className="rounded-full"
        onPress={() => onDelete(project)}
      >
        <Icon as={Trash2Icon} className="text-muted-foreground size-5" size={18} />
      </Button>
    </Pressable>
  );
}

// ── Theme toggle ─────────────────────────────────────────────────────

const THEME_ICONS = {
  light: SunIcon,
  dark: MoonStarIcon,
};

function ThemeToggle() {
  const { colorScheme, toggleColorScheme } = useColorScheme();

  return (
    <Button
      onPressIn={toggleColorScheme}
      size="icon"
      variant="ghost"
      className="ios:size-9 rounded-full web:mx-4"
    >
      <Icon as={THEME_ICONS[colorScheme ?? 'light']} className="size-5" />
    </Button>
  );
}
