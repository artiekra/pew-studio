import { Button } from "@/components/ui/button";
import { Icon } from "@/components/ui/icon";
import { Text } from "@/components/ui/text";
import { Stack } from "expo-router";
import { MoonStarIcon, SunIcon } from "lucide-react-native";
import { useColorScheme } from "nativewind";
import * as React from "react";
import { View } from "react-native";

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
      className="ios:size-9 rounded-full">
      <Icon as={THEME_ICONS[colorScheme ?? "light"]} className="size-5 text-foreground" />
    </Button>
  );
}

export default function SettingsScreen() {
  return (
    <>
      <Stack.Screen options={{ title: "Settings" }} />
      <View className="flex-1 bg-background p-6">
        <View className="flex-1">
          <View className="flex-row items-center justify-between rounded-xl border border-border bg-card p-4">
            <Text className="text-base font-medium text-foreground">Theme</Text>
            <ThemeToggle />
          </View>
        </View>

        <View className="items-center pb-8 pt-4">
          <Text className="text-sm text-muted-foreground">PewPew Studio 1.0.0</Text>
        </View>
      </View>
    </>
  );
}
