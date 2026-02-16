import { createContext, useContext, useEffect, useState } from 'react';
import type { ReactNode } from 'react';
import type { Workspace, WorkspaceMemberRole } from '../types/database';
import {
  getWorkspaces,
  createWorkspace as createWorkspaceInDB,
  updateWorkspace as updateWorkspaceInDB,
  deleteWorkspace as deleteWorkspaceInDB,
  getMyMembership,
} from '../lib/database';
import { useAuth } from './AuthContext';

interface WorkspaceContextType {
  workspaces: Workspace[];
  activeWorkspace: Workspace | null;
  myRole: WorkspaceMemberRole | null;
  loading: boolean;
  error: string | null;
  setActiveWorkspace: (id: string) => void;
  refreshWorkspaces: () => Promise<void>;
  refreshMyRole: () => Promise<void>;
  createWorkspace: (name: string) => Promise<Workspace>;
  renameWorkspace: (id: string, name: string) => Promise<Workspace>;
  deleteWorkspace: (id: string) => Promise<void>;
}

const WorkspaceContext = createContext<WorkspaceContextType | undefined>(undefined);

const STORAGE_KEY = 'f-plan:activeWorkspaceId';

export function WorkspaceProvider({ children }: { children: ReactNode }) {
  const { user: authUser } = useAuth();
  const [workspaces, setWorkspaces] = useState<Workspace[]>([]);
  const [activeWorkspace, setActiveWorkspaceState] = useState<Workspace | null>(null);
  const [myRole, setMyRole] = useState<WorkspaceMemberRole | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch the current user's role whenever active workspace changes
  useEffect(() => {
    if (!activeWorkspace || !authUser) {
      setMyRole(null);
      return;
    }
    getMyMembership(activeWorkspace.id, authUser.id)
      .then((m) => setMyRole(m?.role ?? null))
      .catch(() => setMyRole(null));
  }, [activeWorkspace, authUser]);

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

  const refreshMyRole = async () => {
    if (!activeWorkspace || !authUser) return;
    const m = await getMyMembership(activeWorkspace.id, authUser.id);
    setMyRole(m?.role ?? null);
  };

  const createWorkspace = async (name: string): Promise<Workspace> => {
    const newWorkspace = await createWorkspaceInDB(name);
    setWorkspaces([...workspaces, newWorkspace]);
    setActiveWorkspace(newWorkspace.id);
    return newWorkspace;
  };

  const renameWorkspace = async (id: string, name: string): Promise<Workspace> => {
    const updated = await updateWorkspaceInDB(id, { name });
    setWorkspaces(workspaces.map((w) => (w.id === id ? updated : w)));
    if (activeWorkspace?.id === id) {
      setActiveWorkspaceState(updated);
    }
    return updated;
  };

  const deleteWorkspace = async (id: string): Promise<void> => {
    if (workspaces.length === 1) {
      throw new Error('Cannot delete the last workspace');
    }

    await deleteWorkspaceInDB(id);

    const remaining = workspaces.filter((w) => w.id !== id);
    setWorkspaces(remaining);

    // If deleted workspace was active, switch to next available
    if (activeWorkspace?.id === id) {
      const nextWorkspace = remaining[0];
      setActiveWorkspaceState(nextWorkspace);
      localStorage.setItem(STORAGE_KEY, nextWorkspace.id);
    }
  };

  return (
    <WorkspaceContext.Provider
      value={{
        workspaces,
        activeWorkspace,
        myRole,
        loading,
        error,
        setActiveWorkspace,
        refreshWorkspaces,
        refreshMyRole,
        createWorkspace,
        renameWorkspace,
        deleteWorkspace,
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
