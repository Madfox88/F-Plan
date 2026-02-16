import React, { useState, useEffect, useCallback } from 'react';
import { useWorkspace } from '../context/WorkspaceContext';
import { useCurrentUser } from '../context/UserContext';
import {
  getWorkspaceMembers,
  removeWorkspaceMember,
  updateWorkspaceMemberRole,
  getWorkspaceInvitations,
  createWorkspaceInvitation,
  revokeWorkspaceInvitation,
  sendInvitationEmail,
  transferWorkspaceOwnership,
} from '../lib/database';
import type { WorkspaceMember, WorkspaceMemberRole, WorkspaceInvitation, User } from '../types/database';
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
  const { activeWorkspace, myRole, renameWorkspace, deleteWorkspace, workspaces, refreshMyRole } = useWorkspace();
  const { userId, displayName } = useCurrentUser();

  const [tab, setTab] = useState<'general' | 'members'>('general');

  // ── General tab state ─────────────────────────────
  const [name, setName] = useState('');
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  // ── Members tab state ─────────────────────────────
  const [members, setMembers] = useState<MemberRow[]>([]);
  const [membersLoading, setMembersLoading] = useState(false);

  // ── Invitations state ─────────────────────────────
  const [invitations, setInvitations] = useState<WorkspaceInvitation[]>([]);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState<'admin' | 'member'>('member');
  const [inviteSending, setInviteSending] = useState(false);

  // ── Transfer ownership state ──────────────────────
  const [transferTarget, setTransferTarget] = useState<string | null>(null);
  const [transferring, setTransferring] = useState(false);

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

  // Load members + invitations when switching to members tab
  const loadMembers = useCallback(async () => {
    if (!activeWorkspace) return;
    setMembersLoading(true);
    try {
      const [memberData, inviteData] = await Promise.all([
        getWorkspaceMembers(activeWorkspace.id),
        getWorkspaceInvitations(activeWorkspace.id),
      ]);
      setMembers(memberData);
      setInvitations(inviteData);
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

  // ── Invitation handlers ───────────────────────────
  const handleSendInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeWorkspace || !userId || !inviteEmail.trim()) return;

    // Check if email is already a member
    const alreadyMember = members.some(
      (m) => m.user.email.toLowerCase() === inviteEmail.trim().toLowerCase()
    );
    if (alreadyMember) {
      setMessage({ type: 'error', text: 'This user is already a member of this workspace' });
      return;
    }

    setInviteSending(true);
    try {
      const inv = await createWorkspaceInvitation(
        activeWorkspace.id,
        inviteEmail.trim(),
        inviteRole,
        userId
      );
      // Fire-and-forget email — don't block on it
      const emailSent = await sendInvitationEmail(
        inv.email,
        activeWorkspace.name,
        displayName || 'A team member',
        inviteRole
      );
      setInvitations((prev) => [inv, ...prev]);
      setInviteEmail('');
      setInviteRole('member');
      setMessage({
        type: 'success',
        text: emailSent
          ? `Invitation sent to ${inv.email}`
          : `Invitation created for ${inv.email} (email notification could not be delivered — share the link manually)`,
      });
      setTimeout(() => setMessage(null), 3000);
    } catch (err) {
      setMessage({ type: 'error', text: err instanceof Error ? err.message : 'Failed to send invitation' });
    } finally {
      setInviteSending(false);
    }
  };

  const handleRevokeInvite = async (inviteId: string) => {
    try {
      await revokeWorkspaceInvitation(inviteId);
      setInvitations((prev) => prev.filter((i) => i.id !== inviteId));
    } catch (err) {
      setMessage({ type: 'error', text: err instanceof Error ? err.message : 'Failed to revoke invitation' });
    }
  };

  // ── Transfer ownership handler ────────────────────
  const handleTransferOwnership = async (newOwnerId: string) => {
    if (!activeWorkspace) return;
    setTransferring(true);
    try {
      await transferWorkspaceOwnership(activeWorkspace.id, newOwnerId);
      // Refresh members to reflect the role swap
      await loadMembers();
      await refreshMyRole();
      setTransferTarget(null);
      setMessage({ type: 'success', text: 'Ownership transferred successfully. You are now an admin.' });
      setTimeout(() => setMessage(null), 5000);
    } catch (err) {
      setMessage({ type: 'error', text: err instanceof Error ? err.message : 'Transfer failed' });
    } finally {
      setTransferring(false);
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
            {/* Invite form — admin/owner only */}
            {isAdmin && (
              <form className="ws-invite-form" onSubmit={handleSendInvite}>
                <label className="settings-label">Invite by Email</label>
                <div className="ws-invite-row">
                  <input
                    className="settings-input ws-invite-input"
                    type="email"
                    value={inviteEmail}
                    onChange={(e) => setInviteEmail(e.target.value)}
                    placeholder="colleague@example.com"
                    disabled={inviteSending}
                    required
                  />
                  <select
                    className="ws-role-select ws-invite-role"
                    value={inviteRole}
                    onChange={(e) => setInviteRole(e.target.value as 'admin' | 'member')}
                    disabled={inviteSending}
                  >
                    <option value="member">Member</option>
                    <option value="admin">Admin</option>
                  </select>
                  <button
                    type="submit"
                    className="settings-button primary"
                    disabled={inviteSending || !inviteEmail.trim()}
                  >
                    {inviteSending ? 'Sending…' : 'Invite'}
                  </button>
                </div>
              </form>
            )}

            {/* Pending invitations */}
            {invitations.length > 0 && (
              <div className="ws-invite-section">
                <label className="settings-label">Pending Invitations</label>
                <div className="ws-members-list">
                  {invitations.map((inv) => (
                    <div key={inv.id} className="ws-member-row ws-invite-row-item">
                      <div className="ws-member-info">
                        <div className="ws-member-avatar ws-invite-avatar">
                          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <rect x="2" y="4" width="20" height="16" rx="2" />
                            <path d="M22 4L12 13L2 4" />
                          </svg>
                        </div>
                        <div className="ws-member-text">
                          <span className="ws-member-name">{inv.email}</span>
                          <span className="ws-member-email">Invited · {inv.role}</span>
                        </div>
                      </div>
                      <div className="ws-member-actions">
                        <span className="ws-role-badge ws-role-pending">pending</span>
                        {isAdmin && (
                          <button
                            className="ws-member-remove"
                            onClick={() => handleRevokeInvite(inv.id)}
                            title="Revoke invitation"
                          >
                            <img src={TrashIcon} alt="Revoke" />
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Existing members */}
            {membersLoading ? (
              <p className="ws-members-loading">Loading members…</p>
            ) : members.length === 0 ? (
              <p className="ws-members-loading">No members found.</p>
            ) : (
              <div className="ws-members-section">
                <label className="settings-label">Members ({members.length})</label>
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
                        {/* Owner can promote/demote any non-owner, non-self member */}
                        {isOwner && !isMemberOwner && !isSelf ? (
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

                        {/* Remove button — owner can remove anyone except self;
                            admin can only remove regular members */}
                        {!isMemberOwner && !isSelf && (
                          isOwner || (isAdmin && member.role === 'member')
                        ) && (
                          <button
                            className="ws-member-remove"
                            onClick={() => handleRemoveMember(member.user_id)}
                            title="Remove member"
                          >
                            <img src={TrashIcon} alt="Remove" />
                          </button>
                        )}

                        {/* Transfer ownership — owner only, to non-owners */}
                        {isOwner && !isMemberOwner && !isSelf && (
                          <button
                            className="ws-transfer-btn"
                            onClick={() => setTransferTarget(member.user_id)}
                            title="Transfer ownership"
                          >
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                              <path d="M4 12h16M13 5l7 7-7 7" />
                            </svg>
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* ── Transfer ownership confirmation overlay ── */}
      {transferTarget && (() => {
        const target = members.find((m) => m.user_id === transferTarget);
        if (!target) return null;
        return (
          <div className="ws-transfer-overlay">
            <div className="ws-transfer-dialog">
              <h3 className="ws-transfer-title">Transfer ownership</h3>
              <p className="ws-transfer-desc">
                Are you sure you want to transfer ownership of{' '}
                <strong>{activeWorkspace?.name}</strong> to{' '}
                <strong>{target.user.display_name}</strong>?
              </p>
              <p className="ws-transfer-warn">
                You will be downgraded to <em>admin</em>. This action cannot be undone
                without the new owner's consent.
              </p>
              <div className="ws-transfer-actions">
                <button
                  className="btn btn-ghost"
                  onClick={() => setTransferTarget(null)}
                  disabled={transferring}
                >
                  Cancel
                </button>
                <button
                  className="btn btn-danger"
                  onClick={() => handleTransferOwnership(transferTarget)}
                  disabled={transferring}
                >
                  {transferring ? 'Transferring…' : 'Transfer ownership'}
                </button>
              </div>
            </div>
          </div>
        );
      })()}
    </div>
  );
};
