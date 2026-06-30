import React, { useEffect, useState, useCallback } from "react";
import { View, TextInput, Alert } from "react-native";
import { Stack, useRouter } from "expo-router";
import { Pressable } from "react-native";
import { Text } from "@/components/ui/text";
import { Icon } from "@/components/ui/icon";
import { Button } from "@/components/ui/button";
import { ArrowLeftIcon, SaveIcon, ServerIcon, KeyRoundIcon, CheckCircleIcon } from "lucide-react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { getAiSettings, saveAiSettings, type AiSettings } from "@/lib/aiSettings";

export default function AiSettingsScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [apiUrl, setApiUrl] = useState("");
  const [apiKey, setApiKey] = useState("");
  const [loading, setLoading] = useState(true);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    (async () => {
      const settings = await getAiSettings();
      if (settings) {
        setApiUrl(settings.apiUrl);
        setApiKey(settings.apiKey);
      }
      setLoading(false);
    })();
  }, []);

  const handleSave = useCallback(async () => {
    if (!apiUrl.trim()) {
      Alert.alert("Missing API URL", "Please enter an API URL.");
      return;
    }
    if (!apiKey.trim()) {
      Alert.alert("Missing API Key", "Please enter an API key.");
      return;
    }
    try {
      await saveAiSettings({ apiUrl: apiUrl.trim(), apiKey: apiKey.trim() });
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch (err) {
      Alert.alert("Error", "Failed to save AI settings.");
    }
  }, [apiUrl, apiKey]);

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
          {/* Description */}
          <View className="rounded-xl border border-border bg-card p-4">
            <Text className="text-sm leading-5 text-muted-foreground">
              Configure a cloud AI provider to enable AI-powered features. Enter the API endpoint URL and
              your API key below.
            </Text>
          </View>

          {/* API URL */}
          <View className="gap-2">
            <View className="flex-row items-center gap-2">
              <Icon as={ServerIcon} className="size-4 text-muted-foreground" size={16} />
              <Text className="text-sm font-medium text-foreground">API URL</Text>
            </View>
            <TextInput
              className="rounded-xl border border-border bg-card px-4 py-3 text-base text-foreground"
              placeholder="https://api.example.com/v1/chat"
              placeholderTextColor="hsl(0 0% 45%)"
              value={apiUrl}
              onChangeText={setApiUrl}
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
        </View>

        {/* Save button */}
        <View style={{ paddingBottom: Math.max(insets.bottom, 16) }}>
          <Button
            className="flex-row items-center justify-center gap-2"
            onPress={handleSave}>
            <Icon
              as={saved ? CheckCircleIcon : SaveIcon}
              className="size-4 text-primary-foreground"
              size={16}
            />
            <Text className="font-semibold text-primary-foreground">
              {saved ? "Saved!" : "Save"}
            </Text>
          </Button>
        </View>
      </View>
    </>
  );
}
