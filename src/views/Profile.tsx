import { useRef, useState } from 'react';
import { supabase } from '../lib/supabase';
import { useAvatar } from '../context/AvatarContext';
import { useWorkspace } from '../context/WorkspaceContext';
import { AvatarCropperModal } from '../components/AvatarCropperModal';
import './Profile.css';

const profileData = {
  name: 'Alex Morgan',
  email: 'alex@fplan.com',
  createdAt: 'January 31, 2026',
};

export function Profile() {
  const { avatarUrl, setAvatarUrl } = useAvatar();
  const { activeWorkspace } = useWorkspace();
  const workspaceId = activeWorkspace?.id ?? null;
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [cropSrc, setCropSrc] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);

  const handleAvatarClick = () => {
    if (!workspaceId) return;
    fileInputRef.current?.click();
  };

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => {
      setCropSrc(reader.result as string);
    };
    reader.readAsDataURL(file);
    event.target.value = '';
  };

  const handleSaveCrop = async (blob: Blob) => {
    if (!workspaceId) return;
    setIsUploading(true);
    const path = `avatars/${workspaceId}/avatar.jpg`;
    const { error } = await supabase.storage
      .from('avatars')
      .upload(path, blob, { upsert: true, contentType: 'image/jpeg', cacheControl: '0' });

    if (!error) {
      const { data } = supabase.storage.from('avatars').getPublicUrl(path);
      setAvatarUrl(data.publicUrl);
    }

    setIsUploading(false);
    setCropSrc(null);
  };

  return (
    <div className="profile-page">
      <div className="profile-card">
        <button
          className="profile-avatar-large"
          onClick={handleAvatarClick}
          aria-label="Change avatar"
          disabled={!workspaceId || isUploading}
        >
          {avatarUrl ? (
            <img src={avatarUrl} alt="" className="profile-avatar-image" />
          ) : (
            <div className="profile-avatar-placeholder" aria-hidden="true" />
          )}
        </button>
        <div className="profile-name">{profileData.name}</div>
        <div className="profile-detail">
          <span className="profile-label">Email</span>
          <span className="profile-value">{profileData.email}</span>
        </div>
        <div className="profile-detail">
          <span className="profile-label">Created</span>
          <span className="profile-value">{profileData.createdAt}</span>
        </div>
      </div>

      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={handleFileChange}
        className="profile-avatar-input"
      />

      {cropSrc && (
        <AvatarCropperModal
          isOpen={!!cropSrc}
          imageSrc={cropSrc}
          onClose={() => setCropSrc(null)}
          onConfirm={handleSaveCrop}
        />
      )}
    </div>
  );
}
