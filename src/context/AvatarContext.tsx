import { createContext, useContext, useEffect, useState } from 'react';
import type { ReactNode } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from './AuthContext';

interface AvatarContextType {
  avatarUrl: string | null;
  loading: boolean;
  setAvatarUrl: (url: string | null) => void;
  refreshAvatar: () => Promise<void>;
}

const AvatarContext = createContext<AvatarContextType | undefined>(undefined);

const getAvatarPath = (userId: string) => `avatars/${userId}/avatar.jpg`;

export function AvatarProvider({ children }: { children: ReactNode }) {
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const { user: authUser } = useAuth();
  const userId = authUser?.id ?? null;

  const refreshAvatar = async () => {
    if (!userId) {
      setAvatarUrl(null);
      return;
    }

    const path = getAvatarPath(userId);
    const { data, error } = await supabase.storage
      .from('avatars')
      .list(`avatars/${userId}`, { search: 'avatar.jpg', limit: 1 });

    if (error || !data || data.length === 0) {
      setAvatarUrl(null);
      return;
    }

    const { data: publicUrlData } = supabase.storage
      .from('avatars')
      .getPublicUrl(path);

    setAvatarUrl(`${publicUrlData.publicUrl}?t=${Date.now()}`);
  };

  useEffect(() => {
    let cancelled = false;
    const init = async () => {
      setLoading(true);
      await refreshAvatar();
      if (!cancelled) setLoading(false);
    };
    init();
    return () => { cancelled = true; };
  }, [userId]); // eslint-disable-line react-hooks/exhaustive-deps

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
