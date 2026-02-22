import { supabase } from '../supabase';
import type { Reminder, RepeatRule } from '../../types/database';
import { expandRecurrences } from '../recurrence';

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
