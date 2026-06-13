import { Stack, useLocalSearchParams, useRouter } from "expo-router";
import { Pressable, View, useColorScheme } from "react-native";
import { Icon } from "@/components/ui/icon";
import { ArrowLeftIcon } from "lucide-react-native";
import { WebView } from "react-native-webview";
import { useEffect, useRef, useState } from "react";
import { readFileContent, writeFileContent } from "@/lib/fileSystem";

export default function EditorScreen() {
  const { projectId, fileId } = useLocalSearchParams<{ projectId: string; fileId: string }>();
  const router = useRouter();
  const webViewRef = useRef<WebView>(null);
  const colorScheme = useColorScheme();

  const fileExtension = fileId?.split(".").pop();
  const language = fileExtension === "json" ? "json" : fileExtension === "lua" ? "lua" : "";

  // Try to use require for the asset
  const [htmlSource] = useState(require("../assets/editor/index.html"));
  const [initialContent, setInitialContent] = useState<string>("");

  useEffect(() => {
    if (projectId && fileId) {
      readFileContent(projectId, fileId).then((content) => {
        setInitialContent(content);
      });
    }
  }, [projectId, fileId]);

  const handleMessage = async (event: any) => {
    try {
      const data = JSON.parse(event.nativeEvent.data);
      if (data.type === "change" && projectId && fileId) {
        await writeFileContent(projectId, fileId, data.content);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleLoadEnd = () => {
    if (initialContent) {
      webViewRef.current?.injectJavaScript(`
        if (window.setEditorContent) {
          window.setEditorContent(${JSON.stringify(initialContent)});
        }
        if (window.setTheme) {
          window.setTheme("${colorScheme}");
        }
        if (window.setLanguage) {
          window.setLanguage("${language}");
        }
        true;
      `);
    } else {
      webViewRef.current?.injectJavaScript(`
        if (window.setTheme) {
          window.setTheme("${colorScheme}");
        }
        if (window.setLanguage) {
          window.setLanguage("${language}");
        }
        true;
      `);
    }
  };

  useEffect(() => {
    if (initialContent) {
      webViewRef.current?.injectJavaScript(`
        if (window.setEditorContent) {
          window.setEditorContent(${JSON.stringify(initialContent)});
        }
        if (window.setLanguage) {
          window.setLanguage("${language}");
        }
        true;
      `);
    }
  }, [initialContent, language]);

  useEffect(() => {
    webViewRef.current?.injectJavaScript(`
      if (window.setTheme) {
        window.setTheme("${colorScheme}");
      }
      true;
    `);
  }, [colorScheme]);

  return (
    <>
      <Stack.Screen
        options={{
          title: fileId?.split("/").pop() || "Editor",
          headerLeft: () => (
            <Pressable onPress={() => router.back()} className="ios:ml-0 ml-2 mr-6 p-1" hitSlop={8}>
              <Icon as={ArrowLeftIcon} className="size-6 text-foreground" size={24} />
            </Pressable>
          ),
        }}
      />
      <View className="flex-1 bg-background">
        <WebView
          ref={webViewRef}
          source={htmlSource}
          onMessage={handleMessage}
          onLoadEnd={handleLoadEnd}
          style={{ flex: 1, backgroundColor: "transparent" }}
          containerStyle={{ backgroundColor: "transparent" }}
          javaScriptEnabled={true}
        />
      </View>
    </>
  );
}
