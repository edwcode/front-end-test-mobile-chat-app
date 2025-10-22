import { db } from '../database/db';
import { users, chats, chatParticipants, messages, messageReadReceipts } from '../database/schema';
import { seedDatabase } from '../database/seed';

async function resetDatabase() {
  try {
    console.log('Limpiando base de datos...');
    
    // Eliminar en orden correcto (respetando foreign keys)
    await db.delete(messageReadReceipts);
    console.log('Eliminados read receipts');
    
    await db.delete(messages);
    console.log('Eliminados mensajes');
    
    await db.delete(chatParticipants);
    console.log('Eliminados participantes');
    
    await db.delete(chats);
    console.log('Eliminados chats');
    
    await db.delete(users);
    console.log('Eliminados usuarios');
    
    console.log('Regenerando datos de prueba...');
    await seedDatabase();
    
  } catch (error) {
    console.error('Error reseteando base de datos:', error);
    throw error;
  }
}

resetDatabase();
