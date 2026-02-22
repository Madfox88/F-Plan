import { describe, it, expect } from 'vitest';
import { expandRecurrences, expandEventOccurrences } from './recurrence';

const d = (s: string) => new Date(s);

describe('expandRecurrences', () => {
  it('returns the anchor when rule is "none" and within range', () => {
    const result = expandRecurrences(
      d('2025-03-15T10:00:00'),
      'none',
      d('2025-03-01'),
      d('2025-03-31')
    );
    expect(result).toHaveLength(1);
    expect(result[0].toISOString()).toContain('2025-03-15');
  });

  it('returns [] when rule is "none" and outside range', () => {
    const result = expandRecurrences(
      d('2025-04-01T10:00:00'),
      'none',
      d('2025-03-01'),
      d('2025-03-31')
    );
    expect(result).toHaveLength(0);
  });

  it('expands daily recurrences within a 7-day range', () => {
    const result = expandRecurrences(
      d('2025-03-01T09:00:00'),
      'daily',
      d('2025-03-01'),
      d('2025-03-07T23:59:59')
    );
    expect(result).toHaveLength(7);
  });

  it('expands weekly recurrences', () => {
    const result = expandRecurrences(
      d('2025-01-06T09:00:00'), // Monday
      'weekly',
      d('2025-01-01'),
      d('2025-01-31T23:59:59')
    );
    // Jan 6, 13, 20, 27
    expect(result).toHaveLength(4);
  });

  it('expands monthly recurrences across a year', () => {
    const result = expandRecurrences(
      d('2025-01-15T09:00:00'),
      'monthly',
      d('2025-01-01'),
      d('2025-12-31T23:59:59')
    );
    expect(result).toHaveLength(12);
  });

  it('handles anchor before range (advances to range)', () => {
    const result = expandRecurrences(
      d('2025-01-01T00:00:00Z'),
      'daily',
      d('2025-03-01T00:00:00Z'),
      d('2025-03-03T23:59:59Z')
    );
    expect(result).toHaveLength(3);
  });

  it('handles anchor after range (returns [])', () => {
    const result = expandRecurrences(
      d('2025-05-01T00:00:00'),
      'daily',
      d('2025-03-01'),
      d('2025-03-31')
    );
    expect(result).toHaveLength(0);
  });

  it('caps at 1000 iterations to prevent infinite loops', () => {
    const result = expandRecurrences(
      d('2020-01-01T00:00:00'),
      'daily',
      d('2020-01-01'),
      d('2030-12-31')
    );
    expect(result.length).toBeLessThanOrEqual(1000);
  });
});

describe('expandEventOccurrences', () => {
  it('returns a single occurrence for non-repeating event in range', () => {
    const result = expandEventOccurrences(
      d('2025-03-10T10:00:00'),
      d('2025-03-10T11:00:00'),
      'none',
      d('2025-03-01'),
      d('2025-03-31')
    );
    expect(result).toHaveLength(1);
    expect(result[0].start.toISOString()).toContain('2025-03-10');
  });

  it('returns [] for non-repeating event outside range', () => {
    const result = expandEventOccurrences(
      d('2025-04-10T10:00:00'),
      d('2025-04-10T11:00:00'),
      'none',
      d('2025-03-01'),
      d('2025-03-31')
    );
    expect(result).toHaveLength(0);
  });

  it('preserves event duration across recurrences', () => {
    const result = expandEventOccurrences(
      d('2025-03-01T10:00:00'),
      d('2025-03-01T12:00:00'), // 2 hours
      'daily',
      d('2025-03-01'),
      d('2025-03-03T23:59:59')
    );
    expect(result).toHaveLength(3);
    for (const occ of result) {
      const duration = occ.end.getTime() - occ.start.getTime();
      expect(duration).toBe(2 * 60 * 60 * 1000);
    }
  });

  it('expands bi-weekly events', () => {
    const result = expandEventOccurrences(
      d('2025-01-06T14:00:00'),
      d('2025-01-06T15:00:00'),
      'bi_weekly',
      d('2025-01-01'),
      d('2025-03-31T23:59:59')
    );
    // Jan 6, Jan 20, Feb 3, Feb 17, Mar 3, Mar 17, Mar 31
    expect(result.length).toBeGreaterThanOrEqual(6);
  });
});
