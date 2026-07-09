import { useState, useEffect, useRef, useCallback } from "react";
import { useColorScheme } from "react-native";
import { readFileContent, writeFileContent } from "@/services/fileIO";
import { Asset } from "expo-asset";
import { File } from "expo-file-system";
import type { EditorToNative } from "@/lib/messages/editorMessages";
import type WebView from "react-native-webview";
import { getEditorSettings, EditorTheme } from "@/lib/editorSettings";
import { useFocusEffect } from "expo-router";

export function useEditorBridge(projectId: string | undefined, fileId: string | undefined) {
  const webViewRef = useRef<WebView>(null);
  const colorScheme = useColorScheme();
  const [editorThemeSetting, setEditorThemeSetting] = useState<EditorTheme>("system");

  useFocusEffect(
    useCallback(() => {
      getEditorSettings().then((settings) => {
        setEditorThemeSetting(settings.theme);
      });
    }, [])
  );

  const finalTheme =
    editorThemeSetting === "system" ? (colorScheme ?? "light") : editorThemeSetting;

  const fileExtension = fileId?.split(".").pop();
  const language = fileExtension === "json" ? "json" : fileExtension === "lua" ? "lua" : "";

  const [htmlSource, setHtmlSource] = useState<string>("");
  const [initialContent, setInitialContent] = useState<string>("");

  useEffect(() => {
    const loadHtml = async () => {
      try {
        const asset = Asset.fromModule(require("../assets/editor/index.html"));
        await asset.downloadAsync();
        const html = await new File(asset.localUri || asset.uri).text();
        setHtmlSource(html);
      } catch (e) {
        console.error("Failed to load HTML:", e);
      }
    };
    loadHtml();
  }, []);

  useEffect(() => {
    if (projectId && fileId) {
      readFileContent(projectId, fileId).then((content) => {
        setInitialContent(content);
      });
    }
  }, [projectId, fileId]);

  const handleMessage = async (event: any) => {
    try {
      const data = JSON.parse(event.nativeEvent.data) as EditorToNative;
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
          window.setTheme("${finalTheme}");
        }
        if (window.setLanguage) {
          window.setLanguage("${language}");
        }
        true;
      `);
    } else {
      webViewRef.current?.injectJavaScript(`
        if (window.setTheme) {
          window.setTheme("${finalTheme}");
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
        window.setTheme("${finalTheme}");
      }
      true;
    `);
  }, [finalTheme]);

  return {
    webViewRef,
    htmlSource,
    handleMessage,
    handleLoadEnd,
  };
}
