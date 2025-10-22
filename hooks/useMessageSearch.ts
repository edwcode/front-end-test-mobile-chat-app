import { useState, useCallback, useEffect, useRef } from 'react';
import { chatService, Message } from '../services/ChatService';

export interface SearchFilters {
  senderId?: string;
  messageType?: 'text' | 'image' | 'all';
  dateFrom?: number;
  dateTo?: number;
}

export interface UseMessageSearchReturn {
  results: Message[];
  isSearching: boolean;
  error: string | null;
  search: (query: string, filters?: SearchFilters) => Promise<void>;
  searchGlobal: (query: string) => Promise<void>;
  clearResults: () => void;
  hasResults: boolean;
}


export const useMessageSearch = (
  chatId?: string,
  debounceMs: number = 300
): UseMessageSearchReturn => {
  const [results, setResults] = useState<Message[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Caché de resultados (Map: query+filters -> results)
  const cacheRef = useRef<Map<string, { results: Message[]; timestamp: number }>>(new Map());
  const CACHE_DURATION = 5 * 60 * 1000; // 5 minutos

  // Timer para debounce
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);

  /**
   * Búsqueda local en un chat específico
   */
  const search = useCallback(
    async (query: string, filters?: SearchFilters) => {
      // Validación
      if (!chatId) {
        setError('No se especificó un chat para buscar');
        return;
      }

      if (!query || query.trim().length < 2) {
        setResults([]);
        setError(null);
        return;
      }

      // Limpiar timer anterior
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }

      // Debounce
      debounceTimerRef.current = setTimeout(async () => {
        try {
          setIsSearching(true);
          setError(null);

          // Generar clave de caché
          const cacheKey = JSON.stringify({ chatId, query: query.trim(), filters });

          // Verificar caché
          const cached = cacheRef.current.get(cacheKey);
          if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
            console.log('[useMessageSearch] Using cached results');
            setResults(cached.results);
            setIsSearching(false);
            return;
          }

          // Búsqueda en servicio
          const searchResults = await chatService.searchMessages(
            chatId,
            query.trim(),
            filters
          );

          // Guardar en caché
          cacheRef.current.set(cacheKey, {
            results: searchResults,
            timestamp: Date.now(),
          });

          // Limpiar caché antiguo
          for (const [key, value] of cacheRef.current.entries()) {
            if (Date.now() - value.timestamp > CACHE_DURATION) {
              cacheRef.current.delete(key);
            }
          }

          setResults(searchResults);
          console.log(`[useMessageSearch] Found ${searchResults.length} results`);
        } catch (err) {
          const errorMessage = err instanceof Error ? err.message : 'Error en la búsqueda';
          setError(errorMessage);
          console.error('[useMessageSearch] Search error:', err);
        } finally {
          setIsSearching(false);
        }
      }, debounceMs);
    },
    [chatId, debounceMs]
  );

  /**
   * Búsqueda global en todos los chats del usuario
   */
  const searchGlobal = useCallback(
    async (query: string) => {
      if (!query || query.trim().length < 2) {
        setResults([]);
        setError(null);
        return;
      }

      // Limpiar timer anterior
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }

      // Debounce
      debounceTimerRef.current = setTimeout(async () => {
        try {
          setIsSearching(true);
          setError(null);

          // Generar clave de caché
          const cacheKey = JSON.stringify({ global: true, query: query.trim() });

          // Verificar caché
          const cached = cacheRef.current.get(cacheKey);
          if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
            console.log('[useMessageSearch] Using cached global results');
            setResults(cached.results);
            setIsSearching(false);
            return;
          }

          // Búsqueda global
          const searchResults = await chatService.searchMessagesGlobal(query.trim());

          // Guardar en caché
          cacheRef.current.set(cacheKey, {
            results: searchResults,
            timestamp: Date.now(),
          });

          setResults(searchResults);
          console.log(`[useMessageSearch] Found ${searchResults.length} global results`);
        } catch (err) {
          const errorMessage = err instanceof Error ? err.message : 'Error en la búsqueda global';
          setError(errorMessage);
          console.error('[useMessageSearch] Global search error:', err);
        } finally {
          setIsSearching(false);
        }
      }, debounceMs);
    },
    [debounceMs]
  );

  /**
   * Limpia resultados y caché
   */
  const clearResults = useCallback(() => {
    setResults([]);
    setError(null);
    cacheRef.current.clear();
    
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }
  }, []);

  // Cleanup al desmontar
  useEffect(() => {
    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
    };
  }, []);

  return {
    results,
    isSearching,
    error,
    search,
    searchGlobal,
    clearResults,
    hasResults: results.length > 0,
  };
};
