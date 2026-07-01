import * as FileSystem from "expo-file-system/legacy";
import * as Crypto from "expo-crypto";
import type { Chat, ChatMessage } from "@/types";

function generateId(): string {
  return Crypto.randomUUID();
}

function getChatsFilePath(projectId: string): string {
  return `${FileSystem.documentDirectory}pewpew_chats_${projectId}.json`;
}

export async function getProjectChats(projectId: string): Promise<Chat[]> {
  const filePath = getChatsFilePath(projectId);
  try {
    const info = await FileSystem.getInfoAsync(filePath);
    if (!info.exists) return [];
    const content = await FileSystem.readAsStringAsync(filePath);
    return JSON.parse(content) as Chat[];
  } catch (e) {
    console.error(`Failed to read chats file for project ${projectId}:`, e);
    return [];
  }
}

async function saveProjectChats(projectId: string, chats: Chat[]): Promise<void> {
  const filePath = getChatsFilePath(projectId);
  await FileSystem.writeAsStringAsync(filePath, JSON.stringify(chats, null, 2));
}

export async function createChat(projectId: string, title: string = "New Chat"): Promise<Chat> {
  const chats = await getProjectChats(projectId);
  const now = new Date().toISOString();
  const chat: Chat = {
    id: generateId(),
    projectId,
    title,
    messages: [],
    createdAt: now,
    updatedAt: now,
  };
  chats.unshift(chat); // newest first
  await saveProjectChats(projectId, chats);
  return chat;
}

export async function getChat(projectId: string, chatId: string): Promise<Chat | null> {
  const chats = await getProjectChats(projectId);
  return chats.find((c) => c.id === chatId) ?? null;
}

export async function addMessageToChat(
  projectId: string,
  chatId: string,
  message: Omit<ChatMessage, "id" | "createdAt">
): Promise<Chat | null> {
  const chats = await getProjectChats(projectId);
  const chatIndex = chats.findIndex((c) => c.id === chatId);
  if (chatIndex === -1) return null;

  const now = new Date().toISOString();
  const newMessage: ChatMessage = {
    ...message,
    id: generateId(),
    createdAt: now,
  };

  chats[chatIndex].messages.push(newMessage);
  chats[chatIndex].updatedAt = now;
  
  await saveProjectChats(projectId, chats);
  return chats[chatIndex];
}

export async function deleteChat(projectId: string, chatId: string): Promise<void> {
  const chats = await getProjectChats(projectId);
  await saveProjectChats(projectId, chats.filter((c) => c.id !== chatId));
}

export async function updateChat(projectId: string, updatedChat: Chat): Promise<void> {
  const chats = await getProjectChats(projectId);
  const index = chats.findIndex((c) => c.id === updatedChat.id);
  if (index === -1) return;
  chats[index] = updatedChat;
  await saveProjectChats(projectId, chats);
}
