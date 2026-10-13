"use client";

import React, { createContext, useContext, useEffect, useState, useCallback } from "react";
import { AuthUser, UserRole } from "@/lib/api/types";
import { authApi } from "@/lib/api/auth";

export type AuthStatus = "loading" | "authenticated" | "unauthenticated" | "backend_offline";

interface AuthContextType {
  user: AuthUser | null;
  status: AuthStatus;
  role: UserRole | null;
  error: string | null;
  refreshSession: () => Promise<void>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  status: "loading",
  role: null,
  error: null,
  refreshSession: async () => {},
  signOut: async () => {},
});

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [status, setStatus] = useState<AuthStatus>("loading");
  const [error, setError] = useState<string | null>(null);

  const refreshSession = useCallback(async () => {
    try {
      const res = await authApi.getSession();
      if (res.authenticated && res.user) {
        setUser(res.user);
        setStatus("authenticated");
      } else {
        setUser(null);
        if (res.error?.includes("offline")) {
          setStatus("backend_offline");
        } else {
          setStatus("unauthenticated");
        }
      }
    } catch (err: unknown) {
      setUser(null);
      setStatus("backend_offline");
      setError(err instanceof Error ? err.message : "Authentication service unreachable");
    }
  }, []);

  const signOut = useCallback(async () => {
    try {
      await authApi.signOut();
    } catch {
      // Ignored during client cleanup
    } finally {
      setUser(null);
      setStatus("unauthenticated");
    }
  }, []);

  useEffect(() => {
    let ignore = false;
    async function initSession() {
      try {
        const res = await authApi.getSession();
        if (ignore) return;
        if (res.authenticated && res.user) {
          setUser(res.user);
          setStatus("authenticated");
        } else {
          setUser(null);
          setStatus(res.error?.includes("offline") ? "backend_offline" : "unauthenticated");
        }
      } catch (err: unknown) {
        if (ignore) return;
        setUser(null);
        setStatus("backend_offline");
        setError(err instanceof Error ? err.message : "Authentication service unreachable");
      }
    }

    initSession();
    return () => {
      ignore = true;
    };
  }, []);

  return (
    <AuthContext.Provider
      value={{
        user,
        status,
        role: user?.role ?? null,
        error,
        refreshSession,
        signOut,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export function useAuth(): AuthContextType {
  return useContext(AuthContext);
}
