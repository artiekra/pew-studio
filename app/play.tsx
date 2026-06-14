import React from "react";
import { View, Pressable } from "react-native";
import { Stack, useLocalSearchParams, useRouter } from "expo-router";
import * as ScreenOrientation from "expo-screen-orientation";
import { Text } from "@/components/ui/text";
import { Icon } from "@/components/ui/icon";
import { ArrowLeftIcon, WrenchIcon, SettingsIcon, CodeIcon } from "lucide-react-native";
import { useFocusEffect } from "expo-router";

export default function PlayScreen() {
  const { projectId } = useLocalSearchParams<{ projectId: string }>();
  const router = useRouter();

  useFocusEffect(
    React.useCallback(() => {
      // Lock to landscape when entering the play screen
      ScreenOrientation.lockAsync(ScreenOrientation.OrientationLock.LANDSCAPE);

      return () => {
        // Revert to portrait explicitly when leaving to avoid layout cache bugs
        ScreenOrientation.lockAsync(ScreenOrientation.OrientationLock.PORTRAIT_UP);
      };
    }, [])
  );

  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />
      <View className="flex-1 flex-row bg-background">
        {/* Sidebar */}
        <View className="w-16 flex-col items-center gap-6 border-r border-border bg-card py-4">
          <Pressable
  onPress={async () => {
    await ScreenOrientation.lockAsync(ScreenOrientation.OrientationLock.PORTRAIT_UP);
    // Replace the current route with the project screen to force a fresh mount
    router.replace({ pathname: "/project/[id]", params: { id: projectId } });
  }}
  className="rounded-full bg-muted p-2 active:opacity-70">



            <Icon as={ArrowLeftIcon} className="size-6 text-foreground" size={24} />
          </Pressable>

          <Pressable className="p-2 active:opacity-70">
            <Icon as={WrenchIcon} className="size-6 text-muted-foreground" size={24} />
          </Pressable>

          <Pressable className="p-2 active:opacity-70">
            <Icon as={CodeIcon} className="size-6 text-muted-foreground" size={24} />
          </Pressable>

          <View className="flex-1" />

          <Pressable className="p-2 active:opacity-70">
            <Icon as={SettingsIcon} className="size-6 text-muted-foreground" size={24} />
          </Pressable>
        </View>

        {/* Main Content Area (Future WebView) */}
        <View className="m-4 flex-1 items-center justify-center rounded-xl border border-dashed border-border bg-background">
          <Text className="text-xl font-semibold text-muted-foreground">WebView Area</Text>
          <Text className="mt-2 text-sm text-muted-foreground">Project ID: {projectId}</Text>
        </View>
      </View>
    </>
  );
}
