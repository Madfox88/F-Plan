import { useEffect, useState, useCallback } from 'react';
import type { Plan } from '../types/database';
import { getActivePlans } from '../lib/database';
import { useApp } from '../context/AppContext';
import './PlansIndex.css';

interface PlansIndexProps {
  onCreatePlan: () => void;
  onSelectPlan: (planId: string) => void;
}

export function PlansIndex({ onCreatePlan, onSelectPlan }: PlansIndexProps) {
  const { workspace } = useApp();
  const [plans, setPlans] = useState<Plan[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [viewMode, setViewMode] = useState<'list' | 'grid'>('grid');

  const loadPlans = useCallback(async () => {
    if (!workspace) return;

    try {
      setLoading(true);
      const activePlans = await getActivePlans(workspace.id);
      setPlans(activePlans);
    } catch (error) {
      console.error('Failed to load plans:', error);
    } finally {
      setLoading(false);
    }
  }, [workspace]);

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
              ☰
            </button>
            <button
              className={`toggle-btn ${viewMode === 'grid' ? 'active' : ''}`}
              onClick={() => setViewMode('grid')}
              title="Grid view"
            >
              ⊞
            </button>
          </div>
          <button className="btn-primary" onClick={onCreatePlan}>
            + New Plan
          </button>
        </div>
      </div>

      {filteredPlans.length === 0 ? (
        <div className="plans-empty">
          <p className="empty-message">No plans yet. Create one to get started.</p>
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
