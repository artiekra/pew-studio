import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import { Icon } from '@/components/ui/icon';
import { Text } from '@/components/ui/text';
import {
  addFolder,
  getFileTree,
  removeNode,
  type FileNode,
  type ProjectFileTree,
} from '@/lib/fileSystem';
import { getProjects, type Project } from '@/lib/projects';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import {
  ArrowLeftIcon,
  ChevronDownIcon,
  ChevronRightIcon,
  FileIcon,
  FolderIcon,
  FolderPlusIcon,
  PackageIcon,
  PlayIcon,
  RocketIcon,
  Trash2Icon,
} from 'lucide-react-native';
import * as React from 'react';
import { Modal, Pressable, TextInput, View } from 'react-native';

// ── Screen ──────────────────────────────────────────────────────────

export default function ProjectScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const [project, setProject] = React.useState<Project | null>(null);
  const [fileTree, setFileTree] = React.useState<ProjectFileTree>([]);
  const [expandedFolders, setExpandedFolders] = React.useState<Set<string>>(new Set());

  // New-folder modal state
  const [folderModalVisible, setFolderModalVisible] = React.useState(false);
  const [folderParentId, setFolderParentId] = React.useState<string | null>(null);
  const [newFolderName, setNewFolderName] = React.useState('');

  // Deletion state
  const [nodeToDelete, setNodeToDelete] = React.useState<FileNode | null>(null);

  // ── Load data ───────────────────────────────────────────────────
  React.useEffect(() => {
    (async () => {
      const projects = await getProjects();
      const found = projects.find((p) => p.id === id);
      setProject(found ?? null);

      if (found) {
        const tree = await getFileTree(found.id);
        setFileTree(tree);
      }
    })();
  }, [id]);

  // ── Handlers ────────────────────────────────────────────────────
  const toggleFolder = React.useCallback((folderId: string) => {
    setExpandedFolders((prev) => {
      const next = new Set(prev);
      if (next.has(folderId)) next.delete(folderId);
      else next.add(folderId);
      return next;
    });
  }, []);

  const handleNewFolderOpen = React.useCallback((parentId: string | null) => {
    setFolderParentId(parentId);
    setNewFolderName('');
    setFolderModalVisible(true);
  }, []);

  const handleCreateFolder = React.useCallback(async () => {
    const trimmed = newFolderName.trim();
    if (!trimmed || !id) return;
    const updatedTree = await addFolder(id, folderParentId, trimmed);
    setFileTree(updatedTree);
    // Auto-expand the parent so the new folder is visible
    if (folderParentId) {
      setExpandedFolders((prev) => new Set(prev).add(folderParentId));
    }
    setFolderModalVisible(false);
  }, [id, folderParentId, newFolderName]);

  const confirmDelete = React.useCallback(async () => {
    if (!nodeToDelete || !id) return;
    const updatedTree = await removeNode(id, nodeToDelete.id);
    setFileTree(updatedTree);
    setNodeToDelete(null);
  }, [id, nodeToDelete]);

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
        {/* ── File tree ─────────────────────────────────────────── */}
        <View className="flex-1 p-4">
          {/* Root-level "New Folder" button */}
          <Pressable
            className="mb-2 flex-row items-center gap-2 rounded-lg px-3 py-2 active:opacity-70"
            onPress={() => handleNewFolderOpen(null)}
          >
            <Icon as={FolderPlusIcon} className="size-4 text-muted-foreground" size={16} />
            <Text className="text-sm text-muted-foreground">New folder</Text>
          </Pressable>

          {fileTree.map((node) => (
            <FileTreeNode
              key={node.id}
              node={node}
              depth={0}
              expandedFolders={expandedFolders}
              onToggle={toggleFolder}
              onNewFolder={handleNewFolderOpen}
              onDelete={setNodeToDelete}
            />
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

      {/* ── New folder modal ────────────────────────────────────── */}
      <Modal
        visible={folderModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setFolderModalVisible(false)}
      >
        <Pressable
          className="flex-1 items-center justify-center bg-black/50 p-6"
          onPress={() => setFolderModalVisible(false)}
        >
          <Pressable
            className="w-full max-w-sm gap-4 rounded-2xl border border-border bg-card p-6"
            onPress={() => {}}
          >
            <Text className="text-xl font-semibold text-foreground">New Folder</Text>
            <TextInput
              className="rounded-lg border border-border bg-secondary px-4 py-3 text-base text-foreground"
              placeholder="Folder name"
              placeholderTextColor="#888"
              value={newFolderName}
              onChangeText={setNewFolderName}
              autoFocus
              onSubmitEditing={handleCreateFolder}
              returnKeyType="done"
            />
            <View className="flex-row justify-end gap-3">
              <Button variant="ghost" onPress={() => setFolderModalVisible(false)}>
                <Text>Cancel</Text>
              </Button>
              <Button onPress={handleCreateFolder} disabled={!newFolderName.trim()}>
                <Text>Create</Text>
              </Button>
            </View>
          </Pressable>
        </Pressable>
      </Modal>

      {/* ── Delete confirmation dialog ──────────────────────────── */}
      <AlertDialog
        open={!!nodeToDelete}
        onOpenChange={(open) => {
          if (!open) setNodeToDelete(null);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              Delete {nodeToDelete?.type === 'folder' ? 'Folder' : 'File'}
            </AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{nodeToDelete?.name}"?
              {nodeToDelete?.type === 'folder'
                ? ' All contents inside this folder will also be deleted.'
                : ''}{' '}
              This cannot be undone.
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

// ── Recursive file tree node ─────────────────────────────────────────

function FileTreeNode({
  node,
  depth,
  expandedFolders,
  onToggle,
  onNewFolder,
  onDelete,
}: {
  node: FileNode;
  depth: number;
  expandedFolders: Set<string>;
  onToggle: (id: string) => void;
  onNewFolder: (parentId: string | null) => void;
  onDelete: (node: FileNode) => void;
}) {
  const isFolder = node.type === 'folder';
  const isExpanded = expandedFolders.has(node.id);
  const indent = depth * 20;

  return (
    <>
      <Pressable
        className="flex-row items-center gap-3 rounded-lg border border-border bg-card px-4 py-3 active:opacity-80"
        style={{ marginLeft: indent, marginBottom: 4 }}
        onPress={() => {
          if (isFolder) onToggle(node.id);
        }}
      >
        {/* Chevron for folders */}
        {isFolder ? (
          <Icon
            as={isExpanded ? ChevronDownIcon : ChevronRightIcon}
            className="size-4 text-muted-foreground"
            size={16}
          />
        ) : (
          <View style={{ width: 16 }} />
        )}

        {/* Icon */}
        <Icon
          as={isFolder ? FolderIcon : FileIcon}
          className="size-5 text-muted-foreground"
          size={20}
        />

        {/* Name */}
        <Text className="flex-1 text-base text-foreground">{node.name}</Text>

        {/* Folder: add sub-folder button */}
        {isFolder && (
          <Pressable
            hitSlop={8}
            className="p-1"
            onPress={(e) => {
              e.stopPropagation();
              onNewFolder(node.id);
            }}
          >
            <Icon as={FolderPlusIcon} className="size-4 text-muted-foreground" size={16} />
          </Pressable>
        )}

        {/* Delete button */}
        <Pressable
          hitSlop={8}
          className="p-1"
          onPress={(e) => {
            e.stopPropagation();
            onDelete(node);
          }}
        >
          <Icon as={Trash2Icon} className="size-4 text-muted-foreground" size={16} />
        </Pressable>
      </Pressable>

      {/* Render children when expanded */}
      {isFolder && isExpanded && node.children?.map((child) => (
        <FileTreeNode
          key={child.id}
          node={child}
          depth={depth + 1}
          expandedFolders={expandedFolders}
          onToggle={onToggle}
          onNewFolder={onNewFolder}
          onDelete={onDelete}
        />
      ))}
    </>
  );
}
