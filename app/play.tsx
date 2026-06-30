import React, { useRef, useState, useEffect } from "react";
import { View, Pressable, ActivityIndicator, useWindowDimensions, ScrollView } from "react-native";
import { Stack, useLocalSearchParams, useRouter } from "expo-router";
import { Text } from "@/components/ui/text";
import { Icon } from "@/components/ui/icon";
import { ArrowLeftIcon, Gamepad2Icon, TerminalIcon } from "lucide-react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { WebView } from "react-native-webview";
import { Asset } from "expo-asset";
import * as FileSystem from "expo-file-system/legacy";
import Server from "@dr.pogodin/react-native-static-server";
import { getFileTree } from "@/lib/fileSystem";
import JSZip from "jszip";

const injectedFetchOverride = `
  (function() {
    if (window.__fetchIntercepted) return;
    window.__fetchIntercepted = true;

    ['log', 'info', 'warn', 'error', 'debug'].forEach(level => {
      const original = console[level];
      console[level] = function(...args) {
        original.apply(console, args);
        try {
          const msg = args.map(a => {
            if (a === null) return 'null';
            if (a === undefined) return 'undefined';
            if (a instanceof Error) return a.message + '\\n' + a.stack;
            if (typeof a === 'object') {
              try { return JSON.stringify(a); } catch(e) { return String(a); }
            }
            return String(a);
          }).join(' ');

          if (level === 'log' && msg.includes('[🛑 error]')) {
            window.ReactNativeWebView.postMessage(JSON.stringify({
              type: 'error',
              message: msg
            }));
          }

          window.ReactNativeWebView.postMessage(JSON.stringify({
            type: 'console_log',
            level: level,
            message: msg
          }));
        } catch(e) {}
      };
    });

    const originalFetch = window.fetch;
    window.fetch = async function(resource, init) {
      let url = '';
      if (typeof resource === 'string') {
        url = resource;
      } else if (resource instanceof Request) {
        url = resource.url;
      }

      if (url.includes('custom_levels')) {
        return new Promise((resolve, reject) => {
          const requestId = Math.random().toString(36).substring(7);
          
          window['__resolveFetch_' + requestId] = function(data) {
            let body = data.body;
            if (data.isBase64) {
              const binary = atob(data.body);
              const bytes = new Uint8Array(binary.length);
              for (let i = 0; i < binary.length; i++) {
                bytes[i] = binary.charCodeAt(i);
              }
              body = bytes.buffer;
            }
            resolve(new Response(body, {
              status: data.status || 200,
              headers: data.headers || {}
            }));
            delete window['__resolveFetch_' + requestId];
          };

          window.ReactNativeWebView.postMessage(JSON.stringify({
            type: 'fetch',
            requestId: requestId,
            url: url,
            options: init
          }));
        });
      }

      return originalFetch(resource, init);
    };

    const originalXHR = window.XMLHttpRequest;
    window.XMLHttpRequest = function() {
      const xhr = new originalXHR();
      const originalOpen = xhr.open;
      const originalSend = xhr.send;

      xhr.open = function(method, url) {
        this._method = method;
        this._url = typeof url === 'string' ? url : url.toString();
        return originalOpen.apply(this, arguments);
      };

      xhr.send = function(body) {
        if (this._url && this._url.includes('custom_levels')) {
          const url = this._url;
          const requestId = Math.random().toString(36).substring(7);
          const self = this;

          window['__resolveFetch_' + requestId] = function(data) {
            let responseBody = data.body;
            if (data.isBase64) {
              const binary = atob(data.body);
              const bytes = new Uint8Array(binary.length);
              for (let i = 0; i < binary.length; i++) {
                bytes[i] = binary.charCodeAt(i);
              }
              responseBody = bytes.buffer;
            }

            Object.defineProperty(self, 'readyState', { writable: true, value: 4 });
            Object.defineProperty(self, 'status', { writable: true, value: data.status || 200 });
            
            if (self.responseType === 'arraybuffer' && data.isBase64) {
              Object.defineProperty(self, 'response', { writable: true, value: responseBody });
            } else {
              Object.defineProperty(self, 'response', { writable: true, value: responseBody });
              Object.defineProperty(self, 'responseText', { writable: true, value: responseBody });
            }

            if (self.onload) self.onload({ target: self });
            if (self.onreadystatechange) self.onreadystatechange({ target: self });

            delete window['__resolveFetch_' + requestId];
          };

          window.ReactNativeWebView.postMessage(JSON.stringify({
            type: 'fetch',
            requestId: requestId,
            url: url
          }));
          return;
        }
        return originalSend.apply(this, arguments);
      };
      return xhr;
    };
    
    // Copy constants
    for (let key in originalXHR) {
      window.XMLHttpRequest[key] = originalXHR[key];
    }
  })();
  true;
`;

type LogEntry = {
  id: string;
  level: string;
  message: string;
  timestamp: number;
};

export default function PlayScreen() {
  const { projectId } = useLocalSearchParams<{ projectId: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const webViewRef = useRef<WebView>(null);
  const [serverUrl, setServerUrl] = useState<string | null>(null);
  const [levelError, setLevelError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"game" | "console">("game");
  const [logs, setLogs] = useState<LogEntry[]>([]);

  const { width, height } = useWindowDimensions();
  // Ensure we get the landscape dimensions regardless of current physical orientation
  const landscapeWidth = Math.max(width, height);
  const landscapeHeight = Math.min(width, height);

  useEffect(() => {
    let server: Server | null = null;
    (async () => {
      try {
        const wwwDir = FileSystem.documentDirectory + "www/";
        const dirInfo = await FileSystem.getInfoAsync(wwwDir);
        if (!dirInfo.exists) {
          await FileSystem.makeDirectoryAsync(wwwDir, { intermediates: true });
        }

        const assets = [
          { module: require("../source/utils/pewpew.html"), name: "pewpew.html" },
          { module: require("../source/utils/pewpewlive.js.bin"), name: "pewpewlive.js" },
          { module: require("../source/utils/pewpewlive.wasm"), name: "pewpewlive.wasm" },
        ];

        for (const asset of assets) {
          const [{ localUri }] = await Asset.loadAsync(asset.module);
          if (localUri) {
            if (asset.name === "pewpew.html") {
              let html = await FileSystem.readAsStringAsync(localUri);
              // Ensure we inject the script before any other scripts
              html = html.replace(
                "<script",
                "<script>" + injectedFetchOverride + "</script><script"
              );
              await FileSystem.writeAsStringAsync(wwwDir + asset.name, html);
            } else {
              await FileSystem.copyAsync({
                from: localUri,
                to: wwwDir + asset.name,
              });
            }
          }
        }

        const cleanWwwDir = wwwDir.replace(/^file:\/\//, "");
        server = new Server({ port: 9000, fileDir: cleanWwwDir });
        const url = await server.start();
        setServerUrl(url);
      } catch (err) {
        console.error("Failed to start server", err);
      }
    })();

    return () => {
      if (server) {
        server.stop();
      }
    };
  }, []);

  const onMessage = async (event: any) => {
    try {
      const data = JSON.parse(event.nativeEvent.data);
      if (data.type === "error") {
        setLevelError(data.message);
      } else if (data.type === "console_log") {
        setLogs(prev => [...prev, {
          id: Math.random().toString(),
          level: data.level,
          message: data.message,
          timestamp: Date.now()
        }]);
      } else if (data.type === "fetch") {
        const { requestId, url } = data;

        let responseBody: string = "";
        let isBase64 = false;
        let status = 200;

        const projectDir = `${FileSystem.documentDirectory}projects/${projectId}/`;

        if (url.includes("custom_levels/get_public_levels_v2")) {
          try {
            const manifestContent = await FileSystem.readAsStringAsync(
              `${projectDir}manifest.json`
            );
            const manifest = JSON.parse(manifestContent);
            const levelJson = {
              name: manifest.name || "Unknown",
              author: "Anonymous",
              account_id: "",
              level_uuid: projectId,
              date: 0,
              publish_state: 0,
              experimental: true,
              leaderboard_kind: manifest.has_score_leaderboard ? 1 : 0,
              v: 0,
              diff: 0,
              featured: false,
            };
            responseBody = JSON.stringify([levelJson]);
          } catch (e: any) {
            console.error("Error get_public_levels_v2", e);
            setLevelError("Error loading level manifest: " + e.message);
            responseBody = "[]";
          }
        } else if (url.includes("custom_levels/get_level_manifest3")) {
          try {
            const manifestContent = await FileSystem.readAsStringAsync(
              `${projectDir}manifest.json`
            );
            const manifest = JSON.parse(manifestContent);
            const extra = {
              name: manifest.name || "Unknown",
              author: "Anonymous",
              account_id: "",
              level_uuid: projectId,
              v: 0,
              date: 0,
              publish_state: 0,
              experimental: true,
              leaderboard_kind: manifest.has_score_leaderboard ? 1 : 0,
              diff: 0,
              featured: false,
            };
            responseBody = JSON.stringify({ manifest, extra });
          } catch (e: any) {
            console.error("Error get_level_manifest3", e);
            setLevelError("Error parsing level manifest: " + e.message);
            status = 500;
          }
        } else if (url.includes("custom_levels/get_level")) {
          try {
            const zip = new JSZip();
            const tree = await getFileTree(projectId);

            const addNodeToZip = async (nodes: any[]) => {
              for (const node of nodes) {
                if (node.type === "file" && node.id.endsWith(".lua")) {
                  const fileUri = `${projectDir}${node.id}`;
                  const contentBase64 = await FileSystem.readAsStringAsync(fileUri, {
                    encoding: FileSystem.EncodingType.Base64,
                  });
                  zip.file(`level/${node.id}`, contentBase64, { base64: true });
                } else if (node.type === "folder" && node.children) {
                  await addNodeToZip(node.children);
                }
              }
            };

            await addNodeToZip(tree);
            const zipBase64 = await zip.generateAsync({ type: "base64" });
            responseBody = zipBase64;
            isBase64 = true;
          } catch (e: any) {
            console.error("Error get_level", e);
            setLevelError("Error packaging level data: " + e.message);
            status = 500;
          }
        }
        webViewRef.current?.injectJavaScript(`
          if (window['__resolveFetch_${requestId}']) {
            window['__resolveFetch_${requestId}']({
              body: ${isBase64 ? '"' + responseBody + '"' : JSON.stringify(responseBody)},
              isBase64: ${isBase64},
              status: ${status},
              headers: { "Content-Type": ${isBase64 ? '"application/zip"' : '"application/json"'}, "Access-Control-Allow-Origin": "*" }
            });
          }
          true;
        `);
      }
    } catch (e) {
      console.error("Message error:", e);
    }
  };

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
                  logs.map(log => (
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
