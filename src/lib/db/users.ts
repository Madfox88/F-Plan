import { supabase } from '../supabase';
import type { User } from '../../types/database';

/* ══════════════════════════════════════════════════
   User Operations (DATABASE_SCHEMA.md §3)
   ══════════════════════════════════════════════════ */

/** Fetch all users in the system. Scoped to workspace members later. */
export async function getUsers(): Promise<User[]> {
  const { data, error } = await supabase
    .from('users')
    .select('*')
    .order('display_name');

  if (error) throw new Error(`Failed to fetch users: ${error.message}`);
  return data ?? [];
}

/** Update mutable fields on a user row (display_name, email, avatar_url). */
export async function updateUser(
  id: string,
  fields: Partial<Pick<User, 'display_name' | 'email' | 'avatar_url'>>
): Promise<User> {
  const { data, error } = await supabase
    .from('users')
    .update(fields)
    .eq('id', id)
    .select()
    .single();

  if (error) throw new Error(`Failed to update user: ${error.message}`);
  return data;
}

/* ── Account Deletion ───────────────────────────── */

/**
 * Permanently delete the current user's account.
 * Calls the `delete_own_account` RPC which:
 *   - Blocks if the user owns a workspace with other members
 *     (must transfer ownership first)
 *   - Deletes solo-owned workspaces (CASCADE cleans all data)
 *   - Deletes public.users + auth.users rows
 */
export async function deleteOwnAccount(): Promise<void> {
  const { error } = await supabase.rpc('delete_own_account');
  if (error) throw new Error(error.message);
}
