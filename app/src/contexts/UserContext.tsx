import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';

import { getItem, removeItem, setItem } from '../lib/storage';
import { apiJson } from '../lib/api';

export type User = {
  id: number;
  email: string;
  displayName: string | null;
  /** Present after backend includes role in /auth/me (USER | ADMIN) */
  role?: 'USER' | 'ADMIN';
};

type UserContextValue = {
  user: User | null;
  setUser: (u: User | null) => void;
  refreshUser: () => Promise<void>;
  isLoading: boolean;
};

const UserContext = createContext<UserContextValue | null>(null);

const USER_KEY = 'smartwallet_user';

export function UserProvider({ children }: { children: React.ReactNode }) {
  const [user, setUserState] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const setUser = useCallback((u: User | null) => {
    setUserState(u);
    if (u) {
      setItem(USER_KEY, JSON.stringify(u));
    } else {
      removeItem(USER_KEY);
    }
  }, []);

  const refreshUser = useCallback(async () => {
    const token = await getItem('smartwallet_token');
    if (!token) {
      setUserState(null);
      return;
    }
    try {
      const u = await apiJson<User>('/auth/me', {
        headers: { Authorization: `Bearer ${token}` },
      });
      setUserState(u);
      setItem(USER_KEY, JSON.stringify(u));
    } catch {
      setUserState(null);
    }
  }, []);

  useEffect(() => {
    let mounted = true;
    async function load() {
      const token = await getItem('smartwallet_token');
      if (!token) {
        if (mounted) {
          setUserState(null);
          setIsLoading(false);
        }
        return;
      }
      try {
        const u = await apiJson<User>('/auth/me', {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (mounted) {
          setUserState(u);
          setItem(USER_KEY, JSON.stringify(u));
        }
      } catch {
        if (mounted) setUserState(null);
      } finally {
        if (mounted) setIsLoading(false);
      }
    }
    load();
    return () => {
      mounted = false;
    };
  }, []);

  return (
    <UserContext.Provider value={{ user, setUser, refreshUser, isLoading }}>
      {children}
    </UserContext.Provider>
  );
}

export function useUser() {
  const ctx = useContext(UserContext);
  if (!ctx) throw new Error('useUser must be used within UserProvider');
  return ctx;
}
