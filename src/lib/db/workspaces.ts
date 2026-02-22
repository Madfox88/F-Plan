import { supabase } from '../supabase';
import type { Workspace, WorkspaceMember, WorkspaceMemberRole, WorkspaceInvitation, User } from '../../types/database';

/* Workspace Operations */
export async function getWorkspaces(): Promise<Workspace[]> {
  const { data, error } = await supabase
    .from('workspaces')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) throw new Error(`Failed to fetch workspaces: ${error.message}`);
  return data || [];
}

export async function createWorkspace(name: string): Promise<Workspace> {
  const { data, error } = await supabase
    .from('workspaces')
    .insert([{ name }])
    .select()
    .single();

  if (error) throw new Error(`Failed to create workspace: ${error.message}`);
  return data;
}

export async function updateWorkspace(
  id: string,
  updates: Partial<Workspace>
): Promise<Workspace> {
  const { data, error } = await supabase
    .from('workspaces')
    .update(updates)
    .eq('id', id)
    .select()
    .single();

  if (error) throw new Error(`Failed to update workspace: ${error.message}`);
  return data;
}

export async function deleteWorkspace(id: string): Promise<void> {
  const { error } = await supabase
    .from('workspaces')
    .delete()
    .eq('id', id);

  if (error) throw new Error(`Failed to delete workspace: ${error.message}`);
}

export async function getOrCreateWorkspace(): Promise<Workspace> {
  // First, try to get existing workspace
  const { data: existingWorkspaces } = await supabase
    .from('workspaces')
    .select('*')
    .limit(1);

  if (existingWorkspaces && existingWorkspaces.length > 0) {
    return existingWorkspaces[0];
  }

  // Create default workspace if none exists
  const { data: newWorkspace, error: createError } = await supabase
    .from('workspaces')
    .insert([{ name: 'My Workspace' }])
    .select()
    .single();

  if (createError) throw new Error(`Failed to create workspace: ${createError.message}`);
  return newWorkspace;
}

export async function getWorkspace(id: string): Promise<Workspace> {
  const { data, error } = await supabase
    .from('workspaces')
    .select('*')
    .eq('id', id)
    .single();

  if (error) throw new Error(`Failed to fetch workspace: ${error.message}`);
  return data;
}

/* Workspace Member Operations */

/** Get all members for a workspace (with user profile data). */
export async function getWorkspaceMembers(
  workspaceId: string
): Promise<(WorkspaceMember & { user: User })[]> {
  const { data, error } = await supabase
    .from('workspace_members')
    .select('*, user:users(*)')
    .eq('workspace_id', workspaceId);

  if (error) throw new Error(`Failed to fetch workspace members: ${error.message}`);
  return (data || []) as (WorkspaceMember & { user: User })[];
}

/** Get the current user's membership in a workspace (or null if not a member). */
export async function getMyMembership(
  workspaceId: string,
  userId: string
): Promise<WorkspaceMember | null> {
  const { data, error } = await supabase
    .from('workspace_members')
    .select('*')
    .eq('workspace_id', workspaceId)
    .eq('user_id', userId)
    .maybeSingle();

  if (error) throw new Error(`Failed to fetch membership: ${error.message}`);
  return data;
}

/** Add a member to a workspace. Caller must be owner/admin (enforced by RLS). */
export async function addWorkspaceMember(
  workspaceId: string,
  userId: string,
  role: WorkspaceMemberRole = 'member'
): Promise<WorkspaceMember> {
  const { data, error } = await supabase
    .from('workspace_members')
    .insert([{ workspace_id: workspaceId, user_id: userId, role }])
    .select()
    .single();

  if (error) throw new Error(`Failed to add workspace member: ${error.message}`);
  return data;
}

/** Update a member's role. Caller must be owner/admin (enforced by RLS). */
export async function updateWorkspaceMemberRole(
  workspaceId: string,
  userId: string,
  role: WorkspaceMemberRole
): Promise<WorkspaceMember> {
  const { data, error } = await supabase
    .from('workspace_members')
    .update({ role })
    .eq('workspace_id', workspaceId)
    .eq('user_id', userId)
    .select()
    .single();

  if (error) throw new Error(`Failed to update member role: ${error.message}`);
  return data;
}

/** Remove a member from a workspace. */
export async function removeWorkspaceMember(
  workspaceId: string,
  userId: string
): Promise<void> {
  const { error } = await supabase
    .from('workspace_members')
    .delete()
    .eq('workspace_id', workspaceId)
    .eq('user_id', userId);

  if (error) throw new Error(`Failed to remove workspace member: ${error.message}`);
}

/* Workspace Invitation Operations */

/** Get pending invitations for a workspace. */
export async function getWorkspaceInvitations(
  workspaceId: string
): Promise<WorkspaceInvitation[]> {
  const { data, error } = await supabase
    .from('workspace_invitations')
    .select('*')
    .eq('workspace_id', workspaceId)
    .eq('status', 'pending')
    .order('created_at', { ascending: false });

  if (error) throw new Error(`Failed to fetch invitations: ${error.message}`);
  return data || [];
}

/** Create an invitation. Caller must be owner/admin (enforced by RLS). */
export async function createWorkspaceInvitation(
  workspaceId: string,
  email: string,
  role: 'admin' | 'member',
  invitedBy: string
): Promise<WorkspaceInvitation> {
  const { data, error } = await supabase
    .from('workspace_invitations')
    .insert([{
      workspace_id: workspaceId,
      email: email.toLowerCase().trim(),
      role,
      invited_by: invitedBy,
    }])
    .select()
    .single();

  if (error) {
    if (error.code === '23505') {
      throw new Error('An invitation for this email is already pending');
    }
    throw new Error(`Failed to create invitation: ${error.message}`);
  }
  return data;
}

/** Revoke (cancel) a pending invitation. */
export async function revokeWorkspaceInvitation(invitationId: string): Promise<void> {
  const { error } = await supabase
    .from('workspace_invitations')
    .update({ status: 'revoked' })
    .eq('id', invitationId)
    .eq('status', 'pending');

  if (error) throw new Error(`Failed to revoke invitation: ${error.message}`);
}

/** Send invitation email via Edge Function + Resend. Returns true if sent. */
export async function sendInvitationEmail(
  email: string,
  workspaceName: string,
  inviterName: string,
  role: string
): Promise<boolean> {
  const appUrl = window.location.origin;
  const { data, error } = await supabase.functions.invoke('send-invitation-email', {
    body: { email, workspaceName, inviterName, role, appUrl },
  });
  if (error) {
    console.warn('Invitation email failed (invitation still created):', error.message);
    return false;
  }
  if (data?.error) {
    console.warn('Invitation email rejected:', data.error);
    return false;
  }
  return true;
}

/** Transfer workspace ownership to another member. Caller must be owner. */
export async function transferWorkspaceOwnership(
  workspaceId: string,
  newOwnerId: string
): Promise<void> {
  const { error } = await supabase.rpc('transfer_workspace_ownership', {
    ws_id: workspaceId,
    new_owner_id: newOwnerId,
  });

  if (error) throw new Error(`Failed to transfer ownership: ${error.message}`);
}

/** Get pending invitations for the current user's email. */
export async function getMyPendingInvitations(
  email: string
): Promise<(WorkspaceInvitation & { workspace: Workspace })[]> {
  const { data, error } = await supabase
    .from('workspace_invitations')
    .select('*, workspace:workspaces(*)')
    .eq('email', email.toLowerCase())
    .eq('status', 'pending');

  if (error) throw new Error(`Failed to fetch your invitations: ${error.message}`);
  return (data || []) as (WorkspaceInvitation & { workspace: Workspace })[];
}

/** Accept a pending invitation (calls the DB function). */
export async function acceptWorkspaceInvitation(invitationId: string): Promise<void> {
  const { error } = await supabase.rpc('accept_workspace_invitation', {
    invitation_id: invitationId,
  });

  if (error) throw new Error(`Failed to accept invitation: ${error.message}`);
}
