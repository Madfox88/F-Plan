import { useEffect, useState, useCallback } from 'react';
import type { Plan } from '../types/database';
import { getActivePlansWithMetadata } from '../lib/database';
import { useWorkspace } from '../context/WorkspaceContext';
import ListViewIcon from '../assets/icons/list-view.svg';
import GridViewIcon from '../assets/icons/grid.svg';
import './PlansIndex.css';

interface PlansIndexProps {
  onCreatePlan: () => void;
  onSelectPlan: (planId: string) => void;
}

interface PlanWithMetadata extends Plan {
  stageCount: number;
  taskCount: number;
}

export function PlansIndex({ onCreatePlan, onSelectPlan }: PlansIndexProps) {
  const { activeWorkspace } = useWorkspace();
  const [plans, setPlans] = useState<PlanWithMetadata[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [viewMode, setViewMode] = useState<'list' | 'grid'>('grid');

  const loadPlans = useCallback(async () => {
    if (!activeWorkspace) return;

    try {
      setLoading(true);
      const activePlans = await getActivePlansWithMetadata(activeWorkspace.id);
      setPlans(activePlans);
    } catch (error) {
      console.error('Failed to load plans:', error);
    } finally {
      setLoading(false);
    }
  }, [activeWorkspace]);

  useEffect(() => {
    loadPlans();
  }, [loadPlans]);

  const filteredPlans = plans.filter((plan) =>
    plan.title.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading) {
    return (
      <div className="plans-index">
        <div className="plans-loading">Loading plans...</div>
      </div>
    );
  }

  return (
    <div className="plans-index">
      <div className="plans-toolbar">
        <input
          type="text"
          placeholder="Search plans..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="plans-search"
        />
        <div className="toolbar-actions">
          <div className="view-toggle">
            <button
              className={`toggle-btn ${viewMode === 'list' ? 'active' : ''}`}
              onClick={() => setViewMode('list')}
              title="List view"
            >
              <img src={ListViewIcon} alt="" className="toggle-icon" />
            </button>
            <button
              className={`toggle-btn ${viewMode === 'grid' ? 'active' : ''}`}
              onClick={() => setViewMode('grid')}
              title="Grid view"
            >
              <img src={GridViewIcon} alt="" className="toggle-icon" />
            </button>
          </div>
          <button className="btn-primary" onClick={onCreatePlan}>
            + New Plan
          </button>
        </div>
      </div>

      {filteredPlans.length === 0 ? (
        <div className="plans-empty">
          <div className="empty-container">
            <p className="empty-title">No plans yet</p>
            <p className="empty-message">Plans help you organize your work into stages and track progress on your goals.</p>
            <button className="btn-primary btn-large" onClick={onCreatePlan}>
              + Create Your First Plan
            </button>
          </div>
        </div>
      ) : (
        <div className={`plans-container plans-${viewMode}`}>
          {filteredPlans.map((plan) => (
            <div
              key={plan.id}
              className="plan-card glass"
              onClick={() => onSelectPlan(plan.id)}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  onSelectPlan(plan.id);
                }
              }}
            >
              <div className="plan-card-header">
                <h3 className="plan-card-title">{plan.title}</h3>
              </div>
              {plan.description && (
                <p className="plan-card-description">{plan.description}</p>
              )}
              <div className="plan-card-metadata">
                {plan.stageCount > 0 || plan.taskCount > 0 ? (
                  <>
                    <span className="metadata-item">
                      {plan.stageCount} {plan.stageCount === 1 ? 'stage' : 'stages'}
                    </span>
                    <span className="metadata-separator">•</span>
                    <span className="metadata-item">
                      {plan.taskCount} {plan.taskCount === 1 ? 'task' : 'tasks'}
                    </span>
                  </>
                ) : (
                  <span className="metadata-empty">No stages yet</span>
                )}
              </div>
              <div className="plan-card-footer">
                <span className="plan-status">{plan.status}</span>
                <span className="plan-date">
                  {new Date(plan.created_at).toLocaleDateString()}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
