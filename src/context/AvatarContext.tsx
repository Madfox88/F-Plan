import { createContext, useContext, useEffect, useState } from 'react';
import type { ReactNode } from 'react';
import { supabase } from '../lib/supabase';
import { useWorkspace } from './WorkspaceContext';

interface AvatarContextType {
  avatarUrl: string | null;
  loading: boolean;
  setAvatarUrl: (url: string | null) => void;
  refreshAvatar: () => Promise<void>;
}

const AvatarContext = createContext<AvatarContextType | undefined>(undefined);

const getAvatarPath = (workspaceId: string) => `avatars/${workspaceId}/avatar.jpg`;

export function AvatarProvider({ children }: { children: ReactNode }) {
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const { activeWorkspace } = useWorkspace();
  const workspaceId = activeWorkspace?.id ?? null;

  const refreshAvatar = async () => {
    if (!workspaceId) {
      setAvatarUrl(null);
      return;
    }

    const path = getAvatarPath(workspaceId);
    const { data, error } = await supabase.storage
      .from('avatars')
      .list(`avatars/${workspaceId}`, { search: 'avatar.jpg', limit: 1 });

    if (error || !data || data.length === 0) {
      setAvatarUrl(null);
      return;
    }

    const { data: publicUrlData } = supabase.storage
      .from('avatars')
      .getPublicUrl(path);

    setAvatarUrl(publicUrlData.publicUrl);
  };

  useEffect(() => {
    const initAvatar = async () => {
      setLoading(true);
      if (!workspaceId) {
        setAvatarUrl(null);
        setLoading(false);
        return;
      }

      const path = getAvatarPath(workspaceId);
      const { data: listData, error } = await supabase.storage
        .from('avatars')
        .list(`avatars/${workspaceId}`, { search: 'avatar.jpg', limit: 1 });

      if (!error && listData && listData.length > 0) {
        const { data: publicUrlData } = supabase.storage
          .from('avatars')
          .getPublicUrl(path);
        setAvatarUrl(publicUrlData.publicUrl);
      } else {
        setAvatarUrl(null);
      }
      setLoading(false);
    };

    initAvatar();
  }, [workspaceId]);

  return (
    <AvatarContext.Provider value={{ avatarUrl, loading, setAvatarUrl, refreshAvatar }}>
      {children}
    </AvatarContext.Provider>
  );
}

export function useAvatar() {
  const context = useContext(AvatarContext);
  if (!context) {
    throw new Error('useAvatar must be used within AvatarProvider');
  }
  return context;
}
