import React, { createContext, useContext, ReactNode } from 'react';
import { useUserDb, User } from '../hooks/db/useUserDb';

/**
 * UserContext - Maneja SOLO autenticación y usuarios
 * Separado del chat para evitar re-renders innecesarios
 */

type UserContextType = {
  users: User[];
  currentUser: User | null;
  isLoggedIn: boolean;
  login: (userId: string) => Promise<boolean>;
  logout: () => void;
  loading: boolean;
};

const UserContext = createContext<UserContextType | undefined>(undefined);

export function UserProvider({ children }: { children: ReactNode }) {
  const userState = useUserDb();
  
  return (
    <UserContext.Provider value={userState}>
      {children}
    </UserContext.Provider>
  );
}

/**
 * Hook para acceder al contexto de usuario
 * Separado permite que componentes SOLO de user no se re-rendericen con cambios de chat
 */
export function useUserContext() {
  const context = useContext(UserContext);
  if (context === undefined) {
    throw new Error('useUserContext must be used within UserProvider');
  }
  return context;
}

/**
 * Hook optimizado para obtener SOLO currentUser
 * Evita re-renders cuando cambia la lista de users
 */
export function useCurrentUser() {
  const { currentUser } = useUserContext();
  return currentUser;
}

/**
 * Hook optimizado para verificar login
 * Componentes que solo necesitan saber si hay login no se re-renderean con otros cambios
 */
export function useIsLoggedIn() {
  const { isLoggedIn } = useUserContext();
  return isLoggedIn;
}

/**
 * Hook optimizado para obtener la lista de usuarios
 * Útil para mostrar participantes de chat, etc.
 */
export function useUsers() {
  const { users } = useUserContext();
  return users;
}
