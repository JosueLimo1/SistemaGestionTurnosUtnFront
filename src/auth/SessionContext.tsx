import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react';
import { api, type LoginRequest, type SessionUser } from '../api';

const STORAGE_KEY = 'sgt-utn:session';

interface SessionValue {
  user: SessionUser | null;
  login(req: LoginRequest): Promise<SessionUser>;
  logout(): void;
}

const SessionContext = createContext<SessionValue | null>(null);

function readStored(): SessionUser | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as SessionUser) : null;
  } catch {
    return null;
  }
}

export function SessionProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<SessionUser | null>(readStored);

  const login = useCallback(async (req: LoginRequest) => {
    const u = await api.auth.login(req);
    setUser(u);
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(u));
    } catch {
      /* sin almacenamiento: la sesión dura lo que dure la pestaña */
    }
    return u;
  }, []);

  const logout = useCallback(() => {
    setUser(null);
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch {
      /* noop */
    }
  }, []);

  const value = useMemo(() => ({ user, login, logout }), [user, login, logout]);
  return <SessionContext.Provider value={value}>{children}</SessionContext.Provider>;
}

export function useSession(): SessionValue {
  const ctx = useContext(SessionContext);
  if (!ctx) throw new Error('useSession debe usarse dentro de <SessionProvider>');
  return ctx;
}

/** Alumno logueado (solo usar dentro de rutas protegidas del alumno). */
export function useStudent() {
  const { user } = useSession();
  if (user?.role !== 'STUDENT') throw new Error('No hay un alumno en sesión');
  return user.student;
}

/** Worker logueado (solo usar dentro de rutas protegidas del worker). */
export function useWorker() {
  const { user } = useSession();
  if (user?.role !== 'WORKER') throw new Error('No hay un worker en sesión');
  return user.worker;
}
