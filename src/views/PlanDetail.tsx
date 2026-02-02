import { useCallback, useEffect, useState, useMemo } from 'react';
import type { Plan, StageWithTasks, Task } from '../types/database';
import { getStagesByPlan, deletePlan, renamePlan, archivePlan, togglePlanPin, updatePlan, createStage, createTask } from '../lib/database';
import { PageHeaderCard } from '../components/PageHeaderCard';
import { PlanHeaderMenu } from '../components/PlanHeaderMenu';
import { TaskCreateModal } from '../components/TaskCreateModal';
import type { TaskCreatePayload } from '../components/TaskCreateModal';
import { TaskStatusIndicator } from '../components/TaskStatusIndicator';
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

  const handleRenamePlan = (planId: string) => {
    const newTitle = prompt('Enter new plan name:', currentPlan.title);
    if (newTitle && newTitle.trim()) {
      renamePlan(planId, newTitle.trim()).then(() => {
        setCurrentPlan({ ...currentPlan, title: newTitle.trim() });
        if (onPlanUpdated) onPlanUpdated();
      }).catch((error) => console.error('Failed to rename plan:', error));
    }
  };

  const handleTogglePin = async (planId: string, isPinned: boolean) => {
    try {
      await togglePlanPin(planId, isPinned);
      setCurrentPlan({ ...currentPlan, is_pinned: isPinned });
      if (onPlanUpdated) onPlanUpdated();
    } catch (error) {
      console.error('Failed to toggle pin:', error);
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
          .catch((error) => console.error('Failed to unhide plan:', error));
      }
      return;
    }
    if (window.confirm('Hide this plan?')) {
      archivePlan(planId)
        .then(() => {
          setCurrentPlan({ ...currentPlan, status: 'archived' });
          if (onPlanUpdated) onPlanUpdated();
        })
        .catch((error) => console.error('Failed to hide plan:', error));
    }
  };

  const handleDeletePlan = (planId: string) => {
    deletePlan(planId)
      .then(() => {
        if (onPlanDeleted) onPlanDeleted();
      })
      .catch((error) => console.error('Failed to delete plan:', error));
  };

  const fetchStages = useCallback(async () => {
    try {
      setLoading(true);
      const fetchedStages = await getStagesByPlan(planId);
      setStages(fetchedStages);
    } catch (error) {
      console.error('Failed to load stages:', error);
    } finally {
      setLoading(false);
    }
  }, [planId]);

  const handleAddStage = async () => {
    const stageName = prompt('Enter stage name:');
    if (stageName && stageName.trim()) {
      try {
        await createStage(planId, stageName);
        await fetchStages();
      } catch (error) {
        console.error('Failed to create stage:', error);
      }
    }
  };

  const handleOpenTaskModal = (stageId?: string) => {
    setSelectedStageId(stageId);
    setIsTaskModalOpen(true);
  };

  const handleCreateTask = async (payload: TaskCreatePayload) => {
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
    });
    await fetchStages();
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
          {groupingMode === 'stages' && (
            <button className="add-stage-btn" onClick={handleAddStage}>+ Add Stage</button>
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

  if (loading) {
    return (
      <div className="plan-detail-wrapper">
        {headerContent}
        <div className="plan-detail-loading">Loading stages...</div>
      </div>
    );
  }

  if (stages.length === 0) {
    return (
      <div className="plan-detail-wrapper">
        {headerContent}
        <div className="plan-detail-empty">
          <p>No stages yet. Create your first stage to get started.</p>
        </div>
      </div>
    );
  }

  const stagePreviewLimit = 3;

  // Filter stages and tasks based on search term
  const filteredStages = searchTerm.trim() === '' 
    ? groupedStages 
    : groupedStages.map(stage => ({
        ...stage,
        tasks: stage.tasks?.filter(task => 
          task.title.toLowerCase().includes(searchTerm.toLowerCase())
        ) || []
      })).filter(stage => stage.tasks.length > 0);

  return (
    <div className="plan-detail-wrapper">
      {headerContent}

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
                  stage.tasks.map((task) => (
                    <div key={task.id} className="task-card">
                      <div className="task-card-header">
                        <TaskStatusIndicator status={resolveTaskStatus(task)} />
                        <p className="task-title">{task.title}</p>
                      </div>
                      {groupingMode !== 'stages' && task.stage_name && (
                        <div className="task-card-meta">
                          <span className="task-meta-label">Stage:</span>
                          <span className="task-meta-value">{task.stage_name}</span>
                        </div>
                      )}
                    </div>
                  ))
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
                <ul className="plan-list-tasks">
                  {stage.tasks.map((task) => (
                    <li key={task.id} className="plan-list-item">
                      <TaskStatusIndicator status={resolveTaskStatus(task)} />
                      <span className="plan-list-text">{task.title}</span>
                      {groupingMode !== 'stages' && task.stage_name && (
                        <span className="plan-list-meta">· {task.stage_name}</span>
                      )}
                    </li>
                  ))}
                </ul>
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
        onClose={() => {
          setIsTaskModalOpen(false);
          setSelectedStageId(undefined);
        }}
        onSubmit={handleCreateTask}
      />
    </div>
  );
}
