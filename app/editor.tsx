import { Stack, useLocalSearchParams, useRouter } from "expo-router";
import { Pressable, View } from "react-native";
import { Icon } from "@/components/ui/icon";
import { Button } from "@/components/ui/button";
import { ArrowLeftIcon, PlayIcon } from "lucide-react-native";
import { WebView } from "react-native-webview";
import { useEditorBridge } from "@/hooks/useEditorBridge";

export default function EditorScreen() {
  const { projectId, fileId } = useLocalSearchParams<{ projectId: string; fileId: string }>();
  const router = useRouter();

  const { webViewRef, htmlSource, handleMessage, handleLoadEnd } = useEditorBridge(
    projectId,
    fileId
  );

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
          headerRight: () => (
            <Button
              onPress={() => router.push({ pathname: "/play", params: { projectId } })}
              size="icon"
              variant="ghost"
              className="ios:size-9 rounded-full web:mx-4">
              <Icon as={PlayIcon} className="size-5 text-foreground" />
            </Button>
          ),
        }}
      />
      <View className="flex-1 bg-background">
        {!!htmlSource && (
          <WebView
            ref={webViewRef}
            source={{ html: htmlSource }}
            onMessage={handleMessage}
            onLoadEnd={handleLoadEnd}
            style={{ flex: 1, backgroundColor: "transparent" }}
            containerStyle={{ backgroundColor: "transparent" }}
            javaScriptEnabled={true}
          />
        )}
      </View>
    </>
  );
}
