'use client';

import { createContext, useContext, useEffect, useRef, useState, ReactNode } from 'react';
import { authService, UserRoleResponse, CurrentUserDto } from '@/lib/auth';
import { useRouter } from 'next/navigation';

interface AuthContextType {
  isAuthenticated: boolean;
  token: string | null;
  login: (username: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  isLoading: boolean;
  userRole: string | null;
  userData: UserRoleResponse | null;
  currentUser: CurrentUserDto | null;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [userRole, setUserRole] = useState<string | null>(null);
  const [userData, setUserData] = useState<UserRoleResponse | null>(null);
  const [currentUser, setCurrentUser] = useState<CurrentUserDto | null>(null);
  const logoutTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const router = useRouter();

  // Decode JWT payload and return exp (in seconds) or null
  const getTokenExpiry = (jwt: string | null): number | null => {
    if (!jwt) return null;
    const parts = jwt.split('.');
    if (parts.length < 2) return null;
    try {
      const base64 = parts[1].replace(/-/g, '+').replace(/_/g, '/');
      if (typeof atob !== 'function') return null;
      const json = atob(base64);
      const payload = JSON.parse(json);
      if (typeof payload.exp === 'number') return payload.exp; // seconds since epoch
      return null;
    } catch {
      return null;
    }
  };

  useEffect(() => {
    // Check if user is already authenticated on mount
    const storedToken = authService.getStoredToken();
    const storedUserRole = authService.getUserRole();
    const storedUserData = authService.getUserData();
    const storedCurrentUser = authService.getCurrentUser();
    
    if (storedToken) {
      const exp = getTokenExpiry(storedToken);
      const nowSec = Math.floor(Date.now() / 1000);
      if (exp && exp <= nowSec) {
        // Token already expired; force logout immediately
        authService.logout().finally(() => {
          setToken(null);
          setIsAuthenticated(false);
          setUserRole(null);
          setUserData(null);
          setCurrentUser(null);
          router.replace('/login');
        });
      } else {
        setToken(storedToken);
        setIsAuthenticated(true);
        setUserRole(storedUserRole);
        setUserData(storedUserData);
        setCurrentUser(storedCurrentUser);
      }
    }
    setIsLoading(false);
  }, []);

  const login = async (username: string, password: string) => {
    setIsLoading(true);
    try {
      const response = await authService.login({ username, password });
      setToken(response.token);
      setIsAuthenticated(true);
      
      // Update role and user data after login
      const storedUserRole = authService.getUserRole();
      const storedUserData = authService.getUserData();
      const storedCurrentUser = authService.getCurrentUser();
      setUserRole(storedUserRole);
      setUserData(storedUserData);
      setCurrentUser(storedCurrentUser);
    } catch (error) {
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const logout = async () => {
    try {
      await authService.logout();
      setToken(null);
      setIsAuthenticated(false);
      setUserRole(null);
      setUserData(null);
      setCurrentUser(null);
      router.replace('/login');
    } catch (error) {
      // Still clear local state even if API call fails
      setToken(null);
      setIsAuthenticated(false);
      setUserRole(null);
      setUserData(null);
      throw error;
    }
  };

  // When token changes, (re)start a timer to auto-logout at expiration
  useEffect(() => {
    // Clear any existing timer
    if (logoutTimerRef.current) {
      clearTimeout(logoutTimerRef.current);
      logoutTimerRef.current = null;
    }

    if (!token) return;

    const exp = getTokenExpiry(token);
    if (!exp) return; // Can't determine expiry; skip timer

    const nowMs = Date.now();
    const expMs = exp * 1000;
    const delay = expMs - nowMs;

    if (delay <= 0) {
      // Already expired; logout immediately
      logout();
      return;
    }

    logoutTimerRef.current = setTimeout(() => {
      logout();
    }, delay);

    return () => {
      if (logoutTimerRef.current) {
        clearTimeout(logoutTimerRef.current);
        logoutTimerRef.current = null;
      }
    };
  }, [token]);

  return (
    <AuthContext.Provider value={{
      isAuthenticated,
      token,
      login,
      logout,
      isLoading,
      userRole,
      userData,
      currentUser
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
