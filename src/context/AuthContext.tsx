import { signInWithPopup, signOut as firebaseSignOut } from 'firebase/auth';
import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { auth, googleProvider } from '../lib/firebase';
import { apiRequest, getStoredToken, setStoredToken } from '../services/api';

export interface UserProfile {
  id: number;
  name: string;
  email: string;
  role: 'instructor' | 'learner';
  preferred_language: 'en' | 'kn' | 'hi';
  auth_provider?: 'local' | 'google';
  avatar_url?: string | null;
}

export interface GooglePendingProfile {
  name: string;
  email: string;
  avatar_url: string | null;
}

export type GoogleAuthResult =
  | { status: 'authenticated'; user: UserProfile; isNewUser: boolean }
  | { status: 'needs_registration'; idToken: string; googleProfile: GooglePendingProfile };

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
  loginWithGoogle: (options?: {
    role?: 'instructor' | 'learner';
    preferred_language?: 'en' | 'kn' | 'hi';
    confirmSignup?: boolean;
  }) => Promise<GoogleAuthResult>;
  completeGoogleSignup: (
    idToken: string,
    role: 'instructor' | 'learner',
    preferred_language: 'en' | 'kn' | 'hi'
  ) => Promise<UserProfile>;
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

  const applyAuthenticatedSession = useCallback(
    async (token: string, nextUser: UserProfile) => {
      setStoredToken(token);
      setUser(nextUser);
      const lang = nextUser.preferred_language || 'en';
      localStorage.setItem('smarttech_lang', lang);
      await i18n.changeLanguage(lang);
      return nextUser;
    },
    [i18n]
  );

  const login = useCallback(
    async (email: string, password: string) => {
      const res = await apiRequest<{ token: string; user: UserProfile }>('/auth/login', {
        method: 'POST',
        body: JSON.stringify({ email, password }),
      });
      return applyAuthenticatedSession(res.token, res.user);
    },
    [applyAuthenticatedSession]
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
      return applyAuthenticatedSession(res.token, res.user);
    },
    [applyAuthenticatedSession]
  );

  const loginWithGoogle = useCallback(
    async (options?: {
      role?: 'instructor' | 'learner';
      preferred_language?: 'en' | 'kn' | 'hi';
      confirmSignup?: boolean;
    }): Promise<GoogleAuthResult> => {
      const credential = await signInWithPopup(auth, googleProvider);
      const idToken = await credential.user.getIdToken();
      const res = await apiRequest<
        | {
            needsRegistration: true;
            googleProfile: GooglePendingProfile;
          }
        | {
            needsRegistration?: false;
            token: string;
            user: UserProfile;
            isNewUser?: boolean;
          }
      >('/auth/google', {
        method: 'POST',
        body: JSON.stringify({
          idToken,
          role: options?.role ?? 'learner',
          preferred_language: options?.preferred_language ?? 'en',
          confirmSignup: options?.confirmSignup ?? false,
        }),
      });

      if ('needsRegistration' in res && res.needsRegistration) {
        return {
          status: 'needs_registration',
          idToken,
          googleProfile: res.googleProfile,
        };
      }

      if (!('token' in res)) {
        throw new Error('Authentication response missing session token.');
      }

      const authedUser = await applyAuthenticatedSession(res.token, res.user);
      return {
        status: 'authenticated',
        user: authedUser,
        isNewUser: Boolean(res.isNewUser),
      };
    },
    [applyAuthenticatedSession]
  );

  const completeGoogleSignup = useCallback(
    async (
      idToken: string,
      role: 'instructor' | 'learner',
      preferred_language: 'en' | 'kn' | 'hi'
    ) => {
      const res = await apiRequest<{ token: string; user: UserProfile }>('/auth/google', {
        method: 'POST',
        body: JSON.stringify({
          idToken,
          role,
          preferred_language,
          confirmSignup: true,
        }),
      });
      return applyAuthenticatedSession(res.token, res.user);
    },
    [applyAuthenticatedSession]
  );

  const logout = useCallback(() => {
    setStoredToken(null);
    setUser(null);
    firebaseSignOut(auth).catch(() => {});
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
    <AuthContext.Provider
      value={{
        user,
        loading,
        login,
        register,
        loginWithGoogle,
        completeGoogleSignup,
        logout,
        changeLanguage,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider');
  return ctx;
}
