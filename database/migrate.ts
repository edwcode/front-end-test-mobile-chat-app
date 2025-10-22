import { db } from './db';
import { sql } from 'drizzle-orm';

/**
 * Ejecuta las migraciones necesarias para actualizar el schema de la base de datos
 */
export async function runMigrations() {
  try {
    console.log('🔄 Running database migrations...');
    
    // Agregar nuevas columnas a la tabla messages si no existen
    const columnsToAdd = [
      { name: 'status', type: 'TEXT NOT NULL DEFAULT \'sent\'' },
      { name: 'media_url', type: 'TEXT' },
      { name: 'media_type', type: 'TEXT' },
      { name: 'thumbnail_url', type: 'TEXT' },
      { name: 'edited_at', type: 'INTEGER' },
      { name: 'original_text', type: 'TEXT' },
      { name: 'deleted_at', type: 'INTEGER' },
      { name: 'deleted_by', type: 'TEXT' },
    ];
    
    for (const column of columnsToAdd) {
      try {
        await db.run(sql.raw(`ALTER TABLE messages ADD COLUMN ${column.name} ${column.type}`));
        console.log(`✅ Added column: ${column.name}`);
      } catch (error: any) {
        // Si la columna ya existe, ignorar el error
        if (error.message?.includes('duplicate column') || error.message?.includes('already exists')) {
          console.log(`⏭️  Column already exists: ${column.name}`);
        } else {
          console.error(`❌ Error adding column ${column.name}:`, error.message);
        }
      }
    }
    
    // Agregar columnas a la tabla chats si no existen
    try {
      await db.run(sql`ALTER TABLE chats ADD COLUMN created_at INTEGER NOT NULL DEFAULT 0`);
      console.log('✅ Added column: created_at to chats');
    } catch (error: any) {
      if (error.message?.includes('duplicate column') || error.message?.includes('already exists')) {
        console.log('⏭️  Column already exists: created_at');
      } else {
        console.error('❌ Error adding created_at to chats:', error.message);
      }
    }
    
    try {
      await db.run(sql`ALTER TABLE chats ADD COLUMN updated_at INTEGER NOT NULL DEFAULT 0`);
      console.log('✅ Added column: updated_at to chats');
    } catch (error: any) {
      if (error.message?.includes('duplicate column') || error.message?.includes('already exists')) {
        console.log('⏭️  Column already exists: updated_at');
      } else {
        console.error('❌ Error adding updated_at to chats:', error.message);
      }
    }
    
    // Crear tabla de read receipts si no existe
    try {
      await db.run(sql`
        CREATE TABLE IF NOT EXISTS message_read_receipts (
          id TEXT PRIMARY KEY,
          message_id TEXT NOT NULL,
          user_id TEXT NOT NULL,
          read_at INTEGER NOT NULL,
          FOREIGN KEY (message_id) REFERENCES messages(id)
        )
      `);
      console.log('✅ Created table: message_read_receipts');
    } catch (error: any) {
      console.log('⏭️  Table already exists: message_read_receipts');
    }
    
    // Crear índices si no existen
    try {
      await db.run(sql`CREATE INDEX IF NOT EXISTS messages_chat_id_idx ON messages(chat_id)`);
      await db.run(sql`CREATE INDEX IF NOT EXISTS messages_timestamp_idx ON messages(timestamp)`);
      await db.run(sql`CREATE INDEX IF NOT EXISTS messages_chat_timestamp_idx ON messages(chat_id, timestamp)`);
      await db.run(sql`CREATE INDEX IF NOT EXISTS read_receipts_message_id_idx ON message_read_receipts(message_id)`);
      console.log('✅ Created indexes');
    } catch (error: any) {
      console.error('❌ Error creating indexes:', error.message);
    }
    
    console.log('🎉 Migrations completed successfully!');
  } catch (error) {
    console.error('💥 Error running migrations:', error);
    throw error;
  }
}
