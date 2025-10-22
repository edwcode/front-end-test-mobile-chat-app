import React, { useState, useEffect, useRef } from 'react';
import { Image, View, StyleSheet, ActivityIndicator, ImageProps, ViewStyle } from 'react-native';
import { MediaCacheManager } from '@/utils/MediaCacheManager';

interface LazyImageProps extends Omit<ImageProps, 'source' | 'style'> {
  /** URL de la imagen completa */
  uri: string;
  /** URL del thumbnail (opcional, más pequeño y rápido de cargar) */
  thumbnailUri?: string;
  /** Ancho de la imagen */
  width: number;
  /** Alto de la imagen */
  height: number;
  /** Estilo adicional (solo ViewStyle para compatibilidad) */
  style?: ViewStyle;
  /** Modo de redimensionamiento de la imagen */
  resizeMode?: 'cover' | 'contain' | 'stretch' | 'center';
}

/**
 * Componente de imagen optimizado con lazy loading
 * 
 * Estrategia de carga:
 * 1. Muestra spinner mientras carga
 * 2. Si existe thumbnailUri, lo carga primero (rápido)
 * 3. Luego carga la imagen completa en segundo plano
 * 4. Hace fade-in cuando la imagen está lista
 * 
 * Beneficios:
 * - Reduce tiempo de carga inicial
 * - Mejor UX con feedback visual
 * - Ahorra ancho de banda si usuario no scrollea hasta la imagen
 * 
 * @example
 * ```tsx
 * <LazyImage
 *   uri="https://example.com/image-full.jpg"
 *   thumbnailUri="https://example.com/image-thumb.jpg"
 *   width={200}
 *   height={200}
 *   style={{ borderRadius: 12 }}
 * />
 * ```
 */
export function LazyImage({ 
  uri, 
  thumbnailUri, 
  width, 
  height, 
  style,
  resizeMode = 'cover',
  ...imageProps 
}: LazyImageProps) {
  const [isLoading, setIsLoading] = useState(true);
  const [loadedUri, setLoadedUri] = useState<string | null>(null);
  const [error, setError] = useState(false);
  const isMountedRef = useRef(true);
  const abortControllerRef = useRef<AbortController | null>(null);

  useEffect(() => {
    isMountedRef.current = true;
    abortControllerRef.current = new AbortController();

    // Función para cargar una imagen
    const loadImage = async (imageUri: string): Promise<void> => {
      // 🧹 Registrar acceso en MediaCacheManager
      await MediaCacheManager.trackImageAccess(imageUri);

      return new Promise<void>((resolve, reject) => {
        // Verificar si fue cancelado antes de empezar
        if (abortControllerRef.current?.signal.aborted) {
          reject(new Error('Carga cancelada'));
          return;
        }

        Image.prefetch(imageUri)
          .then(() => {
            if (isMountedRef.current && !abortControllerRef.current?.signal.aborted) {
              setLoadedUri(imageUri);
              resolve();
            } else {
              reject(new Error('Componente desmontado'));
            }
          })
          .catch((err) => {
            if (isMountedRef.current && !abortControllerRef.current?.signal.aborted) {
              reject(err);
            }
          });
      });
    };

    const loadImages = async () => {
      try {
        setIsLoading(true);
        setError(false);

        // 1. Si hay thumbnail, cargarlo primero
        if (thumbnailUri && !abortControllerRef.current?.signal.aborted) {
          await loadImage(thumbnailUri);
          
          if (isMountedRef.current) {
            setIsLoading(false); // Mostrar thumbnail mientras carga la imagen completa
          }
          
          // 2. Cargar imagen completa en segundo plano
          if (!abortControllerRef.current?.signal.aborted) {
            await loadImage(uri);
          }
        } else {
          // Sin thumbnail, cargar directamente la imagen completa
          await loadImage(uri);
          
          if (isMountedRef.current) {
            setIsLoading(false);
          }
        }
      } catch (err) {
        if (isMountedRef.current && !abortControllerRef.current?.signal.aborted) {
          console.error('Error cargando imagen:', err);
          setError(true);
          setIsLoading(false);
        }
      }
    };

    loadImages();

    // Cleanup: Liberar recursos al desmontar
    return () => {
      isMountedRef.current = false;
      
      // Cancelar cargas en progreso
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }

      // Remover del tracking (no del caché, solo del tracking activo)
      // El MediaCacheManager se encargará de limpiar automáticamente
    };
  }, [uri, thumbnailUri]);

  const containerStyle: ViewStyle = {
    width,
    height,
    borderRadius: typeof style?.borderRadius === 'number' ? style.borderRadius : 0,
  };

  // Estado de error
  if (error) {
    return (
      <View style={[styles.container, containerStyle, styles.errorContainer]}>
        <View style={styles.errorIcon}>
          <Image
            source={{ uri: 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDgiIGhlaWdodD0iNDgiIHZpZXdCb3g9IjAgMCA0OCA0OCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KICA8cGF0aCBkPSJNMjQgNEMxMi45NTQgNCA0IDEyLjk1NCA0IDI0UzEyLjk1NCA0NCAyNCA0NFM0NCAzNS4wNDYgNDQgMjRTMzUuMDQ2IDQgMjQgNFpNMjQgNDBDMTUuMTYzIDQwIDggMzIuODM3IDggMjRTMTUuMTYzIDggMjQgOFMzOS45ODQgMTUuMTYzIDM5Ljk4NCAyNFMzMi44MzcgNDAgMjQgNDBaIiBmaWxsPSIjOTk5Ij48L3BhdGg+CiAgPHBhdGggZD0iTTI0IDE2QzIzLjQ0OCAxNiAyMyAxNi40NDggMjMgMTdWMjdDMjMgMjcuNTUyIDIzLjQ0OCAyOCAyNCAyOEMyNC41NTIgMjggMjUgMjcuNTUyIDI1IDI3VjE3QzI1IDE2LjQ0OCAyNC41NTIgMTYgMjQgMTZaIiBmaWxsPSIjOTk5Ij48L3BhdGg+CiAgPGNpcmNsZSBjeD0iMjQiIGN5PSIzMiIgcj0iMiIgZmlsbD0iIzk5OSI+PC9jaXJjbGU+Cjwvc3ZnPg==' }}
            style={{ width: 48, height: 48 }}
          />
        </View>
      </View>
    );
  }

  // Estado de carga
  if (isLoading) {
    return (
      <View style={[styles.container, containerStyle, styles.loadingContainer]}>
        <ActivityIndicator size="small" color="#007AFF" />
      </View>
    );
  }

  // Imagen cargada
  return (
    <Image
      {...imageProps}
      source={{ uri: loadedUri || uri }}
      style={{ width, height, borderRadius: typeof style?.borderRadius === 'number' ? style.borderRadius : 0 }}
      resizeMode={resizeMode}
    />
  );
}

const styles = StyleSheet.create({
  container: {
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F0F0F0',
  },
  loadingContainer: {
    backgroundColor: '#F0F0F0',
  },
  errorContainer: {
    backgroundColor: '#F5F5F5',
  },
  errorIcon: {
    opacity: 0.5,
  },
});
