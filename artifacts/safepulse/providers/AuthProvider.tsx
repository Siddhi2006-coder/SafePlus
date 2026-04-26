import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { setAuthTokenGetter } from "@workspace/api-client-react";

import { storage } from "@/lib/storage";

const TOKEN_KEY = "safepulse.token";
const USER_KEY = "safepulse.user";

export type AuthUser = {
  id: number;
  name: string;
  email: string;
  phone: string;
  createdAt: string;
};

type AuthState = {
  ready: boolean;
  token: string | null;
  user: AuthUser | null;
  signIn: (token: string, user: AuthUser) => Promise<void>;
  signOut: () => Promise<void>;
  setUser: (user: AuthUser) => Promise<void>;
};

const AuthContext = createContext<AuthState | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [ready, setReady] = useState(false);
  const [token, setToken] = useState<string | null>(null);
  const [user, setUserState] = useState<AuthUser | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const [t, u] = await Promise.all([
        storage.get(TOKEN_KEY),
        storage.get(USER_KEY),
      ]);
      if (cancelled) return;
      setToken(t);
      if (u) {
        try {
          setUserState(JSON.parse(u));
        } catch {
          setUserState(null);
        }
      }
      setReady(true);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  // Wire token to the API client
  useEffect(() => {
    setAuthTokenGetter(() => token);
    return () => {
      setAuthTokenGetter(null);
    };
  }, [token]);

  const signIn = useCallback(async (newToken: string, newUser: AuthUser) => {
    setToken(newToken);
    setUserState(newUser);
    await Promise.all([
      storage.set(TOKEN_KEY, newToken),
      storage.set(USER_KEY, JSON.stringify(newUser)),
    ]);
  }, []);

  const signOut = useCallback(async () => {
    setToken(null);
    setUserState(null);
    await Promise.all([storage.remove(TOKEN_KEY), storage.remove(USER_KEY)]);
  }, []);

  const setUser = useCallback(async (newUser: AuthUser) => {
    setUserState(newUser);
    await storage.set(USER_KEY, JSON.stringify(newUser));
  }, []);

  const value = useMemo<AuthState>(
    () => ({ ready, token, user, signIn, signOut, setUser }),
    [ready, token, user, signIn, signOut, setUser],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthState {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside AuthProvider");
  return ctx;
}
