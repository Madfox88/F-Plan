/**
 * Recurrence expansion utility (CALENDAR_RULES.md §9)
 *
 * Rules:
 * - A repeating item is stored as ONE row with a repeat_rule.
 * - The UI expands occurrences client-side for the visible range only.
 * - No separate row per occurrence.
 * - No exception tables.
 * - Edits apply to the whole series.
 */

import type { RepeatRule } from '../types/database';

/**
 * Given an anchor date and a repeat rule, generate all occurrence dates
 * that fall within [rangeStart, rangeEnd].
 *
 * Returns an array of Date objects (each representing the start of an occurrence).
 */
export function expandRecurrences(
  anchorDate: Date,
  repeatRule: RepeatRule,
  rangeStart: Date,
  rangeEnd: Date
): Date[] {
  if (repeatRule === 'none') {
    // Non-recurring: only include if anchor falls within range
    if (anchorDate >= rangeStart && anchorDate <= rangeEnd) {
      return [new Date(anchorDate)];
    }
    return [];
  }

  const results: Date[] = [];
  const maxIterations = 1000; // Safety cap
  let current = new Date(anchorDate);
  let iterations = 0;

  // Walk forward/backward to find the first occurrence at or after rangeStart
  // First, if anchor is after rangeEnd, no occurrences
  // We need to handle both directions — anchor could be before or after range

  // Start from the anchor, advance until we're in or past the range
  // If anchor is before rangeStart, advance forward
  // If anchor is within range, start there
  // If anchor is after rangeEnd, nothing to generate

  if (current > rangeEnd) {
    return [];
  }

  // Skip forward until we reach or pass rangeStart
  while (current < rangeStart && iterations < maxIterations) {
    current = advanceDate(current, repeatRule);
    iterations++;
  }

  // Now collect all occurrences within [rangeStart, rangeEnd]
  while (current <= rangeEnd && iterations < maxIterations) {
    results.push(new Date(current));
    current = advanceDate(current, repeatRule);
    iterations++;
  }

  return results;
}

function advanceDate(date: Date, rule: RepeatRule): Date {
  const next = new Date(date);

  switch (rule) {
    case 'daily':
      next.setDate(next.getDate() + 1);
      break;
    case 'bi_daily':
      next.setDate(next.getDate() + 2);
      break;
    case 'weekly':
      next.setDate(next.getDate() + 7);
      break;
    case 'bi_weekly':
      next.setDate(next.getDate() + 14);
      break;
    case 'monthly':
      next.setMonth(next.getMonth() + 1);
      break;
    case 'bi_monthly':
      next.setMonth(next.getMonth() + 2);
      break;
    case 'yearly':
      next.setFullYear(next.getFullYear() + 1);
      break;
    case 'bi_yearly':
      next.setFullYear(next.getFullYear() + 2);
      break;
    default:
      // 'none' shouldn't reach here, advance by 1 day as safeguard
      next.setDate(next.getDate() + 1);
  }

  return next;
}

/**
 * For an event with start_at/end_at and a repeat rule, expand into
 * occurrence windows within the given range.
 */
export function expandEventOccurrences(
  startAt: Date,
  endAt: Date,
  repeatRule: RepeatRule,
  rangeStart: Date,
  rangeEnd: Date
): Array<{ start: Date; end: Date }> {
  const duration = endAt.getTime() - startAt.getTime();

  if (repeatRule === 'none') {
    // Check if event overlaps range
    if (endAt >= rangeStart && startAt <= rangeEnd) {
      return [{ start: new Date(startAt), end: new Date(endAt) }];
    }
    return [];
  }

  const results: Array<{ start: Date; end: Date }> = [];
  const maxIterations = 1000;
  let currentStart = new Date(startAt);
  let iterations = 0;

  // Advance until we might overlap the range
  while (iterations < maxIterations) {
    const currentEnd = new Date(currentStart.getTime() + duration);

    if (currentStart > rangeEnd) break;

    if (currentEnd >= rangeStart && currentStart <= rangeEnd) {
      results.push({ start: new Date(currentStart), end: new Date(currentEnd) });
    }

    currentStart = advanceDate(currentStart, repeatRule);
    iterations++;
  }

  return results;
}
