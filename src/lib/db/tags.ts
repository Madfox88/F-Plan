import { supabase } from '../supabase';
import type { Tag, TagColor } from '../../types/database';

/* ═══ Unified Tag Operations ═══ */

export async function getTagsByWorkspace(workspaceId: string): Promise<Tag[]> {
  const { data, error } = await supabase
    .from('tags')
    .select('*')
    .eq('workspace_id', workspaceId)
    .order('label', { ascending: true });
  if (error) throw new Error(`Failed to fetch tags: ${error.message}`);
  return data || [];
}

export async function createTag(workspaceId: string, label: string, color: TagColor = 'blue'): Promise<Tag> {
  const { data, error } = await supabase
    .from('tags')
    .insert([{ workspace_id: workspaceId, label: label.trim(), color }])
    .select()
    .single();
  if (error) {
    if (error.code === '23505') throw new Error(`Tag "${label.trim()}" already exists`);
    throw new Error(`Failed to create tag: ${error.message}`);
  }
  return data;
}

export async function updateTag(id: string, updates: { label?: string; color?: TagColor }): Promise<Tag> {
  const payload: Record<string, string> = {};
  if (updates.label !== undefined) payload.label = updates.label.trim();
  if (updates.color !== undefined) payload.color = updates.color;
  const { data, error } = await supabase
    .from('tags')
    .update(payload)
    .eq('id', id)
    .select()
    .single();
  if (error) {
    if (error.code === '23505') throw new Error(`Tag "${updates.label}" already exists`);
    throw new Error(`Failed to update tag: ${error.message}`);
  }
  return data;
}

export async function deleteTag(id: string): Promise<void> {
  const { error } = await supabase.from('tags').delete().eq('id', id);
  if (error) throw new Error(`Failed to delete tag: ${error.message}`);
}

/* Tag ↔ Entity linking helpers */

export async function getGoalTagIds(goalId: string): Promise<string[]> {
  const { data, error } = await supabase.from('goal_tags').select('tag_id').eq('goal_id', goalId);
  if (error) throw new Error(`Failed to fetch goal tags: ${error.message}`);
  return (data || []).map((r: { tag_id: string }) => r.tag_id);
}

export async function setGoalTags(goalId: string, tagIds: string[]): Promise<void> {
  // Delete existing links then bulk-insert new ones
  const { error: delErr } = await supabase.from('goal_tags').delete().eq('goal_id', goalId);
  if (delErr) throw new Error(`Failed to clear goal tags: ${delErr.message}`);
  if (tagIds.length === 0) return;
  const rows = tagIds.map((tag_id) => ({ goal_id: goalId, tag_id }));
  const { error: insErr } = await supabase.from('goal_tags').insert(rows);
  if (insErr) throw new Error(`Failed to set goal tags: ${insErr.message}`);
}

export async function getPlanTagIds(planId: string): Promise<string[]> {
  const { data, error } = await supabase.from('plan_tags').select('tag_id').eq('plan_id', planId);
  if (error) throw new Error(`Failed to fetch plan tags: ${error.message}`);
  return (data || []).map((r: { tag_id: string }) => r.tag_id);
}

export async function setPlanTags(planId: string, tagIds: string[]): Promise<void> {
  const { error: delErr } = await supabase.from('plan_tags').delete().eq('plan_id', planId);
  if (delErr) throw new Error(`Failed to clear plan tags: ${delErr.message}`);
  if (tagIds.length === 0) return;
  const rows = tagIds.map((tag_id) => ({ plan_id: planId, tag_id }));
  const { error: insErr } = await supabase.from('plan_tags').insert(rows);
  if (insErr) throw new Error(`Failed to set plan tags: ${insErr.message}`);
}

export async function getTaskTagIds(taskId: string): Promise<string[]> {
  const { data, error } = await supabase.from('task_tags').select('tag_id').eq('task_id', taskId);
  if (error) throw new Error(`Failed to fetch task tags: ${error.message}`);
  return (data || []).map((r: { tag_id: string }) => r.tag_id);
}

export async function setTaskTags(taskId: string, tagIds: string[]): Promise<void> {
  const { error: delErr } = await supabase.from('task_tags').delete().eq('task_id', taskId);
  if (delErr) throw new Error(`Failed to clear task tags: ${delErr.message}`);
  if (tagIds.length === 0) return;
  const rows = tagIds.map((tag_id) => ({ task_id: taskId, tag_id }));
  const { error: insErr } = await supabase.from('task_tags').insert(rows);
  if (insErr) throw new Error(`Failed to set task tags: ${insErr.message}`);
}

/** Bulk fetch: tags for multiple goals in one query */
export async function getTagsForGoals(goalIds: string[]): Promise<Record<string, Tag[]>> {
  if (goalIds.length === 0) return {};
  const { data, error } = await supabase
    .from('goal_tags')
    .select('goal_id, tags(*)')
    .in('goal_id', goalIds);
  if (error) throw new Error(`Failed to fetch tags for goals: ${error.message}`);
  const result: Record<string, Tag[]> = {};
  for (const row of data || []) {
    const r = row as unknown as { goal_id: string; tags: Tag };
    if (!result[r.goal_id]) result[r.goal_id] = [];
    if (r.tags) result[r.goal_id].push(r.tags);
  }
  return result;
}

/** Bulk fetch: tags for multiple plans in one query */
export async function getTagsForPlans(planIds: string[]): Promise<Record<string, Tag[]>> {
  if (planIds.length === 0) return {};
  const { data, error } = await supabase
    .from('plan_tags')
    .select('plan_id, tags(*)')
    .in('plan_id', planIds);
  if (error) throw new Error(`Failed to fetch tags for plans: ${error.message}`);
  const result: Record<string, Tag[]> = {};
  for (const row of data || []) {
    const r = row as unknown as { plan_id: string; tags: Tag };
    if (!result[r.plan_id]) result[r.plan_id] = [];
    if (r.tags) result[r.plan_id].push(r.tags);
  }
  return result;
}

/** Bulk fetch: tags for multiple tasks in one query */
export async function getTagsForTasks(taskIds: string[]): Promise<Record<string, Tag[]>> {
  if (taskIds.length === 0) return {};
  const { data, error } = await supabase
    .from('task_tags')
    .select('task_id, tags(*)')
    .in('task_id', taskIds);
  if (error) throw new Error(`Failed to fetch tags for tasks: ${error.message}`);
  const result: Record<string, Tag[]> = {};
  for (const row of data || []) {
    const r = row as unknown as { task_id: string; tags: Tag };
    if (!result[r.task_id]) result[r.task_id] = [];
    if (r.tags) result[r.task_id].push(r.tags);
  }
  return result;
}
