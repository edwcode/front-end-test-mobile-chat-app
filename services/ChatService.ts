import { chatRepository, MessageData, ChatData } from '../repositories/ChatRepository';
import * as FileSystem from 'expo-file-system';
import { manipulateAsync, SaveFormat } from 'expo-image-manipulator';

export interface Message {
  id: string;
  chatId: string;
  senderId: string;
  text: string;
  timestamp: number;
  status: 'sent' | 'delivered' | 'read';
  mediaUrl?: string | null;
  mediaType?: 'image' | 'video' | null;
  thumbnailUrl?: string | null;
  editedAt?: number | null;
  deletedAt?: number | null;
  originalText?: string | null;
  isDeleted?: boolean;
}

export interface Chat {
  id: string;
  participants: string[];
  messages: Message[];
  lastMessage?: Message;
  createdAt: number;
  updatedAt: number;
  unreadCount?: number;
}

class ChatService {

  
  /**
   * Obtiene todos los chats de un usuario
   * Usa batch query para últimos mensajes Y conteo de no leídos (evita N+1)
   */
  async getUserChats(userId: string): Promise<Chat[]> {
    const chatsData = await chatRepository.getChatsByUserId(userId);
    
    if (chatsData.length === 0) {
      return [];
    }
    
    // OPTIMIZACIÓN: Queries batch para evitar N+1
    const chatIds = chatsData.map(c => c.id);
    const lastMessagesMap = await chatRepository.getLastMessagesForChats(chatIds);
    const unreadCountsMap = await chatRepository.getUnreadCountsForChats(chatIds, userId);
    
    const chats: Chat[] = [];
    for (const chatData of chatsData) {
      const messages = await chatRepository.getMessages(chatData.id, 50);
      const lastMessage = lastMessagesMap.get(chatData.id);
      const unreadCount = unreadCountsMap.get(chatData.id) || 0;
      
      chats.push({
        id: chatData.id,
        participants: chatData.participants,
        messages: messages.map(this.mapMessageData),
        lastMessage: lastMessage ? this.mapMessageData(lastMessage) : undefined,
        createdAt: chatData.createdAt,
        updatedAt: chatData.updatedAt,
        unreadCount, // Ahora incluye conteo real de no leídos
      });
    }
    
    // Ordenar por último mensaje
    return chats.sort((a, b) => b.updatedAt - a.updatedAt);
  }

  /**
   * Crea un nuevo chat
   */
  async createChat(participantIds: string[]): Promise<Chat> {
    const chatData = await chatRepository.createChat(participantIds);
    
    return {
      id: chatData.id,
      participants: chatData.participants,
      messages: [],
      createdAt: chatData.createdAt,
      updatedAt: chatData.updatedAt,
    };
  }

  /**
   * Envía un mensaje de texto
   */
  async sendTextMessage(chatId: string, senderId: string, text: string): Promise<Message> {
    const messageData = await chatRepository.createMessage({
      chatId,
      senderId,
      text,
    });
    
    return this.mapMessageData(messageData);
  }

  /**
   * Envía un mensaje con imagen
   */
  async sendImageMessage(
    chatId: string, 
    senderId: string, 
    imageUri: string,
    caption: string = ''
  ): Promise<Message> {
    // Comprimir y crear thumbnail
    const { compressedUri, thumbnailUri } = await this.processImage(imageUri);
    
    const messageData = await chatRepository.createMessage({
      chatId,
      senderId,
      text: caption,
      mediaUrl: compressedUri,
      mediaType: 'image',
      thumbnailUrl: thumbnailUri,
    });
    
    return this.mapMessageData(messageData);
  }

  /**
   * Procesa una imagen: comprime y crea thumbnail con gestión optimizada de memoria
   */
  private async processImage(uri: string): Promise<{ compressedUri: string; thumbnailUri: string }> {
    try {
      // 1. Obtener información del archivo original
      let fileInfo;
      try {
        fileInfo = await FileSystem.getInfoAsync(uri);
      } catch (error) {
        console.warn('No se pudo obtener info del archivo:', error);
        fileInfo = null;
      }

      const originalSizeBytes = fileInfo && 'size' in fileInfo ? fileInfo.size : 0;
      const originalSizeMB = originalSizeBytes / (1024 * 1024);

      console.log(`Procesando imagen: ${originalSizeMB.toFixed(2)} MB`);

      // 2. Determinar calidad de compresión según tamaño
      let compressionQuality = 0.7;
      let maxWidth = 1200;

      if (originalSizeMB > 10) {
        compressionQuality = 0.5;
        maxWidth = 1000;
        console.log('Imagen muy grande, aplicando compresión agresiva');
      } else if (originalSizeMB > 5) {
        compressionQuality = 0.6;
        maxWidth = 1100;
      } else if (originalSizeMB < 1) {
        compressionQuality = 0.8;
        maxWidth = 1200;
      }

      // 3. Crear versión comprimida
      const compressed = await manipulateAsync(
        uri,
        [{ resize: { width: maxWidth } }],
        { compress: compressionQuality, format: SaveFormat.JPEG }
      );

      // 4. Crear thumbnail
      const thumbnail = await manipulateAsync(
        uri,
        [{ resize: { width: 200 } }],
        { compress: 0.5, format: SaveFormat.JPEG }
      );

      // 5. Preparar directorios
      const imagesDir = `${FileSystem.documentDirectory}images/`;
      await FileSystem.makeDirectoryAsync(imagesDir, { intermediates: true });

      // 6. Guardar archivos
      const timestamp = Date.now();
      const randomId = Math.random().toString(36).substring(7);
      const compressedPath = `${imagesDir}img_${timestamp}_${randomId}.jpg`;
      const thumbnailPath = `${imagesDir}thumb_${timestamp}_${randomId}.jpg`;

      await FileSystem.moveAsync({ from: compressed.uri, to: compressedPath });
      await FileSystem.moveAsync({ from: thumbnail.uri, to: thumbnailPath });

      return {
        compressedUri: compressedPath,
        thumbnailUri: thumbnailPath,
      };
    } catch (error) {
      console.error('Error procesando imagen:', error);
      return {
        compressedUri: uri,
        thumbnailUri: uri,
      };
    }
  }

  /**
   * Carga más mensajes antiguos (paginación)
   */
  async loadOlderMessages(chatId: string, beforeTimestamp: number, limit: number = 50): Promise<Message[]> {
    const messagesData = await chatRepository.getMessages(chatId, limit, beforeTimestamp);
    return messagesData.map(this.mapMessageData);
  }

  /**
   * Edita un mensaje existente
   * Valida que el usuario sea el propietario y guarda el historial
   */
  async editMessage(messageId: string, newText: string, userId: string): Promise<Message | null> {
    // Validación básica
    if (!newText || newText.trim().length === 0) {
      console.warn('[ChatService] Cannot edit message with empty text');
      return null;
    }

    if (newText.length > 5000) {
      console.warn('[ChatService] Message text too long (max 5000 chars)');
      return null;
    }

    const messageData = await chatRepository.editMessage(messageId, newText.trim(), userId);
    
    if (!messageData) {
      return null;
    }

    return this.mapMessageData(messageData);
  }

  /**
   * Elimina un mensaje (soft delete)
   * Solo el propietario puede eliminar sus mensajes
   */
  async deleteMessage(messageId: string, userId: string): Promise<boolean> {
    const success = await chatRepository.deleteMessage(messageId, userId);
    
    if (!success) {
      console.warn('[ChatService] Failed to delete message', messageId);
    }

    return success;
  }

  /**
   * Obtiene el historial de ediciones de un mensaje
   */
  async getMessageHistory(messageId: string): Promise<{
    current: string;
    original: string | null;
    editedAt: number | null;
  } | null> {
    return await chatRepository.getMessageHistory(messageId);
  }

  /**
   * Marca mensajes de un chat como leídos
   */
  async markAsRead(chatId: string, userId: string): Promise<void> {
    await chatRepository.markMessagesAsRead(chatId, userId);
  }

  /**
   * Marca mensajes como entregados
   */
  async markAsDelivered(messageIds: string[]): Promise<void> {
    await chatRepository.markMessagesAsDelivered(messageIds);
  }

  /**
   * Búsqueda básica de mensajes en un chat
   */
  async searchMessages(
    chatId: string,
    query: string,
    filters?: {
      senderId?: string;
      messageType?: 'text' | 'image' | 'all';
      dateFrom?: number;
      dateTo?: number;
    }
  ): Promise<Message[]> {
    // Si hay filtros, usar búsqueda avanzada
    if (filters && Object.keys(filters).length > 0) {
      const messagesData = await chatRepository.searchMessagesAdvanced(chatId, {
        query,
        ...filters,
      });
      return messagesData.map(this.mapMessageData);
    }

    // Búsqueda básica
    const messagesData = await chatRepository.searchMessages(chatId, query);
    return messagesData.map(this.mapMessageData);
  }

  /**
   * Búsqueda global en todos los chats del usuario
   */
  async searchMessagesGlobal(query: string, userId?: string): Promise<Message[]> {
    if (!userId) {
      console.warn('[ChatService] userId required for global search');
      return [];
    }

    const messagesData = await chatRepository.searchMessagesGlobal(userId, query);
    return messagesData.map(this.mapMessageData);
  }

  /**
   * Mapea datos de la BD al modelo de la aplicación
   */
  private mapMessageData(data: MessageData): Message {
    return {
      id: data.id,
      chatId: data.chatId,
      senderId: data.senderId,
      text: data.text,
      timestamp: data.timestamp,
      status: data.status as 'sent' | 'delivered' | 'read',
      mediaUrl: data.mediaUrl,
      mediaType: data.mediaType as 'image' | 'video' | null,
      thumbnailUrl: data.thumbnailUrl,
      editedAt: data.editedAt,
      deletedAt: data.deletedAt,
      isDeleted: !!data.deletedAt,
    };
  }
}

export const chatService = new ChatService();
