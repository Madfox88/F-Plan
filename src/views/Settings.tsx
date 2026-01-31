import { useState } from 'react';
import './Settings.css';

interface SettingsData {
  email: string;
  createdAt: string;
}

const defaultSettings: SettingsData = {
  email: 'alex@fplan.com',
  createdAt: 'January 31, 2026',
};

export function Settings() {
  const [settings, setSettings] = useState<SettingsData>(defaultSettings);
  const [isEditingEmail, setIsEditingEmail] = useState(false);
  const [editEmail, setEditEmail] = useState(settings.email);
  const [isChangingPassword, setIsChangingPassword] = useState(false);
  const [passwordForm, setPasswordForm] = useState({ current: '', new: '', confirm: '' });
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const handleEmailSave = () => {
    if (!editEmail.trim()) {
      setMessage({ type: 'error', text: 'Email cannot be empty' });
      return;
    }
    setSettings({ ...settings, email: editEmail });
    setIsEditingEmail(false);
    setMessage({ type: 'success', text: 'Email updated successfully' });
    setTimeout(() => setMessage(null), 3000);
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
      account: settings,
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
    // In a real app, this would delete the user account from the database
    setShowDeleteConfirm(false);
    setMessage({ type: 'success', text: 'Account deleted. Redirecting...' });
    setTimeout(() => {
      window.location.href = '/';
    }, 2000);
  };

  return (
    <div className="settings-page">
      {message && (
        <div className={`settings-message settings-message-${message.type}`}>
          {message.text}
        </div>
      )}

      {/* Account Info Section */}
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
              <span className="settings-value">{settings.email}</span>
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
            <span className="settings-value">{settings.createdAt}</span>
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

      {/* Account Management Section */}
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
    </div>
  );
}
