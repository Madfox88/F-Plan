import React, { useEffect, useState, useCallback } from 'react';
import { getActivePlans, getLinkedPlanIdsForGoal, linkGoalToPlan, unlinkGoalFromPlan } from '../../lib/db';
import type { Plan } from '../../types/database';
import { useEscapeKey } from '../../hooks/useEscapeKey';
import './LinkPlanModal.css';

interface LinkPlanModalProps {
  isOpen: boolean;
  goalId: string;
  workspaceId: string;
  onClose: () => void;
  onChanged: () => void;
}

export const LinkPlanModal: React.FC<LinkPlanModalProps> = ({
  isOpen,
  goalId,
  workspaceId,
  onClose,
  onChanged,
}) => {
  const [plans, setPlans] = useState<Plan[]>([]);
  const [linkedIds, setLinkedIds] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const [activePlans, linked] = await Promise.all([
        getActivePlans(workspaceId),
        getLinkedPlanIdsForGoal(goalId),
      ]);
      setPlans(activePlans);
      setLinkedIds(new Set(linked));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load plans');
    } finally {
      setLoading(false);
    }
  }, [goalId, workspaceId]);

  useEffect(() => {
    if (isOpen) {
      loadData();
    }
  }, [isOpen, loadData]);

  const handleToggle = async (planId: string) => {
    setUpdatingId(planId);
    setError(null);
    try {
      if (linkedIds.has(planId)) {
        await unlinkGoalFromPlan(planId, goalId);
        setLinkedIds((prev) => {
          const next = new Set(prev);
          next.delete(planId);
          return next;
        });
      } else {
        await linkGoalToPlan(planId, goalId);
        setLinkedIds((prev) => new Set(prev).add(planId));
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
        className="link-plan-modal modal-content"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="modal-header">
          <h2>Link Plans</h2>
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

        <div className="link-plan-body">
          {loading && <div className="link-plan-loading">Loading plans...</div>}

          {!loading && error && <div className="error-message">{error}</div>}

          {!loading && !error && plans.length === 0 && (
            <div className="link-plan-empty">No plans available to link.</div>
          )}

          {!loading && !error && plans.length > 0 && (
            <ul className="link-plan-list">
              {plans.map((plan) => {
                const isLinked = linkedIds.has(plan.id);
                const isUpdating = updatingId === plan.id;
                return (
                  <li key={plan.id} className="link-plan-item">
                    <div className="link-plan-info">
                      <span className="link-plan-title">{plan.title}</span>
                      {plan.description && (
                        <span className="link-plan-desc">{plan.description}</span>
                      )}
                    </div>
                    <button
                      className={`link-plan-toggle ${isLinked ? 'linked' : ''}`}
                      onClick={() => handleToggle(plan.id)}
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
          <button className="btn-primary" onClick={onClose}>
            <span>Done</span>
          </button>
        </div>
      </div>
    </div>
  );
};
