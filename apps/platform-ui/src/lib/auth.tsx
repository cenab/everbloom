import {
  createContext,
  useContext,
  useState,
  useCallback,
  useEffect,
  type ReactNode,
} from 'react';
import type { User as SupabaseUser, Session } from '@supabase/supabase-js';
import { supabase, getAccessToken } from './supabase';

interface AuthContextValue {
  user: SupabaseUser | null;
  session: Session | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  signInWithMagicLink: (email: string) => Promise<{ error: Error | null }>;
  signOut: () => Promise<void>;
  getToken: () => Promise<string | null>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

/**
 * Auth provider that manages Supabase Auth session.
 * Uses magic link authentication for passwordless sign-in.
 */
export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<SupabaseUser | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Initialize auth state
  useEffect(() => {
    // Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      setIsLoading(false);
    });

    // Listen for auth state changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        setSession(session);
        setUser(session?.user ?? null);
        setIsLoading(false);
      }
    );

    return () => subscription.unsubscribe();
  }, []);

  /**
   * Sign in with magic link.
   * Sends an email with a sign-in link.
   */
  const signInWithMagicLink = useCallback(async (email: string) => {
    const redirectBase = import.meta.env.VITE_PLATFORM_URL;
    let redirectUrl = `${window.location.origin}/auth/callback`;
    if (redirectBase) {
      try {
        redirectUrl = new URL('/auth/callback', redirectBase).toString();
      } catch {
        // Fall back to current origin if VITE_PLATFORM_URL is invalid.
      }
    }

    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: {
        emailRedirectTo: redirectUrl,
      },
    });

    return { error };
  }, []);

  /**
   * Sign out the current user.
   */
  const signOut = useCallback(async () => {
    await supabase.auth.signOut();
    setUser(null);
    setSession(null);
  }, []);

  /**
   * Get the current access token for API calls.
   */
  const getToken = useCallback(async () => {
    return getAccessToken();
  }, []);

  const value: AuthContextValue = {
    user,
    session,
    isLoading,
    isAuthenticated: !!user,
    signInWithMagicLink,
    signOut,
    getToken,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

/**
 * Hook to access auth context
 */
export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

/**
 * Get stored auth token for API calls.
 * Synchronous version that reads from Supabase localStorage cache.
 * For components that haven't migrated to async yet.
 */
export function getAuthToken(): string | null {
  // Check Supabase's localStorage cache directly for synchronous access
  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
  if (!supabaseUrl) return null;

  const projectRef = supabaseUrl.replace(/https?:\/\//, '').split('.')[0];
  const storageKey = `sb-${projectRef}-auth-token`;
  const storedSession = localStorage.getItem(storageKey);

  if (!storedSession) return null;

  try {
    const session = JSON.parse(storedSession);
    return session?.access_token ?? null;
  } catch {
    return null;
  }
}
