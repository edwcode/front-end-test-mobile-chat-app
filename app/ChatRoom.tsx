import React, { useState, useRef, useEffect, useCallback } from 'react';
import { 
  View, 
  StyleSheet, 
  TextInput, 
  Pressable, 
  KeyboardAvoidingView, 
  Platform,
  ActivityIndicator,
  Alert,
  Keyboard,
  Dimensions
} from 'react-native';
import { FlashList } from '@shopify/flash-list';
import { useLocalSearchParams, Stack, useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import * as ImagePicker from 'expo-image-picker';
import { useCurrentUser, useUsers } from '@/contexts/AppProvider';
import { useChat, useChatActions } from '@/contexts/AppProvider';
import { useDebounce } from '@/hooks/useDebounce';
import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { MessageBubble } from '@/components/MessageBubble';
import { Avatar } from '@/components/Avatar';
import { IconSymbol } from '@/components/ui/IconSymbol';
import { MessageSearchModal } from '@/components/MessageSearchModal';
import type { Message } from '@/hooks/useChats';


export default function ChatRoomScreen() {
  const { chatId } = useLocalSearchParams<{ chatId: string }>();
  
  const currentUser = useCurrentUser(); // Solo user, no chats
  const users = useUsers(); // Lista de usuarios para mostrar participantes
  const chat = useChat(chatId || ''); // Memoizado, solo este chat
  const { 
    sendMessage, 
    sendImageMessage, 
    loadOlderMessages, 
    markAsRead 
  } = useChatActions(); // Solo acciones, no state
  
  const [messageText, setMessageText] = useState('');
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [hasMoreMessages, setHasMoreMessages] = useState(true);
  const [showSearchModal, setShowSearchModal] = useState(false);
  const [keyboardHeight, setKeyboardHeight] = useState(0);
  const hasMarkedAsReadRef = useRef(false); // Flag para marcar solo una vez
  const flashListRef = useRef<FlashList<Message>>(null);
  const router = useRouter();

  // Setup de listeners del teclado (OK: setup/cleanup necesario)
  useEffect(() => {
    const keyboardWillShow = Keyboard.addListener(
      Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow',
      (e) => setKeyboardHeight(e.endCoordinates.height)
    );
    const keyboardWillHide = Keyboard.addListener(
      Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide',
      () => setKeyboardHeight(0)
    );

    return () => {
      keyboardWillShow.remove();
      keyboardWillHide.remove();
    };
  }, []);
  
  const chatParticipants = chat?.participants
    .filter((id: string) => id !== currentUser?.id)
    .map((id: string) => users.find(user => user.id === id))
    .filter(Boolean) || [];
  
  const chatName = chatParticipants.length === 1 
    ? chatParticipants[0]?.name 
    : `${chatParticipants[0]?.name || 'Unknown'} & ${chatParticipants.length - 1} other${chatParticipants.length > 1 ? 's' : ''}`;

  // Marcar como leído 
  if (chat && currentUser && !hasMarkedAsReadRef.current) {
    markAsRead(chat.id, currentUser.id);
    hasMarkedAsReadRef.current = true;
  }
  const handleSendMessage = useCallback(async () => {
    if (messageText.trim() && currentUser && chat) {
      await sendMessage(chat.id, messageText.trim(), currentUser.id);
      setMessageText('');
      
      // Scroll inmediato después de enviar
      flashListRef.current?.scrollToOffset({ offset: 0, animated: true });
    }
  }, [messageText, currentUser, chat, sendMessage]);

  const handleLoadMore = useCallback(async () => {
    // No cargar si ya está cargando, no hay chat, no hay función, o no hay más mensajes
    if (!chat || isLoadingMore || !loadOlderMessages || !hasMoreMessages) {
      console.log('Paginación bloqueada:', {
        hasChat: !!chat,
        isLoadingMore,
        hasLoadFunction: !!loadOlderMessages,
        hasMoreMessages
      });
      return;
    }
    
    // No cargar si hay menos de 50 mensajes (primera carga completa)
    if (chat.messages.length < 50) {
      console.log(' Chat completo, solo tiene', chat.messages.length, 'mensajes');
      setHasMoreMessages(false);
      return;
    }
    
    setIsLoadingMore(true);
    try {
      const loadedCount = await loadOlderMessages(chat.id);
      
      console.log('Cargados', loadedCount, 'mensajes nuevos');
      console.log('Total ahora:', chat.messages.length + loadedCount);
      
      // Si no se cargaron mensajes nuevos, no hay más disponibles
      if (loadedCount === 0) {
        console.log('Alcanzado inicio de la conversación');
        setHasMoreMessages(false);
      }
    } catch (error) {
      console.error('Error loading more messages:', error);
    } finally {
      setIsLoadingMore(false);
    }
  }, [chat, isLoadingMore, loadOlderMessages, hasMoreMessages]);

  const handlePickImage = useCallback(async () => {
    if (!currentUser || !chat || !sendImageMessage) return;

    // Solicitar permisos
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permiso denegado', 'Necesitamos acceso a tu galería para compartir imágenes');
      return;
    }

    // Seleccionar imagen
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [4, 3],
      quality: 1,
    });

    if (!result.canceled && result.assets[0]) {
      const imageUri = result.assets[0].uri;
      
      // Opcional: pedir caption
      Alert.prompt(
        'Agregar descripción',
        '(Opcional)',
        [
          { text: 'Cancelar', style: 'cancel' },
          {
            text: 'Enviar',
            onPress: async (caption) => {
              await sendImageMessage(chat.id, currentUser.id, imageUri, caption || '');
              // Scroll inmediato después de enviar
              flashListRef.current?.scrollToOffset({ offset: 0, animated: true });
            },
          },
        ],
        'plain-text'
      );
    }
  }, [currentUser, chat, sendImageMessage]);

  const renderMessage = useCallback(({ item }: { item: Message }) => (
    <MessageBubble
      message={item}
      isCurrentUser={item.senderId === currentUser?.id}
      currentUserId={currentUser?.id || ''}
    />
  ), [currentUser?.id]);

  const renderListHeader = useCallback(() => {
    if (isLoadingMore) {
      return (
        <ThemedView style={styles.loadingContainer}>
          <ActivityIndicator size="small" color="#007AFF" />
          <ThemedText style={styles.loadingText}>Cargando mensajes anteriores...</ThemedText>
        </ThemedView>
      );
    }
    
    // Mostrar "inicio de conversación" si hay mensajes pero no hay más que cargar
    if (chat && chat.messages.length >= 50 && !hasMoreMessages) {
      return (
        <ThemedView style={styles.loadingContainer}>
          <ThemedText style={styles.startText}>📍 Inicio de la conversación</ThemedText>
        </ThemedView>
      );
    }
    
    return null;
  }, [isLoadingMore, hasMoreMessages, chat]);

  const renderListEmpty = useCallback(() => (
    <ThemedView style={styles.emptyContainer}>
      <ThemedText>No hay mensajes aún. ¡Di hola!</ThemedText>
    </ThemedView>
  ), []);

  if (!chat || !currentUser) {
    return (
      <ThemedView style={styles.centerContainer}>
        <ThemedText>Chat no encontrado</ThemedText>
      </ThemedView>
    );
  }

  // Filtrar mensajes eliminados y ordenar por timestamp descendente (más nuevos primero en el array)
  // Con inverted={true}, FlashList muestra el primer elemento (más nuevo) ABAJO, junto al input
  const visibleMessages = chat.messages
    .filter((msg: Message) => !msg.isDeleted)
    .sort((a: Message, b: Message) => b.timestamp - a.timestamp);

  // Handler para cuando se selecciona un mensaje en la búsqueda
  const handleMessageSelected = useCallback((message: Message) => {
    // Encontrar el índice del mensaje seleccionado
    const messageIndex = visibleMessages.findIndex((m: Message) => m.id === message.id);
    
    if (messageIndex !== -1 && flashListRef.current) {
      // Scroll al mensaje seleccionado
      flashListRef.current.scrollToIndex({
        index: messageIndex,
        animated: true,
        viewPosition: 0.5, // Centrar el mensaje en la pantalla
      });
    }
  }, [visibleMessages]);

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 0}
      enabled
    >
      <StatusBar style="auto" />
      <Stack.Screen 
        options={{
          headerTitle: () => (
            <View style={styles.headerContainer}>
              <Avatar 
                user={chatParticipants[0]} 
                size={32} 
                showStatus={false}
              />
              <ThemedText type="defaultSemiBold" numberOfLines={1}>
                {chatName}
              </ThemedText>
            </View>
          ),
          headerLeft: () => (
            <Pressable onPress={() => router.back()}>
              <IconSymbol name="chevron.left" size={24} color="#007AFF" />
            </Pressable>
          ),
          headerRight: () => (
            <Pressable onPress={() => setShowSearchModal(true)}>
              <IconSymbol 
                name="magnifyingglass" 
                size={24} 
                color="#007AFF" 
              />
            </Pressable>
          ),
        }} 
      />

      <FlashList
        ref={flashListRef}
        data={visibleMessages}
        keyExtractor={(item) => item.id}
        renderItem={renderMessage}
        estimatedItemSize={80}
        contentContainerStyle={styles.messagesContainer}
        ListHeaderComponent={renderListHeader}
        ListEmptyComponent={renderListEmpty}
        inverted={true}
        onEndReached={handleLoadMore}
        onEndReachedThreshold={0.5}
        maintainVisibleContentPosition={{
          minIndexForVisible: 0,
          autoscrollToTopThreshold: 10,
        }}
      />

      <ThemedView style={styles.inputContainer}>
        <Pressable style={styles.attachButton} onPress={handlePickImage}>
          <IconSymbol name="photo" size={28} color="#007AFF" />
        </Pressable>
        <TextInput
          style={styles.input}
          value={messageText}
          onChangeText={setMessageText}
          placeholder="Escribe un mensaje..."
          multiline
          maxLength={1000}
        />
        <Pressable
          style={[styles.sendButton, !messageText.trim() && styles.disabledButton]}
          onPress={handleSendMessage}
          disabled={!messageText.trim()}
        >
          <IconSymbol name="arrow.up.circle.fill" size={32} color="#007AFF" />
        </Pressable>
      </ThemedView>

      {/* Modal de búsqueda de mensajes */}
      <MessageSearchModal
        visible={showSearchModal}
        chatId={chatId || ''}
        onClose={() => setShowSearchModal(false)}
        onMessagePress={handleMessageSelected}
      />
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  messagesContainer: {
    paddingHorizontal: 10,
    paddingVertical: 10,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
    minHeight: 200,
  },
  loadingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 10,
    gap: 8,
  },
  loadingText: {
    fontSize: 12,
    opacity: 0.7,
  },
  startText: {
    fontSize: 12,
    opacity: 0.5,
    fontStyle: 'italic',
  },
  inputContainer: {
    flexDirection: 'row',
    padding: 10,
    alignItems: 'flex-end',
    borderTopWidth: 1,
    borderTopColor: '#E1E1E1',
    bottom: Platform.OS === 'ios' ? 10 : 0,
  },
  attachButton: {
    marginRight: 8,
    marginBottom: 5,
  },
  input: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#E1E1E1',
    borderRadius: 20,
    padding: 10,
    maxHeight: 100,
    backgroundColor: '#F9F9F9',
  },
  sendButton: {
    marginLeft: 10,
    marginBottom: 5,
  },
  disabledButton: {
    opacity: 0.5,
  },
}); 