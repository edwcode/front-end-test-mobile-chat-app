import React from 'react';
import {
  View,
  FlatList,
  StyleSheet,
  TouchableOpacity,
  Text,
} from 'react-native';
import { ThemedText } from './ThemedText';
import { ThemedView } from './ThemedView';
import { LazyImage } from './LazyImage';
import { Message } from '@/services/ChatService';
import { useColorScheme } from '@/hooks/useColorScheme';

interface MessageSearchResultsProps {
  results: Message[];
  searchQuery: string;
  onMessagePress?: (message: Message) => void;
  isLoading?: boolean;
  emptyMessage?: string;
}

/**
 * Componente de resultados de búsqueda
 * 
 * Características:
 * - Highlight de términos de búsqueda
 * - Vista compacta con preview
 * - Timestamp y tipo de mensaje
 * - Tap para navegar al mensaje
 */
export const MessageSearchResults: React.FC<MessageSearchResultsProps> = ({
  results,
  searchQuery,
  onMessagePress,
  isLoading = false,
  emptyMessage = 'No se encontraron mensajes',
}) => {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';

  const formatTime = (timestamp: number) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));

    if (days === 0) {
      return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } else if (days === 1) {
      return 'Ayer';
    } else if (days < 7) {
      return `Hace ${days} días`;
    } else {
      return date.toLocaleDateString();
    }
  };

  /**
   * Resalta el término de búsqueda en el texto
   */
  const highlightText = (text: string, query: string): React.ReactNode => {
    if (!query || query.trim().length === 0) {
      return <Text>{text}</Text>;
    }

    const parts = text.split(new RegExp(`(${query})`, 'gi'));
    
    return (
      <Text>
        {parts.map((part, index) =>
          part.toLowerCase() === query.toLowerCase() ? (
            <Text
              key={index}
              style={[
                styles.highlight,
                { backgroundColor: isDark ? '#FFD70050' : '#FFFF00' },
              ]}
            >
              {part}
            </Text>
          ) : (
            <Text key={index}>{part}</Text>
          )
        )}
      </Text>
    );
  };

  /**
   * Renderiza un resultado individual
   */
  const renderResult = ({ item: message }: { item: Message }) => {
    const isImage = message.mediaType === 'image';
    const preview = message.text.length > 80
      ? message.text.substring(0, 80) + '...'
      : message.text;

    return (
      <TouchableOpacity
        style={[
          styles.resultItem,
          {
            backgroundColor: isDark ? '#2C2C2C' : '#FFFFFF',
            borderColor: isDark ? '#3C3C3C' : '#E0E0E0',
          },
        ]}
        onPress={() => onMessagePress?.(message)}
        activeOpacity={0.7}
      >
        <View style={styles.resultContent}>
          {/* Miniatura de imagen si aplica */}
          {isImage && message.thumbnailUrl && (
            <LazyImage
              uri={message.thumbnailUrl}
              width={50}
              height={50}
              resizeMode="cover"
              style={styles.thumbnail}
            />
          )}

          {/* Contenido del mensaje */}
          <View style={styles.textContainer}>
            {/* Tipo de mensaje y timestamp */}
            <View style={styles.metadata}>
              <ThemedText style={styles.messageType}>
                {isImage ? '📷 Imagen' : '💬 Texto'}
              </ThemedText>
              <ThemedText style={styles.timestamp}>
                {formatTime(message.timestamp)}
              </ThemedText>
            </View>

            {/* Preview del mensaje con highlight */}
            <ThemedText style={styles.preview} numberOfLines={2}>
              {highlightText(preview, searchQuery)}
            </ThemedText>

            {/* Indicador de editado */}
            {message.editedAt && (
              <ThemedText style={styles.edited}>(editado)</ThemedText>
            )}
          </View>

          {/* Indicador de navegación */}
          <ThemedText style={styles.arrow}>›</ThemedText>
        </View>
      </TouchableOpacity>
    );
  };

  // Estado vacío
  if (!isLoading && results.length === 0 && searchQuery.length > 0) {
    return (
      <ThemedView style={styles.emptyContainer}>
        <ThemedText style={styles.emptyIcon}>🔍</ThemedText>
        <ThemedText style={styles.emptyText}>{emptyMessage}</ThemedText>
        <ThemedText style={styles.emptyHint}>
          Intenta con otras palabras clave
        </ThemedText>
      </ThemedView>
    );
  }

  // Estado inicial
  if (!isLoading && searchQuery.length < 2) {
    return (
      <ThemedView style={styles.emptyContainer}>
        <ThemedText style={styles.emptyIcon}>💬</ThemedText>
        <ThemedText style={styles.emptyText}>
          Escribe para buscar mensajes
        </ThemedText>
        <ThemedText style={styles.emptyHint}>
          Mínimo 2 caracteres
        </ThemedText>
      </ThemedView>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header con contador */}
      {results.length > 0 && (
        <View style={styles.header}>
          <ThemedText style={styles.resultCount}>
            {results.length} {results.length === 1 ? 'resultado' : 'resultados'}
          </ThemedText>
        </View>
      )}

      {/* Lista de resultados */}
      <FlatList
        data={results}
        renderItem={renderResult}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContainer}
        ItemSeparatorComponent={() => <View style={styles.separator} />}
        showsVerticalScrollIndicator={true}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
  },
  resultCount: {
    fontSize: 14,
    fontWeight: '600',
    opacity: 0.7,
  },
  listContainer: {
    padding: 8,
  },
  resultItem: {
    borderRadius: 12,
    borderWidth: 1,
    padding: 12,
    marginVertical: 4,
  },
  resultContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  thumbnail: {
    borderRadius: 8,
    marginRight: 12,
  },
  textContainer: {
    flex: 1,
  },
  metadata: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  messageType: {
    fontSize: 12,
    fontWeight: '600',
    opacity: 0.7,
  },
  timestamp: {
    fontSize: 11,
    opacity: 0.6,
  },
  preview: {
    fontSize: 14,
    lineHeight: 20,
  },
  highlight: {
    fontWeight: '700',
    borderRadius: 2,
    paddingHorizontal: 2,
  },
  edited: {
    fontSize: 11,
    opacity: 0.6,
    fontStyle: 'italic',
    marginTop: 2,
  },
  arrow: {
    fontSize: 24,
    opacity: 0.3,
    marginLeft: 8,
  },
  separator: {
    height: 8,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  emptyIcon: {
    fontSize: 48,
    marginBottom: 16,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 8,
    textAlign: 'center',
  },
  emptyHint: {
    fontSize: 14,
    opacity: 0.6,
    textAlign: 'center',
  },
});
