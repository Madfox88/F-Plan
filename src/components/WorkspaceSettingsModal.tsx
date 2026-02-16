import React, { useState, useEffect, useCallback } from 'react';
import { useWorkspace } from '../context/WorkspaceContext';
import { useCurrentUser } from '../context/UserContext';
import {
  getWorkspaceMembers,
  removeWorkspaceMember,
  updateWorkspaceMemberRole,
} from '../lib/database';
import type { WorkspaceMember, WorkspaceMemberRole, User } from '../types/database';
import TrashIcon from '../assets/icons/trash.svg';
import './WorkspaceSettingsModal.css';

type MemberRow = WorkspaceMember & { user: User };

interface WorkspaceSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const WorkspaceSettingsModal: React.FC<WorkspaceSettingsModalProps> = ({
  isOpen,
  onClose,
}) => {
  const { activeWorkspace, myRole, renameWorkspace, deleteWorkspace, workspaces } = useWorkspace();
  const { userId } = useCurrentUser();

  const [tab, setTab] = useState<'general' | 'members'>('general');

  // ── General tab state ─────────────────────────────
  const [name, setName] = useState('');
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  // ── Members tab state ─────────────────────────────
  const [members, setMembers] = useState<MemberRow[]>([]);
  const [membersLoading, setMembersLoading] = useState(false);

  const isAdmin = myRole === 'owner' || myRole === 'admin';
  const isOwner = myRole === 'owner';

  // Reset state on open
  useEffect(() => {
    if (isOpen && activeWorkspace) {
      setName(activeWorkspace.name);
      setMessage(null);
      setShowDeleteConfirm(false);
      setTab('general');
    }
  }, [isOpen, activeWorkspace]);

  // Load members when switching to members tab
  const loadMembers = useCallback(async () => {
    if (!activeWorkspace) return;
    setMembersLoading(true);
    try {
      const data = await getWorkspaceMembers(activeWorkspace.id);
      setMembers(data);
    } catch {
      setMessage({ type: 'error', text: 'Failed to load members' });
    } finally {
      setMembersLoading(false);
    }
  }, [activeWorkspace]);

  useEffect(() => {
    if (tab === 'members' && isOpen) {
      loadMembers();
    }
  }, [tab, isOpen, loadMembers]);

  // ── General handlers ──────────────────────────────
  const handleRename = async () => {
    if (!activeWorkspace || !name.trim() || name.trim() === activeWorkspace.name) return;
    setSaving(true);
    try {
      await renameWorkspace(activeWorkspace.id, name.trim());
      setMessage({ type: 'success', text: 'Workspace renamed' });
      setTimeout(() => setMessage(null), 3000);
    } catch (err) {
      setMessage({ type: 'error', text: err instanceof Error ? err.message : 'Rename failed' });
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!activeWorkspace) return;
    setSaving(true);
    try {
      await deleteWorkspace(activeWorkspace.id);
      onClose();
    } catch (err) {
      setMessage({ type: 'error', text: err instanceof Error ? err.message : 'Delete failed' });
      setSaving(false);
    }
  };

  // ── Members handlers ──────────────────────────────
  const handleRoleChange = async (memberId: string, newRole: WorkspaceMemberRole) => {
    if (!activeWorkspace) return;
    try {
      await updateWorkspaceMemberRole(activeWorkspace.id, memberId, newRole);
      setMembers((prev) =>
        prev.map((m) => (m.user_id === memberId ? { ...m, role: newRole } : m))
      );
    } catch (err) {
      setMessage({ type: 'error', text: err instanceof Error ? err.message : 'Failed to change role' });
    }
  };

  const handleRemoveMember = async (memberId: string) => {
    if (!activeWorkspace) return;
    try {
      await removeWorkspaceMember(activeWorkspace.id, memberId);
      setMembers((prev) => prev.filter((m) => m.user_id !== memberId));
    } catch (err) {
      setMessage({ type: 'error', text: err instanceof Error ? err.message : 'Failed to remove member' });
    }
  };

  if (!isOpen || !activeWorkspace) return null;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content ws-settings-modal" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="modal-header">
          <h2>Workspace Settings</h2>
          <button className="close-button" onClick={onClose} aria-label="Close">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor">
              <path d="M18 6L6 18M6 6L18 18" strokeWidth="2" strokeLinecap="round" />
            </svg>
          </button>
        </div>

        {/* Tab bar */}
        <div className="ws-settings-tabs">
          <button
            className={`ws-settings-tab ${tab === 'general' ? 'active' : ''}`}
            onClick={() => setTab('general')}
          >
            General
          </button>
          <button
            className={`ws-settings-tab ${tab === 'members' ? 'active' : ''}`}
            onClick={() => setTab('members')}
          >
            Members
          </button>
        </div>

        {/* Message banner */}
        {message && (
          <div className={`settings-message settings-message-${message.type}`}>
            {message.text}
          </div>
        )}

        {/* ═══ General Tab ═══ */}
        {tab === 'general' && (
          <div className="ws-settings-body">
            {/* Workspace name */}
            <div className="settings-field">
              <label className="settings-label">Workspace Name</label>
              {isAdmin ? (
                <div className="settings-edit-field">
                  <input
                    className="settings-input"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Workspace name"
                    disabled={saving}
                    maxLength={255}
                  />
                  {name.trim() !== activeWorkspace.name && (
                    <div className="settings-edit-actions">
                      <button
                        className="settings-button secondary"
                        onClick={() => setName(activeWorkspace.name)}
                        disabled={saving}
                      >
                        Cancel
                      </button>
                      <button
                        className="settings-button primary"
                        onClick={handleRename}
                        disabled={saving || !name.trim()}
                      >
                        {saving ? 'Saving…' : 'Save'}
                      </button>
                    </div>
                  )}
                </div>
              ) : (
                <div className="settings-field-display">
                  <span className="settings-value">{activeWorkspace.name}</span>
                </div>
              )}
            </div>

            {/* Your role */}
            <div className="settings-field">
              <label className="settings-label">Your Role</label>
              <div className="settings-field-display">
                <span className="settings-value ws-role-badge">{myRole ?? 'member'}</span>
              </div>
            </div>

            {/* Danger zone — delete */}
            {isOwner && (
              <div className="settings-field settings-field-danger">
                <label className="settings-label">Danger Zone</label>
                <p className="settings-description">
                  Deleting a workspace permanently removes all its plans, tasks, stages, events,
                  and goals. This cannot be undone.
                </p>
                {!showDeleteConfirm ? (
                  <button
                    className="settings-button danger"
                    onClick={() => setShowDeleteConfirm(true)}
                    disabled={workspaces.length <= 1}
                  >
                    Delete Workspace
                  </button>
                ) : (
                  <div className="settings-delete-confirm">
                    <p>Are you sure? Type the workspace name to confirm:</p>
                    <input
                      className="settings-input"
                      placeholder={activeWorkspace.name}
                      onChange={(e) => {
                        if (e.target.value === activeWorkspace.name) {
                          handleDelete();
                        }
                      }}
                      autoFocus
                    />
                    <div className="settings-edit-actions" style={{ marginTop: 'var(--space-sm)' }}>
                      <button
                        className="settings-button secondary"
                        onClick={() => setShowDeleteConfirm(false)}
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                )}
                {workspaces.length <= 1 && (
                  <p className="settings-description" style={{ marginTop: 'var(--space-xs)' }}>
                    You cannot delete your last workspace.
                  </p>
                )}
              </div>
            )}
          </div>
        )}

        {/* ═══ Members Tab ═══ */}
        {tab === 'members' && (
          <div className="ws-settings-body">
            {membersLoading ? (
              <p className="ws-members-loading">Loading members…</p>
            ) : members.length === 0 ? (
              <p className="ws-members-loading">No members found.</p>
            ) : (
              <div className="ws-members-list">
                {members.map((member) => {
                  const isSelf = member.user_id === userId;
                  const isMemberOwner = member.role === 'owner';

                  return (
                    <div key={member.user_id} className="ws-member-row">
                      {/* Avatar + info */}
                      <div className="ws-member-info">
                        <div className="ws-member-avatar">
                          {member.user.avatar_url ? (
                            <img src={member.user.avatar_url} alt="" />
                          ) : (
                            <span>{member.user.display_name.charAt(0).toUpperCase()}</span>
                          )}
                        </div>
                        <div className="ws-member-text">
                          <span className="ws-member-name">
                            {member.user.display_name}
                            {isSelf && <span className="ws-member-you">(you)</span>}
                          </span>
                          <span className="ws-member-email">{member.user.email}</span>
                        </div>
                      </div>

                      {/* Role badge / dropdown */}
                      <div className="ws-member-actions">
                        {isAdmin && !isMemberOwner && !isSelf ? (
                          <select
                            className="ws-role-select"
                            value={member.role}
                            onChange={(e) =>
                              handleRoleChange(member.user_id, e.target.value as WorkspaceMemberRole)
                            }
                          >
                            <option value="admin">Admin</option>
                            <option value="member">Member</option>
                          </select>
                        ) : (
                          <span className={`ws-role-badge ws-role-${member.role}`}>
                            {member.role}
                          </span>
                        )}

                        {/* Remove button */}
                        {isAdmin && !isMemberOwner && !isSelf && (
                          <button
                            className="ws-member-remove"
                            onClick={() => handleRemoveMember(member.user_id)}
                            title="Remove member"
                          >
                            <img src={TrashIcon} alt="Remove" />
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
