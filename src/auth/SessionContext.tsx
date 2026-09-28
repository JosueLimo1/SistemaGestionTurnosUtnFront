import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { api, type LoginRequest, type SessionUser } from '../api';

const STORAGE_KEY = 'sgt-utn:session';

interface SessionValue {
  user: SessionUser | null;
  login(req: LoginRequest): Promise<SessionUser>;
  logout(): void;
  /** Vuelve a leer el usuario en sesión (ej. después de cambiar su propio rol). */
  refresh(): Promise<void>;
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

  // Revalida la sesión guardada al abrir la app (el usuario pudo haber sido borrado o cambiado).
  useEffect(() => {
    const stored = readStored();
    if (!stored) return;
    api.auth
      .me(stored)
      .then((fresh) => {
        setUser(fresh);
        localStorage.setItem(STORAGE_KEY, JSON.stringify(fresh));
      })
      .catch(() => {
        setUser(null);
        localStorage.removeItem(STORAGE_KEY);
      });
  }, []);

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

  const refresh = useCallback(async () => {
    const stored = readStored();
    if (!stored) return;
    try {
      const fresh = await api.auth.me(stored);
      setUser(fresh);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(fresh));
    } catch {
      setUser(null);
      localStorage.removeItem(STORAGE_KEY);
    }
  }, []);

  const value = useMemo(() => ({ user, login, logout, refresh }), [user, login, logout, refresh]);
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
