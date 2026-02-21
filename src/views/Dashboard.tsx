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

import { useCallback, useEffect, useRef, useState } from 'react';
import { ActivityFeed } from '../components/ActivityFeed';
import { useWorkspace } from '../context/WorkspaceContext';
import { useCurrentUser } from '../context/UserContext';
import type { CalendarEvent, Reminder, FocusSession, Plan, Goal, Task } from '../types/database';
import {
  getTasksDueForUser,
  getTodaysEvents,
  getTodaysRemindersForUser,
  getActiveGoalsForUser,
  getCompletedTaskCountInWindow,
  getAssignedTaskCountInWindow,
  getActiveFocusSession,
  computeFocusStreak,
  computeAverageDailyFocus,
  startFocusSession,
  endFocusSession,
  getActivePlans,
  getGoalsByWorkspace,
  getIncompleteTasksForUser,
} from '../lib/database';
import type { TaskWithContext, DashboardGoal } from '../lib/database';
import { TaskReadOnlyModal } from '../components/TaskReadOnlyModal';
import { GoalReadOnlyModal } from '../components/GoalReadOnlyModal';
import { EventReadOnlyModal } from '../components/EventReadOnlyModal';
import { ReminderReadOnlyModal } from '../components/ReminderReadOnlyModal';
import { FocusTimer } from '../components/FocusTimer';
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

/* ── Component ── */

interface DashboardProps {
  onNavigate?: (tab: string) => void;
}

export function Dashboard({ onNavigate }: DashboardProps) {
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
  const [focusContextType, setFocusContextType] = useState<'none' | 'plan' | 'goal' | 'task'>('none');
  const [focusContextId, setFocusContextId] = useState('');
  const [focusPlans, setFocusPlans] = useState<Plan[]>([]);
  const [focusGoals, setFocusGoals] = useState<Goal[]>([]);
  const [focusTasks, setFocusTasks] = useState<Task[]>([]);
  const [focusStarted, setFocusStarted] = useState(false);  // show form vs idle
  const [focusLoading, setFocusLoading] = useState(false);
  const [focusError, setFocusError] = useState<string | null>(null);
  const [focusEndMsg, setFocusEndMsg] = useState<string | null>(null);
  const [isCtxTypeOpen, setIsCtxTypeOpen] = useState(false);
  const [isCtxValOpen, setIsCtxValOpen] = useState(false);
  const [isDurationOpen, setIsDurationOpen] = useState(false);
  const [focusDuration, setFocusDuration] = useState<number | null>(25); // minutes, null = custom
  const [customDuration, setCustomDuration] = useState('');

  /* Click-outside refs for focus dropdowns */
  const ctxTypeRef = useRef<HTMLDivElement>(null);
  const ctxValRef = useRef<HTMLDivElement>(null);
  const durationRef = useRef<HTMLDivElement>(null);

  /* Popups */
  const [selectedTask, setSelectedTask] = useState<TaskWithContext | null>(null);
  const [selectedGoal, setSelectedGoal] = useState<DashboardGoal | null>(null);
  const [selectedEvent, setSelectedEvent] = useState<(CalendarEvent & { occurrenceStart: string; occurrenceEnd: string }) | null>(null);
  const [selectedReminder, setSelectedReminder] = useState<(Reminder & { occurrenceAt: string }) | null>(null);

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
      const [tasks, events, reminders, goals, completed, assigned, avgFoc, streak, session, plans, wGoals, incompleteTasks] =
        await Promise.all([
          getTasksDueForUser(userId, wsId, today).catch(() => [] as TaskWithContext[]),
          getTodaysEvents(wsId).catch(() => [] as Array<CalendarEvent & { occurrenceStart: string; occurrenceEnd: string }>),
          getTodaysRemindersForUser(userId, wsId).catch(() => [] as Array<Reminder & { occurrenceAt: string }>),
          getActiveGoalsForUser(userId, wsId).catch(() => [] as DashboardGoal[]),
          getCompletedTaskCountInWindow(userId, windowStart).catch(() => 0),
          getAssignedTaskCountInWindow(userId, wsId, windowStart).catch(() => 0),
          computeAverageDailyFocus(userId, wsId).catch(() => 0),
          computeFocusStreak(userId, wsId).catch(() => 0),
          getActiveFocusSession(userId, wsId).catch(() => null),
          getActivePlans(wsId).catch(() => [] as Plan[]),
          getGoalsByWorkspace(wsId).catch(() => [] as Goal[]),
          getIncompleteTasksForUser(userId, wsId).catch(() => [] as Task[]),
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
      setFocusTasks(incompleteTasks);
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

  /* ── Focus click-outside handler ── */
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      const t = e.target as Node;
      if (isCtxTypeOpen && ctxTypeRef.current && !ctxTypeRef.current.contains(t)) setIsCtxTypeOpen(false);
      if (isCtxValOpen && ctxValRef.current && !ctxValRef.current.contains(t)) setIsCtxValOpen(false);
      if (isDurationOpen && durationRef.current && !durationRef.current.contains(t)) setIsDurationOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [isCtxTypeOpen, isCtxValOpen, isDurationOpen]);

  const closeAllFocusDropdowns = () => {
    setIsCtxTypeOpen(false);
    setIsCtxValOpen(false);
    setIsDurationOpen(false);
  };

  const DURATION_PRESETS = [15, 20, 25, 30, 45, 60] as const;
  const durationLabel = focusDuration === null ? `${customDuration || '?'} min` : `${focusDuration} min`;

  /* ── Inline focus session handlers ── */
  const handleShowSetup = () => {
    setFocusStarted(true);
    setFocusError(null);
    setFocusEndMsg(null);
  };

  const handleCancelSetup = () => {
    setFocusStarted(false);
    setFocusContextType('none');
    setFocusContextId('');
    setFocusDuration(25);
    setCustomDuration('');
    closeAllFocusDropdowns();
    setFocusError(null);
  };

  const handleStartSession = async () => {
    if (!userId || !activeWorkspace) return;
    setFocusLoading(true);
    setFocusError(null);
    try {
      const resolvedDuration = focusDuration ?? (customDuration ? parseInt(customDuration, 10) : undefined);
      const payload: Parameters<typeof startFocusSession>[0] = {
        userId,
        workspaceId: activeWorkspace.id,
        plannedDurationMinutes: resolvedDuration && resolvedDuration > 0 ? resolvedDuration : undefined,
      };
      if (focusContextType === 'plan' && focusContextId) payload.planId = focusContextId;
      if (focusContextType === 'goal' && focusContextId) payload.goalId = focusContextId;
      if (focusContextType === 'task' && focusContextId) payload.taskId = focusContextId;
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

  /* ── Focus context helpers ── */
  const contextTypeLabel = (v: typeof focusContextType) =>
    v === 'none' ? 'No context' : v === 'plan' ? 'Plan' : v === 'goal' ? 'Goal' : 'Task';

  const contextValueLabel = (): string => {
    if (!focusContextId) return 'Select…';
    if (focusContextType === 'plan') return focusPlans.find((p) => p.id === focusContextId)?.title || 'Select…';
    if (focusContextType === 'goal') return focusGoals.find((g) => g.id === focusContextId)?.title || 'Select…';
    if (focusContextType === 'task') return focusTasks.find((t) => t.id === focusContextId)?.title || 'Select…';
    return 'Select…';
  };

  const contextValueItems = (): Array<{ id: string; title: string }> => {
    if (focusContextType === 'plan') return focusPlans;
    if (focusContextType === 'goal') return focusGoals;
    if (focusContextType === 'task') return focusTasks;
    return [];
  };

  const contextEmptyLabel = (): string => {
    if (focusContextType === 'plan') return 'No active plans';
    if (focusContextType === 'goal') return 'No goals found';
    if (focusContextType === 'task') return 'No incomplete tasks';
    return '';
  };

  /** Resolve active session context label for timer display */
  const activeContextLabel = (): string | null => {
    if (!activeSession) return null;
    if (activeSession.plan_id) {
      const p = focusPlans.find((x) => x.id === activeSession.plan_id);
      return p ? `Plan: ${p.title}` : null;
    }
    if (activeSession.goal_id) {
      const g = focusGoals.find((x) => x.id === activeSession.goal_id);
      return g ? `Goal: ${g.title}` : null;
    }
    if (activeSession.task_id) {
      const t = focusTasks.find((x) => x.id === activeSession.task_id);
      return t ? `Task: ${t.title}` : null;
    }
    return null;
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
        <div className="dashboard-card-header">
          <h3>Today's Schedule</h3>
          {onNavigate && (
            <button className="dashboard-view-all" onClick={() => onNavigate('calendar')}>
              View all →
            </button>
          )}
        </div>
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
                  <button key={`${ev.id}-${i}`} className="schedule-item" onClick={() => setSelectedEvent(ev)}>
                    <span className="schedule-dot schedule-dot--event" />
                    <span className="schedule-item-text">{ev.title}</span>
                    <span className="schedule-item-meta">{fmtTime(ev.occurrenceStart)}</span>
                  </button>
                ))}
              </div>
            )}

            {todayReminders.length > 0 && (
              <div className="schedule-group">
                <span className="schedule-group-label">Reminders</span>
                {todayReminders.map((r, i) => (
                  <button key={`${r.id}-${i}`} className="schedule-item" onClick={() => setSelectedReminder(r)}>
                    <span className="schedule-dot schedule-dot--reminder" />
                    <span className="schedule-item-text">{r.title}</span>
                    <span className="schedule-item-meta">{fmtTime(r.occurrenceAt)}</span>
                  </button>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* ═══ CARD 2 — Active Goals Progress ═══ */}
      <div className="dashboard-card glass">
        <div className="dashboard-card-header">
          <h3>Active Goals Progress</h3>
          {onNavigate && (
            <button className="dashboard-view-all" onClick={() => onNavigate('goals')}>
              View all →
            </button>
          )}
        </div>
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

        {/* Timer — always visible */}
        <FocusTimer
          seconds={focusElapsed}
          active={!!activeSession}
          plannedMinutes={activeSession?.planned_duration_minutes}
        />

        {activeSession ? (
          /* ── Active session ── */
          <div className="focus-inline-active">
            <p className="text-secondary focus-context-hint">
              {activeContextLabel() ? `Focused on: ${activeContextLabel()}` : 'Free focus — no specific context'}
            </p>
            <p className="text-tertiary focus-discard-hint">Sessions under 5 min are discarded.</p>
          </div>
        ) : focusStarted ? (
          /* ── Setup form ── */
          <div className="focus-inline-setup">
            {/* Duration dropdown */}
            <div className="focus-form-group">
              <label className="focus-form-label">Duration</label>
              <div className="dropdown" ref={durationRef}>
                <button
                  type="button"
                  className="dropdown-trigger"
                  onClick={() => { closeAllFocusDropdowns(); setIsDurationOpen(!isDurationOpen); }}
                >
                  <span>{durationLabel}</span>
                  <img src={ChevronDownIcon} alt="" className="dropdown-chevron" />
                </button>
                {isDurationOpen && (
                  <div className="dropdown-menu">
                    {DURATION_PRESETS.map((m) => (
                      <button
                        key={m}
                        type="button"
                        className={`dropdown-option${focusDuration === m ? ' dropdown-option-active' : ''}`}
                        onClick={() => { setFocusDuration(m); setCustomDuration(''); setIsDurationOpen(false); }}
                      >
                        {m} min
                      </button>
                    ))}
                    <button
                      type="button"
                      className={`dropdown-option${focusDuration === null ? ' dropdown-option-active' : ''}`}
                      onClick={() => { setFocusDuration(null); setIsDurationOpen(false); }}
                    >
                      Custom
                    </button>
                  </div>
                )}
              </div>
              {focusDuration === null && (
                <input
                  type="number"
                  className="focus-custom-input"
                  placeholder="Minutes"
                  min={1}
                  max={480}
                  value={customDuration}
                  onChange={(e) => setCustomDuration(e.target.value)}
                />
              )}
            </div>

            {/* Context type dropdown */}
            <div className="focus-form-group">
              <label className="focus-form-label">Link to (optional)</label>
              <div className="dropdown" ref={ctxTypeRef}>
                <button
                  type="button"
                  className="dropdown-trigger"
                  onClick={() => { closeAllFocusDropdowns(); setIsCtxTypeOpen(!isCtxTypeOpen); }}
                >
                  <span>{contextTypeLabel(focusContextType)}</span>
                  <img src={ChevronDownIcon} alt="" className="dropdown-chevron" />
                </button>
                {isCtxTypeOpen && (
                  <div className="dropdown-menu">
                    {(['none', 'plan', 'goal', 'task'] as const).map((v) => (
                      <button
                        key={v}
                        type="button"
                        className={`dropdown-option${focusContextType === v ? ' dropdown-option-active' : ''}`}
                        onClick={() => { setFocusContextType(v); setFocusContextId(''); setIsCtxTypeOpen(false); }}
                      >
                        {contextTypeLabel(v)}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Context value dropdown */}
            {focusContextType !== 'none' && (
              <div className="focus-form-group">
                <label className="focus-form-label">
                  {focusContextType === 'plan' ? 'Select plan' : focusContextType === 'goal' ? 'Select goal' : 'Select task'}
                </label>
                <div className="dropdown" ref={ctxValRef}>
                  <button
                    type="button"
                    className="dropdown-trigger"
                    onClick={() => { closeAllFocusDropdowns(); setIsCtxValOpen(!isCtxValOpen); }}
                  >
                    <span>{contextValueLabel()}</span>
                    <img src={ChevronDownIcon} alt="" className="dropdown-chevron" />
                  </button>
                  {isCtxValOpen && (
                    <div className="dropdown-menu">
                      {contextValueItems().length === 0 ? (
                        <div className="dropdown-empty">{contextEmptyLabel()}</div>
                      ) : (
                        contextValueItems().map((item) => (
                          <button
                            key={item.id}
                            type="button"
                            className={`dropdown-option${focusContextId === item.id ? ' dropdown-option-active' : ''}`}
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
          </div>
        ) : (
          /* ── Idle hint ── */
          <p className="text-secondary">Start a focused work session.</p>
        )}

        {/* ── Actions — always pinned at bottom ── */}
        <div className="focus-inline-actions">
          {activeSession ? (
            <button className="btn-primary focus-end-btn" onClick={handleEndSession} disabled={focusLoading}>
              <span>{focusLoading ? 'Ending…' : 'End Session'}</span>
            </button>
          ) : focusStarted ? (
            <>
              <button className="btn-secondary" onClick={handleCancelSetup}><span>Cancel</span></button>
              <button className="btn-primary" onClick={handleStartSession} disabled={focusLoading}>
                <span>{focusLoading ? 'Starting…' : 'Start'}</span>
              </button>
            </>
          ) : (
            <button className="btn-primary" onClick={handleShowSetup}>
              <span>Start Focus Session</span>
            </button>
          )}
        </div>
      </div>

      {/* ═══ CARD 5 — Recent Activity ═══ */}
      <div className="dashboard-card glass">
        <div className="dashboard-card-header">
          <h3>Recent Activity</h3>
          {onNavigate && (
            <button className="dashboard-view-all" onClick={() => onNavigate('activity')}>
              View all →
            </button>
          )}
        </div>
        <ActivityFeed limit={10} compact />
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

      {selectedEvent && (
        <EventReadOnlyModal isOpen event={selectedEvent} onClose={() => setSelectedEvent(null)} />
      )}

      {selectedReminder && (
        <ReminderReadOnlyModal isOpen reminder={selectedReminder} onClose={() => setSelectedReminder(null)} />
      )}
    </div>
  );
}
