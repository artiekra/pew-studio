import React, { useState, useCallback, useRef } from "react";
import {
  View,
  Pressable,
  TextInput,
  FlatList,
  Modal,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  ActivityIndicator,
} from "react-native";
import { Stack, useLocalSearchParams, useRouter, useFocusEffect } from "expo-router";
import { Text } from "@/components/ui/text";
import { Icon } from "@/components/ui/icon";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  ArrowLeftIcon,
  SendIcon,
  ChevronDownIcon,
  MessageSquareIcon,
  ChevronRightIcon,
  PlusIcon,
  XIcon,
  SearchIcon,
  SparklesIcon,
  UndoIcon,
  FileIcon,
  PencilIcon,
  FolderOpenIcon,
  CheckIcon,
  Loader2Icon,
} from "lucide-react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { getAiSettings } from "@/lib/aiSettings";
import {
  getProjectChats,
  createChat,
  addMessageToChat,
  getChat,
  updateChat,
} from "@/services/chatRepository";
import { runHarness, type ToolCallInfo } from "@/services/aiHarness";
import { fetchAvailableModels } from "@/services/aiClient";
import { executeUndo, type UndoGroup } from "@/services/aiTools";
import { getProjects } from "@/services/projectRepository";
import type { Chat, ChatMessage } from "@/types";

function getProviderDefaultModel(provider?: string): string {
  switch (provider) {
    case "gemini":
      return "gemini-1.5-pro";
    case "anthropic":
      return "claude-3-5-sonnet-20240620";
    case "mistral":
      return "mistral-large-latest";
    case "groq":
      return "llama3-70b-8192";
    case "deepseek":
      return "deepseek-chat";
    case "openrouter":
    case "openai":
    case "custom":
    default:
      return "gpt-4o";
  }
}

export default function AiScreen() {
  const { projectId } = useLocalSearchParams<{ projectId: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const flatListRef = useRef<FlatList>(null);

  const [aiConfigured, setAiConfigured] = useState<boolean | null>(null);
  const [providerModel, setProviderModel] = useState<string>("gpt-4o");
  const [chats, setChats] = useState<Chat[]>([]);
  const [activeChat, setActiveChat] = useState<Chat | null>(null);
  const [inputText, setInputText] = useState("");
  const [isAllChatsModalVisible, setIsAllChatsModalVisible] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [liveToolCalls, setLiveToolCalls] = useState<ToolCallInfo[]>([]);
  const [projectName, setProjectName] = useState("Project");
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [availableModels, setAvailableModels] = useState<string[]>([]);
  const [isModelsLoading, setIsModelsLoading] = useState(false);

  const loadChats = useCallback(async () => {
    if (projectId) {
      const loadedChats = await getProjectChats(projectId);
      setChats(loadedChats);
    }
  }, [projectId]);

  useFocusEffect(
    useCallback(() => {
      setIsModelsLoading(true);
      getAiSettings().then(settings => {
        if (settings) {
          setAiConfigured(settings.enabled && !!settings.apiUrl && !!settings.apiKey);
          setProviderModel(getProviderDefaultModel(settings.provider));
          fetchAvailableModels().then(models => {
            if (models && models.length > 0) {
              setAvailableModels(models);
              // Ensure default is in the list, or select the first one if not
              const defaultM = getProviderDefaultModel(settings.provider);
              if (!models.includes(defaultM)) {
                setProviderModel(models[0]);
              }
            } else {
              setAvailableModels([]);
            }
            setIsModelsLoading(false);
          });
        } else {
          setAiConfigured(false);
          setProviderModel("gpt-4o");
          setAvailableModels([]);
          setIsModelsLoading(false);
        }
      });
      loadChats();
      // Load project name
      getProjects().then((projects) => {
        const p = projects.find((p) => p.id === projectId);
        if (p) setProjectName(p.name);
      });
    }, [loadChats, projectId])
  );

  const isChatEmpty = !activeChat || activeChat.messages.length === 0;

  // ── Send message & run harness ─────────────────────────────────────

  const handleSend = async () => {
    if (!inputText.trim() || !projectId || isLoading) return;

    const textToSend = inputText.trim();
    setInputText("");
    setErrorMsg(null);
    setLiveToolCalls([]);
    setIsLoading(true);

    try {
      let currentChat = activeChat;

      // Create new chat if none active
      if (!currentChat) {
        const title =
          textToSend.slice(0, 40) + (textToSend.length > 40 ? "..." : "");
        currentChat = await createChat(projectId, title);
        setActiveChat(currentChat);
      }

      // Add user message
      const updatedChatWithUser = await addMessageToChat(
        projectId,
        currentChat.id,
        { role: "user", content: textToSend }
      );
      if (updatedChatWithUser) {
        currentChat = updatedChatWithUser;
        setActiveChat({ ...currentChat });
      }

      // Scroll to bottom after user message
      setTimeout(() => flatListRef.current?.scrollToEnd({ animated: true }), 100);

      // Run the AI harness
      const result = await runHarness(
        projectId,
        projectName,
        currentChat.messages,
        textToSend,
        providerModel,
        (toolCallInfo) => {
          setLiveToolCalls((prev) => [...prev, toolCallInfo]);
        }
      );

      // Build the assistant message with tool calls and undo info
      const assistantMsg: Omit<ChatMessage, "id" | "createdAt"> = {
        role: "assistant",
        content: result.assistantContent,
        toolCalls:
          result.toolCalls.length > 0
            ? result.toolCalls.map((tc) => ({
                name: tc.name,
                args: tc.args,
                result: tc.result,
              }))
            : undefined,
        undoGroup: result.undoGroup
          ? {
              entries: result.undoGroup.entries,
              undone: false,
            }
          : undefined,
      };

      const finalChat = await addMessageToChat(
        projectId,
        currentChat.id,
        assistantMsg
      );
      if (finalChat) {
        setActiveChat({ ...finalChat });
      }

      setLiveToolCalls([]);
      await loadChats();

      // Scroll to bottom after assistant response
      setTimeout(() => flatListRef.current?.scrollToEnd({ animated: true }), 100);
    } catch (e: any) {
      setErrorMsg(e.message || "Something went wrong.");
    } finally {
      setIsLoading(false);
    }
  };

  // ── Undo ───────────────────────────────────────────────────────────

  const handleUndo = async (messageIndex: number) => {
    if (!activeChat || !projectId) return;

    const msg = activeChat.messages[messageIndex];
    if (!msg.undoGroup || msg.undoGroup.undone) return;

    const undoGroup: UndoGroup = {
      messageId: msg.id,
      entries: msg.undoGroup.entries,
    };

    await executeUndo(projectId, undoGroup);

    // Mark as undone
    const updatedMessages = [...activeChat.messages];
    updatedMessages[messageIndex] = {
      ...msg,
      undoGroup: { ...msg.undoGroup, undone: true },
    };

    const updatedChat = {
      ...activeChat,
      messages: updatedMessages,
      updatedAt: new Date().toISOString(),
    };

    await updateChat(projectId, updatedChat);
    setActiveChat(updatedChat);
    await loadChats();
  };

  // ── New chat ───────────────────────────────────────────────────────

  const handleNewChat = () => {
    setActiveChat(null);
    setErrorMsg(null);
    setLiveToolCalls([]);
  };

  const handleSelectChat = async (chatId: string) => {
    if (!projectId) return;
    const chat = await getChat(projectId, chatId);
    setActiveChat(chat);
    setIsAllChatsModalVisible(false);
    setErrorMsg(null);
    setLiveToolCalls([]);
  };

  // ── Tool call icon helper ──────────────────────────────────────────

  const getToolIcon = (name: string) => {
    switch (name) {
      case "list_files":
        return FolderOpenIcon;
      case "read_file":
        return FileIcon;
      case "write_file":
        return PencilIcon;
      default:
        return SparklesIcon;
    }
  };

  const getToolLabel = (name: string, args: Record<string, any>) => {
    switch (name) {
      case "list_files":
        return "Listed project files";
      case "read_file":
        return `Read ${args.path || "file"}`;
      case "write_file":
        return `Wrote ${args.path || "file"}`;
      default:
        return name;
    }
  };

  // ── Render a single message ────────────────────────────────────────

  const renderMessage = ({ item, index }: { item: ChatMessage; index: number }) => {
    if (item.role === "user") {
      return (
        <View className="max-w-[85%] self-end rounded-2xl rounded-br-sm bg-primary px-4 py-3">
          <Text className="text-primary-foreground">{item.content}</Text>
        </View>
      );
    }

    // Assistant message
    return (
      <View className="max-w-[90%] self-start gap-2">
        {/* Tool calls */}
        {item.toolCalls && item.toolCalls.length > 0 && (
          <View className="gap-1">
            {item.toolCalls.map((tc, tcIdx) => (
              <View
                key={tcIdx}
                className="flex-row items-center gap-2 rounded-lg bg-muted/50 px-3 py-2">
                <Icon
                  as={getToolIcon(tc.name)}
                  className="size-3.5 text-muted-foreground"
                  size={14}
                />
                <Text className="flex-1 text-xs text-muted-foreground">
                  {getToolLabel(tc.name, tc.args)}
                </Text>
              </View>
            ))}
          </View>
        )}

        {/* Message content */}
        {item.content ? (
          <View className="rounded-2xl rounded-bl-sm bg-muted px-4 py-3">
            <Text className="text-foreground">{item.content}</Text>
          </View>
        ) : null}

        {/* Undo button */}
        {item.undoGroup && (
          <Pressable
            className={`flex-row items-center gap-2 self-start rounded-lg px-3 py-1.5 ${
              item.undoGroup.undone
                ? "bg-green-500/10"
                : "bg-destructive/10 active:bg-destructive/20"
            }`}
            onPress={() => handleUndo(index)}
            disabled={item.undoGroup.undone}>
            <Icon
              as={item.undoGroup.undone ? CheckIcon : UndoIcon}
              className={`size-3.5 ${
                item.undoGroup.undone ? "text-green-500" : "text-destructive"
              }`}
              size={14}
            />
            <Text
              className={`text-xs font-medium ${
                item.undoGroup.undone ? "text-green-500" : "text-destructive"
              }`}>
              {item.undoGroup.undone
                ? "Changes undone"
                : `Undo ${item.undoGroup.entries.length} file change${
                    item.undoGroup.entries.length > 1 ? "s" : ""
                  }`}
            </Text>
          </Pressable>
        )}
      </View>
    );
  };

  // ── Render ─────────────────────────────────────────────────────────

  const renderChatItem = ({ item }: { item: Chat }) => (
    <Pressable
      className="flex-row items-center gap-3 border-b border-border p-4 active:opacity-70"
      onPress={() => handleSelectChat(item.id)}>
      <View className="flex-1">
        <Text className="text-base font-semibold text-foreground" numberOfLines={1}>
          {item.title}
        </Text>
        <Text className="text-sm text-muted-foreground">
          {new Date(item.updatedAt).toLocaleDateString()}{" "}
          {new Date(item.updatedAt).toLocaleTimeString()}
        </Text>
      </View>
      <Icon as={ChevronRightIcon} className="size-5 text-muted-foreground" size={20} />
    </Pressable>
  );

  const filteredChats = chats.filter((c) =>
    c.title.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <>
      <Stack.Screen
        options={{
          title: activeChat?.title || "AI Assistant",
          headerLeft: () => (
            <Pressable
              onPress={() => router.back()}
              className="ios:ml-0 ml-2 mr-6 p-1"
              hitSlop={8}>
              <Icon as={ArrowLeftIcon} className="size-6 text-foreground" size={24} />
            </Pressable>
          ),
        }}
      />

      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        className="flex-1 bg-background"
        style={{ paddingBottom: Math.max(insets.bottom, 16) }}>
        {aiConfigured === false ? (
          <View className="flex-1 items-center justify-center">
            <Icon
              as={SparklesIcon}
              className="mb-6 size-16 text-muted-foreground"
              size={64}
            />
            <Text className="mb-2 text-center text-xl font-bold text-foreground">
              AI Not Configured
            </Text>
            <Text className="mb-8 px-8 text-center text-base text-muted-foreground">
              Set up a cloud AI provider to unlock AI features in your projects.
            </Text>
            <Button
              onPress={() => router.push("/ai-settings")}
              className="w-full max-w-[250px] flex-row justify-center">
              <Text className="font-semibold text-primary-foreground">Go to Settings</Text>
            </Button>
          </View>
        ) : (
          <>
            {/* ── Chat Messages Area ──────────────────────────────── */}
            <View className="flex-1">
              {isChatEmpty ? (
                <View className="flex-1 items-center justify-center px-8">
                  <Text className="text-center text-sm text-muted-foreground">
                    This is AI chat. You can reference files with @filename.
                  </Text>

                  {chats.length > 0 && (
                    <View className="mt-8 w-full max-w-md">
                      <Text className="mb-3 text-center font-medium text-foreground">
                        Recent Chats
                      </Text>
                      <View className="overflow-hidden rounded-xl border border-border bg-card">
                        {chats.slice(0, 5).map((chat, index) => (
                          <Pressable
                            key={chat.id}
                            className={`flex-row items-center gap-3 p-3 active:bg-muted ${
                              index !== Math.min(chats.length, 5) - 1
                                ? "border-b border-border"
                                : ""
                            }`}
                            onPress={() => handleSelectChat(chat.id)}>
                            <Icon
                              as={MessageSquareIcon}
                              className="size-4 text-muted-foreground"
                              size={16}
                            />
                            <Text
                              className="flex-1 text-sm text-foreground"
                              numberOfLines={1}>
                              {chat.title}
                            </Text>
                          </Pressable>
                        ))}
                      </View>

                      {chats.length > 5 && (
                        <Pressable
                          className="mt-3 py-2 active:opacity-70"
                          onPress={() => setIsAllChatsModalVisible(true)}>
                          <Text className="text-center text-sm font-medium text-primary">
                            View All Chats ({chats.length})
                          </Text>
                        </Pressable>
                      )}
                    </View>
                  )}
                </View>
              ) : (
                <>
                  <FlatList
                    ref={flatListRef}
                    data={activeChat?.messages || []}
                    keyExtractor={(item) => item.id}
                    contentContainerStyle={{ padding: 16, gap: 12 }}
                    renderItem={renderMessage}
                    onContentSizeChange={() =>
                      flatListRef.current?.scrollToEnd({ animated: false })
                    }
                  />

                  {/* Live tool call indicators */}
                  {isLoading && liveToolCalls.length > 0 && (
                    <View className="border-t border-border/50 px-4 py-2">
                      {liveToolCalls.slice(-3).map((tc, idx) => (
                        <View
                          key={idx}
                          className="flex-row items-center gap-2 py-0.5">
                          <Icon
                            as={getToolIcon(tc.name)}
                            className="size-3 text-muted-foreground"
                            size={12}
                          />
                          <Text className="text-xs text-muted-foreground">
                            {getToolLabel(tc.name, tc.args)}
                          </Text>
                        </View>
                      ))}
                    </View>
                  )}
                </>
              )}

              {/* Loading indicator */}
              {isLoading && (
                <View className="flex-row items-center gap-2 px-6 py-2">
                  <ActivityIndicator size="small" />
                  <Text className="text-sm text-muted-foreground">
                    {liveToolCalls.length > 0 ? "Working..." : "Thinking..."}
                  </Text>
                </View>
              )}

              {/* Error message */}
              {errorMsg && (
                <View className="mx-4 mb-2 rounded-lg bg-destructive/10 px-4 py-3">
                  <Text className="text-sm text-destructive">{errorMsg}</Text>
                </View>
              )}
            </View>

            {/* ── Chat Input Area ─────────────────────────────────── */}
            <View className="border-t border-border p-4">
              <View className="rounded-xl border border-border bg-card p-2">
                <TextInput
                  className="max-h-32 min-h-[40px] px-2 text-foreground"
                  placeholder="Ask AI something..."
                  placeholderTextColor="#888"
                  multiline
                  value={inputText}
                  onChangeText={setInputText}
                  editable={!isLoading}
                />
                <View className="mt-2 flex-row items-center justify-between px-1">
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Pressable className="flex-row items-center gap-1 rounded-lg px-2 py-1 active:opacity-70">
                        {isModelsLoading ? (
                          <ActivityIndicator size="small" color="#888" style={{ width: 12, height: 12, marginRight: 4 }} />
                        ) : null}
                        <Text className="text-xs font-medium text-muted-foreground" numberOfLines={1} style={{ maxWidth: 150 }}>
                          {providerModel}
                        </Text>
                        <Icon
                          as={ChevronDownIcon}
                          className="size-3 text-muted-foreground"
                          size={12}
                        />
                      </Pressable>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="start" className="w-64 p-1">
                      <ScrollView style={{ maxHeight: 250 }} showsVerticalScrollIndicator={true}>
                        {(availableModels.length > 0 ? availableModels : [providerModel]).map((model) => (
                          <DropdownMenuItem
                            key={model}
                            onPress={() => setProviderModel(model)}>
                            <Text className="text-sm text-foreground">{model}</Text>
                          </DropdownMenuItem>
                        ))}
                      </ScrollView>
                    </DropdownMenuContent>
                  </DropdownMenu>

                  <Pressable
                    className={`rounded-full p-2 ${
                      inputText.trim() && !isLoading
                        ? "bg-primary active:opacity-70"
                        : "bg-muted"
                    }`}
                    onPress={handleSend}
                    disabled={!inputText.trim() || isLoading}>
                    <Icon
                      as={SendIcon}
                      className={`size-4 ${
                        inputText.trim() && !isLoading
                          ? "text-primary-foreground"
                          : "text-muted-foreground"
                      }`}
                      size={16}
                    />
                  </Pressable>
                </View>
              </View>

              <View className="mt-3 flex-row items-center justify-center">
                <Button
                  variant="ghost"
                  className="flex-row items-center gap-2"
                  onPress={handleNewChat}>
                  <Icon as={PlusIcon} className="size-4 text-foreground" size={16} />
                  <Text className="font-semibold text-foreground">New Chat</Text>
                </Button>
                {chats.length > 0 && isChatEmpty && chats.length <= 5 && (
                  <Button
                    variant="ghost"
                    className="ml-2 flex-row items-center gap-2"
                    onPress={() => setIsAllChatsModalVisible(true)}>
                    <Text className="font-semibold text-muted-foreground">All Chats</Text>
                  </Button>
                )}
              </View>
            </View>
          </>
        )}
      </KeyboardAvoidingView>

      {/* ── All Chats Modal ───────────────────────────────── */}
      <Modal
        visible={isAllChatsModalVisible}
        animationType="slide"
        onRequestClose={() => setIsAllChatsModalVisible(false)}>
        <View
          className="flex-1 bg-background"
          style={{
            paddingTop: insets.top,
            paddingBottom: Math.max(insets.bottom, 16),
          }}>
          <View className="flex-row items-center justify-between border-b border-border px-4 py-3">
            <Text className="text-xl font-bold text-foreground">All Chats</Text>
            <Pressable
              onPress={() => setIsAllChatsModalVisible(false)}
              className="-mr-2 p-2">
              <Icon as={XIcon} className="size-6 text-foreground" size={24} />
            </Pressable>
          </View>

          <View className="border-b border-border p-4">
            <View className="flex-row items-center gap-2 rounded-xl border border-border bg-card px-3 py-2">
              <Icon
                as={SearchIcon}
                className="size-4 text-muted-foreground"
                size={16}
              />
              <TextInput
                className="flex-1 text-base text-foreground"
                placeholder="Search chats..."
                placeholderTextColor="#888"
                value={searchQuery}
                onChangeText={setSearchQuery}
              />
              {searchQuery.length > 0 && (
                <Pressable onPress={() => setSearchQuery("")}>
                  <Icon
                    as={XIcon}
                    className="size-4 text-muted-foreground"
                    size={16}
                  />
                </Pressable>
              )}
            </View>
          </View>

          <FlatList
            data={filteredChats}
            keyExtractor={(item) => item.id}
            renderItem={renderChatItem}
            contentContainerStyle={{ paddingBottom: 24 }}
            ListEmptyComponent={() => (
              <View className="mt-10 flex-1 items-center justify-center p-8">
                <Icon
                  as={MessageSquareIcon}
                  className="mb-4 size-12 text-muted-foreground/50"
                  size={48}
                />
                <Text className="text-center text-lg font-medium text-foreground">
                  No chats found
                </Text>
              </View>
            )}
          />
        </View>
      </Modal>
    </>
  );
}
