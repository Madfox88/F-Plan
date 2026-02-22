import { supabase } from '../supabase';
import type { ActivityAction, ActivityEntityType, ActivityLogEntry, ActivityLogEntryWithUser } from '../../types/database';

/* ═══ Activity Log ═══ */

/**
 * Write a single activity log entry.
 * Fire-and-forget — failures are silently logged to console so they never
 * block user-facing CRUD operations.
 */
export async function logActivity(params: {
  workspaceId: string;
  userId: string;
  action: ActivityAction;
  entityType: ActivityEntityType;
  entityId: string;
  entityTitle: string;
  metadata?: Record<string, unknown>;
}): Promise<void> {
  try {
    await supabase.from('activity_log').insert([{
      workspace_id: params.workspaceId,
      user_id: params.userId,
      action: params.action,
      entity_type: params.entityType,
      entity_id: params.entityId,
      entity_title: params.entityTitle,
      metadata: params.metadata ?? {},
    }]);
  } catch (err) {
    console.warn('[activity_log] Failed to write log entry:', err);
  }
}

/** Fetch recent activity for an entire workspace (global feed). */
export async function getActivityLog(
  workspaceId: string,
  options?: { limit?: number; offset?: number; entityType?: ActivityEntityType }
): Promise<ActivityLogEntryWithUser[]> {
  let query = supabase
    .from('activity_log')
    .select('*')
    .eq('workspace_id', workspaceId)
    .order('created_at', { ascending: false });

  if (options?.entityType) {
    query = query.eq('entity_type', options.entityType);
  }
  if (options?.limit) {
    query = query.limit(options.limit);
  }
  if (options?.offset) {
    query = query.range(options.offset, options.offset + (options?.limit ?? 50) - 1);
  }

  const { data, error } = await query;
  if (error) throw new Error(`Failed to fetch activity log: ${error.message}`);

  // Enrich with user display names
  const entries = (data || []) as ActivityLogEntry[];
  if (entries.length === 0) return [];

  const userIds = [...new Set(entries.map((e) => e.user_id))];
  const { data: users } = await supabase
    .from('users')
    .select('id, display_name, avatar_url')
    .in('id', userIds);

  type UserSlice = { id: string; display_name: string; avatar_url: string | null };
  const userMap = new Map((users || []).map((u: UserSlice) => [u.id, u]));

  return entries.map((entry) => {
    const user = userMap.get(entry.user_id);
    return {
      ...entry,
      user_display_name: user?.display_name ?? 'Unknown',
      user_avatar_url: user?.avatar_url ?? null,
    };
  });
}

/** Fetch activity for a specific entity (per-entity history). */
export async function getEntityActivityLog(
  entityType: ActivityEntityType,
  entityId: string,
  limit = 50
): Promise<ActivityLogEntryWithUser[]> {
  const { data, error } = await supabase
    .from('activity_log')
    .select('*')
    .eq('entity_type', entityType)
    .eq('entity_id', entityId)
    .order('created_at', { ascending: false })
    .limit(limit);

  if (error) throw new Error(`Failed to fetch entity activity: ${error.message}`);

  const entries = (data || []) as ActivityLogEntry[];
  if (entries.length === 0) return [];

  const userIds = [...new Set(entries.map((e) => e.user_id))];
  const { data: users } = await supabase
    .from('users')
    .select('id, display_name, avatar_url')
    .in('id', userIds);

  type UserSlice = { id: string; display_name: string; avatar_url: string | null };
  const userMap = new Map((users || []).map((u: UserSlice) => [u.id, u]));

  return entries.map((entry) => {
    const user = userMap.get(entry.user_id);
    return {
      ...entry,
      user_display_name: user?.display_name ?? 'Unknown',
      user_avatar_url: user?.avatar_url ?? null,
    };
  });
}
