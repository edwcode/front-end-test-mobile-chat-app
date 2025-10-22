/**
 * Este archivo existe solo para compatibilidad temporal
 * 
 * ANTES: useChats era un wrapper inútil que solo hacía pass-through
 * AHORA: Usar directamente useChatsDb o mejor aún, useChatContext

 */

import { useChatsDb, Chat, Message } from './db/useChatsDb';

export { Chat, Message };

export function useChats(currentUserId: string | null) {
  console.warn('useChats is deprecated. Use useChatContext() from contexts/ChatContext.tsx');
  return useChatsDb(currentUserId);
} 