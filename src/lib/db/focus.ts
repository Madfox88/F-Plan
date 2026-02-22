import { supabase } from '../supabase';
import type { FocusSession } from '../../types/database';

/** Supabase row shapes */
type IdTitleRow = { id: string; title: string };

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
    plans?.forEach((p: IdTitleRow) => { planMap[p.id] = p.title; });
  }
  if (goalIds.length > 0) {
    const { data: goals } = await supabase
      .from('goals').select('id, title').in('id', goalIds);
    goals?.forEach((g: IdTitleRow) => { goalMap[g.id] = g.title; });
  }
  if (taskIds.length > 0) {
    const { data: tasks } = await supabase
      .from('tasks').select('id, title').in('id', taskIds);
    tasks?.forEach((t: IdTitleRow) => { taskMap[t.id] = t.title; });
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
  sessions.forEach((s: { started_at: string }) => {
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
