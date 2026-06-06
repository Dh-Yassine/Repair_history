import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import { api, getToken, setToken } from '../api';
import { isSupabaseAuthEnabled, supabase, authCallbackUrl } from '../lib/supabase';
import type { User } from '../types';

interface AuthContextValue {
  user: User | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<User>;
  register: (data: { fullName: string; email: string; password: string; phone?: string }) => Promise<void>;
  registerBuyer: (data: { fullName: string; email: string; password: string; phone?: string }) => Promise<User>;
  registerShop: (data: {
    fullName: string;
    email: string;
    password: string;
    phone?: string;
    shopName: string;
    address?: string;
  }) => Promise<void>;
  logout: () => void;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

async function syncProfileAfterAuth(
  body: {
    fullName: string;
    role?: 'OWNER' | 'SHOP' | 'BUYER';
    phone?: string;
    shopName?: string;
    address?: string;
  },
  token: string
) {
  const { user } = await api.syncProfile(body, token);
  return user;
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const useSupabase = isSupabaseAuthEnabled();

  const refreshUser = useCallback(async () => {
    const token = getToken();
    if (!token) {
      setUser(null);
      return;
    }
    const { user: u } = await api.me();
    setUser(u);
  }, []);

  useEffect(() => {
    if (!useSupabase || !supabase) {
      refreshUser()
        .catch(() => {
          setToken(null);
          setUser(null);
        })
        .finally(() => setLoading(false));
      return;
    }

    supabase.auth.getSession().then(({ data }) => {
      if (data.session?.access_token) setToken(data.session.access_token);
    });

    const { data: sub } = supabase.auth.onAuthStateChange(async (_event, session) => {
      if (session?.access_token) {
        setToken(session.access_token);
        try {
          await refreshUser();
        } catch {
          setUser(null);
        }
      } else {
        setToken(null);
        setUser(null);
      }
      setLoading(false);
    });

    refreshUser()
      .catch(() => {
        setToken(null);
        setUser(null);
      })
      .finally(() => setLoading(false));

    return () => sub.subscription.unsubscribe();
  }, [refreshUser, useSupabase]);

  const login = useCallback(
    async (email: string, password: string) => {
      if (useSupabase && supabase) {
        const { data, error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw new Error(error.message);
        if (!data.session?.access_token) throw new Error('Sign-in failed');
        setToken(data.session.access_token);
        const { user: u } = await api.me();
        setUser(u);
        return u;
      }
      const { token, user: u } = await api.login({ email, password });
      setToken(token);
      setUser(u);
      return u;
    },
    [useSupabase]
  );

  const register = useCallback(
    async (data: { fullName: string; email: string; password: string; phone?: string }) => {
      if (useSupabase && supabase) {
        const redirectTo = authCallbackUrl();
        const { data: authData, error } = await supabase.auth.signUp({
          email: data.email,
          password: data.password,
          options: {
            data: { full_name: data.fullName, role: 'OWNER', phone: data.phone || null },
            emailRedirectTo: redirectTo,
          },
        });
        if (error) throw new Error(error.message);
        const token = authData.session?.access_token;
        if (!token) {
          throw new Error('CHECK_EMAIL: We sent a confirmation link to your inbox. Open it to finish signing up.');
        }
        setToken(token);
        const u = await syncProfileAfterAuth(
          { fullName: data.fullName, role: 'OWNER', phone: data.phone },
          token
        );
        setUser(u);
        return;
      }
      const { token, user: u } = await api.register(data);
      setToken(token);
      setUser(u);
    },
    [useSupabase]
  );

  const registerBuyer = useCallback(
    async (data: { fullName: string; email: string; password: string; phone?: string }) => {
      if (useSupabase && supabase) {
        const redirectTo = authCallbackUrl();
        const { data: authData, error } = await supabase.auth.signUp({
          email: data.email,
          password: data.password,
          options: {
            data: { full_name: data.fullName, role: 'BUYER', phone: data.phone || null },
            emailRedirectTo: redirectTo,
          },
        });
        if (error) throw new Error(error.message);
        const token = authData.session?.access_token;
        if (!token) {
          throw new Error('CHECK_EMAIL: We sent a confirmation link to your inbox. Open it to finish signing up.');
        }
        setToken(token);
        const u = await syncProfileAfterAuth(
          { fullName: data.fullName, role: 'BUYER', phone: data.phone },
          token
        );
        setUser(u);
        return u;
      }
      const { token, user: u } = await api.registerBuyer(data);
      setToken(token);
      setUser(u);
      return u;
    },
    [useSupabase]
  );

  const registerShop = useCallback(
    async (data: {
      fullName: string;
      email: string;
      password: string;
      phone?: string;
      shopName: string;
      address?: string;
    }) => {
      if (useSupabase && supabase) {
        const redirectTo = authCallbackUrl();
        const { data: authData, error } = await supabase.auth.signUp({
          email: data.email,
          password: data.password,
          options: {
            data: {
              full_name: data.fullName,
              role: 'SHOP',
              phone: data.phone || null,
              shop_name: data.shopName,
              address: data.address || null,
            },
            emailRedirectTo: redirectTo,
          },
        });
        if (error) throw new Error(error.message);
        const token = authData.session?.access_token;
        if (!token) {
          throw new Error('CHECK_EMAIL: We sent a confirmation link to your inbox. Open it to finish signing up.');
        }
        setToken(token);
        const u = await syncProfileAfterAuth(
          {
            fullName: data.fullName,
            role: 'SHOP',
            phone: data.phone,
            shopName: data.shopName,
            address: data.address,
          },
          token
        );
        setUser(u);
        return;
      }
      const { token, user: u } = await api.registerShop(data);
      setToken(token);
      setUser(u);
    },
    [useSupabase]
  );

  const logout = useCallback(() => {
    if (useSupabase && supabase) supabase.auth.signOut().catch(() => {});
    setToken(null);
    setUser(null);
  }, [useSupabase]);

  const value = useMemo(
    () => ({ user, loading, login, register, registerBuyer, registerShop, logout, refreshUser }),
    [user, loading, login, register, registerBuyer, registerShop, logout, refreshUser]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
