import { useRef, useState } from 'react';
import { supabase } from '../lib/supabase';
import { deleteOwnAccount, getActivePlans, getStagesByPlan, getGoalsByWorkspace, getEvents, getReminders, getFocusSessionLog } from '../lib/db';
import { useAvatar } from '../context/AvatarContext';
import { useCurrentUser } from '../context/UserContext';
import { useAuth } from '../context/AuthContext';
import { useWorkspace } from '../context/WorkspaceContext';
import { AvatarCropperModal } from '../components/profile/AvatarCropperModal';
import PenSquareIcon from '../assets/icons/pen-square.svg';
import './Profile.css';
import './Settings.css';

export function Profile() {
  const { avatarUrl, setAvatarUrl } = useAvatar();
  const { displayName, email: userEmail, updateProfile, userId } = useCurrentUser();
  const { signOut, updateEmail, updatePassword, user: authUser } = useAuth();
  const { activeWorkspace } = useWorkspace();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [cropSrc, setCropSrc] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [isEditingEmail, setIsEditingEmail] = useState(false);
  const [editEmail, setEditEmail] = useState(userEmail);
  const [isChangingPassword, setIsChangingPassword] = useState(false);
  const [passwordForm, setPasswordForm] = useState({ current: '', new: '', confirm: '' });
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleteConfirmText, setDeleteConfirmText] = useState('');
  const [isDeleting, setIsDeleting] = useState(false);
  const [name, setName] = useState(displayName);
  const [isEditingName, setIsEditingName] = useState(false);
  const [editName, setEditName] = useState(displayName);

  const handleAvatarClick = () => {
    if (!userId) return;
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
    if (!userId) return;
    setIsUploading(true);
    const path = `avatars/${userId}/avatar.jpg`;
    const { error } = await supabase.storage
      .from('avatars')
      .upload(path, blob, { upsert: true, contentType: 'image/jpeg', cacheControl: '0' });

    if (!error) {
      const { data } = supabase.storage.from('avatars').getPublicUrl(path);
      setAvatarUrl(data.publicUrl);
    } else {
      setMessage({ type: 'error', text: 'Failed to upload avatar. Please try again.' });
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
      // Update in Supabase Auth (sends confirmation to new email)
      const { error } = await updateEmail(editEmail.trim());
      if (error) {
        setMessage({ type: 'error', text: error });
        return;
      }
      // Don't update public.users email here — the DB trigger will sync
      // it automatically once the user confirms via the email link.
      setIsEditingEmail(false);
      setMessage({ type: 'success', text: 'Confirmation email sent to your new address. Click the link to confirm.' });
      setTimeout(() => setMessage(null), 5000);
    } catch (err) {
      console.error('Failed to update email:', err);
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
    } catch (err) {
      console.error('Failed to update name:', err);
      setMessage({ type: 'error', text: 'Failed to update name' });
    }
  };

  const handlePasswordChange = async () => {
    if (!passwordForm.new || !passwordForm.confirm) {
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
    const { error } = await updatePassword(passwordForm.new);
    if (error) {
      setMessage({ type: 'error', text: error });
      return;
    }
    setPasswordForm({ current: '', new: '', confirm: '' });
    setIsChangingPassword(false);
    setMessage({ type: 'success', text: 'Password changed successfully' });
    setTimeout(() => setMessage(null), 3000);
  };

  const [isExporting, setIsExporting] = useState(false);

  const handleExportData = async () => {
    if (!activeWorkspace || !userId) return;
    setIsExporting(true);
    try {
      const wsId = activeWorkspace.id;
      const farPast = '2000-01-01T00:00:00Z';
      const farFuture = '2099-12-31T23:59:59Z';

      const [plans, goals, events, reminders, focusSessions] = await Promise.all([
        getActivePlans(wsId).catch(() => []),
        getGoalsByWorkspace(wsId).catch(() => []),
        getEvents(wsId, farPast, farFuture).catch(() => []),
        getReminders(wsId, farPast, farFuture).catch(() => []),
        getFocusSessionLog(userId, wsId, 1000, 0).catch(() => []),
      ]);

      // Fetch stages + tasks per plan
      const plansWithStages = await Promise.all(
        plans.map(async (p) => {
          const stages = await getStagesByPlan(p.id).catch(() => []);
          return { ...p, stages };
        })
      );

      const data = {
        account: {
          name: displayName,
          email: userEmail,
          createdAt: authUser?.created_at ?? null,
        },
        workspace: { id: wsId, name: activeWorkspace.name },
        plans: plansWithStages,
        goals,
        events,
        reminders,
        focusSessions,
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
    } catch (err) {
      console.error('Failed to export data:', err);
      setMessage({ type: 'error', text: 'Failed to export data. Please try again.' });
    } finally {
      setIsExporting(false);
      setTimeout(() => setMessage(null), 3000);
    }
  };

  const handleDeleteAccount = async () => {
    if (deleteConfirmText !== 'DELETE') return;
    setIsDeleting(true);
    try {
      await deleteOwnAccount();
      // Account is gone — sign out locally to clear session
      await signOut();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to delete account';
      setMessage({ type: 'error', text: msg });
      setTimeout(() => setMessage(null), 8000);
    } finally {
      setIsDeleting(false);
      setShowDeleteConfirm(false);
      setDeleteConfirmText('');
    }
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
          disabled={!userId || isUploading}
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
            <span className="settings-value">
              {authUser?.created_at
                ? new Date(authUser.created_at).toLocaleDateString(undefined, {
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric',
                  })
                : '—'}
            </span>
          </div>
        </div>

        <div className="settings-field">
          <label className="settings-label">Password</label>
          {isChangingPassword ? (
            <div className="settings-edit-field">
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
          <button className="settings-button secondary" onClick={handleExportData} disabled={isExporting}>
            {isExporting ? 'Exporting…' : 'Export Data'}
          </button>
        </div>

        <div className="settings-field settings-field-danger">
          <label className="settings-label">Delete Account</label>
          <p className="settings-description">
            Permanently delete your account and all associated data.
            If you own a workspace with other members, you must transfer ownership first.
          </p>
          {showDeleteConfirm ? (
            <div className="settings-delete-confirm">
              <p className="settings-delete-warning">
                ⚠️ This action is <strong>permanent</strong> and cannot be undone.
                All your personal workspaces, plans, tasks, focus sessions, and data will be erased.
              </p>
              <label className="settings-label" htmlFor="delete-confirm-input">
                Type <strong>DELETE</strong> to confirm
              </label>
              <input
                id="delete-confirm-input"
                type="text"
                value={deleteConfirmText}
                onChange={(e) => setDeleteConfirmText(e.target.value)}
                className="settings-input settings-input-danger"
                placeholder="DELETE"
                autoComplete="off"
                disabled={isDeleting}
              />
              <div className="settings-edit-actions">
                <button
                  className="settings-button secondary"
                  onClick={() => {
                    setShowDeleteConfirm(false);
                    setDeleteConfirmText('');
                  }}
                  disabled={isDeleting}
                >
                  Cancel
                </button>
                <button
                  className="settings-button danger"
                  onClick={handleDeleteAccount}
                  disabled={deleteConfirmText !== 'DELETE' || isDeleting}
                >
                  {isDeleting ? 'Deleting…' : 'Permanently Delete Account'}
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

      <div className="settings-card">
        <h2 className="settings-section-title">Session</h2>
        <div className="settings-field">
          <label className="settings-label">Sign out</label>
          <p className="settings-description">Sign out of your F-Plan account on this device</p>
          <button className="settings-button danger" onClick={signOut}>
            Sign out
          </button>
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
