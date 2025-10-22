import React, { useState, useEffect } from 'react';
import {
  Modal,
  View,
  TextInput,
  StyleSheet,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  SafeAreaView,
  Keyboard,
  Dimensions,
} from 'react-native';
import { ThemedText } from './ThemedText';
import { ThemedView } from './ThemedView';
import { useColorScheme } from '@/hooks/useColorScheme';

interface MessageEditModalProps {
  visible: boolean;
  initialText: string;
  onSave: (newText: string) => Promise<void>;
  onCancel: () => void;
  isLoading?: boolean;
}

/**
 * Modal para editar mensajes
 * 
 * Muestra un input con el texto actual y botones para guardar o cancelar
 */
export const MessageEditModal: React.FC<MessageEditModalProps> = ({
  visible,
  initialText,
  onSave,
  onCancel,
  isLoading = false,
}) => {
  const colorScheme = useColorScheme();
  const [text, setText] = useState(initialText);

  // Sincronizar con el texto inicial cuando cambia
  useEffect(() => {
    setText(initialText);
  }, [initialText]);

  const handleSave = async () => {
    const trimmed = text.trim();
    
    if (!trimmed) {
      alert('El mensaje no puede estar vacío');
      return;
    }

    if (trimmed === initialText) {
      // No hubo cambios
      onCancel();
      return;
    }

    await onSave(trimmed);
  };

  const isDark = colorScheme === 'dark';

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onCancel}
      statusBarTranslucent
    >
      <SafeAreaView style={styles.safeArea}>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.container}
        >
          <TouchableOpacity
            style={styles.backdrop}
            activeOpacity={1}
            onPress={onCancel}
          >
            <TouchableOpacity activeOpacity={1} onPress={(e) => e.stopPropagation()}>
              <ThemedView
                style={[
                  styles.modalContent,
                  { backgroundColor: isDark ? '#1E1E1E' : '#FFFFFF' },
                ]}
              >
              {/* Header */}
              <View style={styles.header}>
                <ThemedText style={styles.title}>Editar mensaje</ThemedText>
              </View>

              {/* Input */}
              <TextInput
                style={[
                  styles.input,
                  {
                    backgroundColor: isDark ? '#2C2C2C' : '#F5F5F5',
                    color: isDark ? '#FFFFFF' : '#000000',
                    borderColor: isDark ? '#3C3C3C' : '#E0E0E0',
                  },
                ]}
                value={text}
                onChangeText={setText}
                placeholder="Escribe tu mensaje..."
                placeholderTextColor={isDark ? '#999999' : '#666666'}
                multiline
                maxLength={5000}
                autoFocus
                editable={!isLoading}
              />

              {/* Character count */}
              <ThemedText style={styles.charCount}>
                {text.length} / 5000
              </ThemedText>

              {/* Buttons */}
              <View style={styles.buttonContainer}>
                <TouchableOpacity
                  style={[styles.button, styles.cancelButton]}
                  onPress={onCancel}
                  disabled={isLoading}
                >
                  <ThemedText style={styles.cancelButtonText}>
                    Cancelar
                  </ThemedText>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[
                    styles.button,
                    styles.saveButton,
                    isLoading && styles.saveButtonDisabled,
                  ]}
                  onPress={handleSave}
                  disabled={isLoading || !text.trim()}
                >
                  {isLoading ? (
                    <ActivityIndicator color="#FFFFFF" size="small" />
                  ) : (
                    <ThemedText style={styles.saveButtonText}>
                      Guardar
                    </ThemedText>
                  )}
                </TouchableOpacity>
              </View>
            </ThemedView>
          </TouchableOpacity>
        </TouchableOpacity>
      </KeyboardAvoidingView>
      </SafeAreaView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  container: {
    flex: 1,
  },
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContent: {
    width: '100%',
    maxWidth: 400,
    borderRadius: 16,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  header: {
    marginBottom: 16,
  },
  title: {
    fontSize: 20,
    fontWeight: '600',
  },
  input: {
    borderWidth: 1,
    borderRadius: 8,
    padding: 12,
    minHeight: 100,
    maxHeight: 200,
    fontSize: 16,
    textAlignVertical: 'top',
  },
  charCount: {
    fontSize: 12,
    color: '#999999',
    textAlign: 'right',
    marginTop: 8,
    marginBottom: 16,
  },
  buttonContainer: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 12,
  },
  button: {
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 8,
    minWidth: 100,
    alignItems: 'center',
  },
  cancelButton: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: '#999999',
  },
  cancelButtonText: {
    color: '#999999',
    fontWeight: '600',
  },
  saveButton: {
    backgroundColor: '#007AFF',
  },
  saveButtonDisabled: {
    backgroundColor: '#999999',
  },
  saveButtonText: {
    color: '#FFFFFF',
    fontWeight: '600',
  },
});
