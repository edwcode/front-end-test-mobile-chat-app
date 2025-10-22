import { db } from '../database/db';
import { chats, chatParticipants, messages, messageReadReceipts } from '../database/schema';
import { eq, desc, and, isNull, lt, sql, inArray, ne, or, not } from 'drizzle-orm';

export interface MessageData {
  id: string;
  chatId: string;
  senderId: string;
  text: string;
  timestamp: number;
  status: string;
  mediaUrl: string | null;
  mediaType: string | null;
  thumbnailUrl: string | null;
  editedAt: number | null;
  deletedAt: number | null;
}

export interface ChatData {
  id: string;
  createdAt: number;
  updatedAt: number;
  participants: string[];
}

export class ChatRepository {
  /**
   * Obtiene todos los chats donde el usuario es participante
   * OPTIMIZADO: Usa JOIN y agrupa en una sola query
   */
  async getChatsByUserId(userId: string): Promise<ChatData[]> {
    // Query optimizada con JOIN 
    const result = await db
      .select({
        chatId: chats.id,
        createdAt: chats.createdAt,
        updatedAt: chats.updatedAt,
        participantUserId: chatParticipants.userId,
      })
      .from(chats)
      .innerJoin(chatParticipants, eq(chats.id, chatParticipants.chatId))
      .where(
        inArray(
          chats.id,
          db
            .select({ chatId: chatParticipants.chatId })
            .from(chatParticipants)
            .where(eq(chatParticipants.userId, userId))
        )
      )
      .orderBy(desc(chats.updatedAt));

    // Agrupar participantes por chat
    const chatsMap = new Map<string, ChatData>();
    
    for (const row of result) {
      if (!chatsMap.has(row.chatId)) {
        chatsMap.set(row.chatId, {
          id: row.chatId,
          createdAt: row.createdAt,
          updatedAt: row.updatedAt,
          participants: [],
        });
      }
      
      const chat = chatsMap.get(row.chatId)!;
      if (!chat.participants.includes(row.participantUserId)) {
        chat.participants.push(row.participantUserId);
      }
    }

    return Array.from(chatsMap.values());
  }

  /**
   * Crea un nuevo chat con participantes
   */
  async createChat(participantIds: string[]): Promise<ChatData> {
    const chatId = `chat_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
    const now = Date.now();

    await db.insert(chats).values({
      id: chatId,
      createdAt: now,
      updatedAt: now,
    });

    for (const userId of participantIds) {
      await db.insert(chatParticipants).values({
        id: `cp_${chatId}_${userId}`,
        chatId: chatId,
        userId: userId,
      });
    }

    return {
      id: chatId,
      createdAt: now,
      updatedAt: now,
      participants: participantIds,
    };
  }

  /**
   * Obtiene mensajes paginados de un chat (con cursor-based pagination)
   */
  async getMessages(
    chatId: string, 
    limit: number = 50, 
    beforeTimestamp?: number
  ): Promise<MessageData[]> {
    let query = db
      .select()
      .from(messages)
      .where(
        and(
          eq(messages.chatId, chatId),
          isNull(messages.deletedAt),
          beforeTimestamp ? lt(messages.timestamp, beforeTimestamp) : undefined
        )
      )
      .orderBy(desc(messages.timestamp))
      .limit(limit);

    const messageRows = await query;
    
    // Invertir para tener orden cronológico ascendente
    return messageRows.reverse().map(msg => ({
      id: msg.id,
      chatId: msg.chatId,
      senderId: msg.senderId,
      text: msg.text,
      timestamp: msg.timestamp,
      status: msg.status,
      mediaUrl: msg.mediaUrl,
      mediaType: msg.mediaType,
      thumbnailUrl: msg.thumbnailUrl,
      editedAt: msg.editedAt,
      deletedAt: msg.deletedAt,
    }));
  }

  /**
   * Obtiene el último mensaje de un chat
   */
  async getLastMessage(chatId: string): Promise<MessageData | null> {
    const messageRows = await db
      .select()
      .from(messages)
      .where(
        and(
          eq(messages.chatId, chatId),
          isNull(messages.deletedAt)
        )
      )
      .orderBy(desc(messages.timestamp))
      .limit(1);

    if (messageRows.length === 0) return null;

    const msg = messageRows[0];
    return {
      id: msg.id,
      chatId: msg.chatId,
      senderId: msg.senderId,
      text: msg.text,
      timestamp: msg.timestamp,
      status: msg.status,
      mediaUrl: msg.mediaUrl,
      mediaType: msg.mediaType,
      thumbnailUrl: msg.thumbnailUrl,
      editedAt: msg.editedAt,
      deletedAt: msg.deletedAt,
    };
  }

  /**
   * Obtiene últimos mensajes de múltiples chats en una sola query
   */
  async getLastMessagesForChats(chatIds: string[]): Promise<Map<string, MessageData>> {
    if (chatIds.length === 0) return new Map();

    // Subquery para obtener el timestamp más reciente por chat
    const latestTimestamps = db
      .select({
        chatId: messages.chatId,
        maxTimestamp: sql<number>`MAX(${messages.timestamp})`.as('maxTimestamp'),
      })
      .from(messages)
      .where(
        and(
          inArray(messages.chatId, chatIds),
          isNull(messages.deletedAt)
        )
      )
      .groupBy(messages.chatId)
      .as('latest');

    // JOIN para obtener los mensajes completos
    const result = await db
      .select({
        id: messages.id,
        chatId: messages.chatId,
        senderId: messages.senderId,
        text: messages.text,
        timestamp: messages.timestamp,
        status: messages.status,
        mediaUrl: messages.mediaUrl,
        mediaType: messages.mediaType,
        thumbnailUrl: messages.thumbnailUrl,
        editedAt: messages.editedAt,
        deletedAt: messages.deletedAt,
      })
      .from(messages)
      .innerJoin(
        latestTimestamps,
        and(
          eq(messages.chatId, latestTimestamps.chatId),
          eq(messages.timestamp, latestTimestamps.maxTimestamp)
        )
      );

    const messagesMap = new Map<string, MessageData>();
    for (const msg of result) {
      messagesMap.set(msg.chatId, msg);
    }

    return messagesMap;
  }

  /**
   * Inserta un nuevo mensaje
   */
  async createMessage(data: {
    chatId: string;
    senderId: string;
    text: string;
    mediaUrl?: string;
    mediaType?: string;
    thumbnailUrl?: string;
  }): Promise<MessageData> {
    const messageId = `msg_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
    const timestamp = Date.now();

    await db.insert(messages).values({
      id: messageId,
      chatId: data.chatId,
      senderId: data.senderId,
      text: data.text,
      timestamp: timestamp,
      status: 'sent',
      mediaUrl: data.mediaUrl || null,
      mediaType: data.mediaType || null,
      thumbnailUrl: data.thumbnailUrl || null,
      editedAt: null,
      deletedAt: null,
    });

    // Actualizar timestamp del chat
    await db
      .update(chats)
      .set({ updatedAt: timestamp })
      .where(eq(chats.id, data.chatId));

    return {
      id: messageId,
      chatId: data.chatId,
      senderId: data.senderId,
      text: data.text,
      timestamp,
      status: 'sent',
      mediaUrl: data.mediaUrl || null,
      mediaType: data.mediaType || null,
      thumbnailUrl: data.thumbnailUrl || null,
      editedAt: null,
      deletedAt: null,
    };
  }

  /**
   * Edita un mensaje existente
   */
  async updateMessage(messageId: string, newText: string): Promise<boolean> {
    try {
      await db
        .update(messages)
        .set({ 
          text: newText,
          editedAt: Date.now(),
        })
        .where(eq(messages.id, messageId));
      return true;
    } catch (error) {
      console.error('Error updating message:', error);
      return false;
    }
  }

  /**
   * Busca mensajes por texto (búsqueda básica)
   */
  async searchMessages(chatId: string, searchQuery: string): Promise<MessageData[]> {
    const searchPattern = `%${searchQuery}%`;
    
    const messageRows = await db
      .select()
      .from(messages)
      .where(
        and(
          eq(messages.chatId, chatId),
          isNull(messages.deletedAt),
          sql`${messages.text} LIKE ${searchPattern}`
        )
      )
      .orderBy(desc(messages.timestamp))
      .limit(100);

    return messageRows.map(msg => ({
      id: msg.id,
      chatId: msg.chatId,
      senderId: msg.senderId,
      text: msg.text,
      timestamp: msg.timestamp,
      status: msg.status,
      mediaUrl: msg.mediaUrl,
      mediaType: msg.mediaType,
      thumbnailUrl: msg.thumbnailUrl,
      editedAt: msg.editedAt,
      deletedAt: msg.deletedAt,
    }));
  }

  /**
   * Búsqueda avanzada de mensajes con filtros
   */
  async searchMessagesAdvanced(
    chatId: string,
    options: {
      query?: string;
      senderId?: string;
      messageType?: 'text' | 'image' | 'all';
      dateFrom?: number; // timestamp
      dateTo?: number; // timestamp
      limit?: number;
    }
  ): Promise<MessageData[]> {
    const {
      query,
      senderId,
      messageType = 'all',
      dateFrom,
      dateTo,
      limit = 100,
    } = options;

    // Construir condiciones dinámicamente
    const conditions = [
      eq(messages.chatId, chatId),
      isNull(messages.deletedAt),
    ];

    // Filtro por texto
    if (query && query.trim().length > 0) {
      const searchPattern = `%${query.trim()}%`;
      conditions.push(sql`${messages.text} LIKE ${searchPattern}`);
    }

    // Filtro por remitente
    if (senderId) {
      conditions.push(eq(messages.senderId, senderId));
    }

    // Filtro por tipo de mensaje
    if (messageType === 'text') {
      conditions.push(isNull(messages.mediaUrl));
    } else if (messageType === 'image') {
      conditions.push(
        and(
          sql`${messages.mediaUrl} IS NOT NULL`,
          eq(messages.mediaType, 'image')
        ) as any
      );
    }

    // Filtro por rango de fechas
    if (dateFrom) {
      conditions.push(sql`${messages.timestamp} >= ${dateFrom}`);
    }
    if (dateTo) {
      conditions.push(sql`${messages.timestamp} <= ${dateTo}`);
    }

    // Ejecutar query
    const messageRows = await db
      .select()
      .from(messages)
      .where(and(...conditions))
      .orderBy(desc(messages.timestamp))
      .limit(limit);

    console.log(
      `[ChatRepository] Advanced search found ${messageRows.length} messages`,
      { query, senderId, messageType, dateFrom, dateTo }
    );

    return messageRows.map(msg => ({
      id: msg.id,
      chatId: msg.chatId,
      senderId: msg.senderId,
      text: msg.text,
      timestamp: msg.timestamp,
      status: msg.status,
      mediaUrl: msg.mediaUrl,
      mediaType: msg.mediaType,
      thumbnailUrl: msg.thumbnailUrl,
      editedAt: msg.editedAt,
      deletedAt: msg.deletedAt,
    }));
  }

  /**
   * Búsqueda global en todos los chats del usuario
   */
  async searchMessagesGlobal(
    userId: string,
    query: string,
    limit: number = 50
  ): Promise<Array<MessageData & { chatName?: string }>> {
    if (!query || query.trim().length < 2) {
      return [];
    }

    const searchPattern = `%${query.trim()}%`;

    // Obtener chats del usuario
    const userChats = await db
      .select({ chatId: chatParticipants.chatId })
      .from(chatParticipants)
      .where(eq(chatParticipants.userId, userId));

    const chatIds = userChats.map(c => c.chatId);

    if (chatIds.length === 0) {
      return [];
    }

    // Buscar en todos los chats
    const messageRows = await db
      .select()
      .from(messages)
      .where(
        and(
          inArray(messages.chatId, chatIds),
          isNull(messages.deletedAt),
          sql`${messages.text} LIKE ${searchPattern}`
        )
      )
      .orderBy(desc(messages.timestamp))
      .limit(limit);


    return messageRows.map(msg => ({
      id: msg.id,
      chatId: msg.chatId,
      senderId: msg.senderId,
      text: msg.text,
      timestamp: msg.timestamp,
      status: msg.status,
      mediaUrl: msg.mediaUrl,
      mediaType: msg.mediaType,
      thumbnailUrl: msg.thumbnailUrl,
      editedAt: msg.editedAt,
      deletedAt: msg.deletedAt,
    }));
  }

  /**
   * Obtiene recibos de lectura para un mensaje
   */
  async getReadReceipts(messageId: string): Promise<{ userId: string; readAt: number }[]> {
    const receipts = await db
      .select()
      .from(messageReadReceipts)
      .where(eq(messageReadReceipts.messageId, messageId));

    return receipts.map(r => ({
      userId: r.userId,
      readAt: r.readAt,
    }));
  }

  /**
   * Marca mensajes como entregados (delivered)
   * Se llama cuando el receptor está en línea
   */
  async markMessagesAsDelivered(messageIds: string[]): Promise<void> {
    if (messageIds.length === 0) return;

    await db
      .update(messages)
      .set({ 
        status: 'delivered'
      })
      .where(
        and(
          inArray(messages.id, messageIds),
          eq(messages.status, 'sent')
        )
      );
    
  }

  /**
   * Marca mensajes como leídos (read)
   * Se llama cuando el usuario abre el chat
   */
  async markMessagesAsRead(chatId: string, userId: string): Promise<void> {
    // 1. Obtener mensajes del chat que aún no están leídos
    const unreadMessages = await db
      .select({ id: messages.id })
      .from(messages)
      .where(
        and(
          eq(messages.chatId, chatId),
          ne(messages.senderId, userId), // No marcar propios mensajes
          or(
            eq(messages.status, 'sent'),
            eq(messages.status, 'delivered')
          )
        )
      );

    if (unreadMessages.length === 0) {
      console.log('No hay mensajes para marcar como leídos');
      return;
    }

    const messageIds = unreadMessages.map(m => m.id);
    const now = Date.now();

    // 2. Actualizar status a 'read'
    await db
      .update(messages)
      .set({ status: 'read' })
      .where(inArray(messages.id, messageIds));

    // 3. Crear recibos de lectura
    const readReceipts = messageIds.map(messageId => ({
      id: `receipt_${messageId}_${userId}_${now}`,
      messageId,
      userId,
      readAt: now,
    }));

    await db.insert(messageReadReceipts).values(readReceipts);

    console.log(`✅ ${messageIds.length} mensaje(s) marcado(s) como leídos por ${userId}`);
  }

  /**
   * Obtiene conteo de mensajes no leídos por chat para un usuario
   */
  async getUnreadCount(chatId: string, userId: string): Promise<number> {
    const result = await db
      .select({ count: sql<number>`COUNT(*)` })
      .from(messages)
      .where(
        and(
          eq(messages.chatId, chatId),
          ne(messages.senderId, userId), // No contar propios mensajes
          or(
            eq(messages.status, 'sent'),
            eq(messages.status, 'delivered')
          ),
          isNull(messages.deletedAt)
        )
      );

    return result[0]?.count || 0;
  }

  /**
   * Obtiene conteo de no leídos para múltiples chats
   * Optimizado para evitar N+1 queries
   */
  async getUnreadCountsForChats(chatIds: string[], userId: string): Promise<Map<string, number>> {
    if (chatIds.length === 0) return new Map();

    const result = await db
      .select({
        chatId: messages.chatId,
        count: sql<number>`COUNT(*)`.as('count'),
      })
      .from(messages)
      .where(
        and(
          inArray(messages.chatId, chatIds),
          ne(messages.senderId, userId),
          or(
            eq(messages.status, 'sent'),
            eq(messages.status, 'delivered')
          ),
          isNull(messages.deletedAt)
        )
      )
      .groupBy(messages.chatId);

    const countsMap = new Map<string, number>();
    for (const row of result) {
      countsMap.set(row.chatId, row.count);
    }

    return countsMap;
  }

  /**
   * Edita el texto de un mensaje
   * Guarda el texto original y marca la fecha de edición
   */
  async editMessage(messageId: string, newText: string, userId: string): Promise<MessageData | null> {
    // 1. Verificar que el mensaje existe y pertenece al usuario
    const existingMessage = await db
      .select()
      .from(messages)
      .where(
        and(
          eq(messages.id, messageId),
          eq(messages.senderId, userId),
          isNull(messages.deletedAt) // No editar mensajes eliminados
        )
      )
      .limit(1);

    if (existingMessage.length === 0) {
      console.warn(`[ChatRepository] Message ${messageId} not found or not owned by ${userId}`);
      return null;
    }

    const message = existingMessage[0];
    const now = Date.now();

    // 2. Guardar texto original si es la primera edición
    const originalText = message.originalText || message.text;

    // 3. Actualizar mensaje
    await db
      .update(messages)
      .set({
        text: newText,
        editedAt: now,
        originalText: originalText,
      })
      .where(eq(messages.id, messageId));

    console.log(`[ChatRepository] Message ${messageId} edited successfully`);

    // 4. Retornar mensaje actualizado
    const updated = await db
      .select()
      .from(messages)
      .where(eq(messages.id, messageId))
      .limit(1);

    return updated[0] as MessageData;
  }

  /**
   * Elimina un mensaje (soft delete)
   * Marca el mensaje como eliminado pero conserva el registro
   */
  async deleteMessage(messageId: string, userId: string): Promise<boolean> {
    // 1. Verificar que el mensaje existe y pertenece al usuario
    const existingMessage = await db
      .select({ id: messages.id })
      .from(messages)
      .where(
        and(
          eq(messages.id, messageId),
          eq(messages.senderId, userId),
          isNull(messages.deletedAt) // No eliminar si ya está eliminado
        )
      )
      .limit(1);

    if (existingMessage.length === 0) {
      console.warn(`[ChatRepository] Message ${messageId} not found or not owned by ${userId}`);
      return false;
    }

    // 2. Soft delete: marcar como eliminado
    const now = Date.now();
    await db
      .update(messages)
      .set({
        deletedAt: now,
        deletedBy: userId,
        text: 'Mensaje eliminado', // Texto placeholder
      })
      .where(eq(messages.id, messageId));

    console.log(`[ChatRepository] Message ${messageId} deleted by ${userId}`);
    return true;
  }

  /**
   * Obtiene el historial de un mensaje (original + ediciones)
   */
  async getMessageHistory(messageId: string): Promise<{
    current: string;
    original: string | null;
    editedAt: number | null;
  } | null> {
    const result = await db
      .select({
        text: messages.text,
        originalText: messages.originalText,
        editedAt: messages.editedAt,
      })
      .from(messages)
      .where(eq(messages.id, messageId))
      .limit(1);

    if (result.length === 0) return null;

    return {
      current: result[0].text,
      original: result[0].originalText,
      editedAt: result[0].editedAt,
    };
  }

  /**
   * Obtiene un mensaje por ID (incluye eliminados)
   */
  async getMessageById(messageId: string): Promise<MessageData | null> {
    const result = await db
      .select()
      .from(messages)
      .where(eq(messages.id, messageId))
      .limit(1);

    return result.length > 0 ? (result[0] as MessageData) : null;
  }
}

// Singleton instance
export const chatRepository = new ChatRepository();
