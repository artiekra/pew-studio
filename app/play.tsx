import React, { useRef, useState, useEffect } from "react";
import { View, Pressable, ActivityIndicator, useWindowDimensions } from "react-native";
import { Stack, useLocalSearchParams, useRouter } from "expo-router";
import { Text } from "@/components/ui/text";
import { Icon } from "@/components/ui/icon";
import { ArrowLeftIcon, WrenchIcon, SettingsIcon, CodeIcon } from "lucide-react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { WebView } from "react-native-webview";
import { Asset } from "expo-asset";
import * as FileSystem from "expo-file-system/legacy";
import Server from "@dr.pogodin/react-native-static-server";

const injectedFetchOverride = `
  (function() {
    if (window.__fetchIntercepted) return;
    window.__fetchIntercepted = true;
    
    const originalFetch = window.fetch;
    window.fetch = async function(resource, init) {
      let url = '';
      if (typeof resource === 'string') {
        url = resource;
      } else if (resource instanceof Request) {
        url = resource.url;
      }

      if (url.includes('/custom_levels/')) {
        return new Promise((resolve, reject) => {
          const requestId = Math.random().toString(36).substring(7);
          
          window['__resolveFetch_' + requestId] = function(data) {
            resolve(new Response(data.body, {
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
  })();
  true;
`;

export default function PlayScreen() {
  const { projectId } = useLocalSearchParams<{ projectId: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const webViewRef = useRef<WebView>(null);
  const [serverUrl, setServerUrl] = useState<string | null>(null);
  
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
            await FileSystem.copyAsync({
              from: localUri,
              to: wwwDir + asset.name,
            });
          }
        }

        const cleanWwwDir = wwwDir.replace(/^file:\/\//, '');
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

  const onMessage = (event: any) => {
    try {
      const data = JSON.parse(event.nativeEvent.data);
      if (data.type === "fetch") {
        const { requestId, url } = data;
        let responseBody: string = "";
        let status = 200;

        if (url.includes("/custom_levels/get_public_levels_v2")) {
          responseBody = "[]";
        } else if (url.includes("/custom_levels/get_level")) {
          responseBody = "";
        } else if (url.includes("/custom_levels/get_level_manifest3")) {
          responseBody = "";
        }

        webViewRef.current?.injectJavaScript(`
          if (window['__resolveFetch_${requestId}']) {
            window['__resolveFetch_${requestId}']({
              body: ${JSON.stringify(responseBody)},
              status: ${status},
              headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" }
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
      <View style={{ flex: 1, backgroundColor: 'black', alignItems: 'center', justifyContent: 'center' }}>
        <View 
          className="flex-row bg-background"
          style={{
            width: landscapeWidth,
            height: landscapeHeight,
            transform: [{ rotate: '90deg' }],
          }}
        >
          {/* Sidebar */}
          <View
            className="flex-col items-center gap-6 border-r border-border bg-card py-4"
            style={{ paddingLeft: Math.max(insets.top, 12), paddingRight: 12 }}>
            <Pressable
              onPress={() => router.back()}
              className="rounded-full bg-muted p-2 active:opacity-70">
              <Icon as={ArrowLeftIcon} className="size-6 text-foreground" size={24} />
            </Pressable>

            <Pressable className="p-2 active:opacity-70">
              <Icon as={WrenchIcon} className="size-6 text-muted-foreground" size={24} />
            </Pressable>

            <Pressable className="p-2 active:opacity-70">
              <Icon as={CodeIcon} className="size-6 text-muted-foreground" size={24} />
            </Pressable>

            <View className="flex-1" />

            <Pressable className="p-2 active:opacity-70">
              <Icon as={SettingsIcon} className="size-6 text-muted-foreground" size={24} />
            </Pressable>
          </View>

          {/* Main Content Area */}
          <View className="flex-1 overflow-hidden bg-background">
            {serverUrl ? (
              <WebView
                ref={webViewRef}
                source={{ uri: `${serverUrl}/pewpew.html` }}
                className="flex-1 bg-transparent"
                injectedJavaScript={injectedFetchOverride}
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
        </View>
      </View>
    </>
  );
}
