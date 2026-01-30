import { supabase } from './supabase';
import type { Workspace, Plan, Stage, Task, Goal, StageWithTasks } from '../types/database';

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

export async function getOrCreateWorkspace(): Promise<Workspace> {
  // First, try to get existing workspace
  const { data: existingWorkspaces, error: fetchError } = await supabase
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

export async function getPlanById(id: string): Promise<Plan> {
  const { data, error } = await supabase
    .from('plans')
    .select('*')
    .eq('id', id)
    .single();

  if (error) throw new Error(`Failed to fetch plan: ${error.message}`);
  return data;
}

export async function createPlan(
  workspaceId: string,
  title: string,
  description?: string
): Promise<Plan> {
  const { data, error } = await supabase
    .from('plans')
    .insert([
      {
        workspace_id: workspaceId,
        title,
        description: description || null,
        status: 'active',
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
export async function getTasksByStage(stageId: string): Promise<Task[]> {
  const { data, error } = await supabase
    .from('tasks')
    .select('*')
    .eq('stage_id', stageId)
    .order('created_at', { ascending: true });

  if (error) throw new Error(`Failed to fetch tasks: ${error.message}`);
  return data || [];
}

export async function createTask(
  stageId: string,
  title: string,
  dueDate?: string
): Promise<Task> {
  const { data, error } = await supabase
    .from('tasks')
    .insert([
      {
        stage_id: stageId,
        title,
        due_date: dueDate || null,
        completed: false,
      },
    ])
    .select()
    .single();

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

export async function createGoal(
  workspaceId: string,
  title: string,
  description?: string
): Promise<Goal> {
  const { data, error } = await supabase
    .from('goals')
    .insert([
      {
        workspace_id: workspaceId,
        title,
        description: description || null,
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
