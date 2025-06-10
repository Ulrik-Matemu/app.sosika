// src/contexts/AuthContext.ts
import { createContext, useState, useEffect, useMemo, type ReactNode } from 'react';

interface AuthContextType {
  token: string | null;
  email: string | null;
  userId: string | null;
  login: (token: string, userId: string, email: string) => void;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

interface AuthProviderProps {
  children: ReactNode;
}

const AuthProvider = ({ children }: AuthProviderProps) => {
  const [token, setToken] = useState<string | null>(null);
  const [email, setEmail] = useState<string | null>(null);
  const [userId, setUserId] = useState<string | null>(null);

  useEffect(() => {
    const storedToken = localStorage.getItem('authToken');
    const storedUserId = localStorage.getItem('userId');
    const storedEmail = localStorage.getItem('email');

    if (storedToken && storedUserId && storedEmail) {
      setToken(storedToken);
      setUserId(storedUserId);
      setEmail(storedEmail);
    }
  }, []);

  const login = (token: string, userId: string, email: string) => {
    localStorage.setItem('authToken', token);
    localStorage.setItem('userId', userId);
    localStorage.setItem('email', email);
    setToken(token);
    setUserId(userId);
    setEmail(email);
  };

  const logout = () => {
    localStorage.removeItem('authToken');
    localStorage.removeItem('userId');
    localStorage.removeItem('email');
    setToken(null);
    setUserId(null);
    setEmail(null);
  };

  const value = useMemo(
    () => ({ token, userId, email, login, logout }),
    [token, userId, email]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export { AuthContext, AuthProvider };
