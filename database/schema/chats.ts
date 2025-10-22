import { sqliteTable, text, integer, index } from "drizzle-orm/sqlite-core";

export const chats = sqliteTable("chats", {
  id: text("id").primaryKey(),
  createdAt: integer("created_at").notNull().default(0),
  updatedAt: integer("updated_at").notNull().default(0),
});

export const chatParticipants = sqliteTable("chat_participants", {
  id: text("id").primaryKey(),
  chatId: text("chat_id").notNull().references(() => chats.id),
  userId: text("user_id").notNull(),
});

export const messages = sqliteTable("messages", {
  id: text("id").primaryKey(),
  chatId: text("chat_id").notNull().references(() => chats.id),
  senderId: text("sender_id").notNull(),
  text: text("text").notNull(),
  timestamp: integer("timestamp").notNull(),
  // Nuevos campos para features avanzadas
  status: text("status").notNull().default('sent'), // 'sent' | 'delivered' | 'read'
  mediaUrl: text("media_url"),
  mediaType: text("media_type"), // 'image' | 'video' | null
  thumbnailUrl: text("thumbnail_url"),
  editedAt: integer("edited_at"),
  originalText: text("original_text"), // Texto original antes de editar
  deletedAt: integer("deleted_at"),
  deletedBy: text("deleted_by"), // userId que eliminó el mensaje
}, (table) => ({
  chatIdIdx: index("messages_chat_id_idx").on(table.chatId),
  timestampIdx: index("messages_timestamp_idx").on(table.timestamp),
  chatTimestampIdx: index("messages_chat_timestamp_idx").on(table.chatId, table.timestamp),
}));

export const messageReadReceipts = sqliteTable("message_read_receipts", {
  id: text("id").primaryKey(),
  messageId: text("message_id").notNull().references(() => messages.id),
  userId: text("user_id").notNull(),
  readAt: integer("read_at").notNull(),
}, (table) => ({
  messageIdIdx: index("read_receipts_message_id_idx").on(table.messageId),
})); 