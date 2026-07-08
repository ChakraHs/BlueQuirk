"use client";
import { createContext, useContext, useState, useEffect } from "react";
import api, { storeTokens, clearTokens } from "@/services/api";
import { TOKEN_KEY } from "@/lib/auth";

type User = {
  id: number;
  email: string;
  name: string;
  emailVerified: boolean;
  roles: string[];
};

type AuthContextType = {
  user: User | null;
  token: string | null;
  login: (email: string, password: string, rememberMe?: boolean) => Promise<void>;
  logout: () => void;
  isAuthenticated: boolean;
  isAdmin: boolean;
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);

  useEffect(() => {
    const savedToken = localStorage.getItem(TOKEN_KEY);
    if (savedToken) {
      setToken(savedToken);
      fetchMe();
    }
  }, []);

  async function fetchMe() {
    try {
      const { data } = await api.get<User>("/account/me");
      setUser(data);
    } catch {
      doLogout();
    }
  }

  async function login(email: string, password: string, rememberMe = false) {
    const { data } = await api.post<{
      accessToken: string;
      refreshToken: string;
      user: User;
    }>("/auth/login", { email, password, rememberMe });
    storeTokens(data.accessToken, data.refreshToken);
    setToken(data.accessToken);
    setUser(data.user);
  }

  function doLogout() {
    clearTokens();
    setToken(null);
    setUser(null);
  }

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        login,
        logout: doLogout,
        isAuthenticated: !!user,
        isAdmin: !!user?.roles?.includes("admin"),
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside AuthProvider");
  return ctx;
}
