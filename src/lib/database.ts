import { supabase } from './supabase';
import type { Workspace, WorkspaceMember, WorkspaceMemberRole, WorkspaceInvitation, Plan, Stage, Task, Goal, StageWithTasks, CalendarEvent, Reminder, RepeatRule, FocusSession, User } from '../types/database';

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
  return updatePlan(id, { status: 'archived', archived_at: new Date().toISOString() } as Partial<Plan>);
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

/** Update an existing stage's title and/or position. */
export async function updateStage(
  stageId: string,
  updates: Partial<{ title: string; position: number }>
): Promise<Stage> {
  const payload: Record<string, unknown> = {};
  if (updates.title !== undefined) payload.title = updates.title.trim();
  if (updates.position !== undefined) payload.position = updates.position;

  if (Object.keys(payload).length === 0) {
    throw new Error('No updates provided');
  }

  const { data, error } = await supabase
    .from('stages')
    .update(payload)
    .eq('id', stageId)
    .select()
    .single();

  if (error) throw new Error(`Failed to update stage: ${error.message}`);
  return data;
}

/**
 * Delete a stage and all its tasks (DB CASCADE).
 * Throws if it's the last stage in the plan — a plan must have ≥1 stage.
 */
export async function deleteStage(stageId: string, planId: string): Promise<void> {
  // Guard: ensure this isn't the only stage
  const { data: siblings } = await supabase
    .from('stages')
    .select('id')
    .eq('plan_id', planId);

  if (!siblings || siblings.length <= 1) {
    throw new Error('Cannot delete the only stage in a plan');
  }

  const { error } = await supabase
    .from('stages')
    .delete()
    .eq('id', stageId);

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

  // 2. Fetch plan-goal links for goals in this workspace only
  const goalIds = goals.map((g) => g.id);
  const { data: links, error: linksError } = await supabase
    .from('plan_goals')
    .select('plan_id, goal_id')
    .in('goal_id', goalIds);

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
  userId?: string;
}): Promise<Reminder> {
  const { data, error } = await supabase
    .from('reminders')
    .insert([{
      workspace_id: payload.workspaceId,
      title: payload.title,
      notes: payload.notes || null,
      remind_at: payload.remindAt,
      repeat_rule: payload.repeatRule,
      user_id: payload.userId || null,
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
    .not('due_date', 'is', null)
    .gte('due_date', rangeStart.split('T')[0])
    .lte('due_date', rangeEnd.split('T')[0]);

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

/* ══════════════════════════════════════════════════
   Focus Session Operations (FOCUS_SESSIONS_RULES.md §11)
   ══════════════════════════════════════════════════ */

/**
 * Start a new focus session.
 * FOCUS_SESSIONS_RULES.md §5: only one context reference allowed.
 */
export async function startFocusSession(payload: {
  userId: string;
  workspaceId: string;
  taskId?: string;
  planId?: string;
  goalId?: string;
  plannedDurationMinutes?: number;
}): Promise<FocusSession> {
  // Validate single context link
  const contextCount = [payload.taskId, payload.planId, payload.goalId]
    .filter(Boolean).length;
  if (contextCount > 1) {
    throw new Error('Focus session may link to at most one context (task, plan, or goal)');
  }

  const { data, error } = await supabase
    .from('focus_sessions')
    .insert([{
      user_id: payload.userId,
      workspace_id: payload.workspaceId,
      started_at: new Date().toISOString(),
      task_id: payload.taskId || null,
      plan_id: payload.planId || null,
      goal_id: payload.goalId || null,
      planned_duration_minutes: payload.plannedDurationMinutes ?? null,
    }])
    .select()
    .single();

  if (error) throw new Error(`Failed to start focus session: ${error.message}`);
  return data;
}

/**
 * End an active focus session.
 * FOCUS_SESSIONS_RULES.md §5:
 * - Sets ended_at and computes duration_minutes
 * - Sessions < 5 min are discarded
 * - Sessions > 240 min are capped at 240
 */
export async function endFocusSession(sessionId: string): Promise<FocusSession | null> {
  // Fetch the session to compute duration
  const { data: session, error: fetchError } = await supabase
    .from('focus_sessions')
    .select('*')
    .eq('id', sessionId)
    .single();

  if (fetchError) throw new Error(`Failed to fetch focus session: ${fetchError.message}`);
  if (!session || session.ended_at) {
    throw new Error('Session not found or already ended');
  }

  const startedAt = new Date(session.started_at);
  const endedAt = new Date();
  let durationMinutes = Math.round((endedAt.getTime() - startedAt.getTime()) / 60000);

  // Cap at 4 hours (240 min) per FOCUS_SESSIONS_RULES.md §5.3
  if (durationMinutes > 240) durationMinutes = 240;

  // Discard sessions shorter than 5 minutes per §5.2
  if (durationMinutes < 5) {
    await supabase.from('focus_sessions').delete().eq('id', sessionId);
    return null; // silently discarded
  }

  const { data, error } = await supabase
    .from('focus_sessions')
    .update({
      ended_at: endedAt.toISOString(),
      duration_minutes: durationMinutes,
    })
    .eq('id', sessionId)
    .select()
    .single();

  if (error) throw new Error(`Failed to end focus session: ${error.message}`);
  return data;
}

/** Check if the user has an active (un-ended) focus session. */
export async function getActiveFocusSession(
  userId: string,
  workspaceId: string
): Promise<FocusSession | null> {
  const { data, error } = await supabase
    .from('focus_sessions')
    .select('*')
    .eq('user_id', userId)
    .eq('workspace_id', workspaceId)
    .is('ended_at', null)
    .order('started_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) throw new Error(`Failed to fetch active session: ${error.message}`);
  return data;
}

/** Get completed focus sessions in a time range. */
export async function getFocusSessionsInRange(
  userId: string,
  workspaceId: string,
  from: string,
  to: string
): Promise<FocusSession[]> {
  const { data, error } = await supabase
    .from('focus_sessions')
    .select('*')
    .eq('user_id', userId)
    .eq('workspace_id', workspaceId)
    .not('ended_at', 'is', null)
    .gte('started_at', from)
    .lte('started_at', to)
    .gte('duration_minutes', 5)
    .order('started_at', { ascending: false });

  if (error) throw new Error(`Failed to fetch focus sessions: ${error.message}`);
  return data || [];
}

/** Extended focus session with resolved context names for log display. */
export type FocusSessionLogEntry = FocusSession & {
  context_type: 'plan' | 'goal' | 'task' | null;
  context_title: string | null;
};

/**
 * Get the total count of completed focus sessions (≥5 min) for a user.
 * Used by FocusLog to show accurate totals independent of pagination.
 */
export async function getFocusSessionCount(
  userId: string,
  workspaceId: string
): Promise<number> {
  const { count, error } = await supabase
    .from('focus_sessions')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', userId)
    .eq('workspace_id', workspaceId)
    .not('ended_at', 'is', null)
    .gte('duration_minutes', 5);

  if (error) throw new Error(`Failed to count focus sessions: ${error.message}`);
  return count || 0;
}

/**
 * Get total focus minutes for a user across all completed sessions.
 * Used by FocusLog to show accurate total duration independent of pagination.
 */
export async function getTotalFocusMinutes(
  userId: string,
  workspaceId: string
): Promise<number> {
  const { data, error } = await supabase
    .from('focus_sessions')
    .select('duration_minutes')
    .eq('user_id', userId)
    .eq('workspace_id', workspaceId)
    .not('ended_at', 'is', null)
    .gte('duration_minutes', 5);

  if (error) throw new Error(`Failed to sum focus minutes: ${error.message}`);
  return (data || []).reduce((sum, s) => sum + (s.duration_minutes || 0), 0);
}

/**
 * Get focus session log for a user, enriched with context titles.
 * Returns completed sessions (≥5 min) ordered newest-first.
 */
export async function getFocusSessionLog(
  userId: string,
  workspaceId: string,
  limit = 50,
  offset = 0
): Promise<FocusSessionLogEntry[]> {
  const { data: sessions, error } = await supabase
    .from('focus_sessions')
    .select('*')
    .eq('user_id', userId)
    .eq('workspace_id', workspaceId)
    .not('ended_at', 'is', null)
    .gte('duration_minutes', 5)
    .order('started_at', { ascending: false })
    .range(offset, offset + limit - 1);

  if (error) throw new Error(`Failed to fetch focus log: ${error.message}`);
  if (!sessions || sessions.length === 0) return [];

  // Collect unique context IDs
  const planIds = [...new Set(sessions.filter((s) => s.plan_id).map((s) => s.plan_id!))];
  const goalIds = [...new Set(sessions.filter((s) => s.goal_id).map((s) => s.goal_id!))];
  const taskIds = [...new Set(sessions.filter((s) => s.task_id).map((s) => s.task_id!))];

  // Batch-fetch titles
  const planMap: Record<string, string> = {};
  const goalMap: Record<string, string> = {};
  const taskMap: Record<string, string> = {};

  if (planIds.length > 0) {
    const { data: plans } = await supabase
      .from('plans').select('id, title').in('id', planIds);
    plans?.forEach((p: any) => { planMap[p.id] = p.title; });
  }
  if (goalIds.length > 0) {
    const { data: goals } = await supabase
      .from('goals').select('id, title').in('id', goalIds);
    goals?.forEach((g: any) => { goalMap[g.id] = g.title; });
  }
  if (taskIds.length > 0) {
    const { data: tasks } = await supabase
      .from('tasks').select('id, title').in('id', taskIds);
    tasks?.forEach((t: any) => { taskMap[t.id] = t.title; });
  }

  return sessions.map((s) => {
    let context_type: FocusSessionLogEntry['context_type'] = null;
    let context_title: string | null = null;
    if (s.plan_id) { context_type = 'plan'; context_title = planMap[s.plan_id] || null; }
    else if (s.goal_id) { context_type = 'goal'; context_title = goalMap[s.goal_id] || null; }
    else if (s.task_id) { context_type = 'task'; context_title = taskMap[s.task_id] || null; }
    return { ...s, context_type, context_title };
  });
}

/* ══════════════════════════════════════════════════
   Dashboard Data Helpers
   ══════════════════════════════════════════════════ */

/**
 * Compute focus streak: consecutive calendar days (backwards from today)
 * with ≥1 valid focus session (≥5 min).
 * FOCUS_SESSIONS_RULES.md §6
 */
export async function computeFocusStreak(userId: string, workspaceId: string): Promise<number> {
  // Fetch all completed sessions ordered by start, descending
  const { data: sessions, error } = await supabase
    .from('focus_sessions')
    .select('started_at')
    .eq('user_id', userId)
    .eq('workspace_id', workspaceId)
    .not('ended_at', 'is', null)
    .gte('duration_minutes', 5)
    .order('started_at', { ascending: false });

  if (error || !sessions || sessions.length === 0) return 0;

  // Build set of unique calendar dates (user local timezone)
  const daySet = new Set<string>();
  sessions.forEach((s: any) => {
    const d = new Date(s.started_at);
    daySet.add(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`);
  });

  // Count consecutive days backwards from today
  let streak = 0;
  const cursor = new Date();
  cursor.setHours(0, 0, 0, 0);

  while (true) {
    const key = `${cursor.getFullYear()}-${String(cursor.getMonth() + 1).padStart(2, '0')}-${String(cursor.getDate()).padStart(2, '0')}`;
    if (daySet.has(key)) {
      streak++;
      cursor.setDate(cursor.getDate() - 1);
    } else {
      break;
    }
  }

  return streak;
}

/**
 * Compute average daily focus over last 7 calendar days.
 * FOCUS_SESSIONS_RULES.md §7:
 * Total focused minutes in window ÷ 7 (zero-days included).
 */
export async function computeAverageDailyFocus(
  userId: string,
  workspaceId: string,
  windowDays: number = 7
): Promise<number> {
  const now = new Date();
  const windowStart = new Date(now);
  windowStart.setDate(windowStart.getDate() - windowDays);
  windowStart.setHours(0, 0, 0, 0);

  const sessions = await getFocusSessionsInRange(
    userId,
    workspaceId,
    windowStart.toISOString(),
    now.toISOString()
  );

  const totalMinutes = sessions.reduce((sum, s) => sum + (s.duration_minutes || 0), 0);
  return Math.round(totalMinutes / windowDays);
}

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

  return tasks.map((t: any) => {
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
    .in('plan_id', plans.map((p: any) => p.id));

  if (!stages || stages.length === 0) return 0;

  const { count, error } = await supabase
    .from('tasks')
    .select('*', { count: 'exact', head: true })
    .in('stage_id', stages.map((s: any) => s.id))
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
    .in('plan_id', plans.map((p: any) => p.id));

  if (!stages || stages.length === 0) return 0;

  const stageIds = stages.map((s: any) => s.id);

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
    .in('plan_id', plans.map((p: any) => p.id));

  if (!stages || stages.length === 0) return [];

  const { data: tasks, error } = await supabase
    .from('tasks')
    .select('*')
    .in('stage_id', stages.map((s: any) => s.id))
    .eq('completed', false)
    .eq('assigned_to', userId)
    .order('created_at', { ascending: false });

  if (error) throw new Error(`Failed to fetch tasks: ${error.message}`);
  return tasks || [];
}

/* ══════════════════════════════════════════════════
   Dashboard-specific queries (DASHBOARD_RULES.md)
   ══════════════════════════════════════════════════ */

/**
 * Get today's events for the workspace, expanding recurring events.
 * DASHBOARD_RULES.md §4.1B
 */
export async function getTodaysEvents(workspaceId: string): Promise<Array<CalendarEvent & { occurrenceStart: string; occurrenceEnd: string }>> {
  const now = new Date();
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const todayEnd = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);

  const events = await getEvents(workspaceId, todayStart.toISOString(), todayEnd.toISOString());

  // Expand recurrences for today
  const { expandEventOccurrences } = await import('./recurrence');
  const result: Array<CalendarEvent & { occurrenceStart: string; occurrenceEnd: string }> = [];

  for (const event of events) {
    const occurrences = expandEventOccurrences(
      new Date(event.start_at),
      new Date(event.end_at),
      event.repeat_rule,
      todayStart,
      todayEnd
    );
    for (const occ of occurrences) {
      result.push({
        ...event,
        occurrenceStart: occ.start.toISOString(),
        occurrenceEnd: occ.end.toISOString(),
      });
    }
  }

  return result;
}

/**
 * Get today's reminders for a specific user, expanding recurring reminders.
 * DASHBOARD_RULES.md §4.1C + VISIBILITY_RULES.md §7.3 (personal only)
 */
export async function getTodaysRemindersForUser(
  userId: string,
  workspaceId: string
): Promise<Array<Reminder & { occurrenceAt: string }>> {
  const now = new Date();
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const todayEnd = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);

  const reminders = await getReminders(workspaceId, todayStart.toISOString(), todayEnd.toISOString());

  // Filter to user's personal reminders only
  const userReminders = reminders.filter((r) => r.user_id === userId || r.user_id === null);

  // Expand recurrences for today
  const { expandRecurrences } = await import('./recurrence');
  const result: Array<Reminder & { occurrenceAt: string }> = [];

  for (const reminder of userReminders) {
    const occurrences = expandRecurrences(
      new Date(reminder.remind_at),
      reminder.repeat_rule,
      todayStart,
      todayEnd
    );
    for (const occ of occurrences) {
      result.push({
        ...reminder,
        occurrenceAt: occ.toISOString(),
      });
    }
  }

  return result;
}

/**
 * Get active goals where the user has ≥1 assigned task contributing.
 * DASHBOARD_RULES.md §5.1: only goals where user has assigned tasks.
 * PLAN_ARCHIVAL_TRUTH_RULES.md: exclude archived plans.
 */
export type DashboardGoal = Goal & {
  totalTasks: number;
  completedTasks: number;
  progress: number;
  linkedPlanNames: string[];
};

export async function getActiveGoalsForUser(
  userId: string,
  workspaceId: string
): Promise<DashboardGoal[]> {
  // 1. Get all goals for workspace
  const goals = await getGoalsByWorkspace(workspaceId);
  if (goals.length === 0) return [];

  // 2. Get all plan-goal links
  const { data: links, error: linksError } = await supabase
    .from('plan_goals')
    .select('plan_id, goal_id');
  if (linksError) throw new Error(`Failed to fetch plan-goal links: ${linksError.message}`);
  const goalLinks = links || [];

  // 3. Get active plans only (archived_at IS NULL)
  const { data: activePlans } = await supabase
    .from('plans')
    .select('id, title')
    .eq('workspace_id', workspaceId)
    .is('archived_at', null);

  const activePlanIds = new Set((activePlans || []).map((p: any) => p.id));
  const planNameMap: Record<string, string> = {};
  (activePlans || []).forEach((p: any) => { planNameMap[p.id] = p.title; });

  // 4. For each active plan, get stages → tasks (only if we have plans)
  const planStats: Record<string, { total: number; completed: number; userHasTask: boolean }> = {};

  if (activePlanIds.size > 0) {
    const { data: stages } = await supabase
      .from('stages')
      .select('id, plan_id')
      .in('plan_id', Array.from(activePlanIds));

    if (stages && stages.length > 0) {
      const stageIds = stages.map((s: any) => s.id);
      const stagePlanMap: Record<string, string> = {};
      stages.forEach((s: any) => { stagePlanMap[s.id] = s.plan_id; });

      const { data: tasks } = await supabase
        .from('tasks')
        .select('id, stage_id, completed, assigned_to')
        .in('stage_id', stageIds);

      // 5. Build per-plan task stats + check user contribution.
      // TASK_OWNERSHIP_RULES.md §3: only explicitly assigned tasks count.
      for (const task of (tasks || [])) {
        const planId = stagePlanMap[task.stage_id];
        if (!planId) continue;
        if (!planStats[planId]) planStats[planId] = { total: 0, completed: 0, userHasTask: false };
        planStats[planId].total++;
        if (task.completed) planStats[planId].completed++;
        if (task.assigned_to === userId) {
          planStats[planId].userHasTask = true;
        }
      }
    }
  }

  // 6. Assemble goals — include both plan-linked and standalone.
  // Standalone goals (no linked plans) appear with 0% progress.
  const result: DashboardGoal[] = [];

  for (const goal of goals) {
    const goalPlanIds = goalLinks
      .filter((l: any) => l.goal_id === goal.id)
      .map((l: any) => l.plan_id)
      .filter((pid: string) => activePlanIds.has(pid));

    let totalTasks = 0;
    let completedTasks = 0;
    const linkedPlanNames: string[] = [];

    if (goalPlanIds.length > 0) {
      // Goal linked to active plans — check user contribution
      const userContributes = goalPlanIds.some((pid: string) => planStats[pid]?.userHasTask);
      if (!userContributes) continue;

      for (const pid of goalPlanIds) {
        const stats = planStats[pid];
        if (stats) {
          totalTasks += stats.total;
          completedTasks += stats.completed;
        }
        if (planNameMap[pid]) linkedPlanNames.push(planNameMap[pid]);
      }
    }
    // Standalone goals (goalPlanIds.length === 0) fall through here
    // with totalTasks=0, completedTasks=0 — included unconditionally.

    const progress = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

    // Normalize tags
    let tags = [];
    if (Array.isArray(goal.tags)) tags = goal.tags;
    else if (typeof goal.tags === 'string') {
      try { tags = JSON.parse(goal.tags); } catch { tags = []; }
    }

    result.push({
      ...goal,
      tags,
      totalTasks,
      completedTasks,
      progress,
      linkedPlanNames,
    });
  }

  return result;
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
