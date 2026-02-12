import { useRef, useState } from 'react';
import { supabase } from '../lib/supabase';
import { useAvatar } from '../context/AvatarContext';
import { useWorkspace } from '../context/WorkspaceContext';
import { useCurrentUser } from '../context/UserContext';
import { AvatarCropperModal } from '../components/AvatarCropperModal';
import PenSquareIcon from '../assets/icons/pen-square.svg';
import './Profile.css';
import './Settings.css';

export function Profile() {
  const { avatarUrl, setAvatarUrl } = useAvatar();
  const { activeWorkspace } = useWorkspace();
  const { displayName, email: userEmail, updateProfile } = useCurrentUser();
  const workspaceId = activeWorkspace?.id ?? null;
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [cropSrc, setCropSrc] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [isEditingEmail, setIsEditingEmail] = useState(false);
  const [editEmail, setEditEmail] = useState(userEmail);
  const [isChangingPassword, setIsChangingPassword] = useState(false);
  const [passwordForm, setPasswordForm] = useState({ current: '', new: '', confirm: '' });
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [name, setName] = useState(displayName);
  const [isEditingName, setIsEditingName] = useState(false);
  const [editName, setEditName] = useState(displayName);

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

  const handleEmailSave = async () => {
    if (!editEmail.trim()) {
      setMessage({ type: 'error', text: 'Email cannot be empty' });
      return;
    }
    try {
      await updateProfile({ email: editEmail.trim() });
      setIsEditingEmail(false);
      setMessage({ type: 'success', text: 'Email updated successfully' });
      setTimeout(() => setMessage(null), 3000);
    } catch {
      setMessage({ type: 'error', text: 'Failed to update email' });
    }
  };

  const handleNameSave = async () => {
    if (!editName.trim()) {
      setMessage({ type: 'error', text: 'Name cannot be empty' });
      return;
    }
    try {
      const trimmedName = editName.trim();
      await updateProfile({ display_name: trimmedName });
      setName(trimmedName);
      setIsEditingName(false);
      setMessage({ type: 'success', text: 'Name updated successfully' });
      setTimeout(() => setMessage(null), 3000);
    } catch {
      setMessage({ type: 'error', text: 'Failed to update name' });
    }
  };

  const handlePasswordChange = () => {
    if (!passwordForm.current || !passwordForm.new || !passwordForm.confirm) {
      setMessage({ type: 'error', text: 'All fields are required' });
      return;
    }
    if (passwordForm.new !== passwordForm.confirm) {
      setMessage({ type: 'error', text: 'New passwords do not match' });
      return;
    }
    if (passwordForm.new.length < 8) {
      setMessage({ type: 'error', text: 'Password must be at least 8 characters' });
      return;
    }
    setPasswordForm({ current: '', new: '', confirm: '' });
    setIsChangingPassword(false);
    setMessage({ type: 'success', text: 'Password changed successfully' });
    setTimeout(() => setMessage(null), 3000);
  };

  const handleExportData = () => {
    const data = {
      account: { name: displayName, email: userEmail },
      exportedAt: new Date().toISOString(),
    };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `f-plan-export-${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    setMessage({ type: 'success', text: 'Data exported successfully' });
    setTimeout(() => setMessage(null), 3000);
  };

  const handleDeleteAccount = () => {
    setShowDeleteConfirm(false);
    setMessage({ type: 'success', text: 'Account deleted. Redirecting...' });
    setTimeout(() => {
      window.location.href = '/';
    }, 2000);
  };

  return (
    <div className="profile-page settings-page">
      {message && (
        <div className={`settings-message settings-message-${message.type}`}>
          {message.text}
        </div>
      )}
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
        <div className="profile-name-row">
          {isEditingName ? (
            <div className="profile-name-edit">
              <input
                type="text"
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
                className="profile-name-input"
                aria-label="Name"
              />
              <div className="profile-name-actions">
                <button
                  className="settings-button secondary small"
                  onClick={() => {
                    setEditName(name);
                    setIsEditingName(false);
                  }}
                >
                  Cancel
                </button>
                <button className="settings-button primary small" onClick={handleNameSave}>
                  Save
                </button>
              </div>
            </div>
          ) : (
            <div className="profile-name-display">
              <div className="profile-name-wrap">
                <span className="profile-name">{name}</span>
                <button
                  className="profile-name-edit-button"
                  onClick={() => setIsEditingName(true)}
                  aria-label="Edit name"
                >
                  <img src={PenSquareIcon} alt="" className="profile-name-edit-icon" />
                </button>
              </div>
            </div>
          )}
        </div>
        <p className="profile-guidance">
          Hover your name to edit it, or click your avatar to upload and crop a new picture.
        </p>
      </div>

      <div className="settings-card">
        <h2 className="settings-section-title">Account Information</h2>

        <div className="settings-field">
          <label className="settings-label">Email</label>
          {isEditingEmail ? (
            <div className="settings-edit-field">
              <input
                type="email"
                value={editEmail}
                onChange={(e) => setEditEmail(e.target.value)}
                className="settings-input"
              />
              <div className="settings-edit-actions">
                <button className="settings-button secondary" onClick={() => setIsEditingEmail(false)}>
                  Cancel
                </button>
                <button className="settings-button primary" onClick={handleEmailSave}>
                  Save
                </button>
              </div>
            </div>
          ) : (
            <div className="settings-field-display">
              <span className="settings-value">{userEmail}</span>
              <button
                className="settings-button secondary small"
                onClick={() => setIsEditingEmail(true)}
              >
                Edit
              </button>
            </div>
          )}
        </div>

        <div className="settings-field">
          <label className="settings-label">Account Created</label>
          <div className="settings-field-display">
            <span className="settings-value">—</span>
          </div>
        </div>

        <div className="settings-field">
          <label className="settings-label">Password</label>
          {isChangingPassword ? (
            <div className="settings-edit-field">
              <input
                type="password"
                placeholder="Current password"
                value={passwordForm.current}
                onChange={(e) => setPasswordForm({ ...passwordForm, current: e.target.value })}
                className="settings-input"
              />
              <input
                type="password"
                placeholder="New password"
                value={passwordForm.new}
                onChange={(e) => setPasswordForm({ ...passwordForm, new: e.target.value })}
                className="settings-input"
              />
              <input
                type="password"
                placeholder="Confirm new password"
                value={passwordForm.confirm}
                onChange={(e) => setPasswordForm({ ...passwordForm, confirm: e.target.value })}
                className="settings-input"
              />
              <div className="settings-edit-actions">
                <button className="settings-button secondary" onClick={() => setIsChangingPassword(false)}>
                  Cancel
                </button>
                <button className="settings-button primary" onClick={handlePasswordChange}>
                  Change Password
                </button>
              </div>
            </div>
          ) : (
            <button
              className="settings-button secondary"
              onClick={() => setIsChangingPassword(true)}
            >
              Change Password
            </button>
          )}
        </div>
      </div>

      <div className="settings-card">
        <h2 className="settings-section-title">Account Management</h2>

        <div className="settings-field">
          <label className="settings-label">Export Data</label>
          <p className="settings-description">Download all your account data as JSON</p>
          <button className="settings-button secondary" onClick={handleExportData}>
            Export Data
          </button>
        </div>

        <div className="settings-field settings-field-danger">
          <label className="settings-label">Delete Account</label>
          <p className="settings-description">Permanently delete your account and all associated data</p>
          {showDeleteConfirm ? (
            <div className="settings-delete-confirm">
              <p>Are you sure? This action cannot be undone.</p>
              <div className="settings-edit-actions">
                <button
                  className="settings-button secondary"
                  onClick={() => setShowDeleteConfirm(false)}
                >
                  Cancel
                </button>
                <button
                  className="settings-button danger"
                  onClick={handleDeleteAccount}
                >
                  Delete Account
                </button>
              </div>
            </div>
          ) : (
            <button className="settings-button danger" onClick={() => setShowDeleteConfirm(true)}>
              Delete Account
            </button>
          )}
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
