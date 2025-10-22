import React, { useState } from 'react';
import {
  View,
  Modal,
  StyleSheet,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  SafeAreaView,
} from 'react-native';
import { ThemedText } from './ThemedText';
import { ThemedView } from './ThemedView';
import { MessageSearchBar } from './MessageSearchBar';
import { MessageSearchResults } from './MessageSearchResults';
import { useMessageSearch, SearchFilters } from '@/hooks/useMessageSearch';
import { Message } from '@/services/ChatService';
import { useColorScheme } from '@/hooks/useColorScheme';

interface MessageSearchModalProps {
  visible: boolean;
  chatId?: string;
  onClose: () => void;
  onMessagePress?: (message: Message) => void;
  title?: string;
}

/**
 * Modal de búsqueda de mensajes
 * 
 * Integra SearchBar y SearchResults en un modal completo
 * con navegación y gestión de estado
 */
export const MessageSearchModal: React.FC<MessageSearchModalProps> = ({
  visible,
  chatId,
  onClose,
  onMessagePress,
  title = 'Buscar mensajes',
}) => {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';

  const {
    results,
    isSearching,
    error,
    search,
    clearResults,
    hasResults,
  } = useMessageSearch(chatId);

  const [searchQuery, setSearchQuery] = useState('');

  const handleSearch = (query: string, filters?: SearchFilters) => {
    setSearchQuery(query);
    if (query.trim().length >= 2) {
      search(query, filters);
    } else {
      clearResults();
    }
  };

  const handleClear = () => {
    setSearchQuery('');
    clearResults();
  };

  const handleMessagePress = (message: Message) => {
    onMessagePress?.(message);
    onClose();
  };

  const handleClose = () => {
    handleClear();
    onClose();
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={handleClose}
    >
      <SafeAreaView
        style={[
          styles.container,
          { backgroundColor: isDark ? '#1E1E1E' : '#F5F5F5' },
        ]}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={styles.content}
          keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 0}
        >
          {/* Header */}
          <View
            style={[
              styles.header,
              {
                backgroundColor: isDark ? '#2C2C2C' : '#FFFFFF',
                borderBottomColor: isDark ? '#3C3C3C' : '#E0E0E0',
              },
            ]}
          >
            <ThemedText style={styles.title}>{title}</ThemedText>
            <TouchableOpacity onPress={handleClose} style={styles.closeButton}>
              <ThemedText style={styles.closeIcon}>✕</ThemedText>
            </TouchableOpacity>
          </View>

          {/* Barra de búsqueda */}
          <View style={styles.searchContainer}>
            <MessageSearchBar
              onSearch={handleSearch}
              onClear={handleClear}
              isSearching={isSearching}
              showFilters={true}
            />
          </View>

          {/* Error message */}
          {error && (
            <View style={styles.errorContainer}>
              <ThemedText style={styles.errorText}>⚠️ {error}</ThemedText>
            </View>
          )}

          {/* Resultados */}
          <View style={styles.resultsContainer}>
            <MessageSearchResults
              results={results}
              searchQuery={searchQuery}
              onMessagePress={handleMessagePress}
              isLoading={isSearching}
            />
          </View>

          {/* Footer con info */}
          {hasResults && !isSearching && (
            <View
              style={[
                styles.footer,
                {
                  backgroundColor: isDark ? '#2C2C2C' : '#FFFFFF',
                  borderTopColor: isDark ? '#3C3C3C' : '#E0E0E0',
                },
              ]}
            >
              <ThemedText style={styles.footerText}>
                Toca un mensaje para ir a la conversación
              </ThemedText>
            </View>
          )}
        </KeyboardAvoidingView>
      </SafeAreaView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderBottomWidth: 1,
  },
  title: {
    fontSize: 20,
    fontWeight: '600',
  },
  closeButton: {
    padding: 8,
  },
  closeIcon: {
    fontSize: 24,
    opacity: 0.6,
  },
  searchContainer: {
    paddingHorizontal: 16,
    paddingTop: 16,
  },
  errorContainer: {
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  errorText: {
    color: '#FF3B30',
    fontSize: 14,
  },
  resultsContainer: {
    flex: 1,
    paddingHorizontal: 8,
  },
  footer: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderTopWidth: 1,
  },
  footerText: {
    fontSize: 12,
    opacity: 0.6,
    textAlign: 'center',
  },
});
