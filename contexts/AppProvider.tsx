import React, { ReactNode } from 'react';
import { DatabaseProvider } from '../database/DatabaseProvider';
import { UserProvider } from './UserContext';
import { ChatProvider } from './ChatContext';

/**
 * Composición de providers
 * 1. Separación de concerns (User vs Chat)
 * 2. Granularidad de re-renders (solo lo necesario)
 * 
 * - DatabaseProvider primero (infraestructura)
 * - UserProvider segundo (autenticación)
 * - ChatProvider tercero (depende de user)
 */
export function AppProvider({ children }: { children: ReactNode }) {
  return (
    <DatabaseProvider>
      <UserProvider>
        <ChatProvider>
          {children}
        </ChatProvider>
      </UserProvider>
    </DatabaseProvider>
  );
}

export function useAppContext() {

  const { useUserContext } = require('./UserContext');
  const { useChatContext } = require('./ChatContext');
  
  const userContext = useUserContext();
  const chatContext = useChatContext();
  
  return {
    ...userContext,
    ...chatContext,
    dbInitialized: true, // Siempre true si llegamos aquí
  };
}

// Re-exportar hooks optimizados para fácil importación
export { 
  useUserContext,
  useCurrentUser, 
  useIsLoggedIn,
  useUsers 
} from './UserContext';

export { 
  useChatContext,
  useChats, 
  useChatActions, 
  useChat 
} from './ChatContext';
