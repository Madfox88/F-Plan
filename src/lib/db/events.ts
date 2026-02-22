import { supabase } from '../supabase';
import type { CalendarEvent, RepeatRule } from '../../types/database';
import { expandEventOccurrences } from '../recurrence';

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
