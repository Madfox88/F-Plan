import { useEffect, useState, useCallback } from 'react';
import type { Plan } from '../types/database';
import { getActivePlansWithMetadata, getPlansWithMetadataByStatus, togglePlanPin, deletePlan, renamePlan, archivePlan, updatePlan } from '../lib/database';
import { useWorkspace } from '../context/WorkspaceContext';
import { PlanCardMenu } from '../components/PlanCardMenu';
import { LinkGoalFromPlanModal } from '../components/LinkGoalFromPlanModal';
import ListViewIcon from '../assets/icons/list-view.svg';
import GridViewIcon from '../assets/icons/grid.svg';
import SearchIcon from '../assets/icons/search.svg';
import PinIcon from '../assets/icons/pin.svg';
import PinFilledIcon from '../assets/icons/pin-filled.svg';
import './PlansIndex.css';

interface PlansIndexProps {
  onCreatePlan: () => void;
  onSelectPlan: (planId: string) => void;
  onPinToggle?: () => void;
}

interface PlanWithMetadata extends Plan {
  stageCount: number;
  taskCount: number;
}

export function PlansIndex({ onCreatePlan, onSelectPlan, onPinToggle }: PlansIndexProps) {
  const { activeWorkspace } = useWorkspace();
  const [plans, setPlans] = useState<PlanWithMetadata[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [viewMode, setViewMode] = useState<'list' | 'grid'>('grid');
  const [searchOpen, setSearchOpen] = useState(false);
  const [showArchived, setShowArchived] = useState(false);
  const [linkGoalPlanId, setLinkGoalPlanId] = useState<string | null>(null);

  const loadPlans = useCallback(async () => {
    if (!activeWorkspace) return;

    try {
      setLoading(true);
      const status = showArchived ? 'archived' : 'active';
      const loadedPlans = showArchived
        ? await getPlansWithMetadataByStatus(activeWorkspace.id, status)
        : await getActivePlansWithMetadata(activeWorkspace.id);
      setPlans(loadedPlans);
    } catch (error) {
      console.error('Failed to load plans:', error);
    } finally {
      setLoading(false);
    }
  }, [activeWorkspace, showArchived]);

  useEffect(() => {
    // Defer data loading to allow toggle animation to complete (220ms + 30ms buffer)
    const timeoutId = setTimeout(() => {
      loadPlans();
    }, 250);
    
    return () => clearTimeout(timeoutId);
  }, [loadPlans]);

  const handleTogglePin = async (e: React.MouseEvent, planId: string, currentPinState: boolean) => {
    e.stopPropagation();
    try {
      await togglePlanPin(planId, !currentPinState);
      await loadPlans();
      if (onPinToggle) {
        onPinToggle();
      }
    } catch (error) {
      console.error('Failed to toggle pin:', error);
    }
  };

  const handleOpenPlan = (planId: string) => {
    onSelectPlan(planId);
  };

  const handleRenamePlan = (planId: string) => {
    const plan = plans.find((p) => p.id === planId);
    if (!plan) return;
    const newTitle = prompt('Enter new plan name:', plan.title);
    if (newTitle && newTitle.trim()) {
      renamePlan(planId, newTitle.trim()).then(() => loadPlans()).catch((error) => console.error('Failed to rename plan:', error));
    }
  };

  const handleTogglePinFromMenu = async (planId: string, isPinned: boolean) => {
    try {
      await togglePlanPin(planId, isPinned);
      await loadPlans();
      if (onPinToggle) {
        onPinToggle();
      }
    } catch (error) {
      console.error('Failed to toggle pin:', error);
    }
  };

  const handleHidePlan = (planId: string, status: Plan['status']) => {
    if (status === 'archived') {
      if (window.confirm('Unhide this plan?')) {
        updatePlan(planId, { status: 'active' })
          .then(() => loadPlans())
          .catch((error) => console.error('Failed to unhide plan:', error));
      }
      return;
    }

    if (window.confirm('Hide this plan?')) {
      archivePlan(planId)
        .then(() => loadPlans())
        .catch((error) => console.error('Failed to hide plan:', error));
    }
  };

  const handleDeletePlan = (planId: string) => {
    if (window.confirm('Are you sure you want to delete this plan? This action cannot be undone.')) {
      deletePlan(planId).then(() => loadPlans()).catch((error) => console.error('Failed to delete plan:', error));
    }
  };

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
        <div className={`search-wrapper ${searchOpen ? 'open' : ''}`}>
          <button
            className="search-icon-btn"
            onClick={() => setSearchOpen(!searchOpen)}
            title="Search plans"
          >
            <img src={SearchIcon} alt="Search" className="search-icon-img" />
          </button>
          <input
            type="text"
            placeholder="Search plans..."
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
        <div className="toolbar-actions">
          <div className="toggle-container" title={showArchived ? 'Show active plans' : 'Show hidden plans'}>
            <div className="toggle-wrap">
              <input
                className="toggle-input"
                id="archive-toggle"
                type="checkbox"
                checked={showArchived}
                onChange={() => setShowArchived(!showArchived)}
              />
              <label className="toggle-track" htmlFor="archive-toggle">
                <div className="track-lines">
                  <div className="track-line" />
                </div>
                <div className="toggle-thumb">
                  <div className="thumb-core" />
                  <div className="thumb-inner" />
                  <div className="thumb-scan" />
                  <div className="thumb-particles">
                    <div className="thumb-particle" />
                    <div className="thumb-particle" />
                    <div className="thumb-particle" />
                    <div className="thumb-particle" />
                    <div className="thumb-particle" />
                  </div>
                </div>
                <div className="toggle-data">
                  <div className="data-text off">Hidden</div>
                  <div className="data-text on">Active</div>
                  <div className="status-indicator off" />
                  <div className="status-indicator on" />
                </div>
                <div className="energy-rings">
                  <div className="energy-ring" />
                  <div className="energy-ring" />
                  <div className="energy-ring" />
                </div>
                <div className="interface-lines">
                  <div className="interface-line" />
                  <div className="interface-line" />
                  <div className="interface-line" />
                  <div className="interface-line" />
                  <div className="interface-line" />
                  <div className="interface-line" />
                </div>
                <div className="toggle-reflection" />
                <div className="holo-glow" />
              </label>
            </div>
          </div>
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
        </div>

        <button className="btn-primary" onClick={onCreatePlan} style={{ marginLeft: 'auto' }}>
          <span>+ New Plan</span>
        </button>
      </div>

      {filteredPlans.length === 0 ? (
        <div className="plans-empty">
          <div className="empty-container">
            <p className="empty-title">No plans yet</p>
            <p className="empty-message">Plans help you organize your work into stages and track progress on your goals.</p>
            <button className="btn-primary btn-large" onClick={onCreatePlan}>
              <span>+ Create Your First Plan</span>
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
                <div className="plan-card-actions">
                  <button
                    className="plan-pin-btn"
                    onClick={(e) => handleTogglePin(e, plan.id, plan.is_pinned)}
                    aria-label={plan.is_pinned ? 'Unpin plan' : 'Pin plan'}
                    title={plan.is_pinned ? 'Unpin plan' : 'Pin plan'}
                  >
                    <img
                      src={plan.is_pinned ? PinFilledIcon : PinIcon}
                      alt=""
                      className="plan-pin-icon"
                    />
                  </button>
                  <PlanCardMenu
                    plan={plan}
                    onOpen={handleOpenPlan}
                    onRename={handleRenamePlan}
                    onPin={handleTogglePinFromMenu}
                    onHide={handleHidePlan}
                    onDelete={handleDeletePlan}
                    onLinkGoal={(planId) => setLinkGoalPlanId(planId)}
                  />
                </div>
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
                {plan.due_date && (
                  <span className="plan-due-pill">
                    Due: {new Date(plan.due_date + 'T00:00:00').toLocaleDateString()}
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
      {linkGoalPlanId && activeWorkspace && (
        <LinkGoalFromPlanModal
          isOpen={!!linkGoalPlanId}
          planId={linkGoalPlanId}
          workspaceId={activeWorkspace.id}
          onClose={() => setLinkGoalPlanId(null)}
          onChanged={loadPlans}
        />
      )}
    </div>
  );
}
