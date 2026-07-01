import * as React from "react";
import { Stack, useRouter } from "expo-router";
import { Button } from "@/components/ui/button";
import { Icon } from "@/components/ui/icon";
import { SettingsIcon } from "lucide-react-native";
import { ProjectListScreen } from "@/components/project/ProjectListScreen";

function SettingsButton() {
  const router = useRouter();
  return (
    <Button
      onPress={() => router.push("/settings")}
      size="icon"
      variant="ghost"
      className="ios:size-9 rounded-full web:mx-4">
      <Icon as={SettingsIcon} className="size-5 text-foreground" />
    </Button>
  );
}

const SCREEN_OPTIONS = {
  title: "PewPew Studio",
  headerRight: () => <SettingsButton />,
};

export default function IndexRoute() {
  return (
    <>
      <Stack.Screen options={SCREEN_OPTIONS} />
      <ProjectListScreen />
    </>
  );
}
