'use client';
import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from 'react';

interface UserInfo {
  id: string;
  phone: string;
  name: string;
  credits: number;
}

interface AuthContextType {
  user: UserInfo | null;
  token: string | null;
  loading: boolean;
  login: (phone: string, password: string) => Promise<string | null>;
  register: (phone: string, password: string, name: string) => Promise<string | null>;
  logout: () => void;
  refreshCredits: () => Promise<void>;
  deductCredits: (amount: number) => Promise<boolean>;
  sendVerifyCode: (target: string, type: 'sms' | 'email') => Promise<string | null>;
  resetPassword: (target: string, code: string, newPassword: string) => Promise<string | null>;
}

const AuthContext = createContext<AuthContextType | null>(null);

const TOKEN_KEY = 'ziwei_auth_token';

async function fetchAPI(url: string, options?: RequestInit) {
  return fetch(url, {
    ...options,
    headers: { 'Content-Type': 'application/json', ...options?.headers },
  });
}

async function fetchWithAuth(url: string, token: string | null, options?: RequestInit) {
  return fetch(url, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options?.headers,
    },
  });
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<UserInfo | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const savedToken = localStorage.getItem(TOKEN_KEY);
    if (savedToken) {
      setToken(savedToken);
      fetchWithAuth('/api/auth/me', savedToken)
        .then(r => r.json())
        .then(res => {
          if (res.ok) setUser(res.data);
          else localStorage.removeItem(TOKEN_KEY);
        })
        .catch(() => localStorage.removeItem(TOKEN_KEY))
        .finally(() => setLoading(false));
    } else {
      setLoading(false);
    }
  }, []);

  const login = useCallback(async (phone: string, password: string): Promise<string | null> => {
    const res = await fetchAPI('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ phone, password }),
    });
    const data = await res.json();
    if (data.ok) {
      localStorage.setItem(TOKEN_KEY, data.data.token);
      setToken(data.data.token);
      setUser(data.data.user);
      return null;
    }
    return data.error || '登录失败';
  }, []);

  const register = useCallback(async (phone: string, password: string, name: string): Promise<string | null> => {
    const res = await fetchAPI('/api/auth/register', {
      method: 'POST',
      body: JSON.stringify({ phone, password, name }),
    });
    const data = await res.json();
    if (data.ok) {
      localStorage.setItem(TOKEN_KEY, data.data.token);
      setToken(data.data.token);
      setUser(data.data.user);
      return null;
    }
    return data.error || '注册失败';
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem(TOKEN_KEY);
    setToken(null);
    setUser(null);
  }, []);

  const refreshCredits = useCallback(async () => {
    if (!token) return;
    const res = await fetchWithAuth('/api/user/credits', token);
    const data = await res.json();
    if (data.ok && user) {
      setUser(prev => prev ? { ...prev, credits: data.data.credits } : null);
    }
  }, [token, user]);

  const deductCredits = useCallback(async (amount: number): Promise<boolean> => {
    if (!token) return false;
    const res = await fetchWithAuth('/api/user/credits', token, {
      method: 'POST',
      body: JSON.stringify({ amount, action: 'deduct' }),
    });
    const data = await res.json();
    if (data.ok) {
      setUser(prev => prev ? { ...prev, credits: data.data.credits } : null);
      return true;
    }
    return false;
  }, [token]);

  const sendVerifyCode = useCallback(async (target: string, type: 'sms' | 'email'): Promise<string | null> => {
    const res = await fetchAPI('/api/auth/send-code', {
      method: 'POST',
      body: JSON.stringify({ target, type }),
    });
    const data = await res.json();
    if (data.ok) return null;
    return data.error || '发送失败';
  }, []);

  const resetPassword = useCallback(async (target: string, code: string, newPassword: string): Promise<string | null> => {
    const res = await fetchAPI('/api/auth/reset-password', {
      method: 'POST',
      body: JSON.stringify({ target, code, newPassword }),
    });
    const data = await res.json();
    if (data.ok) {
      localStorage.setItem(TOKEN_KEY, data.data.token);
      setToken(data.data.token);
      setUser(data.data.user);
      return null;
    }
    return data.error || '重置失败';
  }, []);

  return (
    <AuthContext.Provider value={{ user, token, loading, login, register, logout, refreshCredits, deductCredits, sendVerifyCode, resetPassword }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
