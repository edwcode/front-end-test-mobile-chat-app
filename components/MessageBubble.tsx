import React, { useState } from 'react';
import { View, StyleSheet, Pressable, Alert, Modal } from 'react-native';
import { ThemedText } from './ThemedText';
import { LazyImage } from './LazyImage';
import { MessageEditModal } from './MessageEditModal';
import { Message } from '@/hooks/db/useChatsDb';
import { useColorScheme } from '@/hooks/useColorScheme';
import { useChatActions } from '@/contexts/AppProvider';

interface MessageBubbleProps {
  message: Message;
  isCurrentUser: boolean;
  currentUserId: string;
}

export function MessageBubble({ message, isCurrentUser, currentUserId }: MessageBubbleProps) {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';
  const { editMessage, deleteMessage } = useChatActions();
  
  const [showMenu, setShowMenu] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const formatTime = (timestamp: number) => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const handleLongPress = () => {
    if (isCurrentUser && !message.deletedAt) {
      setShowMenu(true);
    }
  };

  const handleEditPress = () => {
    setShowMenu(false);
    setShowEditModal(true);
  };

  const handleEditSave = async (newText: string) => {
    setIsLoading(true);
    try {
      const success = await editMessage(message.id, newText, currentUserId);
      if (success) {
        setShowEditModal(false);
      } else {
        Alert.alert('Error', 'No se pudo editar el mensaje');
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleEditCancel = () => {
    setShowEditModal(false);
  };

  const handleDelete = () => {
    setShowMenu(false);
    Alert.alert(
      'Eliminar mensaje',
      '¿Estás seguro de que quieres eliminar este mensaje?',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Eliminar',
          style: 'destructive',
          onPress: async () => {
            setIsLoading(true);
            try {
              const success = await deleteMessage(message.id, currentUserId);
              if (!success) {
                Alert.alert('Error', 'No se pudo eliminar el mensaje');
              }
            } finally {
              setIsLoading(false);
            }
          },
        },
      ]
    );
  };

  /**
   * Renderiza indicador de estado del mensaje
   * - Enviado: ✓ (gris)
   * - Entregado: ✓✓ (gris)
   * - Leído: ✓✓ (azul)
   */
  const getStatusIcon = () => {
    if (!isCurrentUser) return null;
    
    switch (message.status) {
      case 'sent':
        return (
          <ThemedText style={[styles.statusText, { color: '#999' }]}>
            ✓
          </ThemedText>
        );
      case 'delivered':
        return (
          <ThemedText style={[styles.statusText, { color: '#999' }]}>
            ✓✓
          </ThemedText>
        );
      case 'read':
        return (
          <ThemedText style={[styles.statusText, { color: '#34B7F1' }]}>
            ✓✓
          </ThemedText>
        );
      default:
        return null;
    }
  };

  return (
    <>
      <Pressable
        onLongPress={handleLongPress}
        delayLongPress={500}
        style={[
          styles.container,
          isCurrentUser ? styles.selfContainer : styles.otherContainer
        ]}
      >
        <View style={[
          styles.bubble,
          isCurrentUser 
            ? [styles.selfBubble, { backgroundColor: isDark ? '#235A4A' : '#DCF8C6' }]
            : [styles.otherBubble, { backgroundColor: isDark ? '#2A2C33' : '#FFFFFF' }]
        ]}>
          {message.mediaUrl && (
            <LazyImage
              uri={message.mediaUrl}
              thumbnailUri={message.thumbnailUrl ?? undefined}
              width={200}
              height={200}
              resizeMode="cover"
              style={{ borderRadius: 12 }}
            />
          )}
          
          {/* Mostrar contenido o indicador de eliminado */}
          {message.deletedAt ? (
            <ThemedText style={[styles.messageText, styles.deletedText]}>
              🗑️ Mensaje eliminado
            </ThemedText>
          ) : (
            <>
              {message.text && (
                <ThemedText style={[
                  styles.messageText,
                  isCurrentUser && !isDark && styles.selfMessageText
                ]}>
                  {message.text}
                </ThemedText>
              )}
              
              {message.editedAt && (
                <ThemedText style={styles.editedText}> (editado)</ThemedText>
              )}
            </>
          )}
          
          <View style={styles.timeContainer}>
            <ThemedText style={styles.timeText}>
              {formatTime(message.timestamp)}
            </ThemedText>
            {getStatusIcon()}
          </View>
        </View>
      </Pressable>

      {/* Menú contextual */}
      <Modal
        visible={showMenu}
        transparent
        animationType="fade"
        onRequestClose={() => setShowMenu(false)}
      >
        <Pressable 
          style={styles.modalOverlay}
          onPress={() => setShowMenu(false)}
        >
          <View style={styles.menuContainer}>
            <Pressable style={styles.menuItem} onPress={handleEditPress}>
              <ThemedText style={styles.menuText}>✏️ Editar</ThemedText>
            </Pressable>
            <Pressable style={styles.menuItem} onPress={handleDelete}>
              <ThemedText style={[styles.menuText, styles.deleteText]}>🗑️ Eliminar</ThemedText>
            </Pressable>
            <Pressable style={styles.menuItem} onPress={() => setShowMenu(false)}>
              <ThemedText style={styles.menuText}>❌ Cancelar</ThemedText>
            </Pressable>
          </View>
        </Pressable>
      </Modal>

      {/* Modal de edición */}
      <MessageEditModal
        visible={showEditModal}
        initialText={message.text}
        onSave={handleEditSave}
        onCancel={handleEditCancel}
        isLoading={isLoading}
      />
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    marginVertical: 4,
    maxWidth: '80%',
  },
  selfContainer: {
    alignSelf: 'flex-end',
  },
  otherContainer: {
    alignSelf: 'flex-start',
  },
  bubble: {
    borderRadius: 16,
    paddingHorizontal: 12,
    paddingVertical: 8,
    elevation: 1,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 1,
  },
  selfBubble: {
    borderBottomRightRadius: 4,
  },
  otherBubble: {
    borderBottomLeftRadius: 4,
  },
  messageText: {
    fontSize: 16,
  },
  selfMessageText: {
    color: '#000000',
  },
  editedText: {
    fontSize: 11,
    opacity: 0.6,
    fontStyle: 'italic',
  },
  timeContainer: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'center',
    marginTop: 2,
    gap: 4,
  },
  timeText: {
    fontSize: 11,
    opacity: 0.7,
  },
  statusText: {
    fontSize: 11,
    opacity: 0.7,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  menuContainer: {
    backgroundColor: 'white',
    borderRadius: 12,
    minWidth: 200,
    overflow: 'hidden',
    elevation: 5,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
  },
  menuItem: {
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E1E1E1',
  },
  menuText: {
    fontSize: 16,
    textAlign: 'center',
  },
  deleteText: {
    color: '#FF3B30',
  },
  deletedText: {
    fontStyle: 'italic',
    opacity: 0.6,
  },
}); 