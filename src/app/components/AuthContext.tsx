import { createContext, useContext, useState, ReactNode } from 'react';

export interface User {
  role: 'admin' | 'user';
  name: string;
}

interface StoredSession {
  user: User;
  expiresAt: number;
}

interface AuthContextType {
  user: User | null;
  login: (role: 'admin' | 'user', name: string) => void;
  logout: () => void;
}

const SESSION_STORAGE_KEY = 'nova-auth-session';
const SESSION_DURATION_MS = 8 * 60 * 60 * 1000;

export const AuthContext = createContext<AuthContextType | null>(null);

function clearStoredSession() {
  if (typeof window !== 'undefined') {
    window.localStorage.removeItem(SESSION_STORAGE_KEY);
  }
}

function isValidUser(user: unknown): user is User {
  if (!user || typeof user !== 'object') {
    return false;
  }

  const candidate = user as Record<string, unknown>;
  return (
    (candidate.role === 'admin' || candidate.role === 'user') &&
    typeof candidate.name === 'string' &&
    candidate.name.trim().length > 0
  );
}

function readStoredSession(): User | null {
  if (typeof window === 'undefined') {
    return null;
  }

  try {
    const rawSession = window.localStorage.getItem(SESSION_STORAGE_KEY);
    if (!rawSession) {
      return null;
    }

    const parsed = JSON.parse(rawSession) as Partial<StoredSession>;
    if (!isValidUser(parsed.user) || typeof parsed.expiresAt !== 'number') {
      clearStoredSession();
      return null;
    }

    if (parsed.expiresAt <= Date.now()) {
      clearStoredSession();
      return null;
    }

    return parsed.user;
  } catch (error) {
    console.error('No se pudo restaurar la sesión guardada:', error);
    clearStoredSession();
    return null;
  }
}

function storeSession(user: User) {
  if (typeof window === 'undefined') {
    return;
  }

  const session: StoredSession = {
    user,
    expiresAt: Date.now() + SESSION_DURATION_MS,
  };

  window.localStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(session));
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(() => readStoredSession());

  const login = (role: 'admin' | 'user', name: string) => {
    const nextUser = { role, name };
    setUser(nextUser);
    storeSession(nextUser);
  };

  const logout = () => {
    setUser(null);
    clearStoredSession();
  };

  return (
    <AuthContext.Provider value={{ user, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth debe ser usado dentro de un AuthProvider');
  }
  return context;
};
