import { Button } from '@/components/ui/button';
import { Icon } from '@/components/ui/icon';
import { Text } from '@/components/ui/text';
import { getProjects, type Project } from '@/lib/projects';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import {
  ArrowLeftIcon,
  FileIcon,
  FolderIcon,
  PackageIcon,
  PlayIcon,
  RocketIcon,
} from 'lucide-react-native';
import * as React from 'react';
import { Pressable, View } from 'react-native';

// ── Placeholder file-system data ────────────────────────────────────

const PLACEHOLDER_FILES = [
  { name: 'main.lua', type: 'file' as const },
  { name: 'enemies/', type: 'folder' as const },
  { name: 'levels/', type: 'folder' as const },
  { name: 'helpers.lua', type: 'file' as const },
  { name: 'config.json', type: 'file' as const },
];

// ── Screen ──────────────────────────────────────────────────────────

export default function ProjectScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const [project, setProject] = React.useState<Project | null>(null);

  React.useEffect(() => {
    getProjects().then((projects) => {
      const found = projects.find((p) => p.id === id);
      setProject(found ?? null);
    });
  }, [id]);

  if (!project) return null;

  return (
    <>
      <Stack.Screen
        options={{
          title: project.name,
          headerLeft: () => (
            <Pressable onPress={() => router.back()} className="ios:ml-0 ml-2 mr-6 p-1" hitSlop={8}>
              <Icon as={ArrowLeftIcon} className="size-6 text-foreground" size={24} />
            </Pressable>
          ),
        }}
      />

      <View className="flex-1 bg-background">
        {/* ── File system viewer (boilerplate) ──────────────────── */}
        <View className="flex-1 gap-1 p-4">
          {PLACEHOLDER_FILES.map((file) => (
            <Pressable
              key={file.name}
              className="flex-row items-center gap-3 rounded-lg border border-border bg-card px-4 py-3 active:opacity-80">
              <Icon
                as={file.type === 'folder' ? FolderIcon : FileIcon}
                className="size-5 text-muted-foreground"
                size={20}
              />
              <Text className="text-base text-foreground">{file.name}</Text>
            </Pressable>
          ))}
        </View>

        {/* ── Bottom action bar ─────────────────────────────────── */}
        <View className="border-t border-border bg-card px-4 pb-9 pt-4">
          <View className="flex-row gap-3">
            <Button className="flex-1 flex-row items-center justify-center gap-2">
              <Icon as={PlayIcon} className="size-4 text-primary-foreground" size={16} />
              <Text className="font-semibold text-primary-foreground">Play</Text>
            </Button>
            <Button
              variant="secondary"
              className="flex-1 flex-row items-center justify-center gap-2">
              <Icon as={RocketIcon} className="size-4 text-secondary-foreground" size={16} />
              <Text className="font-semibold text-secondary-foreground">Release</Text>
            </Button>
            <Button variant="outline" className="flex-1 flex-row items-center justify-center gap-2">
              <Icon as={PackageIcon} className="size-4 text-foreground" size={16} />
              <Text className="font-semibold text-foreground">Export</Text>
            </Button>
          </View>
        </View>
      </View>
    </>
  );
}
