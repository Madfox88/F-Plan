import { supabase } from '../supabase';
import type { Goal, Plan, Tag } from '../../types/database';
import { getStagesByPlan } from './stages';
import { getActivePlans } from './plans';
import { getTagsForGoals } from './tags';

/** Supabase row shapes */
type IdTitleRow = { id: string; title: string };
type PlanGoalLink = { plan_id: string; goal_id: string };
type StageIdRow = { id: string; plan_id: string };
type GoalJoinRow = { goals: Goal[] | Goal | null };

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
  tags: Tag[];
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
  const linkedPlanIds = [...new Set(goalLinks.map((l: PlanGoalLink) => l.plan_id))];

  // 3b. Fetch plan names for all linked plans
  const planNamesMap: Record<string, string> = {};
  if (linkedPlanIds.length > 0) {
    const { data: plans } = await supabase
      .from('plans')
      .select('id, title')
      .in('id', linkedPlanIds);
    (plans || []).forEach((p: IdTitleRow) => { planNamesMap[p.id] = p.title; });
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
      } catch (err) {
        console.warn('Failed to count tasks for plan', planId, err);
        tasksByPlan[planId] = { total: 0, completed: 0 };
      }
    })
  );

  // 5. Fetch tags from join table for all goals
  let goalTagsMap: Record<string, Tag[]> = {};
  try {
    goalTagsMap = await getTagsForGoals(goalIds);
  } catch (err) {
    console.warn('Failed to fetch goal tags from join table (migration may not have run yet)', err);
  }

  // 6. Compute per-goal progress
  return goals.map((goal) => {
    const goalPlanIds = goalLinks
      .filter((l: PlanGoalLink) => l.goal_id === goal.id)
      .map((l: PlanGoalLink) => l.plan_id);

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

    return {
      ...goal,
      tags: goalTagsMap[goal.id] || [],
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

/** Mark a goal as completed (user-confirmed prompt). */
export async function completeGoal(id: string): Promise<Goal> {
  return updateGoal(id, { completed_at: new Date().toISOString() } as Partial<Goal>);
}

/** Reopen a completed goal. */
export async function reopenGoal(id: string): Promise<Goal> {
  return updateGoal(id, { completed_at: null } as Partial<Goal>);
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
  return (data || []).map((row: { plan_id: string }) => row.plan_id);
}

export async function getLinkedGoalIdsForPlan(planId: string): Promise<string[]> {
  const { data, error } = await supabase
    .from('plan_goals')
    .select('goal_id')
    .eq('plan_id', planId);

  if (error) throw new Error(`Failed to fetch linked goals: ${error.message}`);
  return (data || []).map((row: { goal_id: string }) => row.goal_id);
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
      } catch (err) {
        console.warn('Failed to compute progress for plan', plan.id, err);
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
    .map((row: GoalJoinRow) => row.goals)
    .flat()
    .filter((goal: Goal | null): goal is Goal => goal !== null && goal !== undefined);
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

  const activePlanIds = new Set((activePlans || []).map((p: IdTitleRow) => p.id));
  const planNameMap: Record<string, string> = {};
  (activePlans || []).forEach((p: IdTitleRow) => { planNameMap[p.id] = p.title; });

  // 4. For each active plan, get stages → tasks (only if we have plans)
  const planStats: Record<string, { total: number; completed: number; userHasTask: boolean }> = {};

  if (activePlanIds.size > 0) {
    const { data: stages } = await supabase
      .from('stages')
      .select('id, plan_id')
      .in('plan_id', Array.from(activePlanIds));

    if (stages && stages.length > 0) {
      const stageIds = stages.map((s: StageIdRow) => s.id);
      const stagePlanMap: Record<string, string> = {};
      stages.forEach((s: StageIdRow) => { stagePlanMap[s.id] = s.plan_id; });

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
      .filter((l: PlanGoalLink) => l.goal_id === goal.id)
      .map((l: PlanGoalLink) => l.plan_id)
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
      try { tags = JSON.parse(goal.tags); } catch (err) { console.warn('Malformed tags JSON', err); tags = []; }
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
