import { createContext, useContext, useEffect, useState } from 'react';
import type { ReactNode } from 'react';
import type { Workspace } from '../types/database';
import { getWorkspaces, createWorkspace as createWorkspaceInDB } from '../lib/database';

interface WorkspaceContextType {
  workspaces: Workspace[];
  activeWorkspace: Workspace | null;
  loading: boolean;
  error: string | null;
  setActiveWorkspace: (id: string) => void;
  refreshWorkspaces: () => Promise<void>;
  createWorkspace: (name: string) => Promise<Workspace>;
}

const WorkspaceContext = createContext<WorkspaceContextType | undefined>(undefined);

const STORAGE_KEY = 'f-plan:activeWorkspaceId';

export function WorkspaceProvider({ children }: { children: ReactNode }) {
  const [workspaces, setWorkspaces] = useState<Workspace[]>([]);
  const [activeWorkspace, setActiveWorkspaceState] = useState<Workspace | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Load workspaces
  const loadWorkspaces = async () => {
    try {
      setLoading(true);
      const ws = await getWorkspaces();
      setWorkspaces(ws);

      // Restore active workspace from localStorage or use first
      const savedId = localStorage.getItem(STORAGE_KEY);
      const active =
        ws.find((w) => w.id === savedId) || ws[0] || null;

      if (active) {
        setActiveWorkspaceState(active);
        localStorage.setItem(STORAGE_KEY, active.id);
      } else {
        // Create default workspace if none exist
        const newWorkspace = await createWorkspaceInDB('My Workspace');
        setWorkspaces([newWorkspace]);
        setActiveWorkspaceState(newWorkspace);
        localStorage.setItem(STORAGE_KEY, newWorkspace.id);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load workspaces');
      console.error('Workspace initialization error:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadWorkspaces();
  }, []);

  const setActiveWorkspace = (id: string) => {
    const workspace = workspaces.find((w) => w.id === id);
    if (workspace) {
      setActiveWorkspaceState(workspace);
      localStorage.setItem(STORAGE_KEY, id);
    }
  };

  const refreshWorkspaces = async () => {
    await loadWorkspaces();
  };

  const createWorkspace = async (name: string): Promise<Workspace> => {
    const newWorkspace = await createWorkspaceInDB(name);
    setWorkspaces([...workspaces, newWorkspace]);
    setActiveWorkspace(newWorkspace.id);
    return newWorkspace;
  };

  return (
    <WorkspaceContext.Provider
      value={{
        workspaces,
        activeWorkspace,
        loading,
        error,
        setActiveWorkspace,
        refreshWorkspaces,
        createWorkspace,
      }}
    >
      {children}
    </WorkspaceContext.Provider>
  );
}

export function useWorkspace() {
  const context = useContext(WorkspaceContext);
  if (context === undefined) {
    throw new Error('useWorkspace must be used within WorkspaceProvider');
  }
  return context;
}
