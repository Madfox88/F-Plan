/**
 * Dashboard — Read-only intelligence surface (DASHBOARD_RULES.md)
 *
 * 4 cards, in order:
 *   1. Today's Schedule  (tasks + events + reminders)
 *   2. Active Goals Progress
 *   3. Productivity Stats
 *   4. Focus Session Entry Point (only interactive element)
 *
 * All data scoped to current user.
 * No creation, no editing, no comparisons.
 */

import { useCallback, useEffect, useState } from 'react';
import { useWorkspace } from '../context/WorkspaceContext';
import { useCurrentUser } from '../context/UserContext';
import type { CalendarEvent, Reminder, FocusSession, Plan, Goal } from '../types/database';
import {
  getTasksDueForUser,
  getTodaysEvents,
  getTodaysRemindersForUser,
  getActiveGoalsForUser,
  getCompletedTaskCountInWindow,
  getAssignedTaskCount,
  getActiveFocusSession,
  computeFocusStreak,
  computeAverageDailyFocus,
  startFocusSession,
  endFocusSession,
  getActivePlans,
  getGoalsByWorkspace,
} from '../lib/database';
import type { TaskWithContext, DashboardGoal } from '../lib/database';
import { TaskReadOnlyModal } from '../components/TaskReadOnlyModal';
import { GoalReadOnlyModal } from '../components/GoalReadOnlyModal';
import ChevronDownIcon from '../assets/icons/angle-small-down.svg';
import './Dashboard.css';

/* ── Helpers ── */

function localToday(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function rollingWindowStart(): string {
  const d = new Date();
  d.setDate(d.getDate() - 7);
  return d.toISOString();
}

function fmtTime(iso: string): string {
  return new Date(iso).toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' });
}

function fmtElapsed(sec: number): string {
  const h = Math.floor(sec / 3600);
  const m = Math.floor((sec % 3600) / 60);
  const s = sec % 60;
  if (h > 0) return `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

/* ── Component ── */

export function Dashboard() {
  const { activeWorkspace } = useWorkspace();
  const { userId } = useCurrentUser();

  /* Card 1 – Today's Schedule */
  const [todayTasks, setTodayTasks] = useState<TaskWithContext[]>([]);
  const [todayEvents, setTodayEvents] = useState<Array<CalendarEvent & { occurrenceStart: string; occurrenceEnd: string }>>([]);
  const [todayReminders, setTodayReminders] = useState<Array<Reminder & { occurrenceAt: string }>>([]);

  /* Card 2 – Active Goals */
  const [activeGoals, setActiveGoals] = useState<DashboardGoal[]>([]);

  /* Card 3 – Productivity Stats */
  const [completedCount, setCompletedCount] = useState(0);
  const [assignedCount, setAssignedCount] = useState(0);
  const [avgDailyFocus, setAvgDailyFocus] = useState(0);
  const [focusStreak, setFocusStreak] = useState(0);

  /* Card 4 – Focus Session (inline) */
  const [activeSession, setActiveSession] = useState<FocusSession | null>(null);
  const [focusElapsed, setFocusElapsed] = useState(0);
  const [focusContextType, setFocusContextType] = useState<'none' | 'plan' | 'goal'>('none');
  const [focusContextId, setFocusContextId] = useState('');
  const [focusPlans, setFocusPlans] = useState<Plan[]>([]);
  const [focusGoals, setFocusGoals] = useState<Goal[]>([]);
  const [focusStarted, setFocusStarted] = useState(false);  // show form vs idle
  const [focusLoading, setFocusLoading] = useState(false);
  const [focusError, setFocusError] = useState<string | null>(null);
  const [focusEndMsg, setFocusEndMsg] = useState<string | null>(null);
  const [isCtxTypeOpen, setIsCtxTypeOpen] = useState(false);
  const [isCtxValOpen, setIsCtxValOpen] = useState(false);

  /* Popups */
  const [selectedTask, setSelectedTask] = useState<TaskWithContext | null>(null);
  const [selectedGoal, setSelectedGoal] = useState<DashboardGoal | null>(null);

  /* Loading */
  const [loading, setLoading] = useState(true);

  /* ── Load all dashboard data ── */
  const loadData = useCallback(async () => {
    if (!userId || !activeWorkspace) return;
    setLoading(true);

    const wsId = activeWorkspace.id;
    const today = localToday();
    const windowStart = rollingWindowStart();

    try {
      const [tasks, events, reminders, goals, completed, assigned, avgFoc, streak, session, plans, wGoals] =
        await Promise.all([
          getTasksDueForUser(userId, wsId, today).catch(() => [] as TaskWithContext[]),
          getTodaysEvents(wsId).catch(() => [] as Array<CalendarEvent & { occurrenceStart: string; occurrenceEnd: string }>),
          getTodaysRemindersForUser(userId, wsId).catch(() => [] as Array<Reminder & { occurrenceAt: string }>),
          getActiveGoalsForUser(userId, wsId).catch(() => [] as DashboardGoal[]),
          getCompletedTaskCountInWindow(userId, windowStart).catch(() => 0),
          getAssignedTaskCount(userId, wsId).catch(() => 0),
          computeAverageDailyFocus(userId).catch(() => 0),
          computeFocusStreak(userId).catch(() => 0),
          getActiveFocusSession(userId, wsId).catch(() => null),
          getActivePlans(wsId).catch(() => [] as Plan[]),
          getGoalsByWorkspace(wsId).catch(() => [] as Goal[]),
        ]);

      setTodayTasks(tasks);
      setTodayEvents(events);
      setTodayReminders(reminders);
      setActiveGoals(goals);
      setCompletedCount(completed);
      setAssignedCount(assigned);
      setAvgDailyFocus(avgFoc);
      setFocusStreak(streak);
      setActiveSession(session);
      setFocusPlans(plans);
      setFocusGoals(wGoals);
    } finally {
      setLoading(false);
    }
  }, [userId, activeWorkspace]);

  useEffect(() => { loadData(); }, [loadData]);

  /* ── Focus timer tick ── */
  useEffect(() => {
    if (!activeSession) { setFocusElapsed(0); return; }
    const start = new Date(activeSession.started_at).getTime();
    const tick = () => setFocusElapsed(Math.floor((Date.now() - start) / 1000));
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [activeSession]);

  /* ── Derived ── */
  const completionRate = assignedCount > 0 ? Math.round((completedCount / assignedCount) * 100) : 0;
  const scheduleEmpty = todayTasks.length === 0 && todayEvents.length === 0 && todayReminders.length === 0;

  /* ── Inline focus session handlers ── */
  const handleShowSetup = async () => {
    setFocusStarted(true);
    setFocusError(null);
    setFocusEndMsg(null);
    if (!activeWorkspace) return;
    try {
      const [p, g] = await Promise.all([
        getActivePlans(activeWorkspace.id),
        getGoalsByWorkspace(activeWorkspace.id),
      ]);
      setFocusPlans(p);
      setFocusGoals(g);
    } catch { /* non-critical */ }
  };

  const handleCancelSetup = () => {
    setFocusStarted(false);
    setFocusContextType('none');
    setFocusContextId('');
    setIsCtxTypeOpen(false);
    setIsCtxValOpen(false);
    setFocusError(null);
  };

  const handleStartSession = async () => {
    if (!userId || !activeWorkspace) return;
    setFocusLoading(true);
    setFocusError(null);
    try {
      const payload: Parameters<typeof startFocusSession>[0] = {
        userId,
        workspaceId: activeWorkspace.id,
      };
      if (focusContextType === 'plan' && focusContextId) payload.planId = focusContextId;
      if (focusContextType === 'goal' && focusContextId) payload.goalId = focusContextId;
      const session = await startFocusSession(payload);
      setActiveSession(session);
      setFocusStarted(false);
    } catch (err) {
      setFocusError(err instanceof Error ? err.message : 'Failed to start session');
    } finally {
      setFocusLoading(false);
    }
  };

  const handleEndSession = async () => {
    if (!activeSession) return;
    setFocusLoading(true);
    setFocusError(null);
    try {
      const result = await endFocusSession(activeSession.id);
      if (result) {
        setFocusEndMsg(`Session ended — ${result.duration_minutes} min recorded.`);
      } else {
        setFocusEndMsg('Session was under 5 min and was discarded.');
      }
      setActiveSession(null);
      loadData();
    } catch (err) {
      setFocusError(err instanceof Error ? err.message : 'Failed to end session');
    } finally {
      setFocusLoading(false);
    }
  };

  /* ── Loading state ── */
  if (loading) {
    return (
      <div className="dashboard">
        <div className="dashboard-card glass dashboard-loading">
          <p className="text-secondary">Loading dashboard…</p>
        </div>
      </div>
    );
  }

  return (
    <div className="dashboard">

      {/* ═══ CARD 1 — Today's Schedule ═══ */}
      <div className="dashboard-card glass">
        <h3>Today's Schedule</h3>
        {scheduleEmpty ? (
          <p className="text-secondary dash-empty">Nothing scheduled for today. Enjoy your day.</p>
        ) : (
          <div className="schedule-list">
            {todayTasks.length > 0 && (
              <div className="schedule-group">
                <span className="schedule-group-label">Tasks</span>
                {todayTasks.map((t) => (
                  <button key={t.id} className="schedule-item" onClick={() => setSelectedTask(t)}>
                    <span className="schedule-dot schedule-dot--task" />
                    <span className="schedule-item-text">{t.title}</span>
                    {t.due_date && (
                      <span className="schedule-item-meta">
                        {t.due_date < localToday() ? 'Overdue' : 'Due today'}
                      </span>
                    )}
                  </button>
                ))}
              </div>
            )}

            {todayEvents.length > 0 && (
              <div className="schedule-group">
                <span className="schedule-group-label">Events</span>
                {todayEvents.map((ev, i) => (
                  <div key={`${ev.id}-${i}`} className="schedule-item schedule-item--static">
                    <span className="schedule-dot schedule-dot--event" />
                    <span className="schedule-item-text">{ev.title}</span>
                    <span className="schedule-item-meta">{fmtTime(ev.occurrenceStart)}</span>
                  </div>
                ))}
              </div>
            )}

            {todayReminders.length > 0 && (
              <div className="schedule-group">
                <span className="schedule-group-label">Reminders</span>
                {todayReminders.map((r, i) => (
                  <div key={`${r.id}-${i}`} className="schedule-item schedule-item--static">
                    <span className="schedule-dot schedule-dot--reminder" />
                    <span className="schedule-item-text">{r.title}</span>
                    <span className="schedule-item-meta">{fmtTime(r.occurrenceAt)}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* ═══ CARD 2 — Active Goals Progress ═══ */}
      <div className="dashboard-card glass">
        <h3>Active Goals Progress</h3>
        {activeGoals.length === 0 ? (
          <p className="text-secondary dash-empty">No active goals with your tasks yet.</p>
        ) : (
          <div className="goals-list">
            {activeGoals.map((g) => (
              <button key={g.id} className="goal-row" onClick={() => setSelectedGoal(g)}>
                <div className="goal-row-header">
                  <span className="goal-row-title">{g.title}</span>
                  <span className="goal-row-pct">{g.progress}%</span>
                </div>
                <div className="goal-progress-track">
                  <div className="goal-progress-fill" style={{ width: `${g.progress}%` }} />
                </div>
                <span className="goal-row-detail">{g.completedTasks}/{g.totalTasks} tasks completed</span>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* ═══ CARD 3 — Productivity Stats ═══ */}
      <div className="dashboard-card glass">
        <h3>Productivity Stats</h3>
        <div className="stat-item">
          <span className="stat-label">Completed Tasks (7d)</span>
          <span className="stat-value">{completedCount}</span>
        </div>
        <div className="stat-item">
          <span className="stat-label">Completion Rate</span>
          <span className="stat-value">{completionRate}%</span>
        </div>
        <div className="stat-item">
          <span className="stat-label">Avg. Daily Focus</span>
          <span className="stat-value">{avgDailyFocus} min</span>
        </div>
        <div className="stat-item">
          <span className="stat-label">Focus Streak</span>
          <span className="stat-value">{focusStreak} {focusStreak === 1 ? 'day' : 'days'}</span>
        </div>
      </div>

      {/* ═══ CARD 4 — Focus Session (inline) ═══ */}
      <div className="dashboard-card glass focus-card">
        <h3>Focus Session</h3>

        {focusError && <div className="focus-inline-error">{focusError}</div>}
        {focusEndMsg && <div className="focus-inline-success">{focusEndMsg}</div>}

        {activeSession ? (
          /* ── Active session: live timer ── */
          <div className="focus-inline-active">
            <div className="focus-resume-timer">{fmtElapsed(focusElapsed)}</div>
            <p className="text-secondary focus-context-hint">
              {activeSession.plan_id && focusPlans.find((p) => p.id === activeSession.plan_id)
                ? `Focused on: ${focusPlans.find((p) => p.id === activeSession.plan_id)?.title}`
                : activeSession.goal_id && focusGoals.find((g) => g.id === activeSession.goal_id)
                ? `Focused on: ${focusGoals.find((g) => g.id === activeSession.goal_id)?.title}`
                : 'Free focus — no specific context'}
            </p>
            <p className="text-tertiary focus-discard-hint">Sessions under 5 min are discarded.</p>
            <button
              className="btn-primary focus-end-btn"
              onClick={handleEndSession}
              disabled={focusLoading}
            >
              {focusLoading ? 'Ending…' : 'End Session'}
            </button>
          </div>
        ) : focusStarted ? (
          /* ── Setup form: choose context + start ── */
          <div className="focus-inline-setup">
            <div className="focus-form-group">
              <label className="focus-form-label">Link to (optional)</label>
              <div className="focus-dropdown">
                <button
                  type="button"
                  className="focus-dropdown-trigger"
                  onClick={() => { setIsCtxValOpen(false); setIsCtxTypeOpen(!isCtxTypeOpen); }}
                >
                  <span>{focusContextType === 'none' ? 'No context' : focusContextType === 'plan' ? 'Plan' : 'Goal'}</span>
                  <img src={ChevronDownIcon} alt="" className="focus-dropdown-chevron" />
                </button>
                {isCtxTypeOpen && (
                  <div className="focus-dropdown-menu">
                    {(['none', 'plan', 'goal'] as const).map((v) => (
                      <button
                        key={v}
                        type="button"
                        className={`focus-dropdown-option${focusContextType === v ? ' focus-dropdown-option--active' : ''}`}
                        onClick={() => { setFocusContextType(v); setFocusContextId(''); setIsCtxTypeOpen(false); }}
                      >
                        {v === 'none' ? 'No context' : v === 'plan' ? 'Plan' : 'Goal'}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {focusContextType !== 'none' && (
              <div className="focus-form-group">
                <label className="focus-form-label">
                  {focusContextType === 'plan' ? 'Select plan' : 'Select goal'}
                </label>
                <div className="focus-dropdown">
                  <button
                    type="button"
                    className="focus-dropdown-trigger"
                    onClick={() => { setIsCtxTypeOpen(false); setIsCtxValOpen(!isCtxValOpen); }}
                  >
                    <span>{focusContextId
                      ? (focusContextType === 'plan'
                          ? focusPlans.find((p) => p.id === focusContextId)?.title
                          : focusGoals.find((g) => g.id === focusContextId)?.title) || 'Select…'
                      : 'Select…'}
                    </span>
                    <img src={ChevronDownIcon} alt="" className="focus-dropdown-chevron" />
                  </button>
                  {isCtxValOpen && (
                    <div className="focus-dropdown-menu">
                      {(focusContextType === 'plan' ? focusPlans : focusGoals).length === 0 ? (
                        <div className="focus-dropdown-empty">
                          No {focusContextType === 'plan' ? 'active plans' : 'goals'} found
                        </div>
                      ) : (
                        (focusContextType === 'plan' ? focusPlans : focusGoals).map((item) => (
                          <button
                            key={item.id}
                            type="button"
                            className={`focus-dropdown-option${focusContextId === item.id ? ' focus-dropdown-option--active' : ''}`}
                            onClick={() => { setFocusContextId(item.id); setIsCtxValOpen(false); }}
                          >
                            {item.title}
                          </button>
                        ))
                      )}
                    </div>
                  )}
                </div>
              </div>
            )}

            <div className="focus-inline-actions">
              <button className="btn-secondary" onClick={handleCancelSetup}>Cancel</button>
              <button className="btn-primary" onClick={handleStartSession} disabled={focusLoading}>
                {focusLoading ? 'Starting…' : 'Start'}
              </button>
            </div>
          </div>
        ) : (
          /* ── Idle state ── */
          <>
            <p className="text-secondary">Start a focused work session.</p>
            <button className="btn-primary focus-start-btn" onClick={handleShowSetup}>
              Start Focus Session
            </button>
          </>
        )}
      </div>

      {/* ═══ Read-only popups ═══ */}
      {selectedTask && (
        <TaskReadOnlyModal isOpen task={selectedTask} onClose={() => setSelectedTask(null)} />
      )}

      {selectedGoal && (
        <GoalReadOnlyModal
          isOpen
          goal={{
            ...selectedGoal,
            linkedPlanNames: selectedGoal.linkedPlanNames,
            totalTasks: selectedGoal.totalTasks,
            completedTasks: selectedGoal.completedTasks,
            progress: selectedGoal.progress,
          }}
          onClose={() => setSelectedGoal(null)}
        />
      )}
    </div>
  );
}
