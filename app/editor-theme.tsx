import { Stack } from "expo-router";
import { View, Pressable, ActivityIndicator } from "react-native";
import { Text } from "@/components/ui/text";
import { Icon } from "@/components/ui/icon";
import { CheckIcon, MonitorIcon, SunIcon, MoonIcon } from "lucide-react-native";
import { useEffect, useState } from "react";
import { EditorTheme, getEditorSettings, saveEditorSettings } from "@/lib/editorSettings";

export default function EditorThemeScreen() {
  const [theme, setTheme] = useState<EditorTheme>("system");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getEditorSettings().then((settings) => {
      setTheme(settings.theme);
      setLoading(false);
    });
  }, []);

  const handleSelect = async (newTheme: EditorTheme) => {
    setTheme(newTheme);
    await saveEditorSettings({ theme: newTheme });
  };

  if (loading) {
    return (
      <>
        <Stack.Screen options={{ title: "Code Editor Theme" }} />
        <View className="flex-1 items-center justify-center bg-background">
          <ActivityIndicator size="large" />
        </View>
      </>
    );
  }

  return (
    <>
      <Stack.Screen options={{ title: "Code Editor Theme" }} />
      <View className="flex-1 bg-background p-6">
        <View className="gap-3">
          <ThemeOption 
            label="System" 
            icon={MonitorIcon} 
            selected={theme === "system"} 
            onSelect={() => handleSelect("system")} 
          />
          <ThemeOption 
            label="Light" 
            icon={SunIcon} 
            selected={theme === "light"} 
            onSelect={() => handleSelect("light")} 
          />
          <ThemeOption 
            label="Dark" 
            icon={MoonIcon} 
            selected={theme === "dark"} 
            onSelect={() => handleSelect("dark")} 
          />
        </View>
      </View>
    </>
  );
}

function ThemeOption({ 
  label, 
  icon, 
  selected, 
  onSelect 
}: { 
  label: string; 
  icon: any; 
  selected: boolean; 
  onSelect: () => void;
}) {
  return (
    <Pressable
      onPress={onSelect}
      className="flex-row items-center justify-between rounded-xl border border-border bg-card p-4 active:opacity-70">
      <View className="flex-row items-center gap-3">
        <Icon as={icon} className="size-5 text-foreground" size={20} />
        <Text className="text-base font-medium text-foreground">{label}</Text>
      </View>
      {selected && <Icon as={CheckIcon} className="size-5 text-foreground" size={20} />}
    </Pressable>
  );
}
