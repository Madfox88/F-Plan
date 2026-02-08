/**
 * Calendar view (CALENDAR_RULES.md)
 *
 * Three views: Month, Week, Day
 * Shows: Tasks (due_date), Goals (due_date), Events, Reminders
 * Click behavior: §6
 */

import { useState, useEffect, useCallback, useMemo } from 'react';
import { useWorkspace } from '../context/WorkspaceContext';
import {
  getEvents,
  getReminders,
  getTasksWithDueDatesInRange,
  getGoalsWithDueDatesInRange,
  createEvent,
  updateEvent,
  deleteEvent,
  createReminder,
  updateReminder,
  deleteReminder,
} from '../lib/database';
import type {
  TaskWithContext,
  GoalForCalendar,
} from '../lib/database';
import type { CalendarEvent, Reminder, RepeatRule } from '../types/database';
import { expandEventOccurrences, expandRecurrences } from '../lib/recurrence';
import { CalendarChooserModal } from '../components/CalendarChooserModal';
import { EventModal } from '../components/EventModal';
import { ReminderModal } from '../components/ReminderModal';
import { TaskReadOnlyModal } from '../components/TaskReadOnlyModal';
import { GoalReadOnlyModal } from '../components/GoalReadOnlyModal';
import './Calendar.css';

type CalendarView = 'month' | 'week' | 'day';

/** Unified calendar item for rendering */
type CalendarItem = {
  type: 'task' | 'goal' | 'event' | 'reminder';
  id: string;
  title: string;
  date: Date;        // for all-day / date-level items
  startTime?: Date;  // for time-blocked items
  endTime?: Date;
  original: TaskWithContext | GoalForCalendar | CalendarEvent | Reminder;
};

/* ────────────────────────────────────────────── */
/*  Helpers                                       */
/* ────────────────────────────────────────────── */

function startOfMonth(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), 1);
}
function endOfMonth(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth() + 1, 0, 23, 59, 59);
}
function startOfWeek(d: Date): Date {
  const day = d.getDay();
  const diff = d.getDate() - day;
  return new Date(d.getFullYear(), d.getMonth(), diff);
}
function endOfWeek(d: Date): Date {
  const s = startOfWeek(d);
  return new Date(s.getFullYear(), s.getMonth(), s.getDate() + 6, 23, 59, 59);
}
function addDays(d: Date, n: number): Date {
  const r = new Date(d);
  r.setDate(r.getDate() + n);
  return r;
}
function isSameDay(a: Date, b: Date): boolean {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}
function formatHour(h: number): string {
  if (h === 0) return '12 AM';
  if (h < 12) return `${h} AM`;
  if (h === 12) return '12 PM';
  return `${h - 12} PM`;
}
function formatMonthYear(d: Date): string {
  return d.toLocaleDateString(undefined, { month: 'long', year: 'numeric' });
}
function formatWeekRange(d: Date): string {
  const s = startOfWeek(d);
  const e = endOfWeek(d);
  const opts: Intl.DateTimeFormatOptions = { month: 'short', day: 'numeric' };
  return `${s.toLocaleDateString(undefined, opts)} – ${e.toLocaleDateString(undefined, { ...opts, year: 'numeric' })}`;
}
function formatDayHeader(d: Date): string {
  return d.toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' });
}

const DAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const HOURS = Array.from({ length: 24 }, (_, i) => i);
const MAX_MONTH_ITEMS = 3;

export function Calendar() {
  const { activeWorkspace } = useWorkspace();
  const [view, setView] = useState<CalendarView>('month');
  const [currentDate, setCurrentDate] = useState(new Date());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Raw data
  const [tasks, setTasks] = useState<TaskWithContext[]>([]);
  const [goals, setGoals] = useState<GoalForCalendar[]>([]);
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [reminders, setReminders] = useState<Reminder[]>([]);

  // Modals
  const [chooserDate, setChooserDate] = useState<Date | null>(null);
  const [chooserHour, setChooserHour] = useState<number | null>(null);
  const [eventModalData, setEventModalData] = useState<{ event?: CalendarEvent; defaultStart?: Date } | null>(null);
  const [reminderModalData, setReminderModalData] = useState<{ reminder?: Reminder; defaultAt?: Date } | null>(null);
  const [taskModalData, setTaskModalData] = useState<TaskWithContext | null>(null);
  const [goalModalData, setGoalModalData] = useState<GoalForCalendar | null>(null);

  /* Compute visible range based on view */
  const visibleRange = useMemo(() => {
    if (view === 'month') {
      const ms = startOfMonth(currentDate);
      const me = endOfMonth(currentDate);
      // Extend to full calendar grid weeks
      const gridStart = startOfWeek(ms);
      const gridEnd = endOfWeek(me);
      return { start: gridStart, end: gridEnd };
    }
    if (view === 'week') {
      return { start: startOfWeek(currentDate), end: endOfWeek(currentDate) };
    }
    // day
    const dayStart = new Date(currentDate.getFullYear(), currentDate.getMonth(), currentDate.getDate());
    const dayEnd = new Date(currentDate.getFullYear(), currentDate.getMonth(), currentDate.getDate(), 23, 59, 59);
    return { start: dayStart, end: dayEnd };
  }, [view, currentDate]);

  /* Load data for visible range */
  const loadData = useCallback(async () => {
    if (!activeWorkspace) return;
    try {
      setLoading(true);
      setError(null);
      const rangeStartISO = visibleRange.start.toISOString();
      const rangeEndISO = visibleRange.end.toISOString();

      const [t, g, e, r] = await Promise.all([
        getTasksWithDueDatesInRange(activeWorkspace.id, rangeStartISO, rangeEndISO),
        getGoalsWithDueDatesInRange(activeWorkspace.id),
        getEvents(activeWorkspace.id, rangeStartISO, rangeEndISO),
        getReminders(activeWorkspace.id, rangeStartISO, rangeEndISO),
      ]);

      setTasks(t);
      setGoals(g);
      setEvents(e);
      setReminders(r);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load calendar data');
    } finally {
      setLoading(false);
    }
  }, [activeWorkspace, visibleRange]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  /* Build unified calendar items with recurrence expansion */
  const calendarItems = useMemo((): CalendarItem[] => {
    const items: CalendarItem[] = [];
    const { start: rangeStart, end: rangeEnd } = visibleRange;

    // Tasks — date-level, no recurrence
    tasks.forEach((t) => {
      if (!t.due_date) return;
      const d = new Date(t.due_date + 'T00:00:00');
      if (d >= rangeStart && d <= rangeEnd) {
        items.push({ type: 'task', id: t.id, title: t.title, date: d, original: t });
      }
    });

    // Goals — date-level, no recurrence
    goals.forEach((g) => {
      if (!g.due_date) return;
      const d = new Date(g.due_date + 'T00:00:00');
      if (d >= rangeStart && d <= rangeEnd) {
        items.push({ type: 'goal', id: g.id, title: g.title, date: d, original: g });
      }
    });

    // Events — time-blocked, with recurrence
    events.forEach((e) => {
      const occurrences = expandEventOccurrences(
        new Date(e.start_at), new Date(e.end_at),
        e.repeat_rule, rangeStart, rangeEnd
      );
      occurrences.forEach((occ, idx) => {
        items.push({
          type: 'event',
          id: `${e.id}-${idx}`,
          title: e.title,
          date: occ.start,
          startTime: occ.start,
          endTime: occ.end,
          original: e,
        });
      });
    });

    // Reminders — time marker, with recurrence
    reminders.forEach((r) => {
      const occurrences = expandRecurrences(
        new Date(r.remind_at), r.repeat_rule, rangeStart, rangeEnd
      );
      occurrences.forEach((occ, idx) => {
        items.push({
          type: 'reminder',
          id: `${r.id}-${idx}`,
          title: r.title,
          date: occ,
          startTime: occ,
          original: r,
        });
      });
    });

    return items;
  }, [tasks, goals, events, reminders, visibleRange]);

  /* Get items for a specific day */
  const getItemsForDay = useCallback((day: Date) => {
    return calendarItems.filter((item) => isSameDay(item.date, day));
  }, [calendarItems]);

  /* Navigation */
  const navigate = (dir: number) => {
    const d = new Date(currentDate);
    if (view === 'month') d.setMonth(d.getMonth() + dir);
    else if (view === 'week') d.setDate(d.getDate() + 7 * dir);
    else d.setDate(d.getDate() + dir);
    setCurrentDate(d);
  };

  const goToday = () => setCurrentDate(new Date());

  /* Click handlers (§6) */
  const handleEmptyClick = (date: Date, hour?: number) => {
    setChooserDate(date);
    setChooserHour(hour ?? null);
  };

  const handleItemClick = (item: CalendarItem, e: React.MouseEvent) => {
    e.stopPropagation();
    switch (item.type) {
      case 'task':
        setTaskModalData(item.original as TaskWithContext);
        break;
      case 'goal':
        setGoalModalData(item.original as GoalForCalendar);
        break;
      case 'event':
        setEventModalData({ event: item.original as CalendarEvent });
        break;
      case 'reminder':
        setReminderModalData({ reminder: item.original as Reminder });
        break;
    }
  };

  /* Chooser actions */
  const handleChooserSelect = (choice: 'event' | 'reminder') => {
    if (!chooserDate) return;
    const defaultDate = new Date(chooserDate);
    if (chooserHour !== null) {
      defaultDate.setHours(chooserHour, 0, 0, 0);
    }
    setChooserDate(null);
    setChooserHour(null);
    if (choice === 'event') {
      setEventModalData({ defaultStart: defaultDate });
    } else {
      setReminderModalData({ defaultAt: defaultDate });
    }
  };

  /* Event CRUD */
  const handleEventSave = async (data: {
    title: string;
    notes?: string;
    location?: string;
    startAt: string;
    endAt: string;
    repeatRule: RepeatRule;
  }) => {
    if (!activeWorkspace) return;
    if (eventModalData?.event) {
      await updateEvent(eventModalData.event.id, {
        title: data.title,
        notes: data.notes || null,
        location: data.location || null,
        start_at: data.startAt,
        end_at: data.endAt,
        repeat_rule: data.repeatRule,
      });
    } else {
      await createEvent({
        workspaceId: activeWorkspace.id,
        title: data.title,
        notes: data.notes,
        location: data.location,
        startAt: data.startAt,
        endAt: data.endAt,
        repeatRule: data.repeatRule,
      });
    }
    setEventModalData(null);
    loadData();
  };

  const handleEventDelete = async (id: string) => {
    await deleteEvent(id);
    setEventModalData(null);
    loadData();
  };

  /* Reminder CRUD */
  const handleReminderSave = async (data: {
    title: string;
    notes?: string;
    remindAt: string;
    repeatRule: RepeatRule;
  }) => {
    if (!activeWorkspace) return;
    if (reminderModalData?.reminder) {
      await updateReminder(reminderModalData.reminder.id, {
        title: data.title,
        notes: data.notes || null,
        remind_at: data.remindAt,
        repeat_rule: data.repeatRule,
      });
    } else {
      await createReminder({
        workspaceId: activeWorkspace.id,
        title: data.title,
        notes: data.notes,
        remindAt: data.remindAt,
        repeatRule: data.repeatRule,
      });
    }
    setReminderModalData(null);
    loadData();
  };

  const handleReminderDelete = async (id: string) => {
    await deleteReminder(id);
    setReminderModalData(null);
    loadData();
  };

  /* ────── Render helpers ────── */
  const typeClass = (type: string) => `cal-type-${type}`;

  const renderItem = (item: CalendarItem) => (
    <div
      key={item.id}
      className={`calendar-item ${typeClass(item.type)}`}
      onClick={(e) => handleItemClick(item, e)}
      title={item.title}
    >
      {item.title}
    </div>
  );

  /* ────── Month View ────── */
  const renderMonth = () => {
    const ms = startOfMonth(currentDate);
    const gridStart = startOfWeek(ms);
    const days: Date[] = [];
    let d = new Date(gridStart);
    // Generate 42 cells (6 weeks)
    for (let i = 0; i < 42; i++) {
      days.push(new Date(d));
      d = addDays(d, 1);
    }
    const today = new Date();

    return (
      <div className="calendar-month">
        <div className="calendar-month-header">
          {DAY_NAMES.map((n) => <span key={n}>{n}</span>)}
        </div>
        <div className="calendar-month-grid">
          {days.map((day, idx) => {
            const dayItems = getItemsForDay(day);
            const isOther = day.getMonth() !== currentDate.getMonth();
            const isToday = isSameDay(day, today);
            return (
              <div
                key={idx}
                className={`calendar-day-cell${isOther ? ' other-month' : ''}${isToday ? ' today' : ''}`}
                onClick={() => handleEmptyClick(day)}
              >
                <span className="calendar-day-number">{day.getDate()}</span>
                <div className="calendar-day-items">
                  {dayItems.slice(0, MAX_MONTH_ITEMS).map(renderItem)}
                  {dayItems.length > MAX_MONTH_ITEMS && (
                    <span className="calendar-day-more">+{dayItems.length - MAX_MONTH_ITEMS} more</span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  /* ────── Week View ────── */
  const renderWeek = () => {
    const weekStart = startOfWeek(currentDate);
    const days = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));
    const today = new Date();

    return (
      <div className="calendar-week">
        <div className="calendar-week-header">
          <div className="calendar-week-header-gutter" />
          {days.map((d, i) => (
            <div key={i} className={`calendar-week-header-day${isSameDay(d, today) ? ' today' : ''}`}>
              <div className="day-name">{DAY_NAMES[d.getDay()]}</div>
              <div className="day-number">{d.getDate()}</div>
            </div>
          ))}
        </div>

        {/* All-day section for tasks & goals */}
        <div className="calendar-week-allday">
          <div className="calendar-week-allday-label">All day</div>
          {days.map((d, i) => {
            const dayItems = getItemsForDay(d).filter((it) => it.type === 'task' || it.type === 'goal');
            return (
              <div key={i} className="calendar-week-allday-cell">
                {dayItems.map(renderItem)}
              </div>
            );
          })}
        </div>

        {/* Time grid */}
        <div className="calendar-week-body">
          <div className="calendar-week-times">
            {HOURS.map((h) => (
              <div key={h} className="calendar-week-time-slot">{formatHour(h)}</div>
            ))}
          </div>
          {days.map((d, di) => {
            const dayTimeItems = getItemsForDay(d).filter((it) => it.type === 'event' || it.type === 'reminder');
            return (
              <div key={di} className="calendar-week-col">
                {HOURS.map((h) => (
                  <div
                    key={h}
                    className="calendar-week-hour-line"
                    onClick={() => handleEmptyClick(d, h)}
                  />
                ))}
                {dayTimeItems.map((item) => {
                  if (!item.startTime) return null;
                  const startH = item.startTime.getHours() + item.startTime.getMinutes() / 60;
                  const endH = item.endTime
                    ? item.endTime.getHours() + item.endTime.getMinutes() / 60
                    : startH + 1;
                  const top = startH * 48;
                  const height = Math.max((endH - startH) * 48, 16);

                  if (item.type === 'reminder') {
                    return (
                      <div
                        key={item.id}
                        className={`calendar-week-reminder ${typeClass(item.type)}`}
                        style={{ top }}
                        onClick={(e) => handleItemClick(item, e)}
                        title={item.title}
                      >
                        {item.title}
                      </div>
                    );
                  }

                  return (
                    <div
                      key={item.id}
                      className={`calendar-week-event ${typeClass(item.type)}`}
                      style={{ top, height }}
                      onClick={(e) => handleItemClick(item, e)}
                      title={item.title}
                    >
                      {item.title}
                    </div>
                  );
                })}
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  /* ────── Day View ────── */
  const renderDay = () => {
    const dayItems = getItemsForDay(currentDate);
    const allDayItems = dayItems.filter((it) => it.type === 'task' || it.type === 'goal');
    const timeItems = dayItems.filter((it) => it.type === 'event' || it.type === 'reminder');

    return (
      <div className="calendar-day">
        {/* All-day / Due / Milestone section */}
        {allDayItems.length > 0 && (
          <div className="calendar-day-allday-section">
            <h4>Due Today</h4>
            <div className="calendar-day-allday-items">
              {allDayItems.map((item) => (
                <div
                  key={item.id}
                  className={`calendar-day-allday-item ${typeClass(item.type)}`}
                  onClick={(e) => handleItemClick(item, e)}
                >
                  {item.title}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Time grid */}
        <div className="calendar-day-timeline">
          <div className="calendar-day-times">
            {HOURS.map((h) => (
              <div key={h} className="calendar-day-time-slot">{formatHour(h)}</div>
            ))}
          </div>
          <div className="calendar-day-col">
            {HOURS.map((h) => (
              <div
                key={h}
                className="calendar-day-hour-line"
                onClick={() => handleEmptyClick(currentDate, h)}
              />
            ))}
            {timeItems.map((item) => {
              if (!item.startTime) return null;
              const startH = item.startTime.getHours() + item.startTime.getMinutes() / 60;
              const endH = item.endTime
                ? item.endTime.getHours() + item.endTime.getMinutes() / 60
                : startH + 1;
              const top = startH * 48;
              const height = Math.max((endH - startH) * 48, 18);

              if (item.type === 'reminder') {
                return (
                  <div
                    key={item.id}
                    className={`calendar-day-reminder-marker ${typeClass(item.type)}`}
                    style={{ top }}
                    onClick={(e) => handleItemClick(item, e)}
                    title={item.title}
                  >
                    🔔 {item.title}
                  </div>
                );
              }

              return (
                <div
                  key={item.id}
                  className={`calendar-day-event ${typeClass(item.type)}`}
                  style={{ top, height }}
                  onClick={(e) => handleItemClick(item, e)}
                  title={item.title}
                >
                  <strong>{item.title}</strong>
                  {(item.original as CalendarEvent).location && (
                    <div style={{ fontSize: '10px', opacity: 0.7 }}>
                      📍 {(item.original as CalendarEvent).location}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    );
  };

  /* ────── Header title ────── */
  const headerTitle = view === 'month'
    ? formatMonthYear(currentDate)
    : view === 'week'
      ? formatWeekRange(currentDate)
      : formatDayHeader(currentDate);

  if (loading && tasks.length === 0) {
    return <div className="calendar-container"><div className="calendar-loading">Loading calendar…</div></div>;
  }

  if (error) {
    return <div className="calendar-container"><div className="calendar-error">{error}</div></div>;
  }

  return (
    <div className="calendar-container">
      {/* Toolbar */}
      <div className="calendar-toolbar">
        <div className="calendar-toolbar-left">
          <button className="calendar-nav-btn" onClick={() => navigate(-1)}>‹</button>
          <button className="calendar-nav-btn calendar-today-btn" onClick={goToday}>Today</button>
          <button className="calendar-nav-btn" onClick={() => navigate(1)}>›</button>
          <h2>{headerTitle}</h2>
        </div>
        <div className="calendar-toolbar-right">
          {(['month', 'week', 'day'] as CalendarView[]).map((v) => (
            <button
              key={v}
              className={`calendar-view-btn${view === v ? ' active' : ''}`}
              onClick={() => setView(v)}
            >
              {v.charAt(0).toUpperCase() + v.slice(1)}
            </button>
          ))}
        </div>
      </div>

      {/* Legend */}
      <div className="calendar-legend">
        <div className="calendar-legend-item cal-type-task">
          <span className="calendar-legend-dot" /> Tasks
        </div>
        <div className="calendar-legend-item cal-type-goal">
          <span className="calendar-legend-dot" /> Goals
        </div>
        <div className="calendar-legend-item cal-type-event">
          <span className="calendar-legend-dot" /> Events
        </div>
        <div className="calendar-legend-item cal-type-reminder">
          <span className="calendar-legend-dot" /> Reminders
        </div>
      </div>

      {/* View */}
      {view === 'month' && renderMonth()}
      {view === 'week' && renderWeek()}
      {view === 'day' && renderDay()}

      {/* Modals */}
      {chooserDate && (
        <CalendarChooserModal
          isOpen
          onClose={() => { setChooserDate(null); setChooserHour(null); }}
          onSelect={handleChooserSelect}
        />
      )}

      {eventModalData && (
        <EventModal
          isOpen
          event={eventModalData.event}
          defaultStart={eventModalData.defaultStart}
          onClose={() => setEventModalData(null)}
          onSave={handleEventSave}
          onDelete={eventModalData.event ? () => handleEventDelete(eventModalData.event!.id) : undefined}
        />
      )}

      {reminderModalData && (
        <ReminderModal
          isOpen
          reminder={reminderModalData.reminder}
          defaultAt={reminderModalData.defaultAt}
          onClose={() => setReminderModalData(null)}
          onSave={handleReminderSave}
          onDelete={reminderModalData.reminder ? () => handleReminderDelete(reminderModalData.reminder!.id) : undefined}
        />
      )}

      {taskModalData && (
        <TaskReadOnlyModal
          isOpen
          task={taskModalData}
          onClose={() => setTaskModalData(null)}
        />
      )}

      {goalModalData && (
        <GoalReadOnlyModal
          isOpen
          goal={goalModalData}
          onClose={() => setGoalModalData(null)}
        />
      )}
    </div>
  );
}
