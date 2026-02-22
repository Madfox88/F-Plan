/**
 * UserContext — Current user profile from public.users.
 *
 * Reads the auth session from AuthContext, then fetches/syncs
 * the corresponding public.users row. Provides userId, display name,
 * email, avatar, and a updateProfile() helper.
 *
 * TASK_OWNERSHIP_RULES.md §3: Every task has exactly one owner.
 * This context resolves the current user identity for all views.
 */

import { createContext, useContext, useEffect, useState, useCallback } from 'react';
import type { ReactNode } from 'react';
import type { User } from '../types/database';
import { updateUser } from '../lib/database';
import { useAuth } from './AuthContext';
import { supabase } from '../lib/supabase';

interface UserContextType {
  userId: string | null;
  displayName: string;
  email: string;
  avatarUrl: string | null;
  loading: boolean;
  /** Persist profile fields to Supabase and update local state. */
  updateProfile: (fields: Partial<Pick<User, 'display_name' | 'email' | 'avatar_url'>>) => Promise<void>;
}

const UserContext = createContext<UserContextType | undefined>(undefined);

export function UserProvider({ children }: { children: ReactNode }) {
  const { user: authUser, loading: authLoading, lastEvent } = useAuth();
  const [userId, setUserId] = useState<string | null>(null);
  const [displayName, setDisplayName] = useState('');
  const [email, setEmail] = useState('');
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  /* When auth user changes, fetch the public.users row */
  useEffect(() => {
    if (authLoading) return;

    if (!authUser) {
      setUserId(null);
      setDisplayName('');
      setEmail('');
      setAvatarUrl(null);
      setLoading(false);
      return;
    }

    const fetchProfile = async () => {
      try {
        const { data, error } = await supabase
          .from('users')
          .select('*')
          .eq('id', authUser.id)
          .maybeSingle();

        if (error) throw error;

        if (data) {
          setUserId(data.id);
          setDisplayName(data.display_name);
          setEmail(data.email);
          setAvatarUrl(data.avatar_url);
        } else {
          // Bridge trigger hasn't fired yet — fall back to auth metadata
          setUserId(authUser.id);
          setDisplayName(
            authUser.user_metadata?.display_name ??
            authUser.email?.split('@')[0] ??
            'User'
          );
          setEmail(authUser.email ?? '');
          setAvatarUrl(null);
        }
      } catch {
        // Fallback to auth metadata if profile fetch fails
        setUserId(authUser.id);
        setDisplayName(authUser.email?.split('@')[0] ?? 'User');
        setEmail(authUser.email ?? '');
        setAvatarUrl(null);
      } finally {
        setLoading(false);
      }
    };

    fetchProfile();
  }, [authUser, authLoading]);

  /* Re-fetch profile when Supabase fires USER_UPDATED (e.g. email confirmed) */
  useEffect(() => {
    if (lastEvent === 'USER_UPDATED' && authUser && userId) {
      supabase
        .from('users')
        .select('*')
        .eq('id', authUser.id)
        .maybeSingle()
        .then(({ data }) => {
          if (data) {
            setDisplayName(data.display_name);
            setEmail(data.email);
            setAvatarUrl(data.avatar_url);
          }
        });
    }
  }, [lastEvent, authUser, userId]);

  const updateProfile = useCallback(
    async (fields: Partial<Pick<User, 'display_name' | 'email' | 'avatar_url'>>) => {
      if (!userId) return;
      const updated = await updateUser(userId, fields);
      setDisplayName(updated.display_name);
      setEmail(updated.email);
      setAvatarUrl(updated.avatar_url);
    },
    [userId]
  );

  return (
    <UserContext.Provider value={{ userId, displayName, email, avatarUrl, loading, updateProfile }}>
      {children}
    </UserContext.Provider>
  );
}

// eslint-disable-next-line react-refresh/only-export-components
export function useCurrentUser(): UserContextType {
  const ctx = useContext(UserContext);
  if (ctx === undefined) {
    throw new Error('useCurrentUser must be used within UserProvider');
  }
  return ctx;
}
