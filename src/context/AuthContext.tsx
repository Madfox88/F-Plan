/**
 * AuthContext — Supabase Auth session management.
 *
 * Wraps the entire app. Provides:
 *  - session / user from Supabase Auth
 *  - signUp, signIn, signOut, resetPassword, updateEmail, updatePassword
 *  - loading flag while the initial session is being resolved
 *
 * On sign-up a DB trigger copies auth.users → public.users
 * (see migration: create_auth_bridge_trigger.sql).
 */

import { createContext, useContext, useEffect, useState, useCallback } from 'react';
import type { ReactNode } from 'react';
import type { Session, User as AuthUser } from '@supabase/supabase-js';
import { supabase, supabaseConfigured } from '../lib/supabase';

/* ── Types ─────────────────────────────────────── */

interface AuthContextType {
  /** The current Supabase session (null when logged out). */
  session: Session | null;
  /** The auth user object (shortcut for session.user). */
  user: AuthUser | null;
  /** True while the initial session is being resolved on mount. */
  loading: boolean;

  /* Actions */
  signUp: (email: string, password: string, displayName: string) => Promise<{ error: string | null }>;
  signIn: (email: string, password: string) => Promise<{ error: string | null }>;
  signOut: () => Promise<void>;
  resetPassword: (email: string) => Promise<{ error: string | null }>;
  updateEmail: (newEmail: string) => Promise<{ error: string | null }>;
  updatePassword: (newPassword: string) => Promise<{ error: string | null }>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

/* ── Provider ──────────────────────────────────── */

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  /* On mount: resolve existing session + subscribe to changes */
  useEffect(() => {
    if (!supabaseConfigured) {
      setLoading(false);
      return;
    }

    // Get the current session
    supabase.auth.getSession().then(({ data: { session: s } }) => {
      setSession(s);
      setLoading(false);
    });

    // Listen for auth state changes (sign-in, sign-out, token refresh)
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, s) => {
      setSession(s);
    });

    return () => subscription.unsubscribe();
  }, []);

  /* ── Actions ─────────────────────────────────── */

  const signUp = useCallback(
    async (email: string, password: string, displayName: string): Promise<{ error: string | null }> => {
      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: { display_name: displayName },
        },
      });
      if (error) return { error: error.message };
      return { error: null };
    },
    []
  );

  const signIn = useCallback(async (email: string, password: string): Promise<{ error: string | null }> => {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) return { error: error.message };
    return { error: null };
  }, []);

  const signOut = useCallback(async () => {
    await supabase.auth.signOut();
    setSession(null);
  }, []);

  const resetPassword = useCallback(async (email: string): Promise<{ error: string | null }> => {
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    });
    if (error) return { error: error.message };
    return { error: null };
  }, []);

  const updateEmail = useCallback(async (newEmail: string): Promise<{ error: string | null }> => {
    const { error } = await supabase.auth.updateUser({ email: newEmail });
    if (error) return { error: error.message };
    return { error: null };
  }, []);

  const updatePassword = useCallback(async (newPassword: string): Promise<{ error: string | null }> => {
    const { error } = await supabase.auth.updateUser({ password: newPassword });
    if (error) return { error: error.message };
    return { error: null };
  }, []);

  return (
    <AuthContext.Provider
      value={{
        session,
        user: session?.user ?? null,
        loading,
        signUp,
        signIn,
        signOut,
        resetPassword,
        updateEmail,
        updatePassword,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

/* ── Hook ──────────────────────────────────────── */

export function useAuth(): AuthContextType {
  const ctx = useContext(AuthContext);
  if (ctx === undefined) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return ctx;
}
