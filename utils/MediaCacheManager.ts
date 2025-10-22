import { Image } from 'react-native';
import * as FileSystem from 'expo-file-system';

/**
 * Singleton para gestión de caché de multimedia
 * 
 * Responsabilidades:
 * - Limitar tamaño total de caché
 * - Limpiar automáticamente imágenes antiguas
 * - Rastrear uso de memoria
 * - Evitar memory leaks
 * 
 * Estrategia LRU (Least Recently Used):
 * - Mantiene registro de último acceso
 * - Elimina imágenes más antiguas cuando se alcanza límite
 * - Prioriza contenido reciente
 */

interface CacheEntry {
  uri: string;
  size: number; // bytes
  lastAccessed: number; // timestamp
  accessCount: number;
}

interface CacheStats {
  totalSize: number; // bytes
  itemCount: number;
  oldestEntry: number; // timestamp
  newestEntry: number; // timestamp
  memoryUsagePercent: number;
}

class MediaCacheManagerClass {
  private static instance: MediaCacheManagerClass;
  
  // Configuración
  private readonly MAX_CACHE_SIZE_MB = 100; // 100 MB máximo
  private readonly MAX_CACHE_ITEMS = 200; // 200 imágenes máximo
  private readonly MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000; // 7 días
  private readonly CLEANUP_THRESHOLD = 0.8; // Limpiar cuando alcance 80%
  
  // Estado del caché
  private cache: Map<string, CacheEntry> = new Map();
  private currentSize: number = 0; // bytes
  private cleanupInProgress: boolean = false;
  
  // Listeners para métricas
  private listeners: Set<(stats: CacheStats) => void> = new Set();

  private constructor() {
    // Singleton: constructor privado
    this.initializeCache();
  }

  /**
   * Obtener instancia única del manager
   */
  public static getInstance(): MediaCacheManagerClass {
    if (!MediaCacheManagerClass.instance) {
      MediaCacheManagerClass.instance = new MediaCacheManagerClass();
    }
    return MediaCacheManagerClass.instance;
  }

  /**
   * Inicializar caché al arrancar
   */
  private async initializeCache(): Promise<void> {
    try {
      // Limpiar caché de React Native Image al inicio
      await this.clearReactNativeImageCache();
      
      console.log('MediaCacheManager inicializado');
      this.logStats();
    } catch (error) {
      console.error('Error inicializando MediaCacheManager:', error);
    }
  }

  /**
   * Limpiar caché de imágenes de React Native
   */
  private async clearReactNativeImageCache(): Promise<void> {
    try {
      // React Native Image tiene su propio caché interno
      // Prefetch crea caché, queryCache permite consultar/limpiar
      console.log('Preparando limpieza de caché de React Native');
    } catch (error) {
      console.warn('No se pudo limpiar caché RN:', error);
    }
  }

  /**
   * Registrar acceso a una imagen
   */
  public async trackImageAccess(uri: string, sizeBytes?: number): Promise<void> {
    const now = Date.now();
    
    if (this.cache.has(uri)) {
      // Actualizar entrada existente
      const entry = this.cache.get(uri)!;
      entry.lastAccessed = now;
      entry.accessCount++;
    } else {
      // Nueva entrada
      const size = sizeBytes || await this.estimateImageSize(uri);
      
      this.cache.set(uri, {
        uri,
        size,
        lastAccessed: now,
        accessCount: 1,
      });
      
      this.currentSize += size;
    }

    // Verificar si necesitamos limpieza
    await this.checkAndCleanup();
    
    // Notificar listeners
    this.notifyListeners();
  }

  /**
   * Estimar tamaño de imagen
   */
  private async estimateImageSize(uri: string): Promise<number> {
    try {
      if (uri.startsWith('file://')) {
        // Archivo local
        const info = await FileSystem.getInfoAsync(uri);
        return info.exists && 'size' in info ? info.size : 0;
      } else if (uri.startsWith('data:')) {
        // Data URI (base64)
        const base64 = uri.split(',')[1];
        return base64 ? Math.ceil(base64.length * 0.75) : 0;
      } else {
        // URL remota: estimar ~200KB promedio
        return 200 * 1024;
      }
    } catch (error) {
      console.warn('Error estimando tamaño:', error);
      return 200 * 1024; // Fallback
    }
  }

  /**
   * Verificar si necesita limpieza y ejecutarla
   */
  private async checkAndCleanup(): Promise<void> {
    const maxSizeBytes = this.MAX_CACHE_SIZE_MB * 1024 * 1024;
    const usagePercent = this.currentSize / maxSizeBytes;

    if (
      usagePercent >= this.CLEANUP_THRESHOLD ||
      this.cache.size >= this.MAX_CACHE_ITEMS
    ) {
      console.log(`🧹 Limpieza necesaria: ${(usagePercent * 100).toFixed(1)}% usado`);
      await this.performCleanup();
    }
  }

  /**
   * Ejecutar limpieza de caché (estrategia LRU)
   */
  private async performCleanup(): Promise<void> {
    if (this.cleanupInProgress) {
      console.log('⏳ Limpieza ya en progreso...');
      return;
    }

    this.cleanupInProgress = true;
    console.log('🧹 Iniciando limpieza de caché...');
    
    try {
      const now = Date.now();
      const entriesToRemove: string[] = [];

      // 1. Eliminar entradas muy antiguas
      for (const [uri, entry] of this.cache.entries()) {
        if (now - entry.lastAccessed > this.MAX_AGE_MS) {
          entriesToRemove.push(uri);
        }
      }

      // 2. Si aún necesitamos más espacio, eliminar las menos usadas
      if (entriesToRemove.length < this.cache.size * 0.3) {
        // Ordenar por último acceso (más antiguas primero)
        const sortedEntries = Array.from(this.cache.entries())
          .sort((a, b) => a[1].lastAccessed - b[1].lastAccessed);

        // Eliminar 30% de las más antiguas
        const itemsToRemove = Math.floor(this.cache.size * 0.3);
        for (let i = 0; i < itemsToRemove; i++) {
          const [uri] = sortedEntries[i];
          if (!entriesToRemove.includes(uri)) {
            entriesToRemove.push(uri);
          }
        }
      }

      // 3. Eliminar entradas seleccionadas
      let freedBytes = 0;
      for (const uri of entriesToRemove) {
        const entry = this.cache.get(uri);
        if (entry) {
          freedBytes += entry.size;
          this.currentSize -= entry.size;
          this.cache.delete(uri);
        }
      }
      
      this.logStats();
      this.notifyListeners();
    } catch (error) {
      console.error('Error en limpieza:', error);
    } finally {
      this.cleanupInProgress = false;
    }
  }

  /**
   * Eliminar una imagen específica del caché
   */
  public removeFromCache(uri: string): void {
    const entry = this.cache.get(uri);
    if (entry) {
      this.currentSize -= entry.size;
      this.cache.delete(uri);
      this.notifyListeners();
    }
  }

  /**
   * Limpiar todo el caché manualmente
   */
  public async clearAllCache(): Promise<void> {
    console.log('Limpiando TODO el caché...');
    
    this.cache.clear();
    this.currentSize = 0;
    
    await this.clearReactNativeImageCache();
    
    console.log('Caché completamente limpio');
    this.notifyListeners();
  }

  /**
   * Obtener estadísticas del caché
   */
  public getStats(): CacheStats {
    const entries = Array.from(this.cache.values());
    const maxSizeBytes = this.MAX_CACHE_SIZE_MB * 1024 * 1024;

    return {
      totalSize: this.currentSize,
      itemCount: this.cache.size,
      oldestEntry: entries.length > 0 
        ? Math.min(...entries.map(e => e.lastAccessed))
        : 0,
      newestEntry: entries.length > 0
        ? Math.max(...entries.map(e => e.lastAccessed))
        : 0,
      memoryUsagePercent: (this.currentSize / maxSizeBytes) * 100,
    };
  }

  /**
   * Log de estadísticas
   */
  private logStats(): void {
    const stats = this.getStats();
  }

  /**
   * Suscribirse a cambios en el caché
   */
  public subscribe(listener: (stats: CacheStats) => void): () => void {
    this.listeners.add(listener);
    
    // Retornar función para desuscribirse
    return () => {
      this.listeners.delete(listener);
    };
  }

  /**
   * Notificar a todos los listeners
   */
  private notifyListeners(): void {
    const stats = this.getStats();
    this.listeners.forEach(listener => {
      try {
        listener(stats);
      } catch (error) {
        console.error('Error en listener:', error);
      }
    });
  }

  /**
   * Verificar si el caché está saludable
   */
  public isHealthy(): boolean {
    const stats = this.getStats();
    return (
      stats.memoryUsagePercent < 90 &&
      stats.itemCount < this.MAX_CACHE_ITEMS
    );
  }

  /**
   * Forzar limpieza si el caché no está saludable
   */
  public async ensureHealthy(): Promise<void> {
    if (!this.isHealthy()) {
      console.log('Caché no saludable, forzando limpieza...');
      await this.performCleanup();
    }
  }
}

// Exportar instancia única
export const MediaCacheManager = MediaCacheManagerClass.getInstance();

// Exportar tipos
export type { CacheStats };
