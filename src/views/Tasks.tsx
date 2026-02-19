import { useEffect, useMemo, useState, useCallback } from 'react';
import { useWorkspace } from '../context/WorkspaceContext';
import { getAllActivePlansIncludingInbox, getOrCreateInboxPlan, getStagesByPlan, updateTask, createTask, deleteTask, setTaskCompleted } from '../lib/database';
import type { Task, Plan, StageWithTasks, ChecklistItem, Stage } from '../types/database';
import { AnimatedCheckbox } from '../components/Checkbox';
import { TaskCreateModal, type TaskCreatePayload } from '../components/TaskCreateModal';
import { useCurrentUser } from '../context/UserContext';
import PenSquareIcon from '../assets/icons/pen-square.svg';
import TrashIcon from '../assets/icons/trash.svg';
import SearchIcon from '../assets/icons/search.svg';
import './Tasks.css';

type Grouping = 'due_date' | 'plan' | 'status' | 'priority';
type StatusFilter = 'all' | 'active' | 'completed';
type DueFilter = 'all' | 'today' | 'overdue' | 'upcoming';
type PriorityFilter = 'all' | 'urgent' | 'important' | 'medium' | 'low';

type TaskWithMeta = Task & {
  planId: string;
  planTitle: string;
  stageTitle: string;
};

type GroupBucket = {
  key: string;
  label: string;
  tasks: TaskWithMeta[];
};

const PRIORITY_ORDER: Record<string, number> = {
  urgent: 0,
  important: 1,
  medium: 2,
  low: 3,
};

const STORAGE_KEY = 'f-plan:tasks-filters';

const normalizeStatus = (task: TaskWithMeta): 'not_started' | 'in_progress' | 'completed' => {
  if (task.status) return task.status;
  return task.completed ? 'completed' : 'not_started';
};

const formatDate = (value?: string | null) => {
  if (!value) return 'No due date';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'No due date';
  return date.toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
  });
};

const startOfDay = (date: Date) => {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
};

const classifyDue = (value?: string | null): 'overdue' | 'today' | 'upcoming' | 'none' => {
  if (!value) return 'none';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'none';
  const today = startOfDay(new Date());
  const dueDay = startOfDay(date);
  if (dueDay.getTime() === today.getTime()) return 'today';
  if (dueDay.getTime() < today.getTime()) return 'overdue';
  return 'upcoming';
};

export function Tasks() {
  const { activeWorkspace } = useWorkspace();
  const { userId: currentUserId } = useCurrentUser();
  const [loading, setLoading] = useState(true);
  const [tasks, setTasks] = useState<TaskWithMeta[]>([]);
  const [plans, setPlans] = useState<Plan[]>([]);
  const [inboxPlanId, setInboxPlanId] = useState<string | null>(null);
  const [inboxStageId, setInboxStageId] = useState<string | null>(null);
  const [stagesByPlan, setStagesByPlan] = useState<Record<string, Stage[]>>({});
  const [stageOptions, setStageOptions] = useState<Array<{ id: string; title: string; planId: string }>>([]);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [searchOpen, setSearchOpen] = useState(false);
  const [grouping, setGrouping] = useState<Grouping>('due_date');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [dueFilter, setDueFilter] = useState<DueFilter>('all');
  const [priorityFilter, setPriorityFilter] = useState<PriorityFilter>('all');
  const [planFilter, setPlanFilter] = useState<'all' | string>('all');
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState('');
  const [editDescription, setEditDescription] = useState('');
  const [editDue, setEditDue] = useState('');
  const [editPriority, setEditPriority] = useState<'urgent' | 'important' | 'medium' | 'low'>('medium');
  const [editChecklist, setEditChecklist] = useState<ChecklistItem[]>([]);
  const [createPlanId, setCreatePlanId] = useState<string | null>(null);
  const [createStageId, setCreateStageId] = useState<string | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);

  // Load persisted filters for the session
  useEffect(() => {
    const saved = sessionStorage.getItem(STORAGE_KEY);
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (parsed.grouping) setGrouping(parsed.grouping);
        if (parsed.statusFilter) setStatusFilter(parsed.statusFilter);
        if (parsed.dueFilter) setDueFilter(parsed.dueFilter);
        if (parsed.priorityFilter) setPriorityFilter(parsed.priorityFilter);
        if (parsed.planFilter) setPlanFilter(parsed.planFilter);
        if (parsed.search) setSearch(parsed.search);
      } catch (e) {
        console.warn('Failed to parse tasks filters', e);
      }
    }
  }, []);

  // Persist filters per session
  useEffect(() => {
    sessionStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({ grouping, statusFilter, dueFilter, priorityFilter, planFilter, search })
    );
  }, [grouping, statusFilter, dueFilter, priorityFilter, planFilter, search]);

  useEffect(() => {
    const fetchTasks = async () => {
      if (!activeWorkspace) return;
      setLoading(true);
      setError(null);
      try {
        // Ensure inbox plan exists and get all plans including inbox
        const [inbox, activePlans] = await Promise.all([
          getOrCreateInboxPlan(activeWorkspace.id),
          getAllActivePlansIncludingInbox(activeWorkspace.id),
        ]);
        setInboxPlanId(inbox.plan.id);
        setInboxStageId(inbox.stageId);
        setPlans(activePlans);

        const stagesPerPlan: Array<{ plan: Plan; stages: StageWithTasks[] }> = await Promise.all(
          activePlans.map(async (plan) => ({ plan, stages: await getStagesByPlan(plan.id) }))
        );

        const collected: TaskWithMeta[] = stagesPerPlan.flatMap(({ plan, stages }) =>
          stages.flatMap((stage) => (stage.tasks || []).map((task) => ({
            ...task,
            planId: plan.id,
            planTitle: plan.is_inbox ? 'Standalone' : plan.title,
            stageTitle: plan.is_inbox ? '' : stage.title,
          })))
        );

        setTasks(collected);

        const stageList = stagesPerPlan.flatMap(({ plan, stages }) =>
          stages.map((stage) => ({ id: stage.id, title: stage.title, planId: plan.id }))
        );
        setStageOptions(stageList);

        const mappedStages: Record<string, Stage[]> = {};
        stagesPerPlan.forEach(({ plan, stages }) => {
          mappedStages[plan.id] = stages.map(({ tasks: _tasks, ...stage }) => stage as Stage);
        });
        setStagesByPlan(mappedStages);

        if (activePlans.length && !createPlanId) {
          setCreatePlanId(activePlans[0].id);
        }
        if (stageList.length && !createStageId) {
          setCreateStageId(stageList[0].id);
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load tasks');
      } finally {
        setLoading(false);
      }
    };

    fetchTasks();
  }, [activeWorkspace]);

  useEffect(() => {
    if (!createPlanId) {
      setCreateStageId(null);
      return;
    }
    const options = stageOptions.filter((s) => s.planId === createPlanId);
    if (!options.length) {
      setCreateStageId(null);
      return;
    }
    if (!createStageId || !options.some((s) => s.id === createStageId)) {
      setCreateStageId(options[0].id);
    }
  }, [createPlanId, createStageId, stageOptions]);

  const handleToggleComplete = async (taskId: string) => {
    const task = tasks.find((t) => t.id === taskId);
    if (!task) return;
    const nextCompleted = !task.completed;
    const nextStatus = nextCompleted ? 'completed' : 'not_started';
    setUpdatingId(taskId);
    try {
      // Persist checklist items as all-completed (or restore) to DB
      const updatedChecklists = (task.checklists || []).map((item) => ({
        ...item,
        completed: nextCompleted ? true : item.completed,
      }));
      await setTaskCompleted(taskId, nextCompleted);
      await updateTask(taskId, { status: nextStatus, checklists: updatedChecklists });
      setTasks((prev) =>
        prev.map((t) =>
          t.id === taskId
            ? {
                ...t,
                completed: nextCompleted,
                status: nextStatus,
                checklists: updatedChecklists,
              }
            : t
        )
      );
      if (expandedId === taskId) {
        setEditChecklist(updatedChecklists);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update task');
    } finally {
      setUpdatingId(null);
    }
  };

  const handleExpand = (task: TaskWithMeta) => {
    setExpandedId((prev) => (prev === task.id ? null : task.id));
    setEditTitle(task.title || '');
    setEditDescription(task.description || '');
    setEditDue(task.due_date || '');
    setEditPriority(task.priority || 'medium');
    setEditChecklist((task.checklists as ChecklistItem[]) || []);
  };

  const handleToggleChecklistItem = async (taskId: string, itemId: string) => {
    const task = tasks.find((t) => t.id === taskId);
    if (!task) return;
    const nextChecklist = (task.checklists || []).map((item) =>
      item.id === itemId ? { ...item, completed: !item.completed } : item
    );

    // Derive task status from checklist state (same as PlanDetail)
    const completedCount = nextChecklist.filter((item) => item.completed).length;
    const allChecked = nextChecklist.length > 0 && completedCount === nextChecklist.length;
    const someChecked = completedCount > 0 && !allChecked;
    const newStatus = allChecked ? 'completed' : someChecked ? 'in_progress' : 'not_started';
    const wasCompleted = !!task.completed;

    setTasks((prev) => prev.map((t) => (t.id === taskId ? { ...t, checklists: nextChecklist, status: newStatus, completed: allChecked } : t)));
    if (expandedId === taskId) setEditChecklist(nextChecklist);
    try {
      if (allChecked !== wasCompleted) {
        await setTaskCompleted(taskId, allChecked);
      }
      await updateTask(taskId, { checklists: nextChecklist, status: newStatus });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update checklist');
    }
  };

  const handleSaveExpanded = async (taskId: string) => {
    setUpdatingId(taskId);
    try {
      await updateTask(taskId, {
        title: editTitle,
        description: editDescription,
        due_date: editDue || null,
        priority: editPriority,
        checklists: editChecklist,
      });
      setTasks((prev) =>
        prev.map((t) =>
          t.id === taskId
            ? {
                ...t,
                title: editTitle,
                description: editDescription,
                due_date: editDue || null,
                priority: editPriority,
                checklists: editChecklist,
              }
            : t
        )
      );
      setExpandedId(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update task');
    } finally {
      setUpdatingId(null);
    }
  };

  const handleDeleteTask = async (taskId: string) => {
    setUpdatingId(taskId);
    try {
      await deleteTask(taskId);
      setTasks((prev) => prev.filter((t) => t.id !== taskId));
      if (expandedId === taskId) setExpandedId(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete task');
    } finally {
      setUpdatingId(null);
    }
  };

  const filteredTasks = useMemo(() => {
    const term = search.toLowerCase().trim();
    return tasks.filter((task) => {
      const status = normalizeStatus(task);
      if (statusFilter === 'active' && status === 'completed') return false;
      if (statusFilter === 'completed' && status !== 'completed') return false;

      const dueClass = classifyDue(task.due_date);
      if (dueFilter === 'today' && dueClass !== 'today') return false;
      if (dueFilter === 'overdue' && dueClass !== 'overdue') return false;
      if (dueFilter === 'upcoming' && dueClass !== 'upcoming') return false;

      if (priorityFilter !== 'all' && (task.priority || 'medium') !== priorityFilter) return false;
      if (planFilter !== 'all' && task.planId !== planFilter) return false;

      if (term) {
        const labelText = (task.labels || []).map((l) => l.name.toLowerCase()).join(' ');
        if (!task.title.toLowerCase().includes(term) && !labelText.includes(term)) return false;
      }

      return true;
    });
  }, [tasks, search, statusFilter, dueFilter, priorityFilter, planFilter]);

  const handleCreateSubmit = useCallback(
    async (payload: TaskCreatePayload) => {
      setError(null);
      try {
        const newTask = await createTask({
          stageId: payload.stageId,
          title: payload.title,
          status: payload.status,
          priority: payload.priority,
          startDate: payload.startDate,
          dueDate: payload.dueDate,
          repeat: payload.repeat,
          description: payload.description,
          checklists: payload.checklists,
          labels: payload.labels,
          assignedTo: payload.assignedTo || currentUserId || '',
        });

        const stageOption = stageOptions.find((s) => s.id === payload.stageId);
        const planId = stageOption?.planId || createPlanId || plans[0]?.id || '';
        const isInbox = planId === inboxPlanId;
        const stageTitle = isInbox ? '' : (stageOption?.title || stagesByPlan[planId]?.find((s) => s.id === payload.stageId)?.title || 'Stage');
        const planTitle = isInbox ? 'Standalone' : (plans.find((p) => p.id === planId)?.title || 'Plan');

        setTasks((prev) => [
          {
            ...newTask,
            planId,
            planTitle,
            stageTitle,
          },
          ...prev,
        ]);
        setShowCreateModal(false);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to create task');
      }
    },
    [createPlanId, plans, stageOptions, stagesByPlan, currentUserId]
  );

  const groupedTasks: GroupBucket[] = useMemo(() => {
    const buckets: GroupBucket[] = [];

    if (grouping === 'due_date') {
      const order: Array<{ key: 'overdue' | 'today' | 'upcoming' | 'none'; label: string }> = [
        { key: 'overdue', label: 'Overdue' },
        { key: 'today', label: 'Today' },
        { key: 'upcoming', label: 'Upcoming' },
        { key: 'none', label: 'No due date' },
      ];
      order.forEach(({ key, label }) => {
        const tasksForBucket = filteredTasks
          .filter((task) => classifyDue(task.due_date) === key)
          .sort((a, b) => {
            const aDate = a.due_date ? new Date(a.due_date).getTime() : Number.POSITIVE_INFINITY;
            const bDate = b.due_date ? new Date(b.due_date).getTime() : Number.POSITIVE_INFINITY;
            if (aDate === bDate) return (PRIORITY_ORDER[a.priority || 'medium'] ?? 2) - (PRIORITY_ORDER[b.priority || 'medium'] ?? 2);
            return aDate - bDate;
          });
        if (tasksForBucket.length) buckets.push({ key, label, tasks: tasksForBucket });
      });
    }

    if (grouping === 'plan') {
      const byPlan = filteredTasks.reduce<Record<string, TaskWithMeta[]>>((acc, task) => {
        acc[task.planId] = acc[task.planId] || [];
        acc[task.planId].push(task);
        return acc;
      }, {});
      Object.entries(byPlan).forEach(([planId, list]) => {
        buckets.push({ key: planId, label: list[0]?.planTitle || 'Plan', tasks: list });
      });
      buckets.sort((a, b) => a.label.localeCompare(b.label));
    }

    if (grouping === 'status') {
      const order: Array<{ key: 'not_started' | 'in_progress' | 'completed'; label: string }> = [
        { key: 'not_started', label: 'Not started' },
        { key: 'in_progress', label: 'In progress' },
        { key: 'completed', label: 'Completed' },
      ];
      order.forEach(({ key, label }) => {
        const tasksForBucket = filteredTasks.filter((task) => normalizeStatus(task) === key);
        if (tasksForBucket.length) buckets.push({ key, label, tasks: tasksForBucket });
      });
    }

    if (grouping === 'priority') {
      const order: Array<{ key: PriorityFilter; label: string }> = [
        { key: 'urgent', label: 'Urgent' },
        { key: 'important', label: 'Important' },
        { key: 'medium', label: 'Medium' },
        { key: 'low', label: 'Low' },
      ];
      order.forEach(({ key, label }) => {
        const tasksForBucket = filteredTasks.filter((task) => (task.priority || 'medium') === key);
        if (tasksForBucket.length) buckets.push({ key, label, tasks: tasksForBucket });
      });
    }

    return buckets;
  }, [filteredTasks, grouping]);

  const hasAnyTasks = tasks.length > 0;
  const hasFilteredTasks = filteredTasks.length > 0;

  return (
    <div className="tasks-view">
      <div className="tasks-header-row">
        <div className="tasks-header-top">
          <div className={`search-wrapper ${searchOpen ? 'open' : ''}`}>
            <button
              className="search-icon-btn"
              onClick={() => setSearchOpen(!searchOpen)}
              title="Search tasks"
            >
              <img src={SearchIcon} alt="Search" className="search-icon-img" />
            </button>
            <input
              type="text"
              placeholder="Search tasks or labels"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className={`search-input ${searchOpen ? 'open' : ''}`}
              onBlur={() => {
                if (!search) {
                  setSearchOpen(false);
                }
              }}
            />
          </div>
          <div className="tasks-controls">
            <div className="control-group">
              <label className="control-label">Group by</label>
              <select
                className="filter-select"
                value={grouping}
                onChange={(e) => setGrouping(e.target.value as Grouping)}
              >
                <option value="due_date">Due date</option>
                <option value="plan">Plan</option>
                <option value="status">Status</option>
                <option value="priority">Priority</option>
              </select>
            </div>
            <div className="control-group">
              <label className="control-label">Status</label>
              <select
                className="filter-select"
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value as StatusFilter)}
              >
                <option value="all">All</option>
                <option value="active">Active</option>
                <option value="completed">Completed</option>
              </select>
            </div>
            <div className="control-group">
              <label className="control-label">Due</label>
              <select
                className="filter-select"
                value={dueFilter}
                onChange={(e) => setDueFilter(e.target.value as DueFilter)}
              >
                <option value="all">All</option>
                <option value="today">Today</option>
                <option value="overdue">Overdue</option>
                <option value="upcoming">Upcoming</option>
              </select>
            </div>
            <div className="control-group">
              <label className="control-label">Priority</label>
              <select
                className="filter-select"
                value={priorityFilter}
                onChange={(e) => setPriorityFilter(e.target.value as PriorityFilter)}
              >
                <option value="all">All</option>
                <option value="urgent">Urgent</option>
                <option value="important">Important</option>
                <option value="medium">Medium</option>
                <option value="low">Low</option>
              </select>
            </div>
            <div className="control-group">
              <label className="control-label">Plan</label>
              <select
                className="filter-select"
                value={planFilter}
                onChange={(e) => setPlanFilter(e.target.value as 'all' | string)}
              >
                <option value="all">All</option>
                {plans.filter((p) => !p.is_inbox).map((plan) => (
                  <option key={plan.id} value={plan.id}>
                    {plan.title}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <button
            type="button"
            className="btn-primary add-task-button"
            onClick={() => {
              // Default to inbox (standalone) unless a plan filter is active
              if (planFilter !== 'all') {
                setCreatePlanId(planFilter);
                const firstStage = (stagesByPlan[planFilter] || [])[0];
                if (firstStage) setCreateStageId(firstStage.id);
              } else if (inboxPlanId && inboxStageId) {
                setCreatePlanId(inboxPlanId);
                setCreateStageId(inboxStageId);
              }
              setShowCreateModal(true);
            }}
          >
            <span>+ Add Task</span>
          </button>
        </div>
      </div>

      {error && <div className="form-error tasks-error">{error}</div>}

      <TaskCreateModal
        isOpen={showCreateModal}
        planId={createPlanId || inboxPlanId || plans[0]?.id || ''}
        stages={(createPlanId && stagesByPlan[createPlanId]) || []}
        defaultStageId={createStageId || (createPlanId ? stagesByPlan[createPlanId]?.[0]?.id : undefined)}
        hideStageSelector={createPlanId === inboxPlanId}
        currentUserId={currentUserId}
        onClose={() => setShowCreateModal(false)}
        onSubmit={handleCreateSubmit}
      />

      {loading ? (
        <div className="tasks-skeleton">
          {[1, 2, 3, 4].map((idx) => (
            <div key={idx} className="task-card skeleton">
              <div className="skeleton-checkbox" />
              <div className="skeleton-lines">
                <div className="skeleton-line short" />
                <div className="skeleton-line" />
              </div>
            </div>
          ))}
        </div>
      ) : !hasAnyTasks ? (
        <div className="tasks-empty">
          <p className="empty-title">No tasks yet</p>
          <p className="empty-subtitle">Click "+ Add Task" to create a standalone task, or go to Plans to create tasks within a plan.</p>
        </div>
      ) : !hasFilteredTasks ? (
        <div className="tasks-empty">
          <p className="empty-title">No tasks match your filters</p>
        </div>
      ) : (
        <div className="tasks-groups">
          {groupedTasks.map((group) => (
            <div key={group.key} className="tasks-group">
              <div className="group-header">
                <div className="group-title">{group.label}</div>
                <div className="group-count">{group.tasks.length}</div>
              </div>
              <div className="group-list">
                {group.tasks.map((task) => {
                  const status = normalizeStatus(task);
                  const checklist = task.checklists || [];
                  const completedCount = checklist.filter((item) => item.completed).length;
                  const hasChecklist = checklist.length > 0;
                  const hasLabels = (task.labels || []).length > 0;
                  const isExpanded = expandedId === task.id;
                  return (
                    <div
                      key={task.id}
                      className={`task-card ${status} ${isExpanded ? 'expanded' : ''}`}
                      role="button"
                      tabIndex={0}
                      onClick={() => handleExpand(task)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' || e.key === ' ') {
                          e.preventDefault();
                          handleExpand(task);
                        }
                      }}
                    >
                      <div className="task-card-top">
                        <div className="task-card-left">
                          <AnimatedCheckbox
                            id={`task-${task.id}`}
                            checked={status === 'completed'}
                            onToggle={() => handleToggleComplete(task.id)}
                            disabled={updatingId === task.id}
                          />
                        </div>
                        <div className="task-card-main">
                          <div className="task-card-title" title={task.title}>{task.title}</div>
                          <div className="task-card-context">
                            {task.planId === inboxPlanId
                              ? 'Standalone'
                              : `${task.planTitle} · ${task.stageTitle}`}
                          </div>
                          <div className="task-card-meta">
                            <span className={`meta-item due ${classifyDue(task.due_date)}`}>{formatDate(task.due_date)}</span>
                            <span className={`meta-item priority ${task.priority || 'medium'}`}>
                              {task.priority ? task.priority.charAt(0).toUpperCase() + task.priority.slice(1) : 'Medium'}
                            </span>
                            {hasChecklist && (
                              <span className="meta-item checklist">{completedCount}/{checklist.length}</span>
                            )}
                          </div>
                          {hasLabels ? (
                            <div className="task-card-tertiary">
                              {(task.labels || []).map((label) => (
                                <span key={label.id} className="pill label" style={{ backgroundColor: label.color }}>
                                  {label.name}
                                </span>
                              ))}
                            </div>
                          ) : hasChecklist ? (
                            <div className="task-card-tertiary">
                              <span className="task-row-progress">Checklist {completedCount}/{checklist.length}</span>
                            </div>
                          ) : null}
                        </div>
                        <div className="task-card-right">
                          <div className="task-card-meta-right">
                            <span className={`task-row-due ${classifyDue(task.due_date)}`}>{formatDate(task.due_date)}</span>
                            <span className={`task-row-priority ${task.priority || 'medium'}`}>
                              {task.priority ? task.priority.charAt(0).toUpperCase() + task.priority.slice(1) : 'Medium'}
                            </span>
                          </div>
                          <div className="task-row-actions">
                            <button
                              type="button"
                              className="task-row-action"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleExpand(task);
                              }}
                              aria-label="Expand task"
                            >
                              <img src={PenSquareIcon} alt="" />
                            </button>
                            <button
                              type="button"
                              className="task-row-action danger"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleDeleteTask(task.id);
                              }}
                              aria-label="Delete task"
                            >
                              <img src={TrashIcon} alt="" />
                            </button>
                          </div>
                        </div>
                      </div>

                      {isExpanded && (
                        <div className="task-card-expanded" onClick={(e) => e.stopPropagation()}>
                          <div className="expanded-grid">
                            <div className="form-group inline">
                              <label className="form-label">Title</label>
                              <input
                                className="form-input"
                                value={editTitle}
                                onChange={(e) => setEditTitle(e.target.value)}
                              />
                            </div>
                            <div className="form-group inline">
                              <label className="form-label">Due date</label>
                              <input
                                className="form-input date-input"
                                type="date"
                                value={editDue || ''}
                                onChange={(e) => setEditDue(e.target.value)}
                              />
                            </div>
                            <div className="form-group inline">
                              <label className="form-label">Priority</label>
                              <select
                                className="filter-select"
                                value={editPriority}
                                onChange={(e) => setEditPriority(e.target.value as PriorityFilter as any)}
                              >
                                <option value="urgent">Urgent</option>
                                <option value="important">Important</option>
                                <option value="medium">Medium</option>
                                <option value="low">Low</option>
                              </select>
                            </div>
                          </div>

                          <div className="form-group">
                            <label className="form-label">Description</label>
                            <textarea
                              className="form-textarea"
                              rows={3}
                              value={editDescription}
                              onChange={(e) => setEditDescription(e.target.value)}
                              placeholder="Add description"
                            />
                          </div>

                          {editChecklist && editChecklist.length > 0 && (
                            <div className="form-group">
                              <label className="form-label">Checklist</label>
                              <div className="task-expanded-checklist">
                                {editChecklist.map((item) => (
                                  <button
                                    key={item.id}
                                    type="button"
                                    className={`task-checklist-item ${item.completed ? 'checked' : ''}`}
                                    onClick={() => handleToggleChecklistItem(task.id, item.id)}
                                  >
                                    <AnimatedCheckbox
                                      id={`expanded-${task.id}-${item.id}`}
                                      checked={!!item.completed}
                                      onToggle={() => handleToggleChecklistItem(task.id, item.id)}
                                    />
                                    <span className="checklist-text">{item.text}</span>
                                  </button>
                                ))}
                              </div>
                            </div>
                          )}

                          <div className="task-card-actions">
                            <button type="button" className="btn-secondary" onClick={() => setExpandedId(null)}>
                              <span>Close</span>
                            </button>
                            <div className="task-card-actions-right">
                              <button
                                type="button"
                                className="btn-secondary"
                                onClick={() => handleDeleteTask(task.id)}
                                disabled={updatingId === task.id}
                              >
                                <span>Delete</span>
                              </button>
                              <button
                                type="button"
                                className="btn-primary"
                                disabled={updatingId === task.id}
                                onClick={() => handleSaveExpanded(task.id)}
                              >
                                <span>Save changes</span>
                              </button>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
