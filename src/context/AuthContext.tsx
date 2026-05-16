import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { rxexApi } from '@/api/rxexApi';
import { getToken } from '@/api/client';
import type { DriverProfile, User } from '@/types/api';

type AuthState = {
  user: User | null;
  profile: DriverProfile | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  refreshProfile: () => Promise<void>;
};

const AuthContext = createContext<AuthState | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<DriverProfile | null>(null);
  const [loading, setLoading] = useState(true);

  async function refreshProfile() {
    const p = await rxexApi.profile();
    setProfile(p);
  }

  async function restore() {
    try {
      const token = await getToken();
      if (!token) return;
      const current = await rxexApi.me();
      setUser(current);
      await refreshProfile();
    } catch {
      await rxexApi.logout();
      setUser(null);
      setProfile(null);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { restore(); }, []);

  const value = useMemo<AuthState>(() => ({
    user,
    profile,
    loading,
    async login(email, password) {
      const result = await rxexApi.login(email.trim(), password);
      setUser(result.user);
      await refreshProfile();
    },
    async logout() {
      await rxexApi.logout();
      setUser(null);
      setProfile(null);
    },
    refreshProfile
  }), [user, profile, loading]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider');
  return ctx;
}
