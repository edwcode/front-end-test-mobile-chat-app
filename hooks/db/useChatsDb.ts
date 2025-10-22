import { useState, useEffect, useCallback } from 'react';
import { chatService, Chat, Message } from '../../services/ChatService';

export { Message, Chat };

export function useChatsDb(currentUserId: string | null) {
  const [userChats, setUserChats] = useState<Chat[]>([]);
  const [loading, setLoading] = useState(true);

  // Cargar chats del usuario
  useEffect(() => {
    const loadChats = async () => {
      if (!currentUserId) {
        setUserChats([]);
        setLoading(false);
        return;
      }
      
      try {
        const chats = await chatService.getUserChats(currentUserId);
        setUserChats(chats);
      } catch (error) {
        console.error('Error loading chats:', error);
      } finally {
        setLoading(false);
      }
    };
    
    loadChats();
  }, [currentUserId]);

  const createChat = useCallback(async (participantIds: string[]) => {
    if (!currentUserId || !participantIds.includes(currentUserId)) {
      return null;
    }
    
    try {
      const newChat = await chatService.createChat(participantIds);
      setUserChats(prevChats => [...prevChats, newChat]);
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
      
      // Actualizar estado local
      setUserChats(prevChats => {
        return prevChats.map(chat => {
          if (chat.id === chatId) {
            return {
              ...chat,
              messages: [...chat.messages, newMessage],
              lastMessage: newMessage,
              updatedAt: newMessage.timestamp,
            };
          }
          return chat;
        }).sort((a, b) => b.updatedAt - a.updatedAt);
      });
      
      return true;
    } catch (error) {
      console.error('Error sending message:', error);
      return false;
    }
  }, []);

  const sendImageMessage = useCallback(async (
    chatId: string,
    senderId: string,
    imageUri: string,
    caption: string = ''
  ) => {
    try {
      const newMessage = await chatService.sendImageMessage(chatId, senderId, imageUri, caption);
      
      setUserChats(prevChats => {
        return prevChats.map(chat => {
          if (chat.id === chatId) {
            return {
              ...chat,
              messages: [...chat.messages, newMessage],
              lastMessage: newMessage,
              updatedAt: newMessage.timestamp,
            };
          }
          return chat;
        }).sort((a, b) => b.updatedAt - a.updatedAt);
      });
      
      return true;
    } catch (error) {
      console.error('Error sending image:', error);
      return false;
    }
  }, []);

  const loadOlderMessages = useCallback(async (chatId: string): Promise<number> => {
    const chat = userChats.find(c => c.id === chatId);
    if (!chat || chat.messages.length === 0) return 0;

    const oldestMessage = chat.messages[0];
    const olderMessages = await chatService.loadOlderMessages(chatId, oldestMessage.timestamp);
    
    if (olderMessages.length > 0) {
      setUserChats(prevChats => {
        return prevChats.map(c => {
          if (c.id === chatId) {
            return {
              ...c,
              messages: [...olderMessages, ...c.messages],
            };
          }
          return c;
        });
      });
    }
    
    return olderMessages.length;
  }, [userChats]);

  const editMessage = useCallback(async (messageId: string, newText: string, userId: string) => {
    const result = await chatService.editMessage(messageId, newText, userId);
    
    if (result) {
      setUserChats(prevChats => {
        return prevChats.map(chat => ({
          ...chat,
          messages: chat.messages.map((msg: Message) =>
            msg.id === messageId
              ? { ...msg, text: newText, editedAt: Date.now() }
              : msg
          ),
        }));
      });
      return true;
    }
    
    return false;
  }, []);

  const deleteMessage = useCallback(async (messageId: string, userId: string) => {
    const success = await chatService.deleteMessage(messageId, userId);
    
    if (success) {
      setUserChats(prevChats => {
        return prevChats.map(chat => ({
          ...chat,
          messages: chat.messages.map((msg: Message) =>
            msg.id === messageId
              ? { ...msg, deletedAt: Date.now(), deletedBy: userId, isDeleted: true }
              : msg
          ),
        }));
      });
    }
    
    return success;
  }, []);

  const searchMessages = useCallback(async (chatId: string, query: string) => {
    return await chatService.searchMessages(chatId, query);
  }, []);

  const markAsRead = useCallback(async (chatId: string, userId: string) => {
    // Simplificado: el repository maneja toda la lógica
    await chatService.markAsRead(chatId, userId);
    
    // Actualizar estado local
    setUserChats(prevChats => {
      return prevChats.map(c => {
        if (c.id === chatId) {
          return {
            ...c,
            messages: c.messages.map((msg: Message) =>
              msg.senderId !== userId && msg.status !== 'read'
                ? { ...msg, status: 'read' as const }
                : msg
            ),
            unreadCount: 0, // Resetear contador
          };
        }
        return c;
      });
    });
  }, []);

  return {
    chats: userChats,
    createChat,
    sendMessage,
    sendImageMessage,
    loadOlderMessages,
    editMessage,
    deleteMessage,
    searchMessages,
    markAsRead,
    loading,
  };
} 