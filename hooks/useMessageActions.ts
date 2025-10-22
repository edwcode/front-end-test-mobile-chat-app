import { useState, useCallback } from 'react';
import { chatService, Message } from '../services/ChatService';

export interface UseMessageActionsReturn {
  editMessage: (messageId: string, newText: string, userId: string) => Promise<boolean>;
  deleteMessage: (messageId: string, userId: string) => Promise<boolean>;
  getMessageHistory: (messageId: string) => Promise<{
    current: string;
    original: string | null;
    editedAt: number | null;
  } | null>;
  isLoading: boolean;
  error: string | null;
}


export const useMessageActions = (): UseMessageActionsReturn => {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  /**
   * Edita un mensaje
   */
  const editMessage = useCallback(async (
    messageId: string,
    newText: string,
    userId: string
  ): Promise<boolean> => {
    try {
      setIsLoading(true);
      setError(null);

      const result = await chatService.editMessage(messageId, newText, userId);

      if (!result) {
        setError('No se pudo editar el mensaje');
        return false;
      }

      console.log('[useMessageActions] Message edited successfully:', messageId);
      return true;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Error desconocido';
      setError(errorMessage);
      console.error('[useMessageActions] Error editing message:', err);
      return false;
    } finally {
      setIsLoading(false);
    }
  }, []);

  /**
   * Elimina un mensaje (soft delete)
   */
  const deleteMessage = useCallback(async (
    messageId: string,
    userId: string
  ): Promise<boolean> => {
    try {
      setIsLoading(true);
      setError(null);

      const success = await chatService.deleteMessage(messageId, userId);

      if (!success) {
        setError('No se pudo eliminar el mensaje');
        return false;
      }

      console.log('[useMessageActions] Message deleted successfully:', messageId);
      return true;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Error desconocido';
      setError(errorMessage);
      console.error('[useMessageActions] Error deleting message:', err);
      return false;
    } finally {
      setIsLoading(false);
    }
  }, []);

  /**
   * Obtiene el historial de un mensaje
   */
  const getMessageHistory = useCallback(async (
    messageId: string
  ): Promise<{
    current: string;
    original: string | null;
    editedAt: number | null;
  } | null> => {
    try {
      setIsLoading(true);
      setError(null);

      const history = await chatService.getMessageHistory(messageId);

      if (!history) {
        setError('No se pudo obtener el historial');
        return null;
      }

      return history;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Error desconocido';
      setError(errorMessage);
      console.error('[useMessageActions] Error getting message history:', err);
      return null;
    } finally {
      setIsLoading(false);
    }
  }, []);

  return {
    editMessage,
    deleteMessage,
    getMessageHistory,
    isLoading,
    error,
  };
};
