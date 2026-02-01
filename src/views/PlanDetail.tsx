import { useCallback, useEffect, useState } from 'react';
import type { Plan, StageWithTasks } from '../types/database';
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
import './PlanDetail.css';

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
  const [currentPlan, setCurrentPlan] = useState<Plan>(plan);
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [isTaskModalOpen, setIsTaskModalOpen] = useState(false);
  const [selectedStageId, setSelectedStageId] = useState<string | undefined>(undefined);

  const resolveTaskStatus = (task: { status?: 'not_started' | 'in_progress' | 'completed'; completed?: boolean }) => {
    if (task.status) return task.status;
    return task.completed ? 'completed' : 'not_started';
  };

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
        <button className="add-stage-btn" onClick={handleAddStage}>+ Add Stage</button>
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
    ? stages 
    : stages.map(stage => ({
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
                <button className="add-task-btn" onClick={() => handleOpenTaskModal(stage.id)}>+ Add task</button>
              </div>
              <div className="stage-tasks">
                {stage.tasks && stage.tasks.length > 0 ? (
                  stage.tasks.map((task) => (
                    <div key={task.id} className="task-card">
                      <div className="task-card-header">
                        <TaskStatusIndicator status={resolveTaskStatus(task)} />
                        <p className="task-title">{task.title}</p>
                      </div>
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
                <button className="add-task-btn" onClick={() => handleOpenTaskModal(stage.id)}>+ Add task</button>
              </div>
              {stage.tasks && stage.tasks.length > 0 ? (
                <ul className="plan-list-tasks">
                  {stage.tasks.map((task) => (
                    <li key={task.id} className="plan-list-item">
                      <TaskStatusIndicator status={resolveTaskStatus(task)} />
                      <span className="plan-list-text">{task.title}</span>
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
                <button className="add-task-btn" onClick={() => handleOpenTaskModal(stage.id)}>+ Add task</button>
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
