import { supabase } from './supabase';
import type { Workspace, Plan, Stage, Task, Goal, StageWithTasks, CalendarEvent, Reminder, RepeatRule } from '../types/database';

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

/* Plan Operations */
export async function getActivePlans(workspaceId: string): Promise<Plan[]> {
  const { data, error } = await supabase
    .from('plans')
    .select('*')
    .eq('workspace_id', workspaceId)
    .eq('status', 'active')
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
    .eq('status', 'active')
    .order('created_at', { ascending: false });

  if (error) throw new Error(`Failed to fetch plans: ${error.message}`);

  return (data || []).map((plan: any) => {
    const stageCount = plan.stages?.length || 0;
    const taskCount = plan.stages?.reduce(
      (sum: number, stage: any) => sum + (stage.tasks?.length || 0),
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
  status: 'active' | 'archived'
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
    .order('created_at', { ascending: false });

  if (error) throw new Error(`Failed to fetch plans: ${error.message}`);

  return (data || []).map((plan: any) => {
    const stageCount = plan.stages?.length || 0;
    const taskCount = plan.stages?.reduce(
      (sum: number, stage: any) => sum + (stage.tasks?.length || 0),
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
  return updatePlan(id, { status: 'archived' });
}

export async function deletePlan(id: string): Promise<void> {
  const { error } = await supabase.from('plans').delete().eq('id', id);
  if (error) throw error;
}

export async function renamePlan(id: string, newTitle: string): Promise<Plan> {
  return updatePlan(id, { title: newTitle });
}

/* Stage Operations */
export async function getStagesByPlan(planId: string): Promise<StageWithTasks[]> {
  const { data, error } = await supabase
    .from('stages')
    .select(
      `
      *,
      tasks (*)
    `
    )
    .eq('plan_id', planId)
    .order('position', { ascending: true });

  if (error) throw new Error(`Failed to fetch stages: ${error.message}`);
  return data || [];
}

export async function createDefaultStages(planId: string): Promise<Stage[]> {
  const defaultStages = [
    'Initiating',
    'Planning',
    'Executing',
    'Controlling and Monitoring',
    'Closing',
  ];

  const stagesToInsert = defaultStages.map((title, position) => ({
    plan_id: planId,
    title,
    position,
  }));

  const { data, error } = await supabase
    .from('stages')
    .insert(stagesToInsert)
    .select();

  if (error) throw new Error(`Failed to create default stages: ${error.message}`);
  return data || [];
}

export async function createSuggestedStages(planId: string): Promise<Stage[]> {
  const suggestedStages = ['Thinking', 'Planning', 'Execution', 'Review'];

  const stagesToInsert = suggestedStages.map((title, position) => ({
    plan_id: planId,
    title,
    position,
  }));

  const { data, error } = await supabase
    .from('stages')
    .insert(stagesToInsert)
    .select();

  if (error) throw new Error(`Failed to create suggested stages: ${error.message}`);
  return data || [];
}

export async function createCustomStages(
  planId: string,
  stageNames: string[]
): Promise<Stage[]> {
  const stagesToInsert = stageNames
    .filter((name) => name.trim())
    .slice(0, 6)
    .map((title, position) => ({
      plan_id: planId,
      title: title.trim(),
      position,
    }));

  if (stagesToInsert.length === 0) {
    throw new Error('At least one stage name is required');
  }

  const { data, error } = await supabase
    .from('stages')
    .insert(stagesToInsert)
    .select();

  if (error) throw new Error(`Failed to create custom stages: ${error.message}`);
  return data || [];
}

export async function createStage(planId: string, title: string): Promise<Stage> {
  // Get the highest position to add the new stage at the end
  const { data: existingStages, error: fetchError } = await supabase
    .from('stages')
    .select('position')
    .eq('plan_id', planId)
    .order('position', { ascending: false })
    .limit(1);

  if (fetchError && fetchError.code !== 'PGRST116') {
    throw new Error(`Failed to fetch stages: ${fetchError.message}`);
  }

  const position = existingStages && existingStages.length > 0 
    ? (existingStages[0].position || 0) + 1
    : 0;

  const { data, error } = await supabase
    .from('stages')
    .insert([{
      plan_id: planId,
      title: title.trim(),
      position,
    }])
    .select()
    .single();

  if (error) throw new Error(`Failed to create stage: ${error.message}`);
  return data;
}

export async function updateStagePosition(id: string, position: number): Promise<Stage> {
  const { data, error } = await supabase
    .from('stages')
    .update({ position })
    .eq('id', id)
    .select()
    .single();

  if (error) throw new Error(`Failed to update stage: ${error.message}`);
  return data;
}

export async function deleteStage(id: string): Promise<void> {
  const { error } = await supabase
    .from('stages')
    .delete()
    .eq('id', id);

  if (error) throw new Error(`Failed to delete stage: ${error.message}`);
}

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

export async function getTasksByStage(stageId: string): Promise<Task[]> {
  const { data, error } = await supabase
    .from('tasks')
    .select('*')
    .eq('stage_id', stageId)
    .order('created_at', { ascending: true });

  if (error) throw new Error(`Failed to fetch tasks: ${error.message}`);
  return data || [];
}

export async function createTask(payload: {
  stageId: string;
  title: string;
  status?: 'not_started' | 'in_progress' | 'completed';
  priority?: 'urgent' | 'important' | 'medium' | 'low';
  startDate?: string;
  dueDate?: string;
  repeat?: 'none' | 'daily' | 'weekly' | 'monthly' | 'yearly' | 'customized';
  description?: string;
  checklists?: ChecklistPayloadItem[];
  labels?: Array<{ id: string; name: string; color: string }>;
}): Promise<Task> {
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

export async function completeTask(id: string): Promise<Task> {
  return updateTask(id, { completed: true });
}

export async function moveTaskToStage(taskId: string, stageId: string): Promise<Task> {
  return updateTask(taskId, { stage_id: stageId });
}

export async function deleteTask(id: string): Promise<void> {
  const { error } = await supabase
    .from('tasks')
    .delete()
    .eq('id', id);

  if (error) throw new Error(`Failed to delete task: ${error.message}`);
}

/* Goal Operations */
export async function getGoalsByWorkspace(workspaceId: string): Promise<Goal[]> {
  const { data, error } = await supabase
    .from('goals')
    .select('*')
    .eq('workspace_id', workspaceId)
    .order('created_at', { ascending: false });

  if (error) throw new Error(`Failed to fetch goals: ${error.message}`);
  return data || [];
}

export type GoalWithProgress = Goal & {
  linkedPlanCount: number;
  linkedPlanNames: string[];
  totalTasks: number;
  completedTasks: number;
  progress: number; // 0–100
};

export async function getGoalsWithProgress(workspaceId: string): Promise<GoalWithProgress[]> {
  // 1. Fetch all goals for this workspace
  const goals = await getGoalsByWorkspace(workspaceId);
  if (goals.length === 0) return [];

  // 2. Fetch all plan-goal links
  const { data: links, error: linksError } = await supabase
    .from('plan_goals')
    .select('plan_id, goal_id');

  if (linksError) throw new Error(`Failed to fetch plan-goal links: ${linksError.message}`);

  const goalLinks = links || [];

  // 3. Get unique plan IDs that are linked to any goal
  const linkedPlanIds = [...new Set(goalLinks.map((l: any) => l.plan_id))];

  // 3b. Fetch plan names for all linked plans
  const planNamesMap: Record<string, string> = {};
  if (linkedPlanIds.length > 0) {
    const { data: plans } = await supabase
      .from('plans')
      .select('id, title')
      .in('id', linkedPlanIds);
    (plans || []).forEach((p: any) => { planNamesMap[p.id] = p.title; });
  }

  // 4. For each linked plan, load stages and tasks to compute progress
  const tasksByPlan: Record<string, { total: number; completed: number }> = {};
  await Promise.all(
    linkedPlanIds.map(async (planId: string) => {
      try {
        const stages = await getStagesByPlan(planId);
        let total = 0;
        let completed = 0;
        stages.forEach((stage) => {
          (stage.tasks || []).forEach((task) => {
            total++;
            if (task.completed) completed++;
          });
        });
        tasksByPlan[planId] = { total, completed };
      } catch {
        tasksByPlan[planId] = { total: 0, completed: 0 };
      }
    })
  );

  // 5. Compute per-goal progress
  return goals.map((goal) => {
    const goalPlanIds = goalLinks
      .filter((l: any) => l.goal_id === goal.id)
      .map((l: any) => l.plan_id);

    let totalTasks = 0;
    let completedTasks = 0;
    goalPlanIds.forEach((planId: string) => {
      const stats = tasksByPlan[planId];
      if (stats) {
        totalTasks += stats.total;
        completedTasks += stats.completed;
      }
    });

    const progress = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

    // Ensure tags is always an array of {label, color}
    let tags = [];
    if (Array.isArray(goal.tags)) {
      tags = goal.tags;
    } else if (typeof goal.tags === 'string') {
      try {
        tags = JSON.parse(goal.tags);
      } catch {
        tags = [];
      }
    } else if (goal.tags) {
      tags = [goal.tags];
    }

    return {
      ...goal,
      tags,
      linkedPlanCount: goalPlanIds.length,
      linkedPlanNames: goalPlanIds.map((id: string) => planNamesMap[id]).filter(Boolean),
      totalTasks,
      completedTasks,
      progress,
    };
  });
}

export async function createGoal(
  workspaceId: string,
  title: string,
  description?: string,
  dueDate?: string,
  tags?: Array<{ label: string; color: string }>
): Promise<Goal> {
  const { data, error } = await supabase
    .from('goals')
    .insert([
      {
        workspace_id: workspaceId,
        title,
        description: description || null,
        due_date: dueDate || null,
        tags: tags && tags.length > 0 ? tags : [],
      },
    ])
    .select()
    .single();

  if (error) throw new Error(`Failed to create goal: ${error.message}`);
  return data;
}

export async function updateGoal(
  id: string,
  updates: Partial<Goal>
): Promise<Goal> {
  const { data, error } = await supabase
    .from('goals')
    .update(updates)
    .eq('id', id)
    .select()
    .single();

  if (error) throw new Error(`Failed to update goal: ${error.message}`);
  return data;
}

export async function deleteGoal(id: string): Promise<void> {
  const { error } = await supabase
    .from('goals')
    .delete()
    .eq('id', id);

  if (error) throw new Error(`Failed to delete goal: ${error.message}`);
}

/* Plan-Goal Links */
export async function linkGoalToPlan(planId: string, goalId: string): Promise<void> {
  const { error } = await supabase
    .from('plan_goals')
    .insert([{ plan_id: planId, goal_id: goalId }]);

  if (error) throw new Error(`Failed to link goal to plan: ${error.message}`);
}

export async function unlinkGoalFromPlan(planId: string, goalId: string): Promise<void> {
  const { error } = await supabase
    .from('plan_goals')
    .delete()
    .eq('plan_id', planId)
    .eq('goal_id', goalId);

  if (error) throw new Error(`Failed to unlink goal from plan: ${error.message}`);
}

export async function getLinkedPlanIdsForGoal(goalId: string): Promise<string[]> {
  const { data, error } = await supabase
    .from('plan_goals')
    .select('plan_id')
    .eq('goal_id', goalId);

  if (error) throw new Error(`Failed to fetch linked plans: ${error.message}`);
  return (data || []).map((row: any) => row.plan_id);
}

export async function getLinkedGoalIdsForPlan(planId: string): Promise<string[]> {
  const { data, error } = await supabase
    .from('plan_goals')
    .select('goal_id')
    .eq('plan_id', planId);

  if (error) throw new Error(`Failed to fetch linked goals: ${error.message}`);
  return (data || []).map((row: any) => row.goal_id);
}

export type LinkedPlanWithProgress = Plan & {
  totalTasks: number;
  completedTasks: number;
  progress: number;
};

export async function getLinkedPlansWithProgress(goalId: string, workspaceId: string): Promise<LinkedPlanWithProgress[]> {
  const linkedPlanIds = await getLinkedPlanIdsForGoal(goalId);
  if (linkedPlanIds.length === 0) return [];

  const activePlans = await getActivePlans(workspaceId);
  const linkedPlans = activePlans.filter((p) => linkedPlanIds.includes(p.id));

  return Promise.all(
    linkedPlans.map(async (plan) => {
      try {
        const stages = await getStagesByPlan(plan.id);
        let total = 0;
        let completed = 0;
        stages.forEach((stage) => {
          (stage.tasks || []).forEach((task) => {
            total++;
            if (task.completed) completed++;
          });
        });
        return { ...plan, totalTasks: total, completedTasks: completed, progress: total > 0 ? Math.round((completed / total) * 100) : 0 };
      } catch {
        return { ...plan, totalTasks: 0, completedTasks: 0, progress: 0 };
      }
    })
  );
}

export async function getGoalsByPlan(planId: string): Promise<Goal[]> {
  const { data, error } = await supabase
    .from('plan_goals')
    .select('goals (*)')
    .eq('plan_id', planId);

  if (error) throw new Error(`Failed to fetch plan goals: ${error.message}`);
  if (!data) return [];
  
  return data
    .map((row: any) => row.goals)
    .flat()
    .filter((goal: any): goal is Goal => goal !== null && goal !== undefined);
}

/* ──────────────────────────────────────────────
   Calendar — Event Operations (CALENDAR_RULES.md §10.2)
   ────────────────────────────────────────────── */

export async function getEvents(
  workspaceId: string,
  rangeStart: string,
  rangeEnd: string
): Promise<CalendarEvent[]> {
  // Fetch events that either fall within the range OR are recurring
  const { data, error } = await supabase
    .from('events')
    .select('*')
    .eq('workspace_id', workspaceId)
    .or(`and(start_at.lte.${rangeEnd},end_at.gte.${rangeStart}),repeat_rule.neq.none`);

  if (error) throw new Error(`Failed to fetch events: ${error.message}`);
  return data || [];
}

export async function createEvent(payload: {
  workspaceId: string;
  title: string;
  notes?: string;
  location?: string;
  startAt: string;
  endAt: string;
  repeatRule: RepeatRule;
}): Promise<CalendarEvent> {
  const { data, error } = await supabase
    .from('events')
    .insert([{
      workspace_id: payload.workspaceId,
      title: payload.title,
      notes: payload.notes || null,
      location: payload.location || null,
      start_at: payload.startAt,
      end_at: payload.endAt,
      repeat_rule: payload.repeatRule,
    }])
    .select()
    .single();

  if (error) throw new Error(`Failed to create event: ${error.message}`);
  return data;
}

export async function updateEvent(
  id: string,
  updates: Partial<{
    title: string;
    notes: string | null;
    location: string | null;
    start_at: string;
    end_at: string;
    repeat_rule: RepeatRule;
  }>
): Promise<CalendarEvent> {
  const { data, error } = await supabase
    .from('events')
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select()
    .single();

  if (error) throw new Error(`Failed to update event: ${error.message}`);
  return data;
}

export async function deleteEvent(id: string): Promise<void> {
  const { error } = await supabase.from('events').delete().eq('id', id);
  if (error) throw new Error(`Failed to delete event: ${error.message}`);
}

/* ──────────────────────────────────────────────
   Calendar — Reminder Operations (CALENDAR_RULES.md §10.3)
   ────────────────────────────────────────────── */

export async function getReminders(
  workspaceId: string,
  rangeStart: string,
  rangeEnd: string
): Promise<Reminder[]> {
  const { data, error } = await supabase
    .from('reminders')
    .select('*')
    .eq('workspace_id', workspaceId)
    .or(`and(remind_at.gte.${rangeStart},remind_at.lte.${rangeEnd}),repeat_rule.neq.none`);

  if (error) throw new Error(`Failed to fetch reminders: ${error.message}`);
  return data || [];
}

export async function createReminder(payload: {
  workspaceId: string;
  title: string;
  notes?: string;
  remindAt: string;
  repeatRule: RepeatRule;
}): Promise<Reminder> {
  const { data, error } = await supabase
    .from('reminders')
    .insert([{
      workspace_id: payload.workspaceId,
      title: payload.title,
      notes: payload.notes || null,
      remind_at: payload.remindAt,
      repeat_rule: payload.repeatRule,
    }])
    .select()
    .single();

  if (error) throw new Error(`Failed to create reminder: ${error.message}`);
  return data;
}

export async function updateReminder(
  id: string,
  updates: Partial<{
    title: string;
    notes: string | null;
    remind_at: string;
    repeat_rule: RepeatRule;
  }>
): Promise<Reminder> {
  const { data, error } = await supabase
    .from('reminders')
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select()
    .single();

  if (error) throw new Error(`Failed to update reminder: ${error.message}`);
  return data;
}

export async function deleteReminder(id: string): Promise<void> {
  const { error } = await supabase.from('reminders').delete().eq('id', id);
  if (error) throw new Error(`Failed to delete reminder: ${error.message}`);
}

/* ──────────────────────────────────────────────
   Calendar — Load tasks & goals with due dates
   ────────────────────────────────────────────── */

export type TaskWithContext = Task & {
  plan_title: string;
  stage_title: string;
};

export async function getTasksWithDueDatesInRange(
  workspaceId: string,
  _rangeStart: string,
  _rangeEnd: string
): Promise<TaskWithContext[]> {
  // Load all active plans for workspace, then their stages + tasks
  const { data: plans, error: plansError } = await supabase
    .from('plans')
    .select('id, title')
    .eq('workspace_id', workspaceId)
    .eq('status', 'active');

  if (plansError) throw new Error(`Failed to fetch plans: ${plansError.message}`);
  if (!plans || plans.length === 0) return [];

  const planIds = plans.map((p: any) => p.id);
  const planMap: Record<string, string> = {};
  plans.forEach((p: any) => { planMap[p.id] = p.title; });

  const { data: stages, error: stagesError } = await supabase
    .from('stages')
    .select('id, plan_id, title')
    .in('plan_id', planIds);

  if (stagesError) throw new Error(`Failed to fetch stages: ${stagesError.message}`);
  if (!stages || stages.length === 0) return [];

  const stageIds = stages.map((s: any) => s.id);
  const stageMap: Record<string, { title: string; planId: string }> = {};
  stages.forEach((s: any) => { stageMap[s.id] = { title: s.title, planId: s.plan_id }; });

  const { data: tasks, error: tasksError } = await supabase
    .from('tasks')
    .select('*')
    .in('stage_id', stageIds)
    .not('due_date', 'is', null);

  if (tasksError) throw new Error(`Failed to fetch tasks: ${tasksError.message}`);
  if (!tasks) return [];

  return tasks.map((t: any) => {
    const stageInfo = stageMap[t.stage_id] || { title: 'Unknown', planId: '' };
    return {
      ...t,
      plan_title: planMap[stageInfo.planId] || 'Unknown',
      stage_title: stageInfo.title,
    };
  });
}

export type GoalForCalendar = Goal & {
  linkedPlanNames: string[];
  totalTasks: number;
  completedTasks: number;
  progress: number;
};

export async function getGoalsWithDueDatesInRange(
  workspaceId: string
): Promise<GoalForCalendar[]> {
  const goalsWithProgress = await getGoalsWithProgress(workspaceId);
  return goalsWithProgress
    .filter((g) => g.due_date)
    .map((g) => ({
      ...g,
    }));
}
