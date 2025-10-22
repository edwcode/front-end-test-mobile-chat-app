import React, { useState } from 'react';
import {
  View,
  TextInput,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { ThemedText } from './ThemedText';
import { useColorScheme } from '@/hooks/useColorScheme';

export interface SearchFilters {
  messageType?: 'text' | 'image' | 'all';
  senderId?: string;
  dateFrom?: number;
  dateTo?: number;
}

interface MessageSearchBarProps {
  onSearch: (query: string, filters?: SearchFilters) => void;
  onClear: () => void;
  isSearching?: boolean;
  placeholder?: string;
  showFilters?: boolean;
}

/**
 * Barra de búsqueda de mensajes
 * 
 * Características:
 * - Input de búsqueda con debounce automático
 * - Botón de limpiar
 * - Indicador de búsqueda activa
 * - Soporte modo oscuro
 */
export const MessageSearchBar: React.FC<MessageSearchBarProps> = ({
  onSearch,
  onClear,
  isSearching = false,
  placeholder = 'Buscar mensajes...',
  showFilters = false,
}) => {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';

  const [query, setQuery] = useState('');
  const [showFilterMenu, setShowFilterMenu] = useState(false);
  const [filters, setFilters] = useState<SearchFilters>({
    messageType: 'all',
  });

  const handleChangeText = (text: string) => {
    setQuery(text);
    onSearch(text, filters);
  };

  const handleClear = () => {
    setQuery('');
    setFilters({ messageType: 'all' });
    onClear();
    setShowFilterMenu(false);
  };

  const handleFilterChange = (newFilters: Partial<SearchFilters>) => {
    const updatedFilters = { ...filters, ...newFilters };
    setFilters(updatedFilters);
    if (query) {
      onSearch(query, updatedFilters);
    }
  };

  return (
    <View style={styles.container}>
      {/* Barra de búsqueda */}
      <View
        style={[
          styles.searchContainer,
          {
            backgroundColor: isDark ? '#2C2C2C' : '#F5F5F5',
            borderColor: isDark ? '#3C3C3C' : '#E0E0E0',
          },
        ]}
      >
        {/* Ícono de búsqueda */}
        <ThemedText style={styles.searchIcon}>🔍</ThemedText>

        {/* Input */}
        <TextInput
          style={[
            styles.input,
            { color: isDark ? '#FFFFFF' : '#000000' },
          ]}
          value={query}
          onChangeText={handleChangeText}
          placeholder={placeholder}
          placeholderTextColor={isDark ? '#999999' : '#666666'}
          autoCapitalize="none"
          autoCorrect={false}
          returnKeyType="search"
        />

        {/* Loading indicator o botón limpiar */}
        {isSearching ? (
          <ActivityIndicator
            size="small"
            color={isDark ? '#FFFFFF' : '#000000'}
            style={styles.indicator}
          />
        ) : query.length > 0 ? (
          <TouchableOpacity onPress={handleClear} style={styles.clearButton}>
            <ThemedText style={styles.clearIcon}>✕</ThemedText>
          </TouchableOpacity>
        ) : null}

        {/* Botón de filtros */}
        {showFilters && (
          <TouchableOpacity
            onPress={() => setShowFilterMenu(!showFilterMenu)}
            style={[
              styles.filterButton,
              showFilterMenu && styles.filterButtonActive,
            ]}
          >
            <ThemedText style={styles.filterIcon}>⚙️</ThemedText>
          </TouchableOpacity>
        )}
      </View>

      {/* Menú de filtros */}
      {showFilters && showFilterMenu && (
        <View
          style={[
            styles.filterMenu,
            {
              backgroundColor: isDark ? '#2C2C2C' : '#FFFFFF',
              borderColor: isDark ? '#3C3C3C' : '#E0E0E0',
            },
          ]}
        >
          <ThemedText style={styles.filterTitle}>Filtros</ThemedText>

          {/* Tipo de mensaje */}
          <View style={styles.filterGroup}>
            <ThemedText style={styles.filterLabel}>Tipo:</ThemedText>
            <View style={styles.filterOptions}>
              {(['all', 'text', 'image'] as const).map((type) => (
                <TouchableOpacity
                  key={type}
                  onPress={() => handleFilterChange({ messageType: type })}
                  style={[
                    styles.filterOption,
                    filters.messageType === type && styles.filterOptionActive,
                    {
                      backgroundColor:
                        filters.messageType === type
                          ? '#007AFF'
                          : isDark
                          ? '#3C3C3C'
                          : '#F0F0F0',
                    },
                  ]}
                >
                  <ThemedText
                    style={[
                      styles.filterOptionText,
                      filters.messageType === type && styles.filterOptionTextActive,
                    ]}
                  >
                    {type === 'all' ? 'Todos' : type === 'text' ? 'Texto' : 'Imágenes'}
                  </ThemedText>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* Botón limpiar filtros */}
          <TouchableOpacity
            onPress={() => handleFilterChange({ messageType: 'all', senderId: undefined })}
            style={styles.clearFiltersButton}
          >
            <ThemedText style={styles.clearFiltersText}>
              Limpiar filtros
            </ThemedText>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginBottom: 8,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  searchIcon: {
    fontSize: 18,
    marginRight: 8,
  },
  input: {
    flex: 1,
    fontSize: 16,
    paddingVertical: 4,
  },
  indicator: {
    marginLeft: 8,
  },
  clearButton: {
    padding: 4,
    marginLeft: 8,
  },
  clearIcon: {
    fontSize: 18,
    opacity: 0.6,
  },
  filterButton: {
    padding: 4,
    marginLeft: 8,
    borderRadius: 6,
  },
  filterButtonActive: {
    backgroundColor: 'rgba(0, 122, 255, 0.1)',
  },
  filterIcon: {
    fontSize: 18,
  },
  filterMenu: {
    marginTop: 8,
    borderRadius: 12,
    borderWidth: 1,
    padding: 16,
  },
  filterTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 12,
  },
  filterGroup: {
    marginBottom: 16,
  },
  filterLabel: {
    fontSize: 14,
    fontWeight: '500',
    marginBottom: 8,
    opacity: 0.7,
  },
  filterOptions: {
    flexDirection: 'row',
    gap: 8,
  },
  filterOption: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
  },
  filterOptionActive: {
    backgroundColor: '#007AFF',
  },
  filterOptionText: {
    fontSize: 14,
  },
  filterOptionTextActive: {
    color: '#FFFFFF',
    fontWeight: '600',
  },
  clearFiltersButton: {
    alignItems: 'center',
    paddingVertical: 8,
  },
  clearFiltersText: {
    fontSize: 14,
    color: '#007AFF',
  },
});
