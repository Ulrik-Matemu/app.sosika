// src/context/AuthContext.tsx
import React, { createContext, useState, useEffect, ReactNode } from 'react';
import { jwtDecode } from 'jwt-decode';

interface DecodedToken {
  exp: number;
  email?: string;
  [key: string]: any;
}

interface AuthContextType {
  user: DecodedToken | null;
  authToken: string | null;
  login: (token: string) => void;
  logout: () => void;
}

export const AuthContext = createContext<AuthContextType | undefined>(undefined);

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [authToken, setAuthToken] = useState<string | null>(null);
  const [user, setUser] = useState<DecodedToken | null>(null);

  // Auto-login on app start
  useEffect(() => {
    const token = localStorage.getItem('authToken');
    if (token && isTokenValid(token)) {
      setAuthToken(token);
      setUser(jwtDecode<DecodedToken>(token));
    } else {
      logout(); // clear invalid token
    }
  }, []);

  const login = (token: string) => {
    localStorage.setItem('authToken', token);
    setAuthToken(token);
    setUser(jwtDecode<DecodedToken>(token));
  };

  const logout = () => {
    localStorage.removeItem('authToken');
    setAuthToken(null);
    setUser(null);
  };

  const isTokenValid = (token: string): boolean => {
    try {
      const decoded = jwtDecode<DecodedToken>(token);
      return decoded.exp * 1000 > Date.now();
    } catch {
      return false;
    }
  };

  return (
    <AuthContext.Provider value={{ user, authToken, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
};
