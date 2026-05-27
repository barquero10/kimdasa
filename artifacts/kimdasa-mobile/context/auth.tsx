import AsyncStorage from "@react-native-async-storage/async-storage";
import { login, setAuthTokenGetter } from "@workspace/api-client-react";
import React, { createContext, useContext, useEffect, useState } from "react";

const TOKEN_KEY = "kimdasa_auth_token";
let _currentToken: string | null = null;

setAuthTokenGetter(() => _currentToken);

interface AuthContextValue {
  token: string | null;
  isLoading: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    AsyncStorage.getItem(TOKEN_KEY).then((t) => {
      _currentToken = t;
      setToken(t);
      setIsLoading(false);
    });
  }, []);

  const signIn = async (email: string, password: string) => {
    const res = await login({ email, password });
    _currentToken = res.token;
    setToken(res.token);
    await AsyncStorage.setItem(TOKEN_KEY, res.token);
  };

  const signOut = async () => {
    _currentToken = null;
    setToken(null);
    await AsyncStorage.removeItem(TOKEN_KEY);
  };

  return (
    <AuthContext.Provider value={{ token, isLoading, signIn, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
