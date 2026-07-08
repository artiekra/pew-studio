import React, { useEffect, useState } from "react";
import { View, Pressable, Linking } from "react-native";
import { Stack, useLocalSearchParams, useRouter } from "expo-router";
import { Text } from "@/components/ui/text";
import { Icon } from "@/components/ui/icon";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  ArrowLeftIcon,
  RocketIcon,
  UploadIcon,
  ExternalLinkIcon,
  BookOpenIcon,
} from "lucide-react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { getProjects } from "@/services/projectRepository";
import { uploadLevel } from "@/services/uploadService";
import type { Project } from "@/types";

export default function ReleaseScreen() {
  const { projectId } = useLocalSearchParams<{ projectId: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [project, setProject] = useState<Project | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadResult, setUploadResult] = useState<{
    status: "success" | "error";
    message: string;
  } | null>(null);
  const [isRulesModalOpen, setIsRulesModalOpen] = useState(false);

  useEffect(() => {
    (async () => {
      const projects = await getProjects();
      const found = projects.find((p) => p.id === projectId);
      setProject(found ?? null);
    })();
  }, [projectId]);

  if (!project) return null;

  const handleUpload = async () => {
    if (!project) return;
    setIsUploading(true);
    const result = await uploadLevel(projectId, project.name);
    setIsUploading(false);
    setUploadResult({
      status: result.success ? "success" : "error",
      message: result.message,
    });
  };

  return (
    <>
      <Stack.Screen
        options={{
          title: "Release: " + project.name,
          headerLeft: () => (
            <Pressable onPress={() => router.back()} className="ios:ml-0 ml-2 mr-6 p-1" hitSlop={8}>
              <Icon as={ArrowLeftIcon} className="size-6 text-foreground" size={24} />
            </Pressable>
          ),
        }}
      />

      <View className="flex-1 bg-background p-6">
        <View className="flex-1 gap-6">
          {/* Info text (boilerplate) */}
          <Text className="px-4 text-base text-muted-foreground">
            Upload your level to PewPew Live so other players can discover and play it.
          </Text>
          <Text className="px-4 text-base text-muted-foreground">
            Your level will initially be private (only visible to you) - it can be played in the
            game's "experimental" tab.
          </Text>
          <Text className="px-4 text-base text-muted-foreground">
            Log into the website to manage your levels (delete, request a review and check their
            status). If you want to update your level within this app, upload it again and delete
            the old version.
          </Text>

          {/* Level uploading rules */}
          <Button
            variant="outline"
            className="flex-row items-center justify-center gap-2"
            onPress={() => setIsRulesModalOpen(true)}>
            <Icon as={BookOpenIcon} className="size-4 text-foreground" size={16} />
            <Text className="font-semibold text-foreground">Level Uploading Rules</Text>
          </Button>

          {/* Upload current level */}
          <Button
            className="flex-row items-center justify-center gap-2"
            onPress={handleUpload}
            disabled={isUploading}>
            <Icon
              as={isUploading ? RocketIcon : UploadIcon}
              className="size-4 text-primary-foreground"
              size={16}
            />
            <Text className="font-semibold text-primary-foreground">
              {isUploading ? "Uploading..." : "Upload Level"}
            </Text>
          </Button>

          {/* View on pewpew.live */}
          <Button
            variant="secondary"
            className="flex-row items-center justify-center gap-2"
            onPress={() => Linking.openURL("https://pewpew.live/account/custom-levels")}>
            <Icon as={ExternalLinkIcon} className="size-4 text-secondary-foreground" size={16} />
            <Text className="font-semibold text-secondary-foreground">
              My Levels on PewPew Live
            </Text>
          </Button>
        </View>
      </View>

      {/* ── Upload Result Alert ───────────────────────────────── */}
      <AlertDialog
        open={uploadResult !== null}
        onOpenChange={(open) => {
          if (!open) setUploadResult(null);
        }}>
        <AlertDialogContent>
          <AlertDialogHeader className="items-center sm:items-center">
            <AlertDialogTitle
              className={
                uploadResult?.status === "success" ? "text-green-500" : "text-destructive"
              }>
              {uploadResult?.status === "success" ? "Upload Successful" : "Upload Failed"}
            </AlertDialogTitle>
            <AlertDialogDescription className="text-center">
              {uploadResult?.message}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="sm:justify-center">
            <AlertDialogAction
              className={
                uploadResult?.status === "success"
                  ? "bg-green-500 hover:bg-green-600 active:bg-green-600/90"
                  : ""
              }
              onPress={() => setUploadResult(null)}>
              <Text className={uploadResult?.status === "success" ? "text-white" : ""}>
                Dismiss
              </Text>
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* ── Rules Modal ───────────────────────────────────────── */}
      <AlertDialog open={isRulesModalOpen} onOpenChange={setIsRulesModalOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Level Uploading Rules</AlertDialogTitle>
            <AlertDialogDescription>
              You may not upload content that: is racist, discriminatory, defamatory of any person,
              obscene, offensive, pornographic, hateful or inflammatory; infringes any copyright,
              trademark or other intellectual property; is malicious or technologically harmful. By
              uploading content, you accept licensing the uploaded content under the MIT License. A
              level cannot have more than 500 files.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogAction onPress={() => setIsRulesModalOpen(false)}>
              <Text>Close</Text>
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
