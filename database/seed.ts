import { db } from './db';
import { users, chats, chatParticipants, messages } from './schema';

// Mock user data from the original useUser hook
const mockUsers = [
  {
    id: '1',
    name: 'John Doe',
    avatar: 'https://i.pravatar.cc/150?img=1',
    status: 'online' as const,
  },
  {
    id: '2',
    name: 'Jane Smith',
    avatar: 'https://i.pravatar.cc/150?img=2',
    status: 'offline' as const,
  },
  {
    id: '3',
    name: 'Mike Johnson',
    avatar: 'https://i.pravatar.cc/150?img=3',
    status: 'away' as const,
  },
  {
    id: '4',
    name: 'Sarah Williams',
    avatar: 'https://i.pravatar.cc/150?img=4',
    status: 'online' as const,
  },
];

// Initial chat data (similar to useChats)
const initialChats = [
  {
    id: 'chat1',
    createdAt: Date.now() - 7200000,
    updatedAt: Date.now() - 1800000,
    participants: ['1', '2'],
    messages: [
      {
        id: 'msg1',
        senderId: '2',
        text: 'Hey, how are you?',
        timestamp: Date.now() - 3600000,
        status: 'read',
      },
      {
        id: 'msg2',
        senderId: '1',
        text: 'I\'m good, thanks for asking!',
        timestamp: Date.now() - 1800000,
        status: 'read',
      },
    ],
  },
  {
    id: 'chat2',
    createdAt: Date.now() - 86400000,
    updatedAt: Date.now() - 86400000,
    participants: ['1', '3'],
    messages: [
      {
        id: 'msg3',
        senderId: '3',
        text: 'Did you check the project?',
        timestamp: Date.now() - 86400000,
        status: 'sent',
      },
    ],
  },
];

// Check if there's any data in the users table
async function isDataSeeded() {
  try {
    const result = await db.select().from(users);
    return result.length > 0;
  } catch (error) {
    console.error('Error checking if database is seeded:', error);
    return false;
  }
}

// Generar mensajes de prueba para testing de paginación
function generateTestMessages(chatId: string, participants: string[], count: number = 150) {
  const testMessages = [];
  const baseTimestamp = Date.now() - (count * 60000); // Empezar hace N minutos
  
  const sampleTexts = [
    "Hola, ¿cómo estás?",
    "Todo bien, ¿y tú?",
    "¿Viste el partido de ayer?",
    "Increíble, no me lo esperaba",
    "¿A qué hora nos vemos?",
    "Perfecto, te veo allá",
    "¿Necesitas ayuda con algo?",
    "Sí, podrías revisarlo?",
    "Claro, dame un momento",
    "Listo, ya está hecho",
    "Gracias! Te lo agradezco mucho",
    "De nada, para eso estamos",
    "¿Ya almorzaste?",
    "Todavía no, ¿tú?",
    "Vamos juntos entonces",
    "Dale, buena idea",
    "¿Qué opinas de esto?",
    "Me parece interesante",
    "Deberíamos probarlo",
    "Sí, hagámoslo",
    "📱 Llamando...",
    "Lo siento, no puedo ahora",
    "No hay problema, luego hablamos",
    "👍 Perfecto",
    "¿Recibiste mi mensaje anterior?",
    "Sí, lo vi recién",
    "Genial, entonces estamos de acuerdo",
    "Exacto, sin duda",
    "¿Cómo va el proyecto?",
    "Bastante bien, avanzando",
    "Excelente noticia",
    "Sí, estoy contento con el progreso",
    "¿Alguna novedad?",
    "Nada por ahora",
    "Ok, me avisas si hay algo",
    "Seguro, cuenta con ello",
    "🎉 Felicidades!",
    "Muchas gracias!",
    "Te lo mereces",
    "Eres muy amable",
  ];
  
  for (let i = 0; i < count; i++) {
    const senderId = participants[i % participants.length];
    const text = sampleTexts[i % sampleTexts.length];
    
    testMessages.push({
      id: `msg_test_${chatId}_${i}`,
      chatId,
      senderId,
      text: `[${i + 1}/${count}] ${text}`,
      timestamp: baseTimestamp + (i * 60000), // 1 minuto entre cada mensaje
      status: 'read' as const,
    });
  }
  
  return testMessages;
}

export async function seedDatabase() {
  try {
    // Check if database already has data
    const alreadySeeded = await isDataSeeded();
    if (alreadySeeded) {
      console.log('Database already seeded, skipping...');
      return;
    }
    
    console.log('Seeding database...');
    
    // Insert users
    console.log('Seeding users...');
    for (const user of mockUsers) {
      await db.insert(users).values(user).onConflictDoNothing();
    }
    
    // Insert chats and their relationships
    console.log('Seeding chats...');
    for (const chat of initialChats) {
      // Insert chat
      await db.insert(chats).values({ 
        id: chat.id,
        createdAt: chat.createdAt,
        updatedAt: chat.updatedAt,
      }).onConflictDoNothing();
      
      // Insert participants
      console.log(`Adding participants for chat ${chat.id}...`);
      for (const userId of chat.participants) {
        await db.insert(chatParticipants).values({
          id: `cp-${chat.id}-${userId}`,
          chatId: chat.id,
          userId,
        }).onConflictDoNothing();
      }
      
      // Generar mensajes de prueba para paginación (150 mensajes)
      console.log(`Generating test messages for chat ${chat.id}...`);
      const testMessages = generateTestMessages(chat.id, chat.participants, 150);
      
      // Insert messages
      console.log(`Adding ${testMessages.length} messages for chat ${chat.id}...`);
      for (const message of testMessages) {
        await db.insert(messages).values({
          id: message.id,
          chatId: message.chatId,
          senderId: message.senderId,
          text: message.text,
          timestamp: message.timestamp,
          status: message.status,
          mediaUrl: null,
          mediaType: null,
          thumbnailUrl: null,
          editedAt: null,
          deletedAt: null,
        }).onConflictDoNothing();
      }
    }
    
    console.log('Database seeded successfully');
  } catch (error) {
    console.error('Error seeding database:', error);
    throw error;
  }
} 