import React, { useState, useEffect, useCallback } from 'react';
import { useCurrentUser } from '../context/UserContext';
import { useWorkspace } from '../context/WorkspaceContext';
import { getMyPendingInvitations, acceptWorkspaceInvitation } from '../lib/database';
import type { WorkspaceInvitation, Workspace } from '../types/database';
import './PendingInvitationsBanner.css';

type InviteWithWorkspace = WorkspaceInvitation & { workspace: Workspace };

export const PendingInvitationsBanner: React.FC = () => {
  const { email } = useCurrentUser();
  const { refreshWorkspaces } = useWorkspace();
  const [invitations, setInvitations] = useState<InviteWithWorkspace[]>([]);
  const [accepting, setAccepting] = useState<string | null>(null);

  const loadInvitations = useCallback(async () => {
    if (!email) return;
    try {
      const data = await getMyPendingInvitations(email);
      setInvitations(data);
    } catch {
      // Silently fail — not critical
    }
  }, [email]);

  useEffect(() => {
    loadInvitations();
  }, [loadInvitations]);

  const handleAccept = async (inv: InviteWithWorkspace) => {
    setAccepting(inv.id);
    try {
      await acceptWorkspaceInvitation(inv.id);
      setInvitations((prev) => prev.filter((i) => i.id !== inv.id));
      await refreshWorkspaces();
    } catch {
      // error handling
    } finally {
      setAccepting(null);
    }
  };

  const handleDismiss = (invId: string) => {
    setInvitations((prev) => prev.filter((i) => i.id !== invId));
  };

  if (invitations.length === 0) return null;

  return (
    <div className="pending-invites-banner">
      {invitations.map((inv) => (
        <div key={inv.id} className="pending-invite-item">
          <div className="pending-invite-text">
            <strong>Workspace invitation:</strong> You've been invited to join{' '}
            <strong>{inv.workspace.name}</strong> as {inv.role === 'admin' ? 'an admin' : 'a member'}.
          </div>
          <div className="pending-invite-actions">
            <button
              className="settings-button primary small"
              onClick={() => handleAccept(inv)}
              disabled={accepting === inv.id}
            >
              {accepting === inv.id ? 'Joining…' : 'Accept'}
            </button>
            <button
              className="settings-button secondary small"
              onClick={() => handleDismiss(inv.id)}
              disabled={accepting === inv.id}
            >
              Dismiss
            </button>
          </div>
        </div>
      ))}
    </div>
  );
};
