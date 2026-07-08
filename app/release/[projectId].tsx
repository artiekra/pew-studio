import React, { useEffect, useState } from "react";
import { View, Pressable } from "react-native";
import { Stack, useLocalSearchParams, useRouter } from "expo-router";
import { Text } from "@/components/ui/text";
import { Icon } from "@/components/ui/icon";
import { Button } from "@/components/ui/button";
import { ArrowLeftIcon, RocketIcon, CheckCircleIcon } from "lucide-react-native";
import { getProjects } from "@/services/projectRepository";
import type { Project } from "@/types";

export default function ReleaseScreen() {
  const { projectId } = useLocalSearchParams<{ projectId: string }>();
  const router = useRouter();
  const [project, setProject] = useState<Project | null>(null);

  useEffect(() => {
    (async () => {
      const projects = await getProjects();
      const found = projects.find((p) => p.id === projectId);
      setProject(found ?? null);
    })();
  }, [projectId]);

  if (!project) return null;

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
      <View className="flex-1 items-center justify-center bg-background p-6">
        <View className="w-full max-w-sm items-center gap-6">
          <View className="mb-4 items-center justify-center rounded-full bg-primary/10 p-6">
            <Icon as={RocketIcon} className="size-12 text-primary" size={48} />
          </View>
          
          <View className="items-center gap-2">
            <Text className="text-center text-2xl font-bold text-foreground">
              Ready for Release!
            </Text>
            <Text className="text-center text-base text-muted-foreground">
              Your project "{project.name}" is configured correctly and ready to be published.
            </Text>
          </View>

          <View className="flex-row w-full items-center justify-center gap-2 rounded-lg border border-green-500/20 bg-green-500/10 px-4 py-3">
            <Icon as={CheckCircleIcon} className="size-5 text-green-500" size={20} />
            <Text className="text-sm font-medium text-green-500">
              Connection to release server successful
            </Text>
          </View>

          <Button 
            className="mt-4 w-full" 
            onPress={() => router.back()}>
            <Text className="font-semibold text-primary-foreground">
              Return to Project
            </Text>
          </Button>
        </View>
      </View>
    </>
  );
}
