import { supabase } from '../supabase';
import type { Task, TaskRepeatRule } from '../../types/database';

/** Supabase row shapes */
type IdRow = { id: string };
type IdTitleRow = { id: string; title: string };
type StageRef = { id: string; plan_id: string; title: string };

/* Task Operations */
type ChecklistPayloadItem = { id?: string; text: string; completed?: boolean } | string;

const normalizeChecklistPayload = (items?: ChecklistPayloadItem[]) => {
  if (!items) return [];
  return items.map((item, index) => {
    if (typeof item === 'string') {
      return { id: `${index}-${Date.now()}`, text: item, completed: false };
    }
    return {
      id: item.id || `${index}-${Date.now()}`,
      text: item.text,
      completed: !!item.completed,
    };
  });
};

export async function createTask(payload: {
  stageId: string;
  title: string;
  status?: 'not_started' | 'in_progress' | 'completed';
  priority?: 'urgent' | 'important' | 'medium' | 'low';
  startDate?: string;
  dueDate?: string;
  repeat?: TaskRepeatRule;
  description?: string;
  checklists?: ChecklistPayloadItem[];
  labels?: Array<{ id: string; name: string; color: string }>;
  assignedTo: string; // TASK_OWNERSHIP_RULES.md §3 — mandatory owner
}): Promise<Task> {
  // TASK_OWNERSHIP_RULES.md §3: Every task must have exactly one owner.
  if (!payload.assignedTo) {
    throw new Error('Task creation requires an authenticated user (assigned_to is mandatory)');
  }

  // First, try to insert with all new fields
  const { data, error } = await supabase
    .from('tasks')
    .insert([
      {
        stage_id: payload.stageId,
        title: payload.title,
        status: payload.status || 'not_started',
        priority: payload.priority || 'medium',
        start_date: payload.startDate || null,
        due_date: payload.dueDate || null,
        repeat: payload.repeat || 'none',
        description: payload.description || null,
        checklists: normalizeChecklistPayload(payload.checklists),
        labels: payload.labels || [],
        completed: payload.status === 'completed',
        assigned_to: payload.assignedTo,
      },
    ])
    .select()
    .single();

  // If it fails due to missing columns, try with basic fields only
  if (error && error.message.includes('column')) {
    const { data: basicData, error: basicError } = await supabase
      .from('tasks')
      .insert([
        {
          stage_id: payload.stageId,
          title: payload.title,
          due_date: payload.dueDate || null,
          completed: payload.status === 'completed',
          assigned_to: payload.assignedTo,
        },
      ])
      .select()
      .single();

    if (basicError) throw new Error(`Failed to create task: ${basicError.message}`);
    return basicData;
  }

  if (error) throw new Error(`Failed to create task: ${error.message}`);
  return data;
}

export async function updateTask(
  id: string,
  updates: Partial<Task>
): Promise<Task> {
  const { data, error } = await supabase
    .from('tasks')
    .update(updates)
    .eq('id', id)
    .select()
    .single();

  if (error) throw new Error(`Failed to update task: ${error.message}`);
  return data;
}

/**
 * Mark a task completed or reopen it.
 * TASK_TEMPORAL_TRUTH_RULES.md §2-3:
 * - Completing: set completed_at = now(), completed = true
 * - Reopening: clear completed_at = null, completed = false
 */
export async function setTaskCompleted(id: string, completed: boolean): Promise<Task> {
  if (completed) {
    return updateTask(id, { completed: true, completed_at: new Date().toISOString() } as Partial<Task>);
  } else {
    return updateTask(id, { completed: false, completed_at: null } as Partial<Task>);
  }
}

export async function deleteTask(id: string): Promise<void> {
  const { error } = await supabase
    .from('tasks')
    .delete()
    .eq('id', id);

  if (error) throw new Error(`Failed to delete task: ${error.message}`);
}

/* ── Dashboard Task Queries ── */

export type TaskWithContext = Task & {
  plan_title: string;
  stage_title: string;
};

/**
 * Get tasks due today or overdue, assigned to a user, from active plans.
 * DASHBOARD_RULES.md §4
 */
export async function getTasksDueForUser(
  userId: string,
  workspaceId: string,
  today: string // YYYY-MM-DD in user's local timezone
): Promise<TaskWithContext[]> {
  // Get active plans
  const { data: plans, error: plansError } = await supabase
    .from('plans')
    .select('id, title')
    .eq('workspace_id', workspaceId)
    .is('archived_at', null);

  if (plansError) throw new Error(`Failed to fetch plans: ${plansError.message}`);
  if (!plans || plans.length === 0) return [];

  const planIds = plans.map((p: IdTitleRow) => p.id);
  const planMap: Record<string, string> = {};
  plans.forEach((p: IdTitleRow) => { planMap[p.id] = p.title; });

  const { data: stages, error: stagesError } = await supabase
    .from('stages')
    .select('id, plan_id, title')
    .in('plan_id', planIds);

  if (stagesError) throw new Error(`Failed to fetch stages: ${stagesError.message}`);
  if (!stages || stages.length === 0) return [];

  const stageIds = stages.map((s: StageRef) => s.id);
  const stageMap: Record<string, { title: string; planId: string }> = {};
  stages.forEach((s: StageRef) => { stageMap[s.id] = { title: s.title, planId: s.plan_id }; });

  // Tasks due today or overdue, assigned to user, not completed
  const { data: tasks, error: tasksError } = await supabase
    .from('tasks')
    .select('*')
    .in('stage_id', stageIds)
    .eq('assigned_to', userId)
    .is('completed_at', null)
    .lte('due_date', today);

  if (tasksError) throw new Error(`Failed to fetch tasks: ${tasksError.message}`);
  if (!tasks) return [];

  return tasks.map((t: Task) => {
    const stageInfo = stageMap[t.stage_id] || { title: 'Unknown', planId: '' };
    return {
      ...t,
      plan_title: planMap[stageInfo.planId] || 'Unknown',
      stage_title: stageInfo.title,
    };
  });
}

/**
 * Get completed task count in a rolling window for a user.
 * TASK_TEMPORAL_TRUTH_RULES.md §4: rolling window = now minus hours.
 * DASHBOARD_RULES.md §6.1: completed tasks (last 7 days).
 */
export async function getCompletedTaskCountInWindow(
  userId: string,
  windowStartISO: string
): Promise<number> {
  const { count, error } = await supabase
    .from('tasks')
    .select('*', { count: 'exact', head: true })
    .eq('assigned_to', userId)
    .gte('completed_at', windowStartISO);

  if (error) throw new Error(`Failed to count completed tasks: ${error.message}`);
  return count || 0;
}

/**
 * Get total assigned task count for a user across active plans.
 * Used for completion rate denominator.
 * VISIBILITY_RULES.md §9.2
 */
export async function getAssignedTaskCount(
  userId: string,
  workspaceId: string
): Promise<number> {
  // Active plans only
  const { data: plans } = await supabase
    .from('plans')
    .select('id')
    .eq('workspace_id', workspaceId)
    .is('archived_at', null);

  if (!plans || plans.length === 0) return 0;

  const { data: stages } = await supabase
    .from('stages')
    .select('id')
    .in('plan_id', plans.map((p: IdRow) => p.id));

  if (!stages || stages.length === 0) return 0;

  const { count, error } = await supabase
    .from('tasks')
    .select('*', { count: 'exact', head: true })
    .in('stage_id', stages.map((s: IdRow) => s.id))
    .eq('assigned_to', userId);

  if (error) throw new Error(`Failed to count assigned tasks: ${error.message}`);
  return count || 0;
}

/**
 * Get task count assigned to a user that were created or completed within a
 * rolling window. Used alongside getCompletedTaskCountInWindow so numerator
 * and denominator share the same time scope.
 */
export async function getAssignedTaskCountInWindow(
  userId: string,
  workspaceId: string,
  windowStartISO: string
): Promise<number> {
  const { data: plans } = await supabase
    .from('plans')
    .select('id')
    .eq('workspace_id', workspaceId)
    .is('archived_at', null);

  if (!plans || plans.length === 0) return 0;

  const { data: stages } = await supabase
    .from('stages')
    .select('id')
    .in('plan_id', plans.map((p: IdRow) => p.id));

  if (!stages || stages.length === 0) return 0;

  const stageIds = stages.map((s: IdRow) => s.id);

  // Tasks that were active in the window: either incomplete or completed within the window
  const { count: incompleteCount } = await supabase
    .from('tasks')
    .select('*', { count: 'exact', head: true })
    .in('stage_id', stageIds)
    .eq('assigned_to', userId)
    .is('completed_at', null);

  const { count: completedInWindowCount } = await supabase
    .from('tasks')
    .select('*', { count: 'exact', head: true })
    .in('stage_id', stageIds)
    .eq('assigned_to', userId)
    .gte('completed_at', windowStartISO);

  return (incompleteCount || 0) + (completedInWindowCount || 0);
}

/**
 * Get incomplete tasks assigned to the current user across all active plans
 * in a workspace. Used by Dashboard focus session to let the user link a
 * session to a specific task.
 */
export async function getIncompleteTasksForUser(
  userId: string,
  workspaceId: string
): Promise<Task[]> {
  const { data: plans } = await supabase
    .from('plans')
    .select('id')
    .eq('workspace_id', workspaceId)
    .is('archived_at', null);

  if (!plans || plans.length === 0) return [];

  const { data: stages } = await supabase
    .from('stages')
    .select('id')
    .in('plan_id', plans.map((p: IdRow) => p.id));

  if (!stages || stages.length === 0) return [];

  const { data: tasks, error } = await supabase
    .from('tasks')
    .select('*')
    .in('stage_id', stages.map((s: IdRow) => s.id))
    .eq('completed', false)
    .eq('assigned_to', userId)
    .order('created_at', { ascending: false });

  if (error) throw new Error(`Failed to fetch tasks: ${error.message}`);
  return tasks || [];
}

export async function getTasksWithDueDatesInRange(
  workspaceId: string,
  rangeStart: string,
  rangeEnd: string
): Promise<TaskWithContext[]> {
  // Load all active plans for workspace, then their stages + tasks
  const { data: plans, error: plansError } = await supabase
    .from('plans')
    .select('id, title')
    .eq('workspace_id', workspaceId)
    .eq('status', 'active');

  if (plansError) throw new Error(`Failed to fetch plans: ${plansError.message}`);
  if (!plans || plans.length === 0) return [];

  const planIds = plans.map((p: IdTitleRow) => p.id);
  const planMap: Record<string, string> = {};
  plans.forEach((p: IdTitleRow) => { planMap[p.id] = p.title; });

  const { data: stages, error: stagesError } = await supabase
    .from('stages')
    .select('id, plan_id, title')
    .in('plan_id', planIds);

  if (stagesError) throw new Error(`Failed to fetch stages: ${stagesError.message}`);
  if (!stages || stages.length === 0) return [];

  const stageIds = stages.map((s: StageRef) => s.id);
  const stageMap: Record<string, { title: string; planId: string }> = {};
  stages.forEach((s: StageRef) => { stageMap[s.id] = { title: s.title, planId: s.plan_id }; });

  const { data: tasks, error: tasksError } = await supabase
    .from('tasks')
    .select('*')
    .in('stage_id', stageIds)
    .not('due_date', 'is', null)
    .gte('due_date', rangeStart.split('T')[0])
    .lte('due_date', rangeEnd.split('T')[0]);

  if (tasksError) throw new Error(`Failed to fetch tasks: ${tasksError.message}`);
  if (!tasks) return [];

  return tasks.map((t: Task) => {
    const stageInfo = stageMap[t.stage_id] || { title: 'Unknown', planId: '' };
    return {
      ...t,
      plan_title: planMap[stageInfo.planId] || 'Unknown',
      stage_title: stageInfo.title,
    };
  });
}
