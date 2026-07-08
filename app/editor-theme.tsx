import { Stack } from "expo-router";
import { View, Pressable, ActivityIndicator, ScrollView } from "react-native";
import { Text } from "@/components/ui/text";
import { Icon } from "@/components/ui/icon";
import { CheckIcon, MonitorIcon, SunIcon, MoonIcon, PaletteIcon } from "lucide-react-native";
import { useEffect, useState } from "react";
import { EditorTheme, getEditorSettings, saveEditorSettings } from "@/lib/editorSettings";

const THEMES: { label: string; value: EditorTheme; icon: any }[] = [
  { label: "System", value: "system", icon: MonitorIcon },
  { label: "Light", value: "light", icon: SunIcon },
  { label: "Dark", value: "dark", icon: MoonIcon },
  { label: "Amy", value: "amy", icon: PaletteIcon },
  { label: "Ayu Light", value: "ayuLight", icon: PaletteIcon },
  { label: "Barf", value: "barf", icon: PaletteIcon },
  { label: "Bespin", value: "bespin", icon: PaletteIcon },
  { label: "Birds of Paradise", value: "birdsOfParadise", icon: PaletteIcon },
  { label: "Boys and Girls", value: "boysAndGirls", icon: PaletteIcon },
  { label: "Clouds", value: "clouds", icon: PaletteIcon },
  { label: "Cobalt", value: "cobalt", icon: PaletteIcon },
  { label: "Cool Glow", value: "coolGlow", icon: PaletteIcon },
  { label: "Dracula", value: "dracula", icon: PaletteIcon },
  { label: "Espresso", value: "espresso", icon: PaletteIcon },
  { label: "Noctis Lilac", value: "noctisLilac", icon: PaletteIcon },
  { label: "Rosé Pine Dawn", value: "rosePineDawn", icon: PaletteIcon },
  { label: "Smoothy", value: "smoothy", icon: PaletteIcon },
  { label: "Solarized Light", value: "solarizedLight", icon: PaletteIcon },
  { label: "Tomorrow", value: "tomorrow", icon: PaletteIcon },
];

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
      <ScrollView className="flex-1 bg-background" contentContainerClassName="p-6 gap-3 pb-12">
        {THEMES.map((t) => (
          <ThemeOption 
            key={t.value}
            label={t.label} 
            icon={t.icon} 
            selected={theme === t.value} 
            onSelect={() => handleSelect(t.value)} 
          />
        ))}
      </ScrollView>
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
