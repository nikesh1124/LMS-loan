'use client';
import { createContext, useCallback, useContext, useEffect, useState, ReactNode } from 'react';
import { api } from './api';
import { User } from './types';

interface AuthCtx {
  user: User | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<User>;
  signup: (name: string, email: string, password: string) => Promise<User>;
  logout: () => void;
}

const Ctx = createContext<AuthCtx>(null as unknown as AuthCtx);
export const useAuth = () => useContext(Ctx);

// Role cookie is only used by proxy.ts for fast redirects; the API enforces real access control.
const setCookie = (role: string | null) => {
  document.cookie = role ? `lms_role=${role}; path=/; max-age=86400; samesite=lax` : 'lms_role=; path=/; max-age=0';
};

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!localStorage.getItem('lms_token')) {
      setLoading(false);
      return;
    }
    api<{ user: User }>('/auth/me')
      .then((r) => {
        setUser(r.user);
        setCookie(r.user.role);
      })
      .catch(() => {
        localStorage.removeItem('lms_token');
        setCookie(null);
      })
      .finally(() => setLoading(false));
  }, []);

  const finish = (r: { token: string; user: User }) => {
    localStorage.setItem('lms_token', r.token);
    setCookie(r.user.role);
    setUser(r.user);
    return r.user;
  };

  const login = useCallback(
    async (email: string, password: string) => finish(await api('/auth/login', { body: { email, password } })),
    []
  );
  const signup = useCallback(
    async (name: string, email: string, password: string) =>
      finish(await api('/auth/signup', { body: { name, email, password } })),
    []
  );
  const logout = useCallback(() => {
    localStorage.removeItem('lms_token');
    setCookie(null);
    setUser(null);
    window.location.href = '/login';
  }, []);

  return <Ctx.Provider value={{ user, loading, login, signup, logout }}>{children}</Ctx.Provider>;
}
