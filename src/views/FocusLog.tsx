/**
 * FocusLog — Session history view
 *
 * Shows a chronological list of completed focus sessions with:
 *   - Date & time
 *   - Duration
 *   - Linked context (plan / goal / task)
 *   - Summary stats at the top
 */

import { useCallback, useEffect, useState } from 'react';
import { useWorkspace } from '../context/WorkspaceContext';
import { useCurrentUser } from '../context/UserContext';
import {
  getFocusSessionLog,
  computeFocusStreak,
  computeAverageDailyFocus,
} from '../lib/database';
import type { FocusSessionLogEntry } from '../lib/database';
import './FocusLog.css';

/* ── Helpers ── */

function fmtDate(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString(undefined, {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  });
}

function fmtTime(iso: string): string {
  return new Date(iso).toLocaleTimeString(undefined, {
    hour: '2-digit',
    minute: '2-digit',
  });
}

function fmtDuration(min: number): string {
  if (min < 60) return `${min} min`;
  const h = Math.floor(min / 60);
  const m = min % 60;
  return m > 0 ? `${h}h ${m}m` : `${h}h`;
}

/** Group sessions by calendar date string */
function groupByDate(sessions: FocusSessionLogEntry[]): Map<string, FocusSessionLogEntry[]> {
  const map = new Map<string, FocusSessionLogEntry[]>();
  for (const s of sessions) {
    const key = fmtDate(s.started_at);
    const arr = map.get(key) || [];
    arr.push(s);
    map.set(key, arr);
  }
  return map;
}

const CONTEXT_LABELS: Record<string, string> = {
  plan: 'Plan',
  goal: 'Goal',
  task: 'Task',
};

/* ── Component ── */

export function FocusLog() {
  const { activeWorkspace } = useWorkspace();
  const { userId } = useCurrentUser();

  const [sessions, setSessions] = useState<FocusSessionLogEntry[]>([]);
  const [streak, setStreak] = useState(0);
  const [avgDaily, setAvgDaily] = useState(0);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const PAGE_SIZE = 50;

  const loadData = useCallback(async () => {
    if (!userId || !activeWorkspace) return;
    setLoading(true);
    try {
      const [log, s, avg] = await Promise.all([
        getFocusSessionLog(userId, activeWorkspace.id, PAGE_SIZE, 0),
        computeFocusStreak(userId, activeWorkspace.id),
        computeAverageDailyFocus(userId, activeWorkspace.id),
      ]);
      setSessions(log);
      setStreak(s);
      setAvgDaily(avg);
      setHasMore(log.length >= PAGE_SIZE);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load focus log');
    } finally {
      setLoading(false);
    }
  }, [userId, activeWorkspace]);

  useEffect(() => { loadData(); }, [loadData]);

  const loadMore = async () => {
    if (!userId || !activeWorkspace || loadingMore) return;
    setLoadingMore(true);
    try {
      const more = await getFocusSessionLog(
        userId, activeWorkspace.id, PAGE_SIZE, sessions.length
      );
      setSessions((prev) => [...prev, ...more]);
      setHasMore(more.length >= PAGE_SIZE);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load more sessions');
    } finally {
      setLoadingMore(false);
    }
  };

  /* ── Derived stats ── */
  const totalSessions = sessions.length;
  const totalMinutes = sessions.reduce((sum, s) => sum + (s.duration_minutes || 0), 0);

  if (loading) {
    return (
      <div className="focus-log">
        <div className="focus-log-loading glass">Loading sessions…</div>
      </div>
    );
  }

  const grouped = groupByDate(sessions);

  return (
    <div className="focus-log">

      {error && (
        <div className="focus-log-error glass" role="alert">
          <span>{error}</span>
          <button className="focus-log-error-dismiss" onClick={() => setError(null)}>✕</button>
        </div>
      )}

      {/* ── Summary stats ── */}
      <div className="focus-log-stats glass">
        <div className="focus-log-stat">
          <span className="focus-log-stat-value">{totalSessions}</span>
          <span className="focus-log-stat-label">Sessions</span>
        </div>
        <div className="focus-log-stat">
          <span className="focus-log-stat-value">{fmtDuration(totalMinutes)}</span>
          <span className="focus-log-stat-label">Total Focus</span>
        </div>
        <div className="focus-log-stat">
          <span className="focus-log-stat-value">{avgDaily} min</span>
          <span className="focus-log-stat-label">Daily Avg</span>
        </div>
        <div className="focus-log-stat">
          <span className="focus-log-stat-value">{streak} {streak === 1 ? 'day' : 'days'}</span>
          <span className="focus-log-stat-label">Streak</span>
        </div>
      </div>

      {/* ── Session list ── */}
      {sessions.length === 0 ? (
        <div className="focus-log-empty glass">
          <p className="text-secondary">No focus sessions recorded yet.</p>
          <p className="text-tertiary">Start a session from the Dashboard to begin tracking.</p>
        </div>
      ) : (
        <div className="focus-log-list">
          {[...grouped.entries()].map(([dateLabel, group]) => (
            <div key={dateLabel} className="focus-log-day">
              <div className="focus-log-day-header">{dateLabel}</div>
              {group.map((s) => (
                <div key={s.id} className="focus-log-row glass">
                  <div className="focus-log-row-time">
                    <span className="focus-log-time-start">{fmtTime(s.started_at)}</span>
                    <span className="focus-log-time-sep">→</span>
                    <span className="focus-log-time-end">{fmtTime(s.ended_at!)}</span>
                  </div>
                  <div className="focus-log-row-duration">
                    {fmtDuration(s.duration_minutes || 0)}
                  </div>
                  <div className="focus-log-row-context">
                    {s.context_type && s.context_title ? (
                      <>
                        <span className={`focus-log-badge focus-log-badge--${s.context_type}`}>
                          {CONTEXT_LABELS[s.context_type]}
                        </span>
                        <span className="focus-log-context-title">{s.context_title}</span>
                      </>
                    ) : (
                      <span className="text-tertiary">Free focus</span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          ))}

          {hasMore && (
            <button
              className="btn-secondary focus-log-load-more"
              onClick={loadMore}
              disabled={loadingMore}
            >
              <span>{loadingMore ? 'Loading…' : 'Load more'}</span>
            </button>
          )}
        </div>
      )}
    </div>
  );
}
