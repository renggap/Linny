import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { authApi, fetchCsrfToken } from '../services/api';
import { User } from '../types';

interface AuthContextType {
  user: User | null;
  login: (email: string, password: string) => Promise<void>;
  register: (name: string, email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
  isLoading: boolean;
  isAuthenticated: boolean;
  error: string | null;
  clearError: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

interface AuthProviderProps {
  children: ReactNode;
}

export function AuthProvider({ children }: AuthProviderProps) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const isAuthenticated = !!user;

  // Check for existing session on mount
  useEffect(() => {
    const checkSession = async () => {
      console.log('[AuthContext] Checking session...');
      // Fetch CSRF token for authenticated session
      try {
        await fetchCsrfToken();
      } catch (e) {
        console.error('[AuthContext] Failed to fetch CSRF token:', e);
      }
      try {
        const currentUser = await authApi.getCurrentUser();
        console.log('[AuthContext] Session valid, user:', currentUser);
        setUser(currentUser);
      } catch (e) {
        console.log('[AuthContext] No valid session:', e);
        // Token is invalid, will be cleared by server
      }
      setIsLoading(false);
    };

    checkSession();
  }, []);

  const login = async (email: string, password: string) => {
    console.log('[AuthContext] login called with:', email);
    setError(null);
    setIsLoading(true);
    try {
      console.log('[AuthContext] Calling authApi.login...');
      const data = await authApi.login(email, password);
      console.log('[AuthContext] Login response received:', data);
      // Fetch CSRF token after successful login
      await fetchCsrfToken();
      console.log('[AuthContext] Setting user:', data.user);
      setUser(data.user);
      console.log('[AuthContext] User set successfully');
    } catch (err) {
      console.log('[AuthContext] Login error:', err);
      const message = err instanceof Error ? err.message : 'Login failed';
      setError(message);
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  const register = async (name: string, email: string, password: string) => {
    setError(null);
    setIsLoading(true);
    try {
      const data = await authApi.register(name, email, password);
      // Fetch CSRF token after successful registration
      await fetchCsrfToken();
      setUser(data.user);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Registration failed';
      setError(message);
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  const logout = async () => {
    setIsLoading(true);
    try {
      await authApi.logout();
    } catch {
      // Ignore logout errors
    } finally {
      setUser(null);
      setIsLoading(false);
    }
  };

  const clearError = () => {
    setError(null);
  };

  const refreshUser = async () => {
    if (!isAuthenticated) return;
    try {
      const currentUser = await authApi.getCurrentUser();
      setUser(currentUser);
    } catch (error) {
      console.error('Failed to refresh user:', error);
    }
  };

  const value: AuthContextType = {
    user,
    login,
    register,
    logout,
    refreshUser,
    isLoading,
    isAuthenticated,
    error,
    clearError
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
