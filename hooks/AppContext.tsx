/**
 * Este archivo existe solo para compatibilidad temporal
 * 
 * PROBLEMAS DE LA ARQUITECTURA ANTERIOR:
 * 1. God Context Anti-Pattern (20+ propiedades en un solo context)
 * 2. Re-renders innecesarios (cambio en user re-renderiza todo chat)
 * 3. Spreading oculta dependencias (...userContext, ...chatContext)
 * 4. Hooks wrapper inútiles (useUser, useChats solo hacen pass-through)
 * 5. Acoplamiento fuerte (chatContext depende de userContext)
 * 
 * NUEVA ARQUITECTURA:
 * Contexts separados: UserContext, ChatContext
 * Hooks optimizados: useCurrentUser(), useChats(), useChatActions()
 * Granularidad de re-renders (solo lo necesario)
 * Testeable (mock individual de cada context)
 * Escalable (agregar contexts sin afectar existentes)
 */

import React, { createContext, useContext, ReactNode } from 'react';
import { useUser, User } from './useUser';
import { useChats, Chat } from './useChats';
import { DatabaseProvider } from '../database/DatabaseProvider';
import { useDatabase } from './useDatabase';

type AppContextType = {
  users: User[];
  currentUser: User | null;
  isLoggedIn: boolean;
  login: (userId: string) => Promise<boolean>;
  logout: () => void;
  chats: Chat[];
  createChat: (participantIds: string[]) => Promise<Chat | null>;
  sendMessage: (chatId: string, text: string, senderId: string) => Promise<boolean>;
  sendImageMessage?: (chatId: string, senderId: string, imageUri: string, caption?: string) => Promise<boolean>;
  loadOlderMessages?: (chatId: string) => Promise<number>;
  editMessage?: (messageId: string, newText: string, userId: string) => Promise<boolean>;
  deleteMessage?: (messageId: string, userId: string) => Promise<boolean>;
  searchMessages?: (chatId: string, query: string) => Promise<any[]>;
  markAsRead?: (chatId: string, userId: string) => Promise<void>;
  loading: boolean;
  dbInitialized: boolean;
};

const AppContext = createContext<AppContextType | undefined>(undefined);

function AppContent({ children }: { children: ReactNode }) {
  const { isInitialized } = useDatabase();
  const userContext = useUser();
  const chatContext = useChats(userContext.currentUser?.id || null);
  
  const loading = !isInitialized || userContext.loading || chatContext.loading;

  const value = {
    ...userContext,
    ...chatContext,
    loading,
    dbInitialized: isInitialized,
  };

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function AppProvider({ children }: { children: ReactNode }) {
  
  return (
    <DatabaseProvider>
      <AppContent>{children}</AppContent>
    </DatabaseProvider>
  );
}

export function useAppContext() {
  
  const context = useContext(AppContext);
  if (context === undefined) {
    throw new Error('useAppContext must be used within an AppProvider');
  }
  return context;
} 