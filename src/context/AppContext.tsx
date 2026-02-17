import { createContext, useContext, useEffect, useState } from 'react';
import type { ReactNode } from 'react';
import type { Workspace } from '../types/database';
import { getOrCreateWorkspace } from '../lib/database';

interface AppContextType {
  workspace: Workspace | null;
  loading: boolean;
  error: string | null;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export function AppProvider({ children }: { children: ReactNode }) {
  const [workspace, setWorkspace] = useState<Workspace | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const initWorkspace = async () => {
      try {
        setLoading(true);
        const ws = await getOrCreateWorkspace();
        setWorkspace(ws);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load workspace');
      } finally {
        setLoading(false);
      }
    };

    initWorkspace();
  }, []);

  return (
    <AppContext.Provider value={{ workspace, loading, error }}>
      {children}
    </AppContext.Provider>
  );
}

export function useApp() {
  const context = useContext(AppContext);
  if (context === undefined) {
    throw new Error('useApp must be used within AppProvider');
  }
  return context;
}
