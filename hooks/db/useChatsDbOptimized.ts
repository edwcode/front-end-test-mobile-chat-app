import { useReducer, useEffect, useCallback, useMemo } from 'react';
import { chatService, Chat, Message } from '../../services/ChatService';

export { Message, Chat };

/**
 * Estado gestionado con useReducer para mejor performance
 */

// Tipos de acciones
type ChatAction =
  | { type: 'SET_CHATS'; payload: Chat[] }
  | { type: 'ADD_CHAT'; payload: Chat }
  | { type: 'UPDATE_CHAT'; payload: { chatId: string; updates: Partial<Chat> } }
  | { type: 'ADD_MESSAGE'; payload: { chatId: string; message: Message } }
  | { type: 'PREPEND_MESSAGES'; payload: { chatId: string; messages: Message[] } }
  | { type: 'UPDATE_MESSAGE'; payload: { chatId: string; messageId: string; updates: Partial<Message> } }
  | { type: 'DELETE_MESSAGE'; payload: { chatId: string; messageId: string; userId: string } }
  | { type: 'SET_LOADING'; payload: boolean };

interface ChatState {
  chats: Chat[];
  loading: boolean;
}

// Reducer optimizado con actualizaciones inmutables
function chatReducer(state: ChatState, action: ChatAction): ChatState {
  switch (action.type) {
    case 'SET_CHATS':
      return { ...state, chats: action.payload };
    
    case 'ADD_CHAT':
      return { ...state, chats: [...state.chats, action.payload] };
    
    case 'UPDATE_CHAT':
      return {
        ...state,
        chats: state.chats.map(chat =>
          chat.id === action.payload.chatId
            ? { ...chat, ...action.payload.updates }
            : chat
        ),
      };
    
    case 'ADD_MESSAGE':
      return {
        ...state,
        chats: state.chats.map(chat =>
          chat.id === action.payload.chatId
            ? {
                ...chat,
                messages: [...chat.messages, action.payload.message],
                lastMessage: action.payload.message,
                updatedAt: action.payload.message.timestamp,
              }
            : chat
        ),
      };
    
    case 'PREPEND_MESSAGES':
      return {
        ...state,
        chats: state.chats.map(chat =>
          chat.id === action.payload.chatId
            ? {
                ...chat,
                messages: [...action.payload.messages, ...chat.messages],
              }
            : chat
        ),
      };
    
    case 'UPDATE_MESSAGE':
      return {
        ...state,
        chats: state.chats.map(chat =>
          chat.id === action.payload.chatId
            ? {
                ...chat,
                messages: chat.messages.map((msg: Message) =>
                  msg.id === action.payload.messageId
                    ? { ...msg, ...action.payload.updates }
                    : msg
                ),
              }
            : chat
        ),
      };
    
    case 'DELETE_MESSAGE':
      return {
        ...state,
        chats: state.chats.map(chat =>
          chat.id === action.payload.chatId
            ? {
                ...chat,
                messages: chat.messages.map((msg: Message) =>
                  msg.id === action.payload.messageId
                    ? { ...msg, deletedAt: Date.now(), deletedBy: action.payload.userId, isDeleted: true }
                    : msg
                ),
              }
            : chat
        ),
      };
    
    case 'SET_LOADING':
      return { ...state, loading: action.payload };
    
    default:
      return state;
  }
}

export function useChatsDbOptimized(currentUserId: string | null) {
  const [state, dispatch] = useReducer(chatReducer, {
    chats: [],
    loading: true,
  });

  // Cargar chats del usuario
  useEffect(() => {
    const loadChats = async () => {
      if (!currentUserId) {
        dispatch({ type: 'SET_CHATS', payload: [] });
        dispatch({ type: 'SET_LOADING', payload: false });
        return;
      }
      
      try {
        const chats = await chatService.getUserChats(currentUserId);
        dispatch({ type: 'SET_CHATS', payload: chats });
      } catch (error) {
        console.error('Error loading chats:', error);
      } finally {
        dispatch({ type: 'SET_LOADING', payload: false });
      }
    };
    
    loadChats();
  }, [currentUserId]);

  // Funciones memoizadas con useCallback
  const createChat = useCallback(async (participantIds: string[]) => {
    if (!currentUserId || !participantIds.includes(currentUserId)) {
      return null;
    }
    
    try {
      const newChat = await chatService.createChat(participantIds);
      dispatch({ type: 'ADD_CHAT', payload: newChat });
      return newChat;
    } catch (error) {
      console.error('Error creating chat:', error);
      return null;
    }
  }, [currentUserId]);

  const sendMessage = useCallback(async (chatId: string, text: string, senderId: string) => {
    if (!text.trim()) return false;
    
    try {
      const newMessage = await chatService.sendTextMessage(chatId, senderId, text);
      dispatch({
        type: 'ADD_MESSAGE',
        payload: { chatId, message: newMessage },
      });
      return true;
    } catch (error) {
      console.error('Error sending message:', error);
      return false;
    }
  }, []);

  const sendImageMessage = useCallback(
    async (chatId: string, senderId: string, imageUri: string, caption?: string) => {
      try {
        const newMessage = await chatService.sendImageMessage(chatId, senderId, imageUri, caption);
        dispatch({
          type: 'ADD_MESSAGE',
          payload: { chatId, message: newMessage },
        });
        return true;
      } catch (error) {
        console.error('Error sending image:', error);
        return false;
      }
    },
    []
  );

  const loadOlderMessages = useCallback(async (chatId: string): Promise<number> => {
    const chat = state.chats.find(c => c.id === chatId);
    if (!chat || chat.messages.length === 0) return 0;

    const oldestMessage = chat.messages[0];
    const olderMessages = await chatService.loadOlderMessages(chatId, oldestMessage.timestamp);
    
    if (olderMessages.length > 0) {
      dispatch({
        type: 'PREPEND_MESSAGES',
        payload: { chatId, messages: olderMessages },
      });
    }
    
    return olderMessages.length;
  }, [state.chats]);

  const editMessage = useCallback(async (messageId: string, newText: string, userId: string) => {
    const result = await chatService.editMessage(messageId, newText, userId);
    
    if (result) {
      // Encontrar el chat que contiene el mensaje
      const chat = state.chats.find(c => c.messages.some((m: Message) => m.id === messageId));
      if (chat) {
        dispatch({
          type: 'UPDATE_MESSAGE',
          payload: {
            chatId: chat.id,
            messageId,
            updates: { text: newText, editedAt: Date.now() },
          },
        });
      }
      return true;
    }
    
    return false;
  }, [state.chats]);

  const deleteMessage = useCallback(async (messageId: string, userId: string) => {
    const success = await chatService.deleteMessage(messageId, userId);
    
    if (success) {
      const chat = state.chats.find(c => c.messages.some((m: Message) => m.id === messageId));
      if (chat) {
        dispatch({
          type: 'DELETE_MESSAGE',
          payload: { chatId: chat.id, messageId, userId },
        });
      }
    }
    
    return success;
  }, [state.chats]);

  const searchMessages = useCallback(
    async (chatId: string, query: string) => {
      return await chatService.searchMessages(chatId, query);
    },
    []
  );

  const markAsRead = useCallback(async (chatId: string, userId: string) => {
    const chat = state.chats.find(c => c.id === chatId);
    if (!chat) return;

    const unreadMessageIds = chat.messages
      .filter((msg: Message) => msg.senderId !== userId && msg.status !== 'read')
      .map((msg: Message) => msg.id);

    if (unreadMessageIds.length > 0) {
      await chatService.markAsRead(chatId, userId);
      
      // Actualizar estado local
      unreadMessageIds.forEach((messageId: string) => {
        dispatch({
          type: 'UPDATE_MESSAGE',
          payload: {
            chatId,
            messageId,
            updates: { status: 'read' },
          },
        });
      });
    }
  }, [state.chats]);

  // Valores memoizados para evitar re-renders innecesarios
  return useMemo(
    () => ({
      chats: state.chats,
      loading: state.loading,
      createChat,
      sendMessage,
      sendImageMessage,
      loadOlderMessages,
      editMessage,
      deleteMessage,
      searchMessages,
      markAsRead,
    }),
    [
      state.chats,
      state.loading,
      createChat,
      sendMessage,
      sendImageMessage,
      loadOlderMessages,
      editMessage,
      deleteMessage,
      searchMessages,
      markAsRead,
    ]
  );
}
