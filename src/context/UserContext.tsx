/**
 * UserContext — Current user identity and profile.
 *
 * TASK_OWNERSHIP_RULES.md §3: Every task has exactly one owner.
 * This context resolves the current user once on mount and makes
 * the userId, display name, email, and avatar available to all views.
 *
 * Profile edits (name, email, avatar) are persisted to Supabase via
 * updateProfile() so they survive browser clears / device changes.
 */

import { createContext, useContext, useEffect, useState, useCallback } from 'react';
import type { ReactNode } from 'react';
import type { User } from '../types/database';
import { getOrCreateUser, updateUser } from '../lib/database';

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
  const [userId, setUserId] = useState<string | null>(null);
  const [displayName, setDisplayName] = useState('');
  const [email, setEmail] = useState('');
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getOrCreateUser('local@fplan.app', 'User')
      .then((u) => {
        setUserId(u.id);
        setDisplayName(u.display_name);
        setEmail(u.email);
        setAvatarUrl(u.avatar_url);
      })
      .catch((err) => console.error('Failed to resolve current user:', err))
      .finally(() => setLoading(false));
  }, []);

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

export function useCurrentUser(): UserContextType {
  const ctx = useContext(UserContext);
  if (ctx === undefined) {
    throw new Error('useCurrentUser must be used within UserProvider');
  }
  return ctx;
}
