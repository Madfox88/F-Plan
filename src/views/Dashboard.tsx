/**
 * Dashboard — Read-only intelligence surface (DASHBOARD_RULES.md)
 *
 * Card layout (fixed 4-column grid):
 *   Row 1: Today's Schedule, Active Goals Progress, Recent Activity, Productivity Stats
 *   Row 2: Upcoming Deadlines, Goal Milestones, 7-Day Activity Heatmap, Focus Session
 *
 * All data scoped to current user.
 * No creation, no editing, no comparisons.
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import { ActivityFeed } from '../components/activity/ActivityFeed';
import { useWorkspace } from '../context/WorkspaceContext';
import { useCurrentUser } from '../context/UserContext';
import type { CalendarEvent, Reminder, FocusSession, Plan, Goal, Task, ActivityLogEntryWithUser } from '../types/database';
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
  getTasksWithDueDatesInRange,
  getGoalsWithDueDatesInRange,
  getActivityLog,
  getFocusSessionsInRange,
} from '../lib/db';
import type { TaskWithContext, DashboardGoal, GoalForCalendar } from '../lib/db';
import { TaskReadOnlyModal } from '../components/modals/TaskReadOnlyModal';
import { GoalReadOnlyModal } from '../components/modals/GoalReadOnlyModal';
import { EventReadOnlyModal } from '../components/modals/EventReadOnlyModal';
import { ReminderReadOnlyModal } from '../components/modals/ReminderReadOnlyModal';
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

function weekAheadEnd(): string {
  const d = new Date();
  d.setDate(d.getDate() + 7);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function relativeDate(dateStr: string): string {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const target = new Date(dateStr + 'T00:00:00');
  const diff = Math.round((target.getTime() - today.getTime()) / 86_400_000);
  if (diff < 0) return 'Overdue';
  if (diff === 0) return 'Today';
  if (diff === 1) return 'Tomorrow';
  return `In ${diff} days`;
}

function localDateKey(iso: string): string {
  const d = new Date(iso);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function weekdayLabel(iso: string): string {
  return new Date(iso + 'T12:00:00').toLocaleDateString(undefined, { weekday: 'short' });
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

  /* New — Upcoming Deadlines (under Schedule) */
  const [upcomingTasks, setUpcomingTasks] = useState<TaskWithContext[]>([]);
  const [upcomingGoals, setUpcomingGoals] = useState<GoalForCalendar[]>([]);

  /* New — Goal Milestones (under Goals) */
  const [goalActivity, setGoalActivity] = useState<ActivityLogEntryWithUser[]>([]);

  /* New — Weekly Activity Heatmap (under Recent Activity) */
  const [weekActivity, setWeekActivity] = useState<ActivityLogEntryWithUser[]>([]);
  const [weekFocusSessions, setWeekFocusSessions] = useState<FocusSession[]>([]);

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

      /* ── New card data (non-blocking) ── */
      const wEnd = weekAheadEnd();
      const [upTasks, upGoals, gActivity, wAct, wFocus] = await Promise.all([
        getTasksWithDueDatesInRange(wsId, today, wEnd).catch(() => [] as TaskWithContext[]),
        getGoalsWithDueDatesInRange(wsId).catch(() => [] as GoalForCalendar[]),
        getActivityLog(wsId, { entityType: 'goal', limit: 10 }).catch(() => [] as ActivityLogEntryWithUser[]),
        getActivityLog(wsId, { limit: 200 }).catch(() => [] as ActivityLogEntryWithUser[]),
        getFocusSessionsInRange(userId, wsId, windowStart, new Date().toISOString()).catch(() => [] as FocusSession[]),
      ]);
      // Upcoming tasks: exclude already-shown today tasks, only incomplete, sort by date
      setUpcomingTasks(
        upTasks
          .filter((t) => !t.completed && t.due_date && t.due_date > today)
          .sort((a, b) => (a.due_date ?? '').localeCompare(b.due_date ?? ''))
          .slice(0, 5)
      );
      // Upcoming goals: only those with due dates in the next 7 days
      setUpcomingGoals(
        upGoals
          .filter((g) => g.due_date && !g.completed_at && g.due_date >= today && g.due_date <= wEnd)
          .sort((a, b) => (a.due_date ?? '').localeCompare(b.due_date ?? ''))
          .slice(0, 5)
      );
      setGoalActivity(gActivity);
      setWeekActivity(wAct);
      setWeekFocusSessions(wFocus);
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
        <div className="dashboard-card-body">
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
        <div className="dashboard-card-body">
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
      </div>

      {/* ═══ CARD 3 — Recent Activity ═══ */}
      <div className="dashboard-card glass">
        <div className="dashboard-card-header">
          <h3>Recent Activity</h3>
          {onNavigate && (
            <button className="dashboard-view-all" onClick={() => onNavigate('activity')}>
              View all →
            </button>
          )}
        </div>
        <div className="dashboard-card-body">
          <ActivityFeed limit={10} compact />
        </div>
      </div>

      {/* ═══ CARD 4 — Productivity Stats (Ring Gauges) ═══ */}
      {(() => {
        const C = 207.35;
        const goalProgressAvg = activeGoals.length > 0
          ? Math.round(activeGoals.reduce((s, g) => s + g.progress, 0) / activeGoals.length)
          : 0;
        const todayDone = todayTasks.filter((t) => t.completed).length;
        const todayTotal = todayTasks.length;
        const todayPct = todayTotal > 0 ? Math.round((todayDone / todayTotal) * 100) : 0;
        const focusPct  = Math.min(avgDailyFocus / 60, 1) * 100;
        const streakPct = Math.min(focusStreak / 7, 1) * 100;
        const ring = (pct: number, color: string, glow: string, size: 'lg' | 'sm') => (
          <svg className={`stat-ring-svg stat-ring-svg--${size}`} viewBox="0 0 80 80">
            <circle className="stat-ring-track" cx="40" cy="40" r="33" />
            <circle
              className="stat-ring-progress"
              cx="40" cy="40" r="33"
              strokeDasharray={C}
              strokeDashoffset={C * (1 - Math.min(pct, 100) / 100)}
              stroke={color}
              style={{ filter: `drop-shadow(0 0 6px ${glow})` }}
              transform="rotate(-90 40 40)"
            />
          </svg>
        );
        return (
          <div className="dashboard-card glass">
            <h3>Productivity Stats</h3>
            <div className="dashboard-card-body">
            <div className="stat-layout">
              {/* Hero ring — Today's Pulse */}
              <div className="stat-hero">
                <div className="stat-ring-wrap stat-ring-wrap--lg">
                  {ring(todayPct, '#00c7be', 'rgba(0,199,190,0.4)', 'lg')}
                  <div className="stat-ring-center">
                    <span className="stat-ring-value stat-ring-value--lg" style={{ color: '#00c7be' }}>{todayDone}</span>
                    <span className="stat-ring-unit">/ {todayTotal}</span>
                  </div>
                </div>
                <span className="stat-ring-label">Today's Pulse</span>
              </div>
              {/* 2×2 grid — secondary stats */}
              <div className="stat-grid">
                <div className="stat-tile">
                  <div className="stat-ring-wrap stat-ring-wrap--sm">
                    {ring(completionRate, '#ff375f', 'rgba(255,55,95,0.35)', 'sm')}
                    <div className="stat-ring-center">
                      <span className="stat-ring-value stat-ring-value--sm" style={{ color: '#ff375f' }}>{completionRate}</span>
                      <span className="stat-ring-unit">%</span>
                    </div>
                  </div>
                  <span className="stat-ring-label">Completion</span>
                </div>
                <div className="stat-tile">
                  <div className="stat-ring-wrap stat-ring-wrap--sm">
                    {ring(goalProgressAvg, '#30d158', 'rgba(48,209,88,0.35)', 'sm')}
                    <div className="stat-ring-center">
                      <span className="stat-ring-value stat-ring-value--sm" style={{ color: '#30d158' }}>{goalProgressAvg}</span>
                      <span className="stat-ring-unit">%</span>
                    </div>
                  </div>
                  <span className="stat-ring-label">Goals</span>
                </div>
                <div className="stat-tile">
                  <div className="stat-ring-wrap stat-ring-wrap--sm">
                    {ring(focusPct, '#5e5ce6', 'rgba(94,92,230,0.35)', 'sm')}
                    <div className="stat-ring-center">
                      <span className="stat-ring-value stat-ring-value--sm" style={{ color: '#5e5ce6' }}>{avgDailyFocus}</span>
                      <span className="stat-ring-unit">min</span>
                    </div>
                  </div>
                  <span className="stat-ring-label">Avg Focus</span>
                </div>
                <div className="stat-tile">
                  <div className="stat-ring-wrap stat-ring-wrap--sm">
                    {ring(streakPct, '#ff9f0a', 'rgba(255,159,10,0.35)', 'sm')}
                    <div className="stat-ring-center">
                      <span className="stat-ring-value stat-ring-value--sm" style={{ color: '#ff9f0a' }}>{focusStreak}</span>
                      <span className="stat-ring-unit">{focusStreak === 1 ? 'day' : 'days'}</span>
                    </div>
                  </div>
                  <span className="stat-ring-label">Streak</span>
                </div>
              </div>
            </div>
            </div>
          </div>
        );
      })()}

      {/* ═══ CARD 5 — Upcoming Deadlines ═══ */}
      <div className="dashboard-card glass">
        <h3>Upcoming Deadlines</h3>
        <div className="dashboard-card-body">
        {upcomingTasks.length === 0 && upcomingGoals.length === 0 ? (
          <p className="text-secondary dash-empty">No upcoming deadlines this week.</p>
        ) : (
          <div className="upcoming-deadlines">
            {upcomingTasks.map((t) => (
              <button key={t.id} className="schedule-item" onClick={() => setSelectedTask(t)}>
                <span className="schedule-dot schedule-dot--task" />
                <span className="schedule-item-text">{t.title}</span>
                <span className="schedule-item-meta">{relativeDate(t.due_date!)}</span>
              </button>
            ))}
            {upcomingGoals.map((g) => (
              <button
                key={g.id}
                className="schedule-item"
                onClick={() =>
                  setSelectedGoal({
                    ...g,
                    linkedPlanNames: g.linkedPlanNames ?? [],
                    totalTasks: g.totalTasks ?? 0,
                    completedTasks: g.completedTasks ?? 0,
                    progress: g.progress ?? 0,
                  })
                }
              >
                <span className="schedule-dot schedule-dot--goal" />
                <span className="schedule-item-text">{g.title}</span>
                <span className="schedule-item-meta">{relativeDate(g.due_date!)}</span>
              </button>
            ))}
          </div>
        )}
        </div>
      </div>

      {/* ═══ CARD — Goal Milestones ═══ */}
      <div className="dashboard-card glass">
        <h3>Goal Milestones</h3>
        <div className="dashboard-card-body">
        {goalActivity.length === 0 && activeGoals.length === 0 ? (
          <p className="text-secondary dash-empty">No goal milestones yet.</p>
        ) : (
          <div className="goal-milestones">
            {/* Recent milestone events */}
            {goalActivity.length > 0 && (
              <div className="milestones-timeline">
                <span className="schedule-group-label">Recent Milestones</span>
                {goalActivity.slice(0, 6).map((a) => (
                  <div key={a.id} className="milestone-item">
                    <div className="milestone-dot-line">
                      <span
                        className={`milestone-dot ${
                          a.action === 'completed' ? 'milestone-dot--completed' : 'milestone-dot--created'
                        }`}
                      />
                      <span className="milestone-line" />
                    </div>
                    <div className="milestone-content">
                      <span className="milestone-text">
                        {a.action === 'completed' ? '✓ Completed' : a.action === 'created' ? '+ Created' : `↻ ${a.action}`}{' '}
                        <strong>{a.entity_title}</strong>
                      </span>
                      <span className="milestone-time">
                        {new Date(a.created_at).toLocaleDateString(undefined, {
                          month: 'short',
                          day: 'numeric',
                        })}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Next milestones: goals that are in-progress */}
            {(() => {
              const next = activeGoals.filter((g) => g.progress > 0 && g.progress < 100);
              if (next.length === 0) return null;
              return (
                <div className="goal-next-milestones">
                  <span className="schedule-group-label">Next Milestones</span>
                  {next.slice(0, 4).map((g) => (
                    <div key={g.id} className="next-milestone-row">
                      <span className="next-milestone-title">{g.title}</span>
                      <span className="next-milestone-badge">{g.progress}%</span>
                    </div>
                  ))}
                </div>
              );
            })()}
          </div>
        )}
        </div>
      </div>

      {/* ═══ CARD — 7-Day Activity (Ring + Daily List) ═══ */}
      <div className="dashboard-card glass activity-card">
        <h3>7-Day Activity</h3>
        <div className="dashboard-card-body">
        {(() => {
          /* Build 7-day buckets */
          const buckets: Record<string, number> = {};
          const todayKey = localDateKey(new Date().toISOString());
          for (let i = 6; i >= 0; i--) {
            const d = new Date();
            d.setDate(d.getDate() - i);
            buckets[localDateKey(d.toISOString())] = 0;
          }
          weekActivity.forEach((a) => {
            const k = localDateKey(a.created_at);
            if (k in buckets) buckets[k]++;
          });
          weekFocusSessions.forEach((s) => {
            const k = localDateKey(s.started_at);
            if (k in buckets) buckets[k]++;
          });

          const days = Object.entries(buckets);
          const maxVal = Math.max(...days.map(([, v]) => v), 1);
          const total = days.reduce((s, [, v]) => s + v, 0);
          const WEEKLY_TARGET = 70;
          const ringRatio = Math.min(total / WEEKLY_TARGET, 1);
          const R = 80;
          const C = 2 * Math.PI * R; // ≈ 502.65

          const INTENSITY_COLORS = [
            'rgba(96, 165, 250, 0.15)',
            'rgba(96, 165, 250, 0.30)',
            'rgba(96, 165, 250, 0.50)',
            'rgba(96, 165, 250, 0.70)',
            'rgba(96, 165, 250, 1)',
          ];
          const intensityIdx = (v: number): number => {
            if (v === 0) return 0;
            if (v <= maxVal * 0.25) return 1;
            if (v <= maxVal * 0.5) return 2;
            if (v <= maxVal * 0.75) return 3;
            return 4;
          };

          return (
            <>
              {/* Ring gauge */}
              <div className="act-ring-wrap">
                <div className="act-ring-glow" />
                <svg className="act-ring-svg" viewBox="0 0 200 200">
                  <defs>
                    <linearGradient id="actRingGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                      <stop offset="0%" stopColor="#a78bfa" />
                      <stop offset="100%" stopColor="#60a5fa" />
                    </linearGradient>
                  </defs>
                  <circle className="act-ring-track" cx="100" cy="100" r={R} strokeWidth="12" />
                  <circle
                    className="act-ring-progress"
                    cx="100" cy="100" r={R}
                    strokeWidth="12"
                    strokeDasharray={C}
                    strokeDashoffset={C * (1 - ringRatio)}
                    transform="rotate(-90 100 100)"
                  />
                </svg>
                <div className="act-ring-center">
                  <span className="act-ring-val">{total}</span>
                  <span className="act-ring-label">actions</span>
                </div>
              </div>

              {/* Daily rows */}
              <div className="act-day-list">
                {days.map(([dateKey, count]) => {
                  const isToday = dateKey === todayKey;
                  const pct = Math.max((count / maxVal) * 100, 3);
                  return (
                    <div key={dateKey} className={`act-day-row${isToday ? ' act-day-row--today' : ''}`}>
                      <span className="act-day-dot" style={{ background: INTENSITY_COLORS[intensityIdx(count)] }} />
                      <span className="act-day-name">{weekdayLabel(dateKey)}</span>
                      <div className="act-day-bar-track">
                        <div className="act-day-bar-fill" style={{ width: `${pct}%` }} />
                      </div>
                      <span className="act-day-count">{count}</span>
                    </div>
                  );
                })}
              </div>
            </>
          );
        })()}
        </div>
      </div>

      {/* ═══ CARD 8 — Focus Session ═══ */}
      <div className="dashboard-card glass focus-card">
        <h3>Focus Session</h3>
        <div className="dashboard-card-body">
        {focusError && <div className="focus-inline-error">{focusError}</div>}

        {/* Active session — compact timer display */}
        {activeSession && (
          <div className="focus-timer-display">
            <span className="focus-timer-time">
              {String(Math.floor(focusElapsed / 3600)).padStart(2, '0')}:{String(Math.floor((focusElapsed % 3600) / 60)).padStart(2, '0')}:{String(focusElapsed % 60).padStart(2, '0')}
            </span>
            {activeSession.planned_duration_minutes && (
              <span className="focus-timer-planned">of {activeSession.planned_duration_minutes} min</span>
            )}
            {activeContextLabel() && (
              <span className="focus-timer-context">{activeContextLabel()}</span>
            )}
          </div>
        )}

        {/* Idle state */}
        {!activeSession && !focusStarted && (
          <div className="focus-idle">
            <span className="focus-idle-icon">⏱</span>
            <p className="text-secondary focus-idle-hint">Start a focused work session.</p>
            {focusEndMsg && <p className="focus-discard-msg">{focusEndMsg}</p>}
          </div>
        )}

        {/* Setup form — vertical stack */}
        {!activeSession && focusStarted && (
          <div className="focus-setup">
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
        )}

        {/* Active hint */}
        {activeSession && (
          <p className="text-tertiary focus-discard-hint">Sessions under 5 min are discarded.</p>
        )}

        {/* Actions — pinned bottom */}
        <div className="focus-bottom-bar">
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
