import React, { useEffect, useState, useCallback } from "react";
import { View, TextInput, KeyboardAvoidingView, ScrollView, Platform } from "react-native";
import { Stack, useRouter } from "expo-router";
import { Pressable } from "react-native";
import { Text } from "@/components/ui/text";
import { Icon } from "@/components/ui/icon";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
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
  MailIcon,
  KeyRoundIcon,
  InfoIcon,
} from "lucide-react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import {
  getReleaseSettings,
  saveReleaseSettings,
  testReleaseConnection,
} from "@/lib/releaseSettings";

export default function ReleaseSettingsScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [enabled, setEnabled] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(true);
  const [saveStatus, setSaveStatus] = useState<{
    status: "success" | "error";
    message: string;
  } | null>(null);
  const [isTesting, setIsTesting] = useState(false);

  useEffect(() => {
    (async () => {
      const settings = await getReleaseSettings();
      if (settings) {
        setEnabled(settings.enabled);
        setEmail(settings.email || "");
        setPassword(settings.password || "");
      }
      setLoading(false);
    })();
  }, []);

  const handleSave = useCallback(async () => {
    if (enabled) {
      if (!email.trim()) {
        setSaveStatus({ status: "error", message: "Please enter an email address." });
        return;
      }
      if (!password.trim()) {
        setSaveStatus({ status: "error", message: "Please enter a password." });
        return;
      }

      setIsTesting(true);
      const testResult = await testReleaseConnection(email.trim(), password.trim());
      setIsTesting(false);

      if (!testResult.success) {
        setSaveStatus({ status: "error", message: "Connection failed: " + testResult.message });
        return;
      }
    }
    try {
      await saveReleaseSettings({ enabled, email: email.trim(), password: password.trim() });
      setSaveStatus({ status: "success", message: "Release settings were saved successfully." });
    } catch (err) {
      setSaveStatus({ status: "error", message: "Failed to save release settings." });
    }
  }, [enabled, email, password]);

  if (loading) return null;

  return (
    <>
      <Stack.Screen
        options={{
          title: "Release Settings",
          headerLeft: () => (
            <Pressable onPress={() => router.back()} className="ios:ml-0 ml-2 mr-6 p-1" hitSlop={8}>
              <Icon as={ArrowLeftIcon} className="size-6 text-foreground" size={24} />
            </Pressable>
          ),
        }}
      />

      <KeyboardAvoidingView
        behavior="padding"
        keyboardVerticalOffset={Platform.OS === "ios" ? 100 : 80}
        className="flex-1 bg-background">
        <ScrollView
          contentContainerStyle={{ flexGrow: 1, padding: 24 }}
          keyboardShouldPersistTaps="handled">
          <View className="flex-1 gap-6">
            {/* Enable Release Features Toggle */}
            <View className="flex-row justify-between rounded-xl">
              <View className="flex-1 pr-4">
                <Text className="mb-1 text-base font-semibold text-foreground">
                  Enable Release Features
                </Text>
              </View>
              <Switch
                checked={enabled}
                onCheckedChange={async (newValue) => {
                  setEnabled(newValue);
                  if (!newValue) {
                    try {
                      await saveReleaseSettings({
                        enabled: false,
                        email: email.trim(),
                        password: password.trim(),
                      });
                    } catch (err) {
                      console.error("Failed to save release settings on toggle", err);
                    }
                  }
                }}
              />
            </View>

            {enabled && (
              <>
                {/* Info Block */}
                <View className="flex-row items-center gap-3 rounded-xl border border-blue-500/20 bg-blue-500/10 p-4">
                  <Icon as={InfoIcon} className="size-5 text-blue-500" size={20} />
                  <Text className="flex-1 text-sm text-blue-500 dark:text-blue-400">
                    Please enter email and password from your PewPewLive account. Credentials are
                    stored locally on your device.
                  </Text>
                </View>

                {/* Email */}
                <View className="gap-2">
                  <View className="flex-row items-center gap-2">
                    <Icon as={MailIcon} className="size-4 text-muted-foreground" size={16} />
                    <Text className="text-sm font-medium text-foreground">Email</Text>
                  </View>
                  <TextInput
                    className="rounded-xl border border-border bg-card px-4 py-3 text-base text-foreground"
                    placeholder="your@email.com"
                    placeholderTextColor="hsl(0 0% 45%)"
                    value={email}
                    onChangeText={setEmail}
                    autoCapitalize="none"
                    autoCorrect={false}
                    keyboardType="email-address"
                  />
                </View>

                {/* Password */}
                <View className="gap-2">
                  <View className="flex-row items-center gap-2">
                    <Icon as={KeyRoundIcon} className="size-4 text-muted-foreground" size={16} />
                    <Text className="text-sm font-medium text-foreground">Password</Text>
                  </View>
                  <TextInput
                    className="rounded-xl border border-border bg-card px-4 py-3 text-base text-foreground"
                    placeholder="password"
                    placeholderTextColor="hsl(0 0% 45%)"
                    value={password}
                    onChangeText={setPassword}
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
            <View style={{ paddingTop: 24, paddingBottom: Math.max(insets.bottom, 16) }}>
              <Button
                className="flex-row items-center justify-center gap-2"
                onPress={handleSave}
                disabled={isTesting}>
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
        </ScrollView>
      </KeyboardAvoidingView>

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
              <Text className={saveStatus?.status === "success" ? "text-white" : ""}>Dismiss</Text>
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
