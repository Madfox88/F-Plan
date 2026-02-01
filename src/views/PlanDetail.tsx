import { useEffect, useState } from 'react';
import type { Plan, StageWithTasks } from '../types/database';
import { getStagesByPlan } from '../lib/database';
import { PageHeaderCard } from '../components/PageHeaderCard';
import ListViewIcon from '../assets/icons/list-view.svg';
import BoardsViewIcon from '../assets/icons/boards.svg';
import GridViewIcon from '../assets/icons/grid.svg';
import './PlanDetail.css';

interface PlanDetailProps {
  planId: string;
  plan: Plan;
}

export function PlanDetail({ planId, plan }: PlanDetailProps) {
  const [stages, setStages] = useState<StageWithTasks[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState<'list' | 'boards' | 'grid'>('boards');

  const headerContent = (
    <>
      <PageHeaderCard title={plan.title} subtitle={plan.intent || 'Plan overview'} />
      <div className="plan-detail-subheader">
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
      </div>
    </>
  );

  useEffect(() => {
    const loadStages = async () => {
      try {
        setLoading(true);
        const fetchedStages = await getStagesByPlan(planId);
        setStages(fetchedStages);
      } catch (error) {
        console.error('Failed to load stages:', error);
      } finally {
        setLoading(false);
      }
    };

    loadStages();
  }, [planId]);

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

  return (
    <div className="plan-detail-wrapper">
      {headerContent}

      {viewMode === 'boards' && (
        <div className="plan-board">
          {stages.map((stage) => (
            <div key={stage.id} className="stage-column glass">
              <div className="stage-header">
                <h2 className="stage-title">{stage.title}</h2>
                <span className="stage-count">{stage.tasks?.length || 0}</span>
              </div>
              <div className="stage-tasks">
                {stage.tasks && stage.tasks.length > 0 ? (
                  stage.tasks.map((task) => (
                    <div key={task.id} className="task-card">
                      <p className="task-title">{task.title}</p>
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
          {stages.map((stage) => (
            <section key={stage.id} className="plan-list-stage glass">
              <div className="plan-list-header">
                <h2 className="plan-list-title">{stage.title}</h2>
                <span className="plan-list-count">{stage.tasks?.length || 0}</span>
              </div>
              {stage.tasks && stage.tasks.length > 0 ? (
                <ul className="plan-list-tasks">
                  {stage.tasks.map((task) => (
                    <li key={task.id} className="plan-list-item">
                      <span className="plan-list-bullet" />
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
          {stages.map((stage) => (
            <div key={stage.id} className="plan-grid-card glass">
              <div className="plan-grid-meta">Stage</div>
              <div className="plan-grid-title">{stage.title}</div>
              <div className="plan-grid-count">
                {stage.tasks?.length || 0} tasks
              </div>
              {stage.tasks && stage.tasks.length > 0 ? (
                <ul className="plan-grid-tasks">
                  {stage.tasks.slice(0, stagePreviewLimit).map((task) => (
                    <li key={task.id} className="plan-grid-task">
                      {task.title}
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
    </div>
  );
}
