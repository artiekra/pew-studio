import React, { useEffect, useState, useCallback } from "react";
import { View, TextInput, Alert, Image } from "react-native";
import { Stack, useRouter } from "expo-router";
import { Pressable } from "react-native";
import { Text } from "@/components/ui/text";
import { Icon } from "@/components/ui/icon";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  ArrowLeftIcon,
  SaveIcon,
  ServerIcon,
  KeyRoundIcon,
  CheckCircleIcon,
  ChevronDownIcon,
  LibraryIcon,
  BrainIcon,
  SparklesIcon,
  BotIcon,
  WindIcon,
  WaypointsIcon,
  ZapIcon,
  TelescopeIcon,
  Settings2Icon,
} from "lucide-react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { getAiSettings, saveAiSettings, testAiConnection, type AiSettings } from "@/lib/aiSettings";

const AI_PROVIDERS = [
  { label: "OpenAI", value: "openai", url: "https://api.openai.com/v1", domain: "openai.com" },
  { label: "Anthropic", value: "anthropic", url: "https://api.anthropic.com/v1", domain: "anthropic.com" },
  { label: "Google Gemini", value: "gemini", url: "https://generativelanguage.googleapis.com", domain: "gemini.google.com" },
  { label: "Mistral AI", value: "mistral", url: "https://api.mistral.ai/v1", domain: "mistral.ai" },
  { label: "OpenRouter", value: "openrouter", url: "https://openrouter.ai/api/v1", domain: "openrouter.ai" },
  { label: "Groq", value: "groq", url: "https://api.groq.com/openai/v1", domain: "groq.com" },
  { label: "DeepSeek", value: "deepseek", url: "https://api.deepseek.com/v1", domain: "deepseek.com" },
  { label: "Custom", value: "custom", url: "", icon: Settings2Icon, color: "text-muted-foreground" },
];

export default function AiSettingsScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [enabled, setEnabled] = useState(false);
  const [provider, setProvider] = useState("custom");
  const [apiUrl, setApiUrl] = useState("");
  const [apiKey, setApiKey] = useState("");
  const [loading, setLoading] = useState(true);
  const [saveStatus, setSaveStatus] = useState<{ status: "success" | "error"; message: string } | null>(null);
  const [isTesting, setIsTesting] = useState(false);

  useEffect(() => {
    (async () => {
      const settings = await getAiSettings();
      if (settings) {
        setEnabled(settings.enabled);
        setProvider(settings.provider || "custom");
        setApiUrl(settings.apiUrl || "");
        setApiKey(settings.apiKey || "");
      }
      setLoading(false);
    })();
  }, []);

  const handleSave = useCallback(async () => {
    if (enabled) {
      if (!apiUrl.trim()) {
        setSaveStatus({ status: "error", message: "Please enter an API URL." });
        return;
      }
      if (!apiKey.trim()) {
        setSaveStatus({ status: "error", message: "Please enter an API key." });
        return;
      }
      
      setIsTesting(true);
      const testResult = await testAiConnection(apiUrl.trim(), apiKey.trim(), provider);
      setIsTesting(false);
      
      if (!testResult.success) {
        setSaveStatus({ status: "error", message: "Connection failed: " + testResult.message });
        return;
      }
    }
    try {
      await saveAiSettings({ enabled, provider, apiUrl: apiUrl.trim(), apiKey: apiKey.trim() });
      setSaveStatus({ status: "success", message: "AI details were saved successfully." });
    } catch (err) {
      setSaveStatus({ status: "error", message: "Failed to save AI settings." });
    }
  }, [enabled, provider, apiUrl, apiKey]);

  if (loading) return null;

  return (
    <>
      <Stack.Screen
        options={{
          title: "AI Settings",
          headerLeft: () => (
            <Pressable onPress={() => router.back()} className="ios:ml-0 ml-2 mr-6 p-1" hitSlop={8}>
              <Icon as={ArrowLeftIcon} className="size-6 text-foreground" size={24} />
            </Pressable>
          ),
        }}
      />

      <View className="flex-1 bg-background p-6">
        <View className="flex-1 gap-6">
          {/* Enable AI Toggle */}
          <View className="flex-row justify-between rounded-xl">
            <View className="flex-1 pr-4">
              <Text className="mb-1 text-base font-semibold text-foreground">
                Enable AI Features
              </Text>
              {/* <Text className="text-sm text-muted-foreground"> */}
              {/*   Turn on to use a cloud AI provider for intelligent features. */}
              {/* </Text> */}
            </View>
            <Switch
              checked={enabled}
              onCheckedChange={async (newValue) => {
                setEnabled(newValue);
                if (!newValue) {
                  try {
                    await saveAiSettings({
                      enabled: false,
                      provider,
                      apiUrl: apiUrl.trim(),
                      apiKey: apiKey.trim(),
                    });
                  } catch (err) {
                    console.error("Failed to save AI settings on toggle", err);
                  }
                }
              }}
            />
          </View>

          {enabled && (
            <>
              {/* Provider Selection */}
              <View className="gap-2">
                <View className="flex-row items-center gap-2">
                  <Icon as={LibraryIcon} className="size-4 text-muted-foreground" size={16} />
                  <Text className="text-sm font-medium text-foreground">AI Provider</Text>
                </View>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Pressable className="flex-row items-center justify-between rounded-xl border border-border bg-card px-4 py-3 active:opacity-70">
                      <View className="flex-row items-center gap-2">
                        {(() => {
                          const p = AI_PROVIDERS.find((p) => p.value === provider) || AI_PROVIDERS[AI_PROVIDERS.length - 1];
                          return (
                            <>
                              {p.domain ? (
                                <Image
                                  source={{ uri: `https://t1.gstatic.com/faviconV2?client=SOCIAL&type=FAVICON&fallback_opts=TYPE,SIZE,URL&url=http://${p.domain}&size=64` }}
                                  style={{ width: 16, height: 16, borderRadius: 4 }}
                                />
                              ) : (
                                <Icon as={p.icon!} className={`size-4 ${p.color}`} size={16} />
                              )}
                              <Text className="text-base text-foreground">{p.label}</Text>
                            </>
                          );
                        })()}
                      </View>
                      <Icon as={ChevronDownIcon} className="size-4 text-muted-foreground" size={16} />
                    </Pressable>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="start" className="w-64 p-1">
                    {AI_PROVIDERS.map((p) => (
                      <DropdownMenuItem
                        key={p.value}
                        onPress={() => {
                          setProvider(p.value);
                          if (p.value !== "custom") {
                            setApiUrl(p.url);
                          }
                        }}>
                        {p.domain ? (
                          <Image
                            source={{ uri: `https://t1.gstatic.com/faviconV2?client=SOCIAL&type=FAVICON&fallback_opts=TYPE,SIZE,URL&url=http://${p.domain}&size=64` }}
                            style={{ width: 16, height: 16, borderRadius: 4, marginRight: 8 }}
                          />
                        ) : (
                          <Icon as={p.icon!} className={`mr-2 size-4 ${p.color}`} size={16} />
                        )}
                        <Text className="text-foreground">{p.label}</Text>
                      </DropdownMenuItem>
                    ))}
                  </DropdownMenuContent>
                </DropdownMenu>
              </View>

              {/* API URL */}
              <View className="gap-2">
                <View className="flex-row items-center gap-2">
                  <Icon as={ServerIcon} className="size-4 text-muted-foreground" size={16} />
                  <Text className="text-sm font-medium text-foreground">API URL</Text>
                </View>
                <TextInput
                  className={`rounded-xl border border-border px-4 py-3 text-base ${
                    provider !== "custom" ? "bg-muted text-muted-foreground opacity-70" : "bg-card text-foreground"
                  }`}
                  placeholder="https://api.example.com/v1/chat"
                  placeholderTextColor="hsl(0 0% 45%)"
                  value={apiUrl}
                  onChangeText={setApiUrl}
                  editable={provider === "custom"}
                  autoCapitalize="none"
                  autoCorrect={false}
                  keyboardType="url"
                />
              </View>

              {/* API Key */}
              <View className="gap-2">
                <View className="flex-row items-center gap-2">
                  <Icon as={KeyRoundIcon} className="size-4 text-muted-foreground" size={16} />
                  <Text className="text-sm font-medium text-foreground">API Key</Text>
                </View>
                <TextInput
                  className="rounded-xl border border-border bg-card px-4 py-3 text-base text-foreground"
                  placeholder="sk-..."
                  placeholderTextColor="hsl(0 0% 45%)"
                  value={apiKey}
                  onChangeText={setApiKey}
                  autoCapitalize="none"
                  autoCorrect={false}
                  secureTextEntry
                />
              </View>
            </>
          )}
        </View>

        {/* Save button */}
        {enabled && (
          <View style={{ paddingBottom: Math.max(insets.bottom, 16) }}>
            <Button className="flex-row items-center justify-center gap-2" onPress={handleSave} disabled={isTesting}>
              <Icon
                as={isTesting ? ServerIcon : SaveIcon}
                className="size-4 text-primary-foreground"
                size={16}
              />
              <Text className="font-semibold text-primary-foreground">
                {isTesting ? "Testing Connection..." : "Save"}
              </Text>
            </Button>
          </View>
        )}
      </View>
      
      {/* ── Save Result Alert ───────────────────────────────── */}
      <AlertDialog
        open={saveStatus !== null}
        onOpenChange={(open) => {
          if (!open) setSaveStatus(null);
        }}>
        <AlertDialogContent>
          <AlertDialogHeader className="items-center sm:items-center">
            <AlertDialogTitle
              className={saveStatus?.status === "success" ? "text-green-500" : "text-destructive"}>
              {saveStatus?.status === "success" ? "Success" : "Error"}
            </AlertDialogTitle>
            <AlertDialogDescription className="text-center">
              {saveStatus?.message}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="sm:justify-center">
            <AlertDialogAction
              className={
                saveStatus?.status === "success"
                  ? "bg-green-500 hover:bg-green-600 active:bg-green-600/90"
                  : ""
              }
              onPress={() => setSaveStatus(null)}>
              <Text className={saveStatus?.status === "success" ? "text-white" : ""}>
                Dismiss
              </Text>
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
