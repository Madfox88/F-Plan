/**
 * UserContext — Current user identity for ownership enforcement.
 *
 * TASK_OWNERSHIP_RULES.md §3: Every task has exactly one owner.
 * This context resolves the current user once on mount and makes
 * the userId available to all views that create or query tasks.
 */

import { createContext, useContext, useEffect, useState } from 'react';
import type { ReactNode } from 'react';
import { getOrCreateUser } from '../lib/database';

interface UserContextType {
  userId: string | null;
  loading: boolean;
}

const UserContext = createContext<UserContextType | undefined>(undefined);

export function UserProvider({ children }: { children: ReactNode }) {
  const [userId, setUserId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getOrCreateUser('local@fplan.app', 'Me')
      .then((u) => setUserId(u.id))
      .catch((err) => console.error('Failed to resolve current user:', err))
      .finally(() => setLoading(false));
  }, []);

  return (
    <UserContext.Provider value={{ userId, loading }}>
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
