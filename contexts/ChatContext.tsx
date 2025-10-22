import React, { createContext, useContext, ReactNode } from 'react';
import { useChatsDb, Chat, Message } from '../hooks/db/useChatsDb';
import { useCurrentUser } from './UserContext';

/**
 * ChatContext - Maneja SOLO funcionalidad de chat
 * Separado de user para granularidad y performance
 */

type ChatContextType = {
  chats: Chat[];
  createChat: (participantIds: string[]) => Promise<Chat | null>;
  sendMessage: (chatId: string, text: string, senderId: string) => Promise<boolean>;
  sendImageMessage: (chatId: string, senderId: string, imageUri: string, caption?: string) => Promise<boolean>;
  loadOlderMessages: (chatId: string) => Promise<number>;
  editMessage: (messageId: string, newText: string, userId: string) => Promise<boolean>;
  deleteMessage: (messageId: string, userId: string) => Promise<boolean>;
  searchMessages: (chatId: string, query: string) => Promise<Message[]>;
  markAsRead: (chatId: string, userId: string) => Promise<void>;
  loading: boolean;
};

const ChatContext = createContext<ChatContextType | undefined>(undefined);

export function ChatProvider({ children }: { children: ReactNode }) {
  const currentUser = useCurrentUser();
  const chatState = useChatsDb(currentUser?.id || null);
  
  return (
    <ChatContext.Provider value={chatState}>
      {children}
    </ChatContext.Provider>
  );
}

/**
 * Hook principal para acceder al contexto de chat
 */
export function useChatContext() {
  const context = useContext(ChatContext);
  if (context === undefined) {
    throw new Error('useChatContext must be used within ChatProvider');
  }
  return context;
}

/**
 * Hook optimizado para obtener SOLO la lista de chats
 * Componentes que solo muestran lista no se re-renderean con cambios de loading, etc
 */
export function useChats() {
  const { chats } = useChatContext();
  return chats;
}

/**
 * Hook optimizado para acciones de chat (sin estado)
 * Útil para componentes que solo necesitan enviar mensajes
 */
export function useChatActions() {
  const {
    sendMessage,
    sendImageMessage,
    editMessage,
    deleteMessage,
    createChat,
    markAsRead,
    loadOlderMessages,
  } = useChatContext();

  return {
    sendMessage,
    sendImageMessage,
    editMessage,
    deleteMessage,
    createChat,
    markAsRead,
    loadOlderMessages,
  };
}

/**
 * Hook para obtener un chat específico
 * Optimizado con useMemo para evitar búsquedas innecesarias
 */
export function useChat(chatId: string): Chat | undefined {
  const chats = useChats();
  return React.useMemo(
    () => chats.find(chat => chat.id === chatId),
    [chats, chatId]
  );
}
