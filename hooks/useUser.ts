/**
 * Este archivo existe solo para compatibilidad temporal
 * 
 * ANTES: useUser era un wrapper inútil que solo hacía pass-through
 * AHORA: Usar directamente useUserDb o mejor aún, useUserContext
 * 
 */

import { useUserDb, User } from './db/useUserDb';

export { User };


export function useUser() {
  console.warn('useUser is deprecated. Use useUserContext() from contexts/UserContext.tsx');
  return useUserDb();
} 