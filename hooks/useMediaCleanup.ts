import { useEffect, useRef, useState } from 'react';
import { AppState, AppStateStatus } from 'react-native';
import { MediaCacheManager } from '@/utils/MediaCacheManager';

interface UseMediaCleanupOptions {
  /** Intervalo de limpieza automática en minutos (default: 10) */
  cleanupIntervalMinutes?: number;
  /** Limpiar cuando la app pasa a background (default: true) */
  cleanOnBackground?: boolean;
  /** Limpiar cuando el componente se desmonta (default: false) */
  cleanOnUnmount?: boolean;
  /** Verificar salud del caché periódicamente (default: true) */
  checkHealth?: boolean;
}

/**
 * 🧹 useMediaCleanup - Hook para limpieza automática de recursos multimedia
 * 
 * Responsabilidades:
 * - Ejecutar limpieza periódica del caché
 * - Limpiar cuando la app pasa a background
 * - Monitorear salud del caché
 * - Prevenir memory leaks
 * 
 * @example
 * ```tsx
 * // En App.tsx o en _layout.tsx (root level)
 * function App() {
 *   useMediaCleanup({
 *     cleanupIntervalMinutes: 15,
 *     cleanOnBackground: true,
 *   });
 *   
 *   return <YourApp />;
 * }
 * ```
 */
export function useMediaCleanup(options: UseMediaCleanupOptions = {}) {
  const {
    cleanupIntervalMinutes = 10,
    cleanOnBackground = true,
    cleanOnUnmount = false,
    checkHealth = true,
  } = options;

  const cleanupIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const healthCheckIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const appStateRef = useRef<AppStateStatus>(AppState.currentState);

  useEffect(() => {
    console.log('🧹 useMediaCleanup inicializado');

    // 1. Configurar limpieza periódica
    if (cleanupIntervalMinutes > 0) {
      const intervalMs = cleanupIntervalMinutes * 60 * 1000;
      
      cleanupIntervalRef.current = setInterval(async () => {
        console.log(` Limpieza periódica (cada ${cleanupIntervalMinutes} min)`);
        await MediaCacheManager.ensureHealthy();
      }, intervalMs);

      console.log(`Limpieza automática cada ${cleanupIntervalMinutes} minutos`);
    }

    // 2. Configurar verificación de salud del caché
    if (checkHealth) {
      healthCheckIntervalRef.current = setInterval(() => {
        const isHealthy = MediaCacheManager.isHealthy();
        const stats = MediaCacheManager.getStats();
        
        if (!isHealthy) {
          console.warn('⚠️ Caché no saludable:', {
            uso: `${stats.memoryUsagePercent.toFixed(1)}%`,
            items: stats.itemCount,
          });
        }
      }, 2 * 60 * 1000); // Cada 2 minutos

      console.log(' Monitoreo de salud del caché activado');
    }

    // 3. Listener para cambios de estado de la app
    const handleAppStateChange = async (nextAppState: AppStateStatus) => {
      const previousState = appStateRef.current;
      appStateRef.current = nextAppState;

      // Cuando la app pasa a background
      if (
        cleanOnBackground &&
        previousState === 'active' &&
        nextAppState.match(/inactive|background/)
      ) {
        console.log('App en background, ejecutando limpieza...');
        
        try {
          await MediaCacheManager.ensureHealthy();
          console.log('Limpieza de background completada');
        } catch (error) {
          console.error('Error en limpieza de background:', error);
        }
      }

      // Cuando la app vuelve a foreground
      if (
        previousState.match(/inactive|background/) &&
        nextAppState === 'active'
      ) {
        console.log('📱 App en foreground, verificando salud...');
        
        const stats = MediaCacheManager.getStats();
        console.log(`Caché: ${stats.itemCount} items, ${(stats.totalSize / 1024 / 1024).toFixed(2)} MB`);
      }
    };

    const subscription = AppState.addEventListener('change', handleAppStateChange);

    // 4. Cleanup al desmontar
    return () => {
      console.log('useMediaCleanup desmontando...');

      // Limpiar intervalos
      if (cleanupIntervalRef.current) {
        clearInterval(cleanupIntervalRef.current);
      }
      if (healthCheckIntervalRef.current) {
        clearInterval(healthCheckIntervalRef.current);
      }

      // Remover listener
      subscription.remove();

      // Limpieza final si está configurada
      if (cleanOnUnmount) {
        console.log('Ejecutando limpieza final...');
        MediaCacheManager.ensureHealthy().catch(error => {
          console.error('Error en limpieza final:', error);
        });
      }
    };
  }, [cleanupIntervalMinutes, cleanOnBackground, cleanOnUnmount, checkHealth]);

  // Retornar funciones útiles para control manual
  return {
    /**
     * Forzar limpieza manual del caché
     */
    forceCleanup: async () => {
      console.log('Limpieza forzada manualmente');
      await MediaCacheManager.ensureHealthy();
    },

    /**
     * Limpiar TODO el caché (resetear)
     */
    clearAll: async () => {
      console.log('Limpiando TODO el caché');
      await MediaCacheManager.clearAllCache();
    },

    /**
     * Obtener estadísticas actuales del caché
     */
    getStats: () => {
      return MediaCacheManager.getStats();
    },

    /**
     * Verificar si el caché está saludable
     */
    isHealthy: () => {
      return MediaCacheManager.isHealthy();
    },
  };
}


export function useMediaStats() {
  const [stats, setStats] = useState(() => MediaCacheManager.getStats());

  useEffect(() => {
    // Actualizar stats cada 5 segundos
    const interval = setInterval(() => {
      setStats(MediaCacheManager.getStats());
    }, 5000);

    // Suscribirse a cambios del caché
    const unsubscribe = MediaCacheManager.subscribe((newStats) => {
      setStats(newStats);
    });

    return () => {
      clearInterval(interval);
      unsubscribe();
    };
  }, []);

  return stats;
}
