import { useEffect, useState, useCallback, useMemo, useRef } from 'react';
import { useWorkspace } from '../context/WorkspaceContext';
import { getGoalsWithProgress, createGoal, linkGoalToPlan, setGoalTags, completeGoal, reopenGoal, deleteGoal } from '../lib/database';
import type { GoalWithProgress } from '../lib/database';
import type { Tag } from '../types/database';
import { CreateGoalModal } from '../components/CreateGoalModal';
import { GoalDetailModal } from '../components/GoalDetailModal';
import SearchIcon from '../assets/icons/search.svg';
import TrashIcon from '../assets/icons/trash.svg';
import './GoalsIndex.css';

type DueDateFilter = 'all' | 'none' | 'this_month' | 'next_month' | 'overdue';

export function GoalsIndex() {
  const { activeWorkspace } = useWorkspace();
  const [goals, setGoals] = useState<GoalWithProgress[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [searchOpen, setSearchOpen] = useState(false);
  const [dueFilter, setDueFilter] = useState<DueDateFilter>('all');
  const [selectedTags, setSelectedTags] = useState<Set<string>>(new Set());
  const [tagDropdownOpen, setTagDropdownOpen] = useState(false);
  const tagDropdownRef = useRef<HTMLDivElement>(null);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [selectedGoal, setSelectedGoal] = useState<GoalWithProgress | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  const loadGoals = useCallback(async () => {
    if (!activeWorkspace) return;
    try {
      setLoading(true);
      setError(null);
      const data = await getGoalsWithProgress(activeWorkspace.id);
      setGoals(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load goals');
    } finally {
      setLoading(false);
    }
  }, [activeWorkspace]);

  useEffect(() => {
    loadGoals();
  }, [loadGoals]);

  const handleCreateGoal = async (
    title: string,
    description: string,
    planIds: string[],
    dueDate: string,
    tagIds: string[]
  ) => {
    if (!activeWorkspace) return;
    const goal = await createGoal(
      activeWorkspace.id,
      title,
      description || undefined,
      dueDate || undefined,
    );
    if (tagIds.length > 0) {
      await setGoalTags(goal.id, tagIds);
    }
    for (const planId of planIds) {
      await linkGoalToPlan(planId, goal.id);
    }
    await loadGoals();
  };

  const handleCompleteGoal = async (goalId: string) => {
    try {
      await completeGoal(goalId);
      await loadGoals();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to complete goal');
    }
  };

  const handleReopenGoal = async (goalId: string) => {
    try {
      await reopenGoal(goalId);
      await loadGoals();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to reopen goal');
    }
  };

  const handleDeleteGoal = async () => {
    setSelectedGoal(null);
    await loadGoals();
  };

  const handleCardDelete = async (goalId: string) => {
    try {
      await deleteGoal(goalId);
      setConfirmDeleteId(null);
      await loadGoals();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete goal');
      setConfirmDeleteId(null);
    }
  };

  const uniqueTagLabels = useMemo(() => {
    const set = new Set<string>();
    for (const goal of goals) {
      if (goal.tags) {
        for (const tag of goal.tags as Tag[]) {
          set.add(tag.label);
        }
      }
    }
    return Array.from(set).sort((a, b) => a.localeCompare(b));
  }, [goals]);

  useEffect(() => {
    if (!tagDropdownOpen) return;
    const handler = (e: MouseEvent) => {
      if (tagDropdownRef.current && !tagDropdownRef.current.contains(e.target as Node)) {
        setTagDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [tagDropdownOpen]);

  const toggleTagFilter = (label: string) => {
    setSelectedTags((prev) => {
      const next = new Set(prev);
      next.has(label) ? next.delete(label) : next.add(label);
      return next;
    });
  };

  const filteredGoals = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    return goals.filter((goal) => {
      if (searchTerm.trim()) {
        const term = searchTerm.toLowerCase();
        if (
          !goal.title.toLowerCase().includes(term) &&
          !goal.description?.toLowerCase().includes(term)
        ) {
          return false;
        }
      }

      if (dueFilter !== 'all') {
        if (dueFilter === 'none') {
          if (goal.due_date) return false;
        } else {
          if (!goal.due_date) return false;
          const d = new Date(goal.due_date + 'T00:00:00');
          if (dueFilter === 'overdue' && d >= today) return false;
          if (dueFilter === 'this_month' && (d.getMonth() !== today.getMonth() || d.getFullYear() !== today.getFullYear())) return false;
          if (dueFilter === 'next_month') {
            const nextMonth = (today.getMonth() + 1) % 12;
            const nextMonthYear = today.getMonth() === 11 ? today.getFullYear() + 1 : today.getFullYear();
            if (d.getMonth() !== nextMonth || d.getFullYear() !== nextMonthYear) return false;
          }
        }
      }

      if (selectedTags.size > 0) {
        const labels = (goal.tags || []).map((t) => t.label.toLowerCase());
        if (!Array.from(selectedTags).some((t) => labels.includes(t.toLowerCase()))) {
          return false;
        }
      }

      return true;
    });
  }, [goals, searchTerm, dueFilter, selectedTags]);

  const hasActiveFilters = searchTerm.trim() !== '' || dueFilter !== 'all' || selectedTags.size > 0;

  if (loading) {
    return <div className="goals-index"><div className="goals-loading">Loading goals…</div></div>;
  }

  if (error) {
    return <div className="goals-index"><div className="goals-error">{error}</div></div>;
  }

  return (
    <div className="goals-index">
      <div className="goals-toolbar">
        <div className={`search-wrapper ${searchOpen ? 'open' : ''}`}>
          <button
            className="search-icon-btn"
            onClick={() => setSearchOpen(!searchOpen)}
          >
            <img src={SearchIcon} alt="Search" className="search-icon-img" />
          </button>
          <input
            type="text"
            placeholder="Search goals..."
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

        <div className="goals-filters">
          <div className="goals-due-filter-btns">
            {[
              { value: 'all', label: 'All' },
              { value: 'none', label: 'No due date' },
              { value: 'this_month', label: 'This month' },
              { value: 'next_month', label: 'Next month' },
              { value: 'overdue', label: 'Overdue' },
            ].map(({ value, label }) => (
              <button
                key={value}
                className={`goals-filter-btn${dueFilter === value ? ' active' : ''}`}
                onClick={() => setDueFilter(value as DueDateFilter)}
              >
                {label}
              </button>
            ))}
          </div>

          <div className="goals-tag-dropdown" ref={tagDropdownRef}>
            <button
              type="button"
              className="goals-filter-select goals-tag-trigger"
              onClick={() => uniqueTagLabels.length && setTagDropdownOpen(!tagDropdownOpen)}
              disabled={!uniqueTagLabels.length}
            >
              Tags{selectedTags.size ? ` (${selectedTags.size})` : ''}
              <span>{tagDropdownOpen ? '▴' : '▾'}</span>
            </button>

            {tagDropdownOpen && (
              <div className="goals-tag-popover">
                {uniqueTagLabels.map((label) => (
                  <label key={label}>
                    <input
                      type="checkbox"
                      checked={selectedTags.has(label)}
                      onChange={() => toggleTagFilter(label)}
                    />
                    {label}
                  </label>
                ))}
              </div>
            )}
          </div>
        </div>

        <button className="btn-primary" onClick={() => setIsCreateModalOpen(true)}>
          <span>+ New Goal</span>
        </button>
      </div>

      <div className="goals-container">
        {filteredGoals.length === 0 && hasActiveFilters ? (
          <div className="goals-no-filter-match">
            <p className="goals-no-filter-title">No goals match your filters</p>
            <p className="goals-no-filter-hint">Try adjusting your search or filter criteria.</p>
            <button
              className="goals-clear-filters-btn"
              onClick={() => {
                setSearchTerm('');
                setSearchOpen(false);
                setDueFilter('all');
                setSelectedTags(new Set());
              }}
            >
              Clear all filters
            </button>
          </div>
        ) : filteredGoals.length === 0 ? (
          <div className="goals-empty">
            <div className="goals-empty-container">
              <p className="goals-empty-title">No goals yet</p>
              <p className="goals-empty-message">Create your first goal to start tracking progress.</p>
            </div>
          </div>
        ) : (
          filteredGoals.map((goal) => {
            const isCompleted = !!goal.completed_at;
            const isFullProgress = goal.progress === 100 && goal.totalTasks > 0 && !isCompleted;
            return (
          <div
            key={goal.id}
            className={`goal-card glass${isCompleted ? ' goal-completed' : ''}${isFullProgress ? ' goal-full-progress' : ''}`}
            onClick={() => setSelectedGoal(goal)}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') setSelectedGoal(goal);
            }}
          >
            {confirmDeleteId === goal.id ? (
              <div className="goal-card-delete-confirm" onClick={(e) => e.stopPropagation()}>
                <span>Delete this goal?</span>
                <div className="goal-card-delete-actions">
                  <button className="btn-danger-sm" onClick={() => handleCardDelete(goal.id)}>Delete</button>
                  <button className="btn-secondary-sm" onClick={() => setConfirmDeleteId(null)}>Cancel</button>
                </div>
              </div>
            ) : (
              <button
                className="goal-card-delete-icon"
                title="Delete goal"
                onClick={(e) => { e.stopPropagation(); setConfirmDeleteId(goal.id); }}
              >
                <img src={TrashIcon} alt="Delete" />
              </button>
            )}

            {isCompleted && (
              <div className="goal-completion-banner completed">
                <span>✅ Completed</span>
                <button
                  className="completion-banner-action secondary"
                  onClick={(e) => { e.stopPropagation(); handleReopenGoal(goal.id); }}
                >
                  Reopen
                </button>
              </div>
            )}

            {isFullProgress && (
              <div className="goal-completion-banner prompt">
                <span>🎉 All tasks done!</span>
                <div className="completion-banner-actions">
                  <button
                    className="completion-banner-action primary"
                    onClick={(e) => { e.stopPropagation(); handleCompleteGoal(goal.id); }}
                  >
                    Mark Complete
                  </button>
                </div>
              </div>
            )}

            <h3 className="goal-card-title">{goal.title}</h3>

            {goal.description && (
              <p className="goal-card-description">{goal.description}</p>
            )}

            <div className="goal-progress">
              <div className="goal-progress-bar-track">
                <div
                  className="goal-progress-bar-fill"
                  style={{ width: `${goal.progress}%` }}
                />
              </div>
              <div className="goal-progress-label">
                <span>{goal.progress}%</span>
                {goal.totalTasks > 0 && (
                  <span>
                    {goal.completedTasks} / {goal.totalTasks} tasks
                  </span>
                )}
              </div>
            </div>

            <div className="goal-card-pills">
              <span
                className="goal-pill goal-pill--plan"
                style={{ display: goal.linkedPlanNames.length > 0 ? 'inline-flex' : 'none' }}
              >
                Linked plan: {goal.linkedPlanNames[0]}
                {goal.linkedPlanNames.length > 1 && ` +${goal.linkedPlanNames.length - 1}`}
              </span>
              <span
                className="goal-pill goal-pill--due"
                style={{ display: goal.due_date ? 'inline-flex' : 'none' }}
              >
                Due date: {goal.due_date ? new Date(goal.due_date + 'T00:00:00').toLocaleDateString(undefined, {
                  year: 'numeric',
                  month: 'short',
                  day: 'numeric',
                }) : ''}
              </span>
              {goal.tags && goal.tags.length > 0 &&
                goal.tags.map((tag: Tag) => (
                  <span
                    key={tag.id}
                    className={`goal-pill goal-tag goal-tag--${tag.color}`}
                  >
                    {tag.label}
                  </span>
                ))
              }
            </div>
          </div>
        );
        })
        )}
      </div>

      {activeWorkspace && (
        <CreateGoalModal
          isOpen={isCreateModalOpen}
          workspaceId={activeWorkspace.id}
          onClose={() => setIsCreateModalOpen(false)}
          onSubmit={handleCreateGoal}
        />
      )}

      {selectedGoal && activeWorkspace && (
        <GoalDetailModal
          isOpen
          goal={selectedGoal}
          workspaceId={activeWorkspace.id}
          onClose={() => setSelectedGoal(null)}
          onLinksChanged={loadGoals}
          onDeleted={handleDeleteGoal}
        />
      )}
    </div>
  );
}