'use client';

import { createContext, useContext, useEffect, useState, ReactNode, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { jwtDecode } from 'jwt-decode'; // <--- USAMOS LA LIBRERÍA

// Definimos la estructura exacta que viene dentro de tu token JWT
interface JwtPayload {
  sub: string;
  email: string;
  role: 'STUDENT' | 'INSTRUCTOR' | 'ADMIN' | 'OWNER';
  orgId?: string;
  fullName?: string;
  avatarUrl?: string;
  exp?: number;
}

export interface User {
  id: string;
  email: string;
  role: 'STUDENT' | 'INSTRUCTOR' | 'ADMIN' | 'OWNER';
  organizationId: string | null;
  fullName?: string;
  avatarUrl?: string;
}

interface AuthContextType {
  user: User | null;
  token: string | null;
  isLoading: boolean;
  login: (token: string, user: User) => void;
  loginWithToken: (token: string) => void;
  logout: () => void;
  isAuthenticated: boolean;
}

const setCookie = (name: string, value: string, days: number) => {
  const expires = new Date(Date.now() + days * 864e5).toUTCString();
  document.cookie = `${name}=${encodeURIComponent(value)}; expires=${expires}; path=/; SameSite=Lax`; 
};

const deleteCookie = (name: string) => {
  document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/`;
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();

  const login = useCallback((newToken: string, newUser: User) => {
    console.log("💾 AuthContext: Guardando sesión...", newUser);
    setToken(newToken);
    setUser(newUser);
    
    localStorage.setItem('token', newToken);
    localStorage.setItem('user', JSON.stringify(newUser));

    setCookie('token', newToken, 7);
    setCookie('role', newUser.role, 7);
  }, []);

  const logout = useCallback(() => {
    setToken(null);
    setUser(null);
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    localStorage.removeItem('auth_intent');
    deleteCookie('token');
    deleteCookie('role');
    router.push('/login');
  }, [router]);

  // --- NUEVA VERSIÓN ROBUSTA ---
  const loginWithToken = useCallback((newToken: string) => {
    try {
      console.log("🔍 AuthContext: Decodificando token...");
      
      // Usamos la librería para decodificar
      const decoded = jwtDecode<JwtPayload>(newToken);
      
      console.log("✅ AuthContext: Token válido. Datos:", decoded);

      const userData: User = {
        id: decoded.sub, 
        email: decoded.email,
        role: decoded.role || 'STUDENT',
        organizationId: decoded.orgId || null,
        fullName: decoded.fullName || '',
        avatarUrl: decoded.avatarUrl || ''
      };

      login(newToken, userData);
      
    } catch (error) {
      console.error("❌ AuthContext: Error crítico al leer el token:", error);
    }
  }, [login]);

  useEffect(() => {
    const storedToken = localStorage.getItem('token');
    const storedUser = localStorage.getItem('user');

    if (storedToken && storedUser) {
      try {
        setToken(storedToken);
        setUser(JSON.parse(storedUser));
      } catch (error) {
        console.error("Error recuperando sesión:", error);
        localStorage.removeItem('token');
        localStorage.removeItem('user');
      }
    }
    setIsLoading(false);
  }, []);

  return (
    <AuthContext.Provider 
      value={{ user, token, isLoading, login, loginWithToken, logout, isAuthenticated: !!user }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth debe usarse dentro de un AuthProvider');
  return context;
};