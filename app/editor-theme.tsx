import { Stack } from "expo-router";
import { View } from "react-native";
import { Text } from "@/components/ui/text";

export default function EditorThemeScreen() {
  return (
    <>
      <Stack.Screen options={{ title: "Code Editor Theme" }} />
      <View className="flex-1 items-center justify-center bg-background p-6">
        <Text className="text-base text-muted-foreground">Editor Theme Settings (Coming Soon)</Text>
      </View>
    </>
  );
}
