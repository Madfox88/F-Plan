import { useEffect, useState, useCallback } from 'react';
import type { Plan, Tag } from '../types/database';
import { getActivePlansWithMetadata, getPlansWithMetadataByStatus, togglePlanPin, deletePlan, renamePlan, archivePlan, updatePlan, getTagsForPlans } from '../lib/database';
import { useWorkspace } from '../context/WorkspaceContext';
import { useActivityLog } from '../hooks/useActivityLog';
import { PlanCardMenu } from '../components/PlanCardMenu';
import { LinkGoalFromPlanModal } from '../components/LinkGoalFromPlanModal';
import { RenamePlanModal } from '../components/RenamePlanModal';
import ListViewIcon from '../assets/icons/list-view.svg';
import GridViewIcon from '../assets/icons/grid.svg';
import SearchIcon from '../assets/icons/search.svg';
import PinIcon from '../assets/icons/pin.svg';
import PinFilledIcon from '../assets/icons/pin-filled.svg';
import '../components/CompletionAnimation.css';
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
  const log = useActivityLog();
  const [plans, setPlans] = useState<PlanWithMetadata[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [viewMode, setViewMode] = useState<'list' | 'grid'>('grid');
  const [searchOpen, setSearchOpen] = useState(false);
  const [planTab, setPlanTab] = useState<'active' | 'completed' | 'hidden'>('active');
  const [linkGoalPlanId, setLinkGoalPlanId] = useState<string | null>(null);
  const [renamePlanId, setRenamePlanId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [planTagsMap, setPlanTagsMap] = useState<Record<string, Tag[]>>({});

  const loadPlans = useCallback(async () => {
    if (!activeWorkspace) return;

    try {
      setLoading(true);
      let loadedPlans;
      if (planTab === 'active') {
        // getActivePlansWithMetadata returns status in ('active','completed'), so filter to active only
        const all = await getActivePlansWithMetadata(activeWorkspace.id);
        loadedPlans = all.filter((p: PlanWithMetadata) => p.status === 'active');
      } else if (planTab === 'completed') {
        loadedPlans = await getPlansWithMetadataByStatus(activeWorkspace.id, 'completed');
      } else {
        loadedPlans = await getPlansWithMetadataByStatus(activeWorkspace.id, 'archived');
      }
      setPlans(loadedPlans);

      // Load tags for plans
      const planIds = loadedPlans.map((p: PlanWithMetadata) => p.id);
      if (planIds.length > 0) {
        try {
          const tagsMap = await getTagsForPlans(planIds);
          setPlanTagsMap(tagsMap);
        } catch {
          // Tags table may not exist yet (pre-migration)
        }
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load plans');
    } finally {
      setLoading(false);
    }
  }, [activeWorkspace, planTab]);

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
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to toggle pin');
    }
  };

  const handleOpenPlan = (planId: string) => {
    onSelectPlan(planId);
  };

  const handleRenamePlan = (planId: string) => {
    setRenamePlanId(planId);
  };

  const handleRenameSubmit = async (newTitle: string) => {
    if (!renamePlanId) return;
    const oldTitle = plans.find((p) => p.id === renamePlanId)?.title ?? '';
    await renamePlan(renamePlanId, newTitle);
    log('renamed', 'plan', renamePlanId, newTitle, { from: oldTitle, to: newTitle });
    await loadPlans();
  };

  const renamePlanTitle = renamePlanId ? plans.find((p) => p.id === renamePlanId)?.title ?? '' : '';

  const handleTogglePinFromMenu = async (planId: string, isPinned: boolean) => {
    try {
      await togglePlanPin(planId, isPinned);
      await loadPlans();
      if (onPinToggle) {
        onPinToggle();
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to toggle pin');
    }
  };

  const handleHidePlan = (planId: string, status: Plan['status']) => {
    const plan = plans.find((p) => p.id === planId);
    if (status === 'archived') {
      if (window.confirm('Unhide this plan?')) {
        updatePlan(planId, { status: 'active' })
          .then(() => { log('unhidden', 'plan', planId, plan?.title || ''); loadPlans(); setPlanTab('active'); })
          .catch((err) => setError(err instanceof Error ? err.message : 'Failed to unhide plan'));
      }
      return;
    }

    if (window.confirm('Hide this plan?')) {
      archivePlan(planId)
        .then(() => { log('hidden', 'plan', planId, plan?.title || ''); loadPlans(); })
        .catch((err) => setError(err instanceof Error ? err.message : 'Failed to hide plan'));
    }
  };

  const handleDeletePlan = (planId: string) => {
    const plan = plans.find((p) => p.id === planId);
    if (window.confirm('Are you sure you want to delete this plan? This action cannot be undone.')) {
      deletePlan(planId).then(() => { log('deleted', 'plan', planId, plan?.title || ''); loadPlans(); }).catch((err) => setError(err instanceof Error ? err.message : 'Failed to delete plan'));
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
      {error && (
        <div className="plans-error glass" role="alert">
          <span>{error}</span>
          <button className="plans-error-dismiss" onClick={() => setError(null)}>✕</button>
        </div>
      )}
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
          <div className="completion-tab-bar">
            <button
              className={`completion-tab-btn ${planTab === 'active' ? 'active' : ''}`}
              onClick={() => setPlanTab('active')}
            >
              Active
            </button>
            <button
              className={`completion-tab-btn ${planTab === 'completed' ? 'active' : ''}`}
              onClick={() => setPlanTab('completed')}
            >
              Completed
            </button>
            <button
              className={`completion-tab-btn ${planTab === 'hidden' ? 'active' : ''}`}
              onClick={() => setPlanTab('hidden')}
            >
              Hidden
            </button>
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
            {planTab === 'active' && (
              <>
                <p className="empty-title">No active plans</p>
                <p className="empty-message">Plans help you organize your work into stages and track progress on your goals.</p>
                <button className="btn-primary btn-large" onClick={onCreatePlan}>
                  <span>+ Create Your First Plan</span>
                </button>
              </>
            )}
            {planTab === 'completed' && (
              <>
                <p className="empty-title">No completed plans yet</p>
                <p className="empty-message">When you finish all tasks in a plan and mark it complete, it will appear here.</p>
              </>
            )}
            {planTab === 'hidden' && (
              <>
                <p className="empty-title">No hidden plans</p>
                <p className="empty-message">Plans you hide will appear here so you can restore them later.</p>
              </>
            )}
          </div>
        </div>
      ) : (
        <div className={`plans-container plans-${viewMode}`}>
          {filteredPlans.map((plan) => (
            <div
              key={plan.id}
              className={`plan-card glass ${planTab === 'completed' ? 'completed-entry' : ''}`}
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
                  {planTab === 'completed' && (
                    <button
                      className="btn-reopen"
                      title="Reopen plan"
                      onClick={(e) => {
                        e.stopPropagation();
                        updatePlan(plan.id, { status: 'active', completed_at: null })
                          .then(() => loadPlans())
                          .catch((err) => setError(err instanceof Error ? err.message : 'Failed to reopen plan'));
                      }}
                    >
                      ↩ Reopen
                    </button>
                  )}
                  {planTab !== 'completed' && (
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
                  )}
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
                {planTab === 'completed' && plan.completed_at ? (
                  <span className="completed-stamp">✅ Completed {new Date(plan.completed_at).toLocaleDateString()}</span>
                ) : (
                  <span className="plan-status" data-status={plan.status}>{plan.status}</span>
                )}
                {plan.due_date && (
                  <span className="plan-due-pill">
                    Due: {new Date(plan.due_date + 'T00:00:00').toLocaleDateString()}
                  </span>
                )}
              </div>
              {planTagsMap[plan.id] && planTagsMap[plan.id].length > 0 && (
                <div className="plan-card-tags">
                  {planTagsMap[plan.id].map((tag) => (
                    <span key={tag.id} className={`goal-tag goal-tag--${tag.color}`}>{tag.label}</span>
                  ))}
                </div>
              )}
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

      <RenamePlanModal
        isOpen={!!renamePlanId}
        currentTitle={renamePlanTitle}
        onClose={() => setRenamePlanId(null)}
        onRename={handleRenameSubmit}
      />
    </div>
  );
}
