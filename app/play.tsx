import React, { useState } from "react";
import { View, Pressable, ActivityIndicator, useWindowDimensions, ScrollView } from "react-native";
import { Stack, useLocalSearchParams, useRouter } from "expo-router";
import { Text } from "@/components/ui/text";
import { Icon } from "@/components/ui/icon";
import { ArrowLeftIcon, Gamepad2Icon, TerminalIcon } from "lucide-react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { WebView } from "react-native-webview";
import { useGameBridge, injectedFetchOverride } from "@/hooks/useGameBridge";

export default function PlayScreen() {
  const { projectId } = useLocalSearchParams<{ projectId: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const [activeTab, setActiveTab] = useState<"game" | "console">("game");
  const { width, height } = useWindowDimensions();

  // Ensure we get the landscape dimensions regardless of current physical orientation
  const landscapeWidth = Math.max(width, height);
  const landscapeHeight = Math.min(width, height);

  const { serverUrl, levelError, logs, onMessage, webViewRef } = useGameBridge(projectId as string);

  return (
    <>
      <Stack.Screen options={{ headerShown: false, orientation: "portrait" }} />
      <View
        style={{
          flex: 1,
          backgroundColor: "black",
          alignItems: "center",
          justifyContent: "center",
        }}>
        <View
          className="flex-row bg-background"
          style={{
            width: landscapeWidth,
            height: landscapeHeight,
            transform: [{ rotate: "90deg" }],
          }}>
          {/* Sidebar */}
          <View
            className="flex-col items-center gap-6 border-r border-border bg-card py-4"
            style={{ paddingLeft: Math.max(insets.top, 12), paddingRight: 12 }}>
            <Pressable
              onPress={() => router.back()}
              className="rounded-full bg-muted p-2 active:opacity-70">
              <Icon as={ArrowLeftIcon} className="size-6 text-foreground" size={24} />
            </Pressable>

            <View className="flex-1" />

            <Pressable
              onPress={() => setActiveTab("game")}
              className={`rounded-xl p-3 active:opacity-70 ${activeTab === "game" ? "bg-primary/20" : ""}`}>
              <Icon
                as={Gamepad2Icon}
                className={`size-6 ${activeTab === "game" ? "text-primary" : "text-muted-foreground"}`}
                size={24}
              />
            </Pressable>

            <Pressable
              onPress={() => setActiveTab("console")}
              className={`rounded-xl p-3 active:opacity-70 ${activeTab === "console" ? "bg-primary/20" : ""}`}>
              <Icon
                as={TerminalIcon}
                className={`size-6 ${activeTab === "console" ? "text-primary" : "text-muted-foreground"}`}
                size={24}
              />
            </Pressable>
          </View>

          {/* Main Content Area */}
          <View className="flex-1 overflow-hidden bg-background">
            <View style={{ flex: 1, display: activeTab === "game" ? "flex" : "none" }}>
              {levelError ? (
                <View className="flex-1 items-center justify-center bg-card p-8">
                  <Text className="mb-4 text-xl font-bold text-destructive">Level Error</Text>
                  <Text className="text-center text-foreground">{levelError}</Text>
                  <Pressable
                    onPress={() => router.back()}
                    className="mt-8 rounded-lg bg-secondary px-6 py-3 active:opacity-80">
                    <Text className="font-medium text-foreground">Dismiss</Text>
                  </Pressable>
                </View>
              ) : serverUrl ? (
                <WebView
                  ref={webViewRef}
                  source={{ uri: `${serverUrl}/pewpew.html` }}
                  className="flex-1 bg-transparent"
                  injectedJavaScriptBeforeContentLoaded={injectedFetchOverride}
                  onMessage={onMessage}
                  javaScriptEnabled={true}
                  domStorageEnabled={true}
                  allowFileAccess={true}
                  allowFileAccessFromFileURLs={true}
                  allowUniversalAccessFromFileURLs={true}
                />
              ) : (
                <View className="flex-1 items-center justify-center">
                  <ActivityIndicator size="large" />
                  <Text className="mt-4 text-muted-foreground">Starting local server...</Text>
                </View>
              )}
            </View>

            <View
              style={{ flex: 1, display: activeTab === "console" ? "flex" : "none" }}
              className="bg-card">
              <View className="border-b border-border p-4">
                <Text className="text-xl font-bold text-foreground">Console</Text>
              </View>
              <ScrollView className="flex-1 p-4">
                {logs.length === 0 ? (
                  <Text className="mt-4 text-center text-muted-foreground">No logs yet...</Text>
                ) : (
                  logs.map((log) => (
                    <View key={log.id} className="mb-1">
                      <Text
                        className={`font-mono text-sm ${
                          log.level === "error"
                            ? "text-destructive"
                            : log.level === "warn"
                              ? "text-yellow-500"
                              : "text-foreground"
                        }`}
                        selectable={true}>
                        {log.message}
                      </Text>
                    </View>
                  ))
                )}
              </ScrollView>
            </View>
          </View>
        </View>
      </View>
    </>
  );
}
