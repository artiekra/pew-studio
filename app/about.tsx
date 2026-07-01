import { Stack } from "expo-router";
import { View, Linking } from "react-native";
import { Text } from "@/components/ui/text";
import { Button } from "@/components/ui/button";
import { GithubIcon } from "lucide-react-native";
import { Icon } from "@/components/ui/icon";

export default function AboutScreen() {
  const openGitHub = () => {
    Linking.openURL("https://github.com/artiekra/pew-studio");
  };

  return (
    <>
      <Stack.Screen options={{ title: "About" }} />
      <View className="flex-1 items-center justify-center bg-background p-6">
        <Text className="text-m text-center text-muted-foreground">PewPew Studio</Text>
        <Text className="text-m text-center text-muted-foreground">version 1.0.0</Text>

        <Text className="text-m mx-4 mt-4 text-center text-muted-foreground">
          Open-source mobile code editor for PewPew Live levels
        </Text>

        <Text className="text-m mb-6 mt-4 text-center text-muted-foreground">
          Artemii Kravchuk, 2026
        </Text>

        <Button onPress={openGitHub} className="gap-2">
          <Icon as={GithubIcon} className="size-5 text-primary-foreground" />
          <Text>GitHub</Text>
        </Button>
      </View>
    </>
  );
}
