import * as FileSystem from 'expo-file-system';
import * as ImageManipulator from 'expo-image-manipulator';

/**
 * Gestión simple de imágenes basada en filesystem
 */

const CACHE_DIR = `${FileSystem.cacheDirectory}chatImages/`;
const MAX_CACHE_SIZE_MB = 100;
const CLEANUP_INTERVAL_MS = 5 * 60 * 1000; // 5 minutos

interface ImageInfo {
  uri: string;
  size: number;
  modificationTime: number;
}

export class ImageStorage {
  private static cleanupTimer: NodeJS.Timeout | null = null;

  /**
   * Inicializar y comenzar limpieza automática
   */
  static initialize(): void {
    if (this.cleanupTimer) return;
    
    console.log('ImageStorage inicializado');
    
    // Limpiar inmediatamente si es necesario
    this.cleanupIfNeeded().catch(console.error);
    
    // Programar limpieza periódica
    this.cleanupTimer = setInterval(() => {
      this.cleanupIfNeeded().catch(console.error);
    }, CLEANUP_INTERVAL_MS);
  }

  /**
   * Detener limpieza automática
   */
  static destroy(): void {
    if (this.cleanupTimer) {
      clearInterval(this.cleanupTimer);
      this.cleanupTimer = null;
    }
  }

  /**
   * Guardar imagen en disco con compresión adaptativa
   */
  static async saveImage(
    chatId: string,
    imageId: string,
    sourceUri: string,
    caption?: string
  ): Promise<{ uri: string; thumbnailUri: string }> {
    try {
      // Crear directorio si no existe
      const chatDir = `${CACHE_DIR}${chatId}/`;
      await FileSystem.makeDirectoryAsync(chatDir, { intermediates: true });

      const extension = sourceUri.split('.').pop()?.toLowerCase() || 'jpg';
      const timestamp = Date.now();
      const imageFileName = `${imageId}_${timestamp}.${extension}`;
      const thumbnailFileName = `${imageId}_${timestamp}_thumb.${extension}`;
      
      const imagePath = `${chatDir}${imageFileName}`;
      const thumbnailPath = `${chatDir}${thumbnailFileName}`;

      // Obtener info de la imagen original
      const imageInfo = await FileSystem.getInfoAsync(sourceUri);
      const imageSizeBytes = imageInfo.exists && 'size' in imageInfo ? imageInfo.size : 0;
      const imageSizeMB = imageSizeBytes / (1024 * 1024);

      console.log(`Guardando imagen: ${imageSizeMB.toFixed(2)}MB`);

      // Compresión adaptativa según tamaño
      let finalImageUri = sourceUri;
      
      if (imageSizeMB > 5) {
        // Imágenes >5MB: comprimir agresivamente
        console.log('Comprimiendo imagen grande...');
        const manipResult = await ImageManipulator.manipulateAsync(
          sourceUri,
          [{ resize: { width: 1280 } }],
          { compress: 0.7, format: ImageManipulator.SaveFormat.JPEG }
        );
        finalImageUri = manipResult.uri;
      } else if (imageSizeMB > 2) {
        // Imágenes >2MB: compresión moderada
        console.log('Comprimiendo imagen mediana...');
        const manipResult = await ImageManipulator.manipulateAsync(
          sourceUri,
          [{ resize: { width: 1920 } }],
          { compress: 0.8, format: ImageManipulator.SaveFormat.JPEG }
        );
        finalImageUri = manipResult.uri;
      }

      // Guardar imagen (original o comprimida)
      await FileSystem.copyAsync({ from: finalImageUri, to: imagePath });

      // Generar thumbnail (200x200)
      const thumbResult = await ImageManipulator.manipulateAsync(
        finalImageUri,
        [{ resize: { width: 200, height: 200 } }],
        { compress: 0.7, format: ImageManipulator.SaveFormat.JPEG }
      );
      await FileSystem.copyAsync({ from: thumbResult.uri, to: thumbnailPath });

      // Verificar si necesitamos limpieza después de guardar
      await this.cleanupIfNeeded();

      console.log('Imagen guardada:', imagePath);
      
      return {
        uri: imagePath,
        thumbnailUri: thumbnailPath,
      };
    } catch (error) {
      console.error('Error guardando imagen:', error);
      throw error;
    }
  }

  /**
   * Limpiar caché si excede el límite
   */
  private static async cleanupIfNeeded(): Promise<void> {
    try {
      const totalSize = await this.calculateCacheSize();
      const maxBytes = MAX_CACHE_SIZE_MB * 1024 * 1024;
      const usagePercent = (totalSize / maxBytes) * 100;

      if (totalSize > maxBytes * 0.8) { // Limpiar al 80%
        console.log(`Limpieza necesaria: ${usagePercent.toFixed(1)}% usado (${(totalSize / 1024 / 1024).toFixed(2)}MB)`);
        const bytesToFree = totalSize - (maxBytes * 0.6); // Reducir a 60%
        await this.cleanOldestFiles(bytesToFree);
      }
    } catch (error) {
      console.error('Error en limpieza automática:', error);
    }
  }

  /**
   * Calcular tamaño total del caché
   */
  private static async calculateCacheSize(): Promise<number> {
    try {
      const files = await this.getAllFiles();
      return files.reduce((total, file) => total + file.size, 0);
    } catch (error) {
      console.warn('Error calculando tamaño:', error);
      return 0;
    }
  }

  /**
   * Obtener todos los archivos con su info
   */
  private static async getAllFiles(): Promise<ImageInfo[]> {
    const files: ImageInfo[] = [];

    try {
      const dirInfo = await FileSystem.getInfoAsync(CACHE_DIR);
      if (!dirInfo.exists) return files;

      const chatDirs = await FileSystem.readDirectoryAsync(CACHE_DIR);

      for (const chatId of chatDirs) {
        const chatDir = `${CACHE_DIR}${chatId}/`;
        const chatDirInfo = await FileSystem.getInfoAsync(chatDir);
        
        if (!chatDirInfo.exists || !chatDirInfo.isDirectory) continue;

        const images = await FileSystem.readDirectoryAsync(chatDir);

        for (const image of images) {
          const filePath = `${chatDir}${image}`;
          const info = await FileSystem.getInfoAsync(filePath);

          if (info.exists && 'size' in info) {
            files.push({
              uri: filePath,
              size: info.size,
              modificationTime: info.modificationTime || 0,
            });
          }
        }
      }
    } catch (error) {
      console.warn('Error obteniendo archivos:', error);
    }

    return files;
  }

  /**
   * Eliminar archivos más antiguos hasta liberar espacio
   */
  private static async cleanOldestFiles(bytesToFree: number): Promise<void> {
    try {
      const files = await this.getAllFiles();

      // Ordenar por fecha de modificación (más antiguos primero)
      files.sort((a, b) => a.modificationTime - b.modificationTime);

      let freedBytes = 0;
      let deletedCount = 0;

      for (const file of files) {
        if (freedBytes >= bytesToFree) break;

        await FileSystem.deleteAsync(file.uri, { idempotent: true });
        freedBytes += file.size;
        deletedCount++;
      }

      console.log(`Limpieza completada: ${deletedCount} archivos eliminados, ${(freedBytes / 1024 / 1024).toFixed(2)}MB liberados`);
    } catch (error) {
      console.error('Error eliminando archivos:', error);
    }
  }
}

// Inicializar automáticamente
ImageStorage.initialize();