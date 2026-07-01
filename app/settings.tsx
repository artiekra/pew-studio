import { Icon } from "@/components/ui/icon";
import { Text } from "@/components/ui/text";
import { Stack, useRouter } from "expo-router";
import { MoonStarIcon, SunIcon, SparklesIcon, ChevronRightIcon } from "lucide-react-native";
import { useColorScheme } from "nativewind";
import * as React from "react";
import { View, Pressable } from "react-native";

const THEME_ICONS = {
  light: SunIcon,
  dark: MoonStarIcon,
};

function ThemeToggle() {
  const { colorScheme, toggleColorScheme } = useColorScheme();

  return (
    <Pressable
      onPress={toggleColorScheme}
      className="flex-row items-center justify-between rounded-xl border border-border bg-card p-4 active:opacity-70">
      <Text className="text-base font-medium text-foreground">Theme</Text>
      <View className="flex-row items-center gap-2">
        <Text className="text-base text-muted-foreground">
          {colorScheme ?? "light"}
        </Text>
        <Icon as={THEME_ICONS[colorScheme ?? "light"]} className="size-5 text-foreground" size={20} />
      </View>
    </Pressable>
  );
}

export default function SettingsScreen() {
  const router = useRouter();

  return (
    <>
      <Stack.Screen options={{ title: "Settings" }} />
      <View className="flex-1 bg-background p-6">
        <View className="flex-1 gap-3">
          <ThemeToggle />

          <Pressable
            onPress={() => router.push("/ai-settings")}
            className="flex-row items-center justify-between rounded-xl border border-border bg-card p-4 active:opacity-70">
            <View className="flex-row items-center gap-3">
              <Icon as={SparklesIcon} className="size-5 text-foreground" size={20} />
              <Text className="text-base font-medium text-foreground">AI Settings</Text>
            </View>
            <Icon as={ChevronRightIcon} className="size-5 text-muted-foreground" size={20} />
          </Pressable>
        </View>

        <View className="items-center pb-8 pt-4">
          <Text className="text-sm text-muted-foreground">PewPew Studio 1.0.0</Text>
        </View>
      </View>
    </>
  );
}
