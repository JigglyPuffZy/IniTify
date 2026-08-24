import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import type { AuthUser } from '@/src/models/auth';
import { authService } from '@/src/services/auth/auth.service';
import { clearSupabaseUserCache } from '@/src/services/database/supabase-sync.service';

interface AuthContextValue {
  user: AuthUser | null;
  isLoading: boolean;
  usesSupabase: boolean;
  signIn: (email: string, password: string) => Promise<{ ok: boolean; message: string }>;
  signUp: (
    email: string,
    password: string,
    displayName?: string | null,
  ) => Promise<{ ok: boolean; message: string; needsEmailConfirm?: boolean }>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let active = true;

    async function bootstrap() {
      try {
        const session = await authService.getSession();
        if (active) setUser(session);
      } finally {
        if (active) setIsLoading(false);
      }
    }

    bootstrap();
    const unsubscribe = authService.onAuthStateChange((nextUser) => {
      if (active) setUser(nextUser);
    });

    return () => {
      active = false;
      unsubscribe();
    };
  }, []);

  const signIn = useCallback(async (email: string, password: string) => {
    clearSupabaseUserCache();
    const result = await authService.signIn(email, password);
    if (result.user) setUser(result.user);
    return { ok: result.ok, message: result.message };
  }, []);

  const signUp = useCallback(
    async (email: string, password: string, displayName?: string | null) => {
      clearSupabaseUserCache();
      const result = await authService.signUp(email, password, displayName ?? null);
      if (result.user) setUser(result.user);
      return {
        ok: result.ok,
        message: result.message,
        needsEmailConfirm: result.ok && !result.user,
      };
    },
    [],
  );

  const signOut = useCallback(async () => {
    await authService.signOut();
    clearSupabaseUserCache();
    setUser(null);
  }, []);

  const value = useMemo(
    () => ({
      user,
      isLoading,
      usesSupabase: authService.usesSupabase(),
      signIn,
      signUp,
      signOut,
    }),
    [user, isLoading, signIn, signUp, signOut],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
