import { Stack } from "expo-router";
import { View, Pressable, ActivityIndicator, ScrollView, Image, Linking } from "react-native";
import { Text } from "@/components/ui/text";
import { Icon } from "@/components/ui/icon";
import { CheckIcon, MonitorIcon, SunIcon, MoonIcon, PaletteIcon } from "lucide-react-native";
import { useEffect, useState } from "react";
import { EditorTheme, getEditorSettings, saveEditorSettings } from "@/lib/editorSettings";

const THEMES: { label: string; value: EditorTheme; icon: any }[] = [
  { label: "Light", value: "light", icon: SunIcon },
  { label: "Dark", value: "dark", icon: MoonIcon },
  { label: "Amy", value: "amy", icon: PaletteIcon },
  { label: "Ayu Light", value: "ayuLight", icon: PaletteIcon },
  { label: "Barf", value: "barf", icon: PaletteIcon },
  { label: "Bespin", value: "bespin", icon: PaletteIcon },
  { label: "Birds", value: "birdsOfParadise", icon: PaletteIcon },
  { label: "Boys&Girls", value: "boysAndGirls", icon: PaletteIcon },
  { label: "Clouds", value: "clouds", icon: PaletteIcon },
  { label: "Cobalt", value: "cobalt", icon: PaletteIcon },
  { label: "Cool Glow", value: "coolGlow", icon: PaletteIcon },
  { label: "Dracula", value: "dracula", icon: PaletteIcon },
  { label: "Espresso", value: "espresso", icon: PaletteIcon },
  { label: "Noctis", value: "noctisLilac", icon: PaletteIcon },
  { label: "Rosé Dawn", value: "rosePineDawn", icon: PaletteIcon },
  { label: "Smoothy", value: "smoothy", icon: PaletteIcon },
  { label: "Solarized", value: "solarizedLight", icon: PaletteIcon },
  { label: "Tomorrow", value: "tomorrow", icon: PaletteIcon },
];

const THEME_IMAGES: Record<string, any> = {
  light: require("../assets/images/themes/light.png"),
  dark: require("../assets/images/themes/dark.png"),
  amy: require("../assets/images/themes/amy.png"),
  ayuLight: require("../assets/images/themes/ayuLight.png"),
  barf: require("../assets/images/themes/barf.png"),
  bespin: require("../assets/images/themes/bespin.png"),
  birdsOfParadise: require("../assets/images/themes/birdsOfParadise.png"),
  boysAndGirls: require("../assets/images/themes/boysAndGirls.png"),
  clouds: require("../assets/images/themes/clouds.png"),
  cobalt: require("../assets/images/themes/cobalt.png"),
  coolGlow: require("../assets/images/themes/coolGlow.png"),
  dracula: require("../assets/images/themes/dracula.png"),
  espresso: require("../assets/images/themes/espresso.png"),
  noctisLilac: require("../assets/images/themes/noctisLilac.png"),
  rosePineDawn: require("../assets/images/themes/rosePineDawn.png"),
  smoothy: require("../assets/images/themes/smoothy.png"),
  solarizedLight: require("../assets/images/themes/solarizedLight.png"),
  tomorrow: require("../assets/images/themes/tomorrow.png"),
};

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
      <ScrollView className="flex-1 bg-background" contentContainerClassName="p-4 pb-12">
        <View className="flex-row flex-wrap">
          <View className="w-full p-2">
            <Pressable
              onPress={() => handleSelect("system")}
              className={`flex-row items-center justify-between rounded-xl border bg-card p-4 active:opacity-70 ${theme === "system" ? "border-[2px] border-primary" : "border-border"}`}>
              <View className="flex-row items-center gap-3">
                <Icon as={MonitorIcon} className="size-5 text-foreground" size={20} />
                <Text className="text-base font-medium text-foreground">Match app theme</Text>
              </View>
              {theme === "system" && (
                <Icon as={CheckIcon} className="size-5 text-primary" size={20} />
              )}
            </Pressable>
          </View>
          {THEMES.map((t) => (
            <View key={t.value} className="w-1/2 p-2">
              <ThemeOption
                label={t.label}
                icon={t.icon}
                themeValue={t.value}
                selected={theme === t.value}
                onSelect={() => handleSelect(t.value)}
              />
            </View>
          ))}
        </View>

        <View className="items-center px-4 pt-4">
          <Text className="text-center text-xs leading-relaxed text-muted-foreground">
            "Dark" and "Light" themes come from{"\n"}
            <Text
              onPress={() => Linking.openURL("https://github.com/fsegurai/codemirror-themes")}
              className="text-xs text-primary underline">
              https://github.com/fsegurai/codemirror-themes
            </Text>
            {"\n\n"}
            While all other themes come from{"\n"}
            <Text
              onPress={() => Linking.openURL("https://github.com/vadimdemedes/thememirror")}
              className="text-xs text-primary underline">
              https://github.com/vadimdemedes/thememirror
            </Text>
          </Text>
        </View>
      </ScrollView>
    </>
  );
}

function ThemeOption({
  label,
  icon,
  themeValue,
  selected,
  onSelect,
}: {
  label: string;
  icon: any;
  themeValue: string;
  selected: boolean;
  onSelect: () => void;
}) {
  const source = THEME_IMAGES[themeValue];
  let actualAspectRatio = 16 / 9;
  try {
    const assetInfo = Image.resolveAssetSource(source);
    if (assetInfo && assetInfo.width && assetInfo.height) {
      actualAspectRatio = assetInfo.width / assetInfo.height;
    }
  } catch (e) {
    // fallback to 16/9
  }

  return (
    <Pressable
      onPress={onSelect}
      className={`overflow-hidden rounded-xl border bg-card active:opacity-70 ${selected ? "border-[2px] border-primary" : "border-border"}`}>
      <View className="aspect-video w-full items-start justify-center overflow-hidden bg-muted">
        <Image
          source={source}
          style={
            {
              height: "100%",
              aspectRatio: actualAspectRatio,
              objectFit: "cover",
              objectPosition: "left",
            } as any
          }
          resizeMode="stretch"
        />
      </View>
      <View className="flex-row items-center justify-between p-3">
        <View className="flex-1 flex-row items-center gap-1">
          <Icon as={icon} className="size-4 shrink-0 text-foreground" size={16} />
          <Text className="text-sm font-medium text-foreground" numberOfLines={1}>
            {label}
          </Text>
        </View>
        {selected && (
          <Icon as={CheckIcon} className="ml-1 size-4 shrink-0 text-primary" size={16} />
        )}
      </View>
    </Pressable>
  );
}
