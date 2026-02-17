import { useCallback, useEffect, useState, useMemo, useRef } from 'react';
import type { Plan, StageWithTasks, Task } from '../types/database';
import { getStagesByPlan, deletePlan, renamePlan, archivePlan, togglePlanPin, updatePlan, createStage, createTask, updateTask, deleteTask, setTaskCompleted, getLinkedGoalIdsForPlan, getGoalsByWorkspace } from '../lib/database';
import { PageHeaderCard } from '../components/PageHeaderCard';
import { PlanHeaderMenu } from '../components/PlanHeaderMenu';
import { TaskCreateModal } from '../components/TaskCreateModal';
import { useCurrentUser } from '../context/UserContext';
import type { TaskCreatePayload } from '../components/TaskCreateModal';
import { TaskStatusIndicator } from '../components/TaskStatusIndicator';
import { LinkGoalFromPlanModal } from '../components/LinkGoalFromPlanModal';
import { AddStageModal } from '../components/AddStageModal';
import { RenamePlanModal } from '../components/RenamePlanModal';
import Checkbox from '../components/Checkbox';
import ListViewIcon from '../assets/icons/list-view.svg';
import BoardsViewIcon from '../assets/icons/boards.svg';
import GridViewIcon from '../assets/icons/grid.svg';
import SearchIcon from '../assets/icons/search.svg';
import ChevronDownIcon from '../assets/icons/angle-small-down.svg';
import './PlanDetail.css';

type GroupingType = 'stages' | 'progress' | 'due_date' | 'priority';

interface TaskGroup {
  id: string;
  title: string;
  tasks: Task[];
  color?: string;
}

interface PlanDetailProps {
  planId: string;
  plan: Plan;
  onPlanUpdated?: () => void;
  onPlanDeleted?: () => void;
}

export function PlanDetail({ planId, plan, onPlanUpdated, onPlanDeleted }: PlanDetailProps) {
  const { userId: currentUserId } = useCurrentUser();
  const [stages, setStages] = useState<StageWithTasks[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState<'list' | 'boards' | 'grid'>('boards');
  const [groupingMode, setGroupingMode] = useState<GroupingType>('stages');
  const [isGroupingOpen, setIsGroupingOpen] = useState(false);
  const [currentPlan, setCurrentPlan] = useState<Plan>(plan);
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [isTaskModalOpen, setIsTaskModalOpen] = useState(false);
  const [selectedStageId, setSelectedStageId] = useState<string | undefined>(undefined);
  const [editingTask, setEditingTask] = useState<Task | undefined>(undefined);
  const [linkGoalOpen, setLinkGoalOpen] = useState(false);
  const [addStageOpen, setAddStageOpen] = useState(false);
  const [linkedGoalNames, setLinkedGoalNames] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [renameModalOpen, setRenameModalOpen] = useState(false);

  const resolveTaskStatus = (task: { status?: 'not_started' | 'in_progress' | 'completed'; completed?: boolean }) => {
    if (task.status) return task.status;
    return task.completed ? 'completed' : 'not_started';
  };

  // Load grouping preference from localStorage
  useEffect(() => {
    const savedGrouping = localStorage.getItem(`plan-${planId}-grouping`) as GroupingType | null;
    if (savedGrouping) {
      setGroupingMode(savedGrouping);
    }
  }, [planId]);

  // Save grouping preference to localStorage
  useEffect(() => {
    localStorage.setItem(`plan-${planId}-grouping`, groupingMode);
  }, [planId, groupingMode]);

  // Handle click outside for grouping dropdown
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      if (!target.closest('.grouping-selector')) {
        setIsGroupingOpen(false);
      }
    };

    if (isGroupingOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [isGroupingOpen]);

  // Group tasks based on selected grouping mode
  const groupedStages = useMemo(() => {
    const allTasks = stages.flatMap(stage => 
      (stage.tasks || []).map(task => ({ ...task, stage_name: stage.title, stage_id: stage.id }))
    );

    if (groupingMode === 'stages') {
      return stages;
    }

    if (groupingMode === 'progress') {
      const groups: TaskGroup[] = [
        { id: 'not_started', title: 'Not Started', tasks: [], color: '#808080' },
        { id: 'in_progress', title: 'In Progress', tasks: [], color: '#ffd95e' },
        { id: 'completed', title: 'Completed', tasks: [], color: '#ffd95e' },
      ];

      allTasks.forEach(task => {
        const status = resolveTaskStatus(task);
        const group = groups.find(g => g.id === status);
        if (group) group.tasks.push(task);
      });

      return groups.map(group => ({
        id: group.id,
        title: group.title,
        position: 0,
        plan_id: planId,
        created_at: '',
        tasks: group.tasks,
      }));
    }

    if (groupingMode === 'priority') {
      const groups: TaskGroup[] = [
        { id: 'urgent', title: 'Urgent', tasks: [], color: '#FF4757' },
        { id: 'important', title: 'Important', tasks: [], color: '#FF4757' },
        { id: 'medium', title: 'Medium', tasks: [], color: '#2ED573' },
        { id: 'low', title: 'Low', tasks: [], color: '#5BC0DE' },
      ];

      allTasks.forEach(task => {
        const priority = task.priority || 'medium';
        const group = groups.find(g => g.id === priority);
        if (group) group.tasks.push(task);
      });

      return groups.map(group => ({
        id: group.id,
        title: group.title,
        position: 0,
        plan_id: planId,
        created_at: '',
        tasks: group.tasks,
      }));
    }

    if (groupingMode === 'due_date') {
      const now = new Date();
      const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      const tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 1);
      const weekEnd = new Date(today);
      weekEnd.setDate(weekEnd.getDate() + 7);
      const monthEnd = new Date(today);
      monthEnd.setMonth(monthEnd.getMonth() + 1);

      const groups: TaskGroup[] = [
        { id: 'overdue', title: 'Overdue', tasks: [] },
        { id: 'today', title: 'Today', tasks: [] },
        { id: 'this_week', title: 'This Week', tasks: [] },
        { id: 'next_week', title: 'Next Week', tasks: [] },
        { id: 'this_month', title: 'This Month', tasks: [] },
        { id: 'later', title: 'Later', tasks: [] },
        { id: 'no_due_date', title: 'No Due Date', tasks: [] },
      ];

      allTasks.forEach(task => {
        if (!task.due_date) {
          groups.find(g => g.id === 'no_due_date')?.tasks.push(task);
          return;
        }

        const dueDate = new Date(task.due_date);
        if (dueDate < today) {
          groups.find(g => g.id === 'overdue')?.tasks.push(task);
        } else if (dueDate.getTime() === today.getTime()) {
          groups.find(g => g.id === 'today')?.tasks.push(task);
        } else if (dueDate <= weekEnd) {
          groups.find(g => g.id === 'this_week')?.tasks.push(task);
        } else if (dueDate <= new Date(weekEnd.getTime() + 7 * 24 * 60 * 60 * 1000)) {
          groups.find(g => g.id === 'next_week')?.tasks.push(task);
        } else if (dueDate <= monthEnd) {
          groups.find(g => g.id === 'this_month')?.tasks.push(task);
        } else {
          groups.find(g => g.id === 'later')?.tasks.push(task);
        }
      });

      return groups.map(group => ({
        id: group.id,
        title: group.title,
        position: 0,
        plan_id: planId,
        created_at: '',
        tasks: group.tasks,
      }));
    }

    return stages;
  }, [stages, groupingMode, planId]);

  const handleRenamePlan = (_planId: string) => {
    setRenameModalOpen(true);
  };

  const handleRenameSubmit = async (newTitle: string) => {
    await renamePlan(planId, newTitle);
    setCurrentPlan({ ...currentPlan, title: newTitle });
    if (onPlanUpdated) onPlanUpdated();
  };

  const handleTogglePin = async (planId: string, isPinned: boolean) => {
    try {
      await togglePlanPin(planId, isPinned);
      setCurrentPlan({ ...currentPlan, is_pinned: isPinned });
      if (onPlanUpdated) onPlanUpdated();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to toggle pin');
    }
  };

  const handleHidePlan = (planId: string, status: Plan['status']) => {
    if (status === 'archived') {
      if (window.confirm('Unhide this plan?')) {
        updatePlan(planId, { status: 'active' })
          .then(() => {
            setCurrentPlan({ ...currentPlan, status: 'active' });
            if (onPlanUpdated) onPlanUpdated();
          })
          .catch((err) => setError(err instanceof Error ? err.message : 'Failed to unhide plan'));
      }
      return;
    }
    if (window.confirm('Hide this plan?')) {
      archivePlan(planId)
        .then(() => {
          setCurrentPlan({ ...currentPlan, status: 'archived' });
          if (onPlanUpdated) onPlanUpdated();
        })
        .catch((err) => setError(err instanceof Error ? err.message : 'Failed to hide plan'));
    }
  };

  const handleDeletePlan = (planId: string) => {
    if (!window.confirm('Are you sure you want to delete this plan? This action cannot be undone.')) return;
    deletePlan(planId)
      .then(() => {
        if (onPlanDeleted) onPlanDeleted();
      })
      .catch((err) => setError(err instanceof Error ? err.message : 'Failed to delete plan'));
  };

  const fetchStages = useCallback(async () => {
    try {
      setLoading(true);
      const fetchedStages = await getStagesByPlan(planId);
      setStages(fetchedStages);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load stages');
    } finally {
      setLoading(false);
    }
  }, [planId]);

  const fetchLinkedGoals = useCallback(async () => {
    try {
      const goalIds = await getLinkedGoalIdsForPlan(planId);
      if (goalIds.length === 0) {
        setLinkedGoalNames([]);
        return;
      }
      const allGoals = await getGoalsByWorkspace(currentPlan.workspace_id);
      const names = allGoals
        .filter((g) => goalIds.includes(g.id))
        .map((g) => g.title);
      setLinkedGoalNames(names);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load linked goals');
    }
  }, [planId, currentPlan.workspace_id]);

  const handleAddStage = () => {
    setAddStageOpen(true);
  };

  const handleAddStageSubmit = async (stageName: string) => {
    try {
      await createStage(planId, stageName);
      await fetchStages();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create stage');
    }
  };

  const handleOpenTaskModal = (stageId?: string) => {
    setEditingTask(undefined);
    setSelectedStageId(stageId);
    setIsTaskModalOpen(true);
  };

  const handleEditTask = (task: Task) => {
    setEditingTask(task);
    setSelectedStageId(task.stage_id);
    setIsTaskModalOpen(true);
  };

  const handleSaveTask = async (payload: TaskCreatePayload, existingTaskId?: string) => {
    try {
      if (existingTaskId) {
        await updateTask(existingTaskId, {
          stage_id: payload.stageId,
          title: payload.title,
          status: payload.status,
          priority: payload.priority,
          start_date: payload.startDate || null,
          due_date: payload.dueDate || null,
          repeat: payload.repeat,
          description: payload.description || null,
          checklists: payload.checklists,
          labels: payload.labels,
          completed: payload.status === 'completed',
          assigned_to: payload.assignedTo || undefined,
        });
      } else {
        await createTask({
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
      }
      setEditingTask(undefined);
      await fetchStages();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save task');
    }
  };

  const handleDeleteTask = async (taskId: string) => {
    if (!window.confirm('Delete this task?')) return;
    try {
      await deleteTask(taskId);
      await fetchStages();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete task');
    }
  };

  const handleCompleteTask = async (task: Task) => {
    try {
      const normalized = Array.isArray(task.checklists)
        ? task.checklists.map((item, index) => ({
            id: item.id || `${index}-${Date.now()}`,
            text: item.text,
            completed: !!item.completed,
          }))
        : [];

      const updatedChecklists = normalized.map((item) => ({ ...item, completed: true }));

      await setTaskCompleted(task.id, true);
      await updateTask(task.id, {
        status: 'completed',
        checklists: updatedChecklists,
      });
      await fetchStages();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to complete task');
    }
  };

  const handleToggleChecklistItem = async (task: Task, itemId: string) => {
    if (!task.checklists) return;
    try {
      const normalized = task.checklists.map((item, index) => ({
        id: item.id || `${index}-${Date.now()}`,
        text: item.text,
        completed: !!item.completed,
      }));

      const nextChecklists = normalized.map((item) =>
        item.id === itemId ? { ...item, completed: !item.completed } : item
      );

      const completedCount = nextChecklists.filter((item) => item.completed).length;
      const allChecked = nextChecklists.length > 0 && completedCount === nextChecklists.length;
      const someChecked = completedCount > 0 && !allChecked;
      const newStatus = allChecked ? 'completed' : someChecked ? 'in_progress' : 'not_started';
      const wasCompleted = !!task.completed;

      if (allChecked !== wasCompleted) {
        await setTaskCompleted(task.id, allChecked);
      }
      await updateTask(task.id, {
        checklists: nextChecklists,
        status: newStatus,
      });

      await fetchStages();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update checklist');
    }
  };

  const handleToggleTaskCheckbox = async (task: Task, nextChecked: boolean) => {
    try {
      const normalized = Array.isArray(task.checklists)
        ? task.checklists.map((item, index) => ({
            id: item.id || `${index}-${Date.now()}`,
            text: item.text,
            completed: !!item.completed,
          }))
        : [];

      const updatedChecklists = normalized.map((item) => ({ ...item, completed: nextChecked }));

      await setTaskCompleted(task.id, nextChecked);
      await updateTask(task.id, {
        status: nextChecked ? 'completed' : 'not_started',
        checklists: updatedChecklists,
      });

      await fetchStages();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update task');
    }
  };

  const formatDate = (value?: string | null) => {
    if (!value) return '';
    const date = new Date(value);
    return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
  };

  const headerContent = (
    <>
      <PageHeaderCard 
        title="Plan overview" 
        subtitle={currentPlan.title}
        subtitleMenu={
          <PlanHeaderMenu
            plan={currentPlan}
            onRename={handleRenamePlan}
            onTogglePin={handleTogglePin}
            onHide={handleHidePlan}
            onDelete={handleDeletePlan}
          />
        }
      />
      <div className="plan-detail-subheader">
        <div className="plan-detail-controls">
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
              placeholder="Search tasks..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className={`search-input ${searchOpen ? 'open' : ''}`}
              onBlur={() => {
                if (!searchTerm) {
                  setSearchOpen(false);
                }
              }}
            />
          </div>

          <div className="view-switcher" role="group" aria-label="Plan view">
          <button
            type="button"
            className={`view-switcher-btn ${viewMode === 'list' ? 'active' : ''}`}
            aria-pressed={viewMode === 'list'}
            onClick={() => setViewMode('list')}
          >
            <img src={ListViewIcon} alt="" className="view-switcher-icon" />
            List
          </button>
          <button
            type="button"
            className={`view-switcher-btn ${viewMode === 'boards' ? 'active' : ''}`}
            aria-pressed={viewMode === 'boards'}
            onClick={() => setViewMode('boards')}
          >
            <img src={BoardsViewIcon} alt="" className="view-switcher-icon" />
            Boards
          </button>
          <button
            type="button"
            className={`view-switcher-btn ${viewMode === 'grid' ? 'active' : ''}`}
            aria-pressed={viewMode === 'grid'}
            onClick={() => setViewMode('grid')}
          >
            <img src={GridViewIcon} alt="" className="view-switcher-icon" />
            Grid
          </button>
        </div>
          <button className="link-goal-btn" onClick={() => setLinkGoalOpen(true)}>Link Goal</button>
          {groupingMode === 'stages' && (
            <button className="add-stage-btn" onClick={handleAddStage}>+ Add Stage</button>
          )}
          {linkedGoalNames.length > 0 && (
            <div className="plan-linked-goals">
              <span className="plan-linked-goals-label">Linked to:</span>
              {linkedGoalNames.map((name) => (
                <span key={name} className="plan-linked-goal-pill">{name}</span>
              ))}
            </div>
          )}
        </div>

        <div className="grouping-selector">
          <button
            type="button"
            className="grouping-selector-trigger"
            onClick={() => setIsGroupingOpen(!isGroupingOpen)}
          >
            <span>
              Group by: {groupingMode === 'stages' ? 'Stages' 
                : groupingMode === 'progress' ? 'Progress' 
                : groupingMode === 'due_date' ? 'Due Date' 
                : 'Priority'}
            </span>
            <img src={ChevronDownIcon} alt="" className="grouping-selector-icon" />
          </button>
          {isGroupingOpen && (
            <div className="grouping-selector-menu">
              <button
                type="button"
                className={`grouping-selector-option ${groupingMode === 'stages' ? 'active' : ''}`}
                onClick={() => {
                  setGroupingMode('stages');
                  setIsGroupingOpen(false);
                }}
              >
                Stages
              </button>
              <button
                type="button"
                className={`grouping-selector-option ${groupingMode === 'progress' ? 'active' : ''}`}
                onClick={() => {
                  setGroupingMode('progress');
                  setIsGroupingOpen(false);
                }}
              >
                Progress
              </button>
              <button
                type="button"
                className={`grouping-selector-option ${groupingMode === 'due_date' ? 'active' : ''}`}
                onClick={() => {
                  setGroupingMode('due_date');
                  setIsGroupingOpen(false);
                }}
              >
                Due Date
              </button>
              <button
                type="button"
                className={`grouping-selector-option ${groupingMode === 'priority' ? 'active' : ''}`}
                onClick={() => {
                  setGroupingMode('priority');
                  setIsGroupingOpen(false);
                }}
              >
                Priority
              </button>
            </div>
          )}
        </div>
      </div>
    </>
  );

  useEffect(() => {
    fetchStages();
  }, [fetchStages]);

  useEffect(() => {
    fetchLinkedGoals();
  }, [fetchLinkedGoals]);

  if (loading) {
    return (
      <div className="plan-detail-wrapper">
        {headerContent}
        {error && (
          <div className="plan-detail-error glass" role="alert">
            <span>{error}</span>
            <button className="plan-detail-error-dismiss" onClick={() => setError(null)}>✕</button>
          </div>
        )}
        <div className="plan-detail-loading">Loading stages...</div>
      </div>
    );
  }

  if (stages.length === 0) {
    return (
      <div className="plan-detail-wrapper">
        {headerContent}
        {error && (
          <div className="plan-detail-error glass" role="alert">
            <span>{error}</span>
            <button className="plan-detail-error-dismiss" onClick={() => setError(null)}>✕</button>
          </div>
        )}
        <div className="plan-detail-empty">
          <p>No stages yet. Create your first stage to get started.</p>
        </div>
      </div>
    );
  }

  const stagePreviewLimit = Number.POSITIVE_INFINITY;

  // Filter stages and tasks based on search term
  const filteredStages = searchTerm.trim() === '' 
    ? groupedStages 
    : groupedStages.map(stage => ({
        ...stage,
        tasks: stage.tasks?.filter(task => 
          task.title.toLowerCase().includes(searchTerm.toLowerCase())
        ) || []
      })).filter(stage => stage.tasks.length > 0);

  const AnimatedCheckbox = ({ id, checked, onToggle }: { id: string; checked: boolean; onToggle: () => void }) => {
    const ref = useRef<HTMLDivElement>(null);

    useEffect(() => {
      const input = ref.current?.querySelector('input');
      const label = ref.current?.querySelector('label');
      if (input) {
        input.id = id;
        (input as HTMLInputElement).checked = checked;
      }
      if (label) {
        (label as HTMLLabelElement).htmlFor = id;
      }
    }, [id, checked]);

    return (
      <div
        ref={ref}
        className="task-checkbox-wrap"
        role="checkbox"
        tabIndex={0}
        aria-checked={checked}
        onClick={(e) => {
          e.stopPropagation();
          onToggle();
        }}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            e.stopPropagation();
            onToggle();
          }
        }}
      >
        <Checkbox />
      </div>
    );
  };

  const renderTaskCard = (task: Task) => {
    const status = resolveTaskStatus(task);
    const checklists = Array.isArray(task.checklists)
      ? task.checklists.map((item, index) => ({
          id: item.id || `${task.id}-${index}`,
          text: item.text,
          completed: !!item.completed,
        }))
      : [];
    const completedCount = checklists.filter((item) => item.completed).length;
    const checklistProgress = checklists.length ? `${completedCount}/${checklists.length}` : null;
    const priorityLabel = task.priority
      ? task.priority === 'urgent'
        ? 'Urgent'
        : task.priority === 'important'
          ? 'Important'
          : task.priority === 'low'
            ? 'Low'
            : 'Medium'
      : 'Medium';
    const labels = Array.isArray(task.labels) ? task.labels : [];

    const taskChecked = status === 'completed';

    return (
      <div
        key={task.id}
        className={`task-card ${status}`}
        role="button"
        tabIndex={0}
        onClick={() => handleEditTask(task)}
        onKeyDown={(e) => {
          if (e.key === 'Enter') handleEditTask(task);
        }}
      >
        <div className="task-top-row">
          <AnimatedCheckbox
            id={`task-${task.id}`}
            checked={taskChecked}
            onToggle={() => handleToggleTaskCheckbox(task, !taskChecked)}
          />
          <div className="task-card-title-block">
            <p className="task-title" title={task.title}>{task.title}</p>
          </div>
          <div className="task-priority-wrap">
            <TaskStatusIndicator status={status} />
            <span className={`task-priority ${task.priority || 'medium'}`}>{priorityLabel}</span>
          </div>
        </div>

        {checklists.length > 0 && (
          <div className="task-checklist stacked">
            {checklists.map((item) => (
              <button
                key={item.id}
                type="button"
                className={`task-checklist-item ${item.completed ? 'checked' : ''}`}
                onClick={(e) => {
                  e.stopPropagation();
                  handleToggleChecklistItem(task, item.id);
                }}
              >
                <AnimatedCheckbox
                  id={`item-${task.id}-${item.id}`}
                  checked={item.completed}
                  onToggle={() => handleToggleChecklistItem(task, item.id)}
                />
                <span className="checklist-text">{item.text}</span>
              </button>
            ))}
          </div>
        )}

        <div className="task-meta-row">
          <div className="task-meta-left">
            {task.due_date && (
              <span className="task-meta-chip due">Due {formatDate(task.due_date)}</span>
            )}
            {checklistProgress && (
              <span className="task-meta-chip checklist">{checklistProgress}</span>
            )}
          </div>
          <div className="task-meta-tags">
            {labels.map((label) => (
              <span key={label.id} className="task-label" style={{ backgroundColor: label.color }}>
                {label.name}
              </span>
            ))}
          </div>
        </div>

        <div className="task-actions-bar" onClick={(e) => e.stopPropagation()}>
          <button
            type="button"
            className="task-action"
            onClick={(e) => {
              e.stopPropagation();
              handleCompleteTask(task);
            }}
            disabled={status === 'completed'}
          >
            {status === 'completed' ? 'Done' : 'Complete'}
          </button>
          <button type="button" className="task-action" onClick={() => handleEditTask(task)}>Edit</button>
          <button
            type="button"
            className="task-action danger"
            onClick={(e) => {
              e.stopPropagation();
              handleDeleteTask(task.id);
            }}
          >
            Delete
          </button>
        </div>
      </div>
    );
  };

  return (
    <div className="plan-detail-wrapper">
      {headerContent}

      {error && (
        <div className="plan-detail-error glass" role="alert">
          <span>{error}</span>
          <button className="plan-detail-error-dismiss" onClick={() => setError(null)}>✕</button>
        </div>
      )}

      {viewMode === 'boards' && (
        <div className="plan-board">
          {filteredStages.map((stage) => (
            <div key={stage.id} className="stage-column glass">
              <div className="stage-header">
                <h2 className="stage-title">{stage.title}</h2>
                {groupingMode === 'stages' && (
                  <button className="add-task-btn" onClick={() => handleOpenTaskModal(stage.id)}>+ Add task</button>
                )}
              </div>
              <div className="stage-tasks">
                {stage.tasks && stage.tasks.length > 0 ? (
                  stage.tasks.map((task) => renderTaskCard(task))
                ) : (
                  <div className="stage-empty">No tasks</div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {viewMode === 'list' && (
        <div className="plan-list">
          {filteredStages.map((stage) => (
            <section key={stage.id} className="plan-list-stage glass">
              <div className="plan-list-header">
                <h2 className="plan-list-title">{stage.title}</h2>
                {groupingMode === 'stages' && (
                  <button className="add-task-btn" onClick={() => handleOpenTaskModal(stage.id)}>+ Add task</button>
                )}
              </div>
              {stage.tasks && stage.tasks.length > 0 ? (
                <div className="plan-list-tasks task-list-mode">
                  {stage.tasks.map((task) => renderTaskCard(task))}
                </div>
              ) : (
                <div className="plan-list-empty">No tasks</div>
              )}
            </section>
          ))}
        </div>
      )}

      {viewMode === 'grid' && (
        <div className="plan-grid">
          {filteredStages.map((stage) => (
            <div key={stage.id} className="plan-grid-card glass">
              <div className="plan-grid-header">
                <div className="plan-grid-title">{stage.title}</div>
                {groupingMode === 'stages' && (
                  <button className="add-task-btn" onClick={() => handleOpenTaskModal(stage.id)}>+ Add task</button>
                )}
              </div>
              {stage.tasks && stage.tasks.length > 0 ? (
                <ul className="plan-grid-tasks">
                  {stage.tasks.slice(0, stagePreviewLimit).map((task) => (
                    <li key={task.id} className="plan-grid-task">
                      <TaskStatusIndicator status={resolveTaskStatus(task)} />
                      <span>{task.title}</span>
                    </li>
                  ))}
                  {stage.tasks.length > stagePreviewLimit && (
                    <li className="plan-grid-task plan-grid-more">
                      +{stage.tasks.length - stagePreviewLimit} more
                    </li>
                  )}
                </ul>
              ) : (
                <div className="plan-grid-empty">No tasks yet</div>
              )}
            </div>
          ))}
        </div>
      )}

      <TaskCreateModal
        isOpen={isTaskModalOpen}
        planId={planId}
        stages={stages}
        defaultStageId={selectedStageId}
        editingTask={editingTask}
        currentUserId={currentUserId}
        onClose={() => {
          setIsTaskModalOpen(false);
          setSelectedStageId(undefined);
          setEditingTask(undefined);
        }}
        onSubmit={handleSaveTask}
      />

      <LinkGoalFromPlanModal
        isOpen={linkGoalOpen}
        planId={planId}
        workspaceId={currentPlan.workspace_id}
        onClose={() => setLinkGoalOpen(false)}
        onChanged={fetchLinkedGoals}
      />

      <AddStageModal
        isOpen={addStageOpen}
        onClose={() => setAddStageOpen(false)}
        onSubmit={handleAddStageSubmit}
      />

      <RenamePlanModal
        isOpen={renameModalOpen}
        currentTitle={currentPlan.title}
        onClose={() => setRenameModalOpen(false)}
        onRename={handleRenameSubmit}
      />
    </div>
  );
}
