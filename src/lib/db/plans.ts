import { supabase } from '../supabase';
import type { Plan } from '../../types/database';
import { createStage } from './stages';

/** Supabase row shapes */
type PlanWithNestedStages = Plan & { stages?: Array<{ id: string; tasks?: Array<{ id: string }> }> };

/* Plan Operations */

/** Get or create the hidden inbox plan for standalone tasks. */
export async function getOrCreateInboxPlan(workspaceId: string): Promise<{ plan: Plan; stageId: string }> {
  // Try to find existing inbox plan
  const { data: existing, error: fetchErr } = await supabase
    .from('plans')
    .select('*')
    .eq('workspace_id', workspaceId)
    .eq('is_inbox', true)
    .limit(1)
    .maybeSingle();

  if (fetchErr) throw new Error(`Failed to fetch inbox plan: ${fetchErr.message}`);

  if (existing) {
    // Get the inbox stage
    const { data: stages, error: stageErr } = await supabase
      .from('stages')
      .select('id')
      .eq('plan_id', existing.id)
      .order('position', { ascending: true })
      .limit(1);

    if (stageErr) throw new Error(`Failed to fetch inbox stage: ${stageErr.message}`);
    if (stages && stages.length > 0) {
      return { plan: existing, stageId: stages[0].id };
    }
    // Stage somehow missing — recreate it
    const stage = await createStage(existing.id, 'Tasks');
    return { plan: existing, stageId: stage.id };
  }

  // Create the inbox plan (handle race condition: another call may have just created it)
  const { data: newPlan, error: createErr } = await supabase
    .from('plans')
    .insert([{
      workspace_id: workspaceId,
      title: 'Inbox',
      description: null,
      intent: null,
      status: 'active',
      is_inbox: true,
      is_pinned: false,
      due_date: null,
    }])
    .select()
    .single();

  if (createErr) {
    // Unique constraint violation → another call created it; re-fetch
    if (createErr.code === '23505') {
      return getOrCreateInboxPlan(workspaceId);
    }
    throw new Error(`Failed to create inbox plan: ${createErr.message}`);
  }

  // Create a single default stage
  const stage = await createStage(newPlan.id, 'Tasks');
  return { plan: newPlan, stageId: stage.id };
}

/** Get active + completed plans EXCLUDING the hidden inbox plan (for Plans page). */
export async function getActivePlans(workspaceId: string): Promise<Plan[]> {
  const { data, error } = await supabase
    .from('plans')
    .select('*')
    .eq('workspace_id', workspaceId)
    .in('status', ['active', 'completed'])
    .or('is_inbox.is.null,is_inbox.eq.false')
    .order('created_at', { ascending: false });

  if (error) throw new Error(`Failed to fetch plans: ${error.message}`);
  return data || [];
}

/** Get ALL active + completed plans INCLUDING the inbox plan (for Tasks view). */
export async function getAllActivePlansIncludingInbox(workspaceId: string): Promise<Plan[]> {
  const { data, error } = await supabase
    .from('plans')
    .select('*')
    .eq('workspace_id', workspaceId)
    .in('status', ['active', 'completed'])
    .order('created_at', { ascending: false });

  if (error) throw new Error(`Failed to fetch plans: ${error.message}`);
  return data || [];
}

export async function getActivePlansWithMetadata(
  workspaceId: string
): Promise<Array<Plan & { stageCount: number; taskCount: number }>> {
  const { data, error } = await supabase
    .from('plans')
    .select(
      `
      *,
      stages (
        id,
        tasks (id)
      )
    `
    )
    .eq('workspace_id', workspaceId)
    .in('status', ['active', 'completed'])
    .or('is_inbox.is.null,is_inbox.eq.false')
    .order('created_at', { ascending: false });

  if (error) throw new Error(`Failed to fetch plans: ${error.message}`);

  return (data || []).map((plan: PlanWithNestedStages) => {
    const stageCount = plan.stages?.length || 0;
    const taskCount = plan.stages?.reduce(
      (sum: number, stage: { tasks?: { id: string }[] }) => sum + (stage.tasks?.length || 0),
      0
    ) || 0;

    return {
      ...plan,
      stageCount,
      taskCount,
      stages: undefined, // Remove nested data
    };
  });
}

export async function getPlansWithMetadataByStatus(
  workspaceId: string,
  status: 'active' | 'completed' | 'archived'
): Promise<Array<Plan & { stageCount: number; taskCount: number }>> {
  const { data, error } = await supabase
    .from('plans')
    .select(
      `
      *,
      stages (
        id,
        tasks (id)
      )
    `
    )
    .eq('workspace_id', workspaceId)
    .eq('status', status)
    .or('is_inbox.is.null,is_inbox.eq.false')
    .order('created_at', { ascending: false });

  if (error) throw new Error(`Failed to fetch plans: ${error.message}`);

  return (data || []).map((plan: PlanWithNestedStages) => {
    const stageCount = plan.stages?.length || 0;
    const taskCount = plan.stages?.reduce(
      (sum: number, stage: { tasks?: { id: string }[] }) => sum + (stage.tasks?.length || 0),
      0
    ) || 0;

    return {
      ...plan,
      stageCount,
      taskCount,
      stages: undefined,
    };
  });
}

export async function getPlanById(id: string): Promise<Plan> {
  const { data, error } = await supabase
    .from('plans')
    .select('*')
    .eq('id', id)
    .single();

  if (error) throw new Error(`Failed to fetch plan: ${error.message}`);
  return data;
}

export async function togglePlanPin(planId: string, isPinned: boolean): Promise<Plan> {
  const { data, error } = await supabase
    .from('plans')
    .update({ is_pinned: isPinned })
    .eq('id', planId)
    .select()
    .single();

  if (error) throw new Error(`Failed to toggle plan pin: ${error.message}`);
  return data;
}

export async function getPinnedPlans(workspaceId: string): Promise<Plan[]> {
  const { data, error } = await supabase
    .from('plans')
    .select('*')
    .eq('workspace_id', workspaceId)
    .eq('is_pinned', true)
    .eq('status', 'active')
    .or('is_inbox.is.null,is_inbox.eq.false')
    .order('created_at', { ascending: true });

  if (error) throw new Error(`Failed to fetch pinned plans: ${error.message}`);
  return data || [];
}

export async function createPlan(
  workspaceId: string,
  title: string,
  description?: string,
  intent?: string,
  status: 'active' | 'draft' = 'active',
  dueDate?: string
): Promise<Plan> {
  const { data, error } = await supabase
    .from('plans')
    .insert([
      {
        workspace_id: workspaceId,
        title,
        description: description || null,
        intent: intent || null,
        status,
        due_date: dueDate || null,
      },
    ])
    .select()
    .single();

  if (error) throw new Error(`Failed to create plan: ${error.message}`);
  return data;
}

export async function updatePlan(
  id: string,
  updates: Partial<Plan>
): Promise<Plan> {
  const { data, error } = await supabase
    .from('plans')
    .update(updates)
    .eq('id', id)
    .select()
    .single();

  if (error) throw new Error(`Failed to update plan: ${error.message}`);
  return data;
}

export async function archivePlan(id: string): Promise<Plan> {
  return updatePlan(id, { status: 'archived', archived_at: new Date().toISOString() } as Partial<Plan>);
}

/** Mark a plan as completed (user-confirmed prompt). */
export async function completePlan(id: string): Promise<Plan> {
  return updatePlan(id, { status: 'completed', completed_at: new Date().toISOString() } as Partial<Plan>);
}

/** Reopen a completed plan back to active. */
export async function reopenPlan(id: string): Promise<Plan> {
  return updatePlan(id, { status: 'active', completed_at: null } as Partial<Plan>);
}

export async function deletePlan(id: string): Promise<void> {
  const { error } = await supabase.from('plans').delete().eq('id', id);
  if (error) throw error;
}

export async function renamePlan(id: string, newTitle: string): Promise<Plan> {
  return updatePlan(id, { title: newTitle });
}
