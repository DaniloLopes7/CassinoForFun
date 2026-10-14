import React, { createContext, useContext, useEffect, useMemo, useState, useCallback } from 'react';
import { api, getToken, setToken } from '../services/api';
import { reconnectSocket } from '../services/socket';

export interface SelfUser {
  id: string;
  username: string;
  email?: string;
  avatar: string;
  balance: number; // centavos
  xp: number;
  level: number;
  role: 'user' | 'moderator' | 'admin';
  clientSeed: string;
  serverSeedHash: string;
  nonce: number;
  referralCode: string;
  dailyStreak: number;
  createdAt: string;
  stats: { bets: number; wagered: number; won: number; biggestWin: number };
}

interface Ctx {
  user: SelfUser | null;
  loading: boolean;
  onLogin: (token: string, user: SelfUser) => void;
  logout: () => void;
  refresh: () => Promise<void>;
  applySocketUpdate: (u: SelfUser) => void;
  authOpen: boolean;
  setAuthOpen: (v: boolean) => void;
}

const UserContext = createContext<Ctx>({} as Ctx);

export function UserProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<SelfUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [authOpen, setAuthOpen] = useState(false);

  const refresh = useCallback(async () => {
    if (!getToken()) {
      setUser(null);
      setLoading(false);
      return;
    }
    try {
      const { data } = await api.get('/auth/me');
      setUser(data.user);
    } catch {
      setUser(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
    const onExpired = () => {
      setUser(null);
      setAuthOpen(true);
    };
    window.addEventListener('auth:expired', onExpired);
    return () => window.removeEventListener('auth:expired', onExpired);
  }, [refresh]);

  const onLogin = useCallback((token: string, u: SelfUser) => {
    setToken(token);
    setUser(u);
    setAuthOpen(false);
    reconnectSocket();
  }, []);

  const logout = useCallback(() => {
    setToken(null);
    setUser(null);
    reconnectSocket();
  }, []);

  const applySocketUpdate = useCallback((u: SelfUser) => setUser(u), []);

  const value = useMemo(
    () => ({ user, loading, onLogin, logout, refresh, applySocketUpdate, authOpen, setAuthOpen }),
    [user, loading, onLogin, logout, refresh, applySocketUpdate, authOpen]
  );

  return <UserContext.Provider value={value}>{children}</UserContext.Provider>;
}

export function useUser() {
  return useContext(UserContext);
}
