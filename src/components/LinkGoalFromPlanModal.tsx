import React, { useEffect, useState, useCallback } from 'react';
import { getGoalsByWorkspace, getLinkedGoalIdsForPlan, linkGoalToPlan, unlinkGoalFromPlan } from '../lib/database';
import type { Goal } from '../types/database';
import { useEscapeKey } from '../hooks/useEscapeKey';
import './LinkGoalFromPlanModal.css';

interface LinkGoalFromPlanModalProps {
  isOpen: boolean;
  planId: string;
  workspaceId: string;
  onClose: () => void;
  onChanged: () => void;
}

export const LinkGoalFromPlanModal: React.FC<LinkGoalFromPlanModalProps> = ({
  isOpen,
  planId,
  workspaceId,
  onClose,
  onChanged,
}) => {
  const [goals, setGoals] = useState<Goal[]>([]);
  const [linkedIds, setLinkedIds] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const [allGoals, linked] = await Promise.all([
        getGoalsByWorkspace(workspaceId),
        getLinkedGoalIdsForPlan(planId),
      ]);
      setGoals(allGoals);
      setLinkedIds(new Set(linked));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load goals');
    } finally {
      setLoading(false);
    }
  }, [planId, workspaceId]);

  useEffect(() => {
    if (isOpen) {
      loadData();
    }
  }, [isOpen, loadData]);

  const handleToggle = async (goalId: string) => {
    setUpdatingId(goalId);
    setError(null);
    try {
      if (linkedIds.has(goalId)) {
        await unlinkGoalFromPlan(planId, goalId);
        setLinkedIds((prev) => {
          const next = new Set(prev);
          next.delete(goalId);
          return next;
        });
      } else {
        await linkGoalToPlan(planId, goalId);
        setLinkedIds((prev) => new Set(prev).add(goalId));
      }
      onChanged();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update link');
    } finally {
      setUpdatingId(null);
    }
  };

  useEscapeKey(isOpen, onClose);

  if (!isOpen) return null;

  return (
    <div className="modal-overlay" onClick={onClose} role="dialog" aria-modal="true">
      <div
        className="link-goal-modal modal-content"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="modal-header">
          <h2>Link Goals</h2>
          <button className="close-button" onClick={onClose} aria-label="Close">
            <svg
              width="24"
              height="24"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
            >
              <path
                d="M18 6L6 18M6 6L18 18"
                strokeWidth="2"
                strokeLinecap="round"
              />
            </svg>
          </button>
        </div>

        <div className="link-goal-body">
          {loading && <div className="link-goal-loading">Loading goals...</div>}

          {!loading && error && <div className="error-message">{error}</div>}

          {!loading && !error && goals.length === 0 && (
            <div className="link-goal-empty">No goals available to link.</div>
          )}

          {!loading && !error && goals.length > 0 && (
            <ul className="link-goal-list">
              {goals.map((goal) => {
                const isLinked = linkedIds.has(goal.id);
                const isUpdating = updatingId === goal.id;
                return (
                  <li key={goal.id} className="link-goal-item">
                    <div className="link-goal-info">
                      <span className="link-goal-title">{goal.title}</span>
                      {goal.description && (
                        <span className="link-goal-desc">{goal.description}</span>
                      )}
                    </div>
                    <button
                      className={`link-goal-toggle ${isLinked ? 'linked' : ''}`}
                      onClick={() => handleToggle(goal.id)}
                      disabled={isUpdating}
                    >
                      {isUpdating ? '...' : isLinked ? 'Unlink' : 'Link'}
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </div>

        <div className="modal-footer">
          <button className="btn-primary" onClick={onClose}><span>Done</span></button>
        </div>
      </div>
    </div>
  );
};
