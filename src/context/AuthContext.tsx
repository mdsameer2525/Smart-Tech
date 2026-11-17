import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { apiRequest, getStoredToken, setStoredToken } from '../services/api';

export interface UserProfile {
  id: number;
  name: string;
  email: string;
  role: 'instructor' | 'learner';
  preferred_language: 'en' | 'kn' | 'hi';
}

interface AuthContextValue {
  user: UserProfile | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<UserProfile>;
  register: (payload: {
    name: string;
    email: string;
    password: string;
    role: 'instructor' | 'learner';
    preferred_language: 'en' | 'kn' | 'hi';
  }) => Promise<UserProfile>;
  logout: () => void;
  changeLanguage: (lang: 'en' | 'kn' | 'hi') => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const { i18n } = useTranslation();

  useEffect(() => {
    const token = getStoredToken();
    if (!token) {
      setLoading(false);
      return;
    }

    apiRequest<{ user: UserProfile }>('/auth/me')
      .then((res) => {
        setUser(res.user);
        if (res.user.preferred_language && !localStorage.getItem('smarttech_lang')) {
          i18n.changeLanguage(res.user.preferred_language);
        }
      })
      .catch(() => {
        setStoredToken(null);
        setUser(null);
      })
      .finally(() => {
        setLoading(false);
      });
  }, [i18n]);

  const login = useCallback(
    async (email: string, password: string) => {
      const res = await apiRequest<{ token: string; user: UserProfile }>('/auth/login', {
        method: 'POST',
        body: JSON.stringify({ email, password }),
      });
      setStoredToken(res.token);
      setUser(res.user);
      const lang = res.user.preferred_language || 'en';
      localStorage.setItem('smarttech_lang', lang);
      await i18n.changeLanguage(lang);
      return res.user;
    },
    [i18n]
  );

  const register = useCallback(
    async (payload: {
      name: string;
      email: string;
      password: string;
      role: 'instructor' | 'learner';
      preferred_language: 'en' | 'kn' | 'hi';
    }) => {
      const res = await apiRequest<{ token: string; user: UserProfile }>('/auth/register', {
        method: 'POST',
        body: JSON.stringify(payload),
      });
      setStoredToken(res.token);
      setUser(res.user);
      localStorage.setItem('smarttech_lang', res.user.preferred_language);
      await i18n.changeLanguage(res.user.preferred_language);
      return res.user;
    },
    [i18n]
  );

  const logout = useCallback(() => {
    setStoredToken(null);
    setUser(null);
  }, []);

  const changeLanguage = useCallback(
    async (lang: 'en' | 'kn' | 'hi') => {
      localStorage.setItem('smarttech_lang', lang);
      await i18n.changeLanguage(lang);
      if (getStoredToken()) {
        try {
          await apiRequest('/auth/language', {
            method: 'PATCH',
            body: JSON.stringify({ language: lang }),
          });
          setUser((prev) => (prev ? { ...prev, preferred_language: lang } : prev));
        } catch {
          // Non-fatal if offline
        }
      }
    },
    [i18n]
  );

  return (
    <AuthContext.Provider value={{ user, loading, login, register, logout, changeLanguage }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider');
  return ctx;
}
