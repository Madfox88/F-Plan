import React, { useEffect, useState, useCallback } from 'react';
import { getLinkedPlansWithProgress } from '../lib/database';
import type { LinkedPlanWithProgress } from '../lib/database';
import type { GoalWithProgress } from '../lib/database';
import { LinkPlanModal } from './LinkPlanModal';
import './GoalDetailModal.css';

interface GoalDetailModalProps {
  isOpen: boolean;
  goal: GoalWithProgress;
  workspaceId: string;
  onClose: () => void;
  onLinksChanged: () => void;
}

export const GoalDetailModal: React.FC<GoalDetailModalProps> = ({
  isOpen,
  goal,
  workspaceId,
  onClose,
  onLinksChanged,
}) => {
  const [linkedPlans, setLinkedPlans] = useState<LinkedPlanWithProgress[]>([]);
  const [loading, setLoading] = useState(true);
  const [isLinkModalOpen, setIsLinkModalOpen] = useState(false);

  const loadLinkedPlans = useCallback(async () => {
    try {
      setLoading(true);
      const plans = await getLinkedPlansWithProgress(goal.id, workspaceId);
      setLinkedPlans(plans);
    } catch (err) {
      console.error('Failed to load linked plans:', err);
    } finally {
      setLoading(false);
    }
  }, [goal.id, workspaceId]);

  useEffect(() => {
    if (isOpen) {
      loadLinkedPlans();
    }
  }, [isOpen, loadLinkedPlans]);

  const handleLinksChanged = () => {
    loadLinkedPlans();
    onLinksChanged();
  };

  if (!isOpen) return null;

  // Derive totals from linked plans for the detail view
  const totalTasks = linkedPlans.reduce((sum, p) => sum + p.totalTasks, 0);
  const completedTasks = linkedPlans.reduce((sum, p) => sum + p.completedTasks, 0);
  const progress = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

  return (
    <>
      <div className="modal-overlay" onClick={onClose}>
        <div
          className="goal-detail-modal modal-content"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="modal-header">
            <h2>{goal.title}</h2>
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

          <div className="goal-detail-body">
            {goal.description && (
              <p className="goal-detail-description">{goal.description}</p>
            )}

            {/* Progress */}
            <div className="goal-detail-progress">
              <div className="goal-detail-progress-track">
                <div
                  className="goal-detail-progress-fill"
                  style={{ width: `${progress}%` }}
                />
              </div>
              <div className="goal-detail-progress-label">
                <span>{progress}% complete</span>
                {totalTasks > 0 && (
                  <span>
                    {completedTasks} / {totalTasks} tasks
                  </span>
                )}
              </div>
            </div>

            {/* Linked Plans */}
            <div className="goal-detail-section">
              <div className="goal-detail-section-header">
                <h3>Linked Plans</h3>
                <button
                  className="btn-secondary goal-detail-link-btn"
                  onClick={() => setIsLinkModalOpen(true)}
                >
                  Link Plan
                </button>
              </div>

              {loading && (
                <div className="goal-detail-plans-loading">Loading...</div>
              )}

              {!loading && linkedPlans.length === 0 && (
                <div className="goal-detail-plans-empty">
                  Not linked yet. Link plans to track progress toward this goal.
                </div>
              )}

              {!loading && linkedPlans.length > 0 && (
                <ul className="goal-detail-plans-list">
                  {linkedPlans.map((plan) => (
                    <li key={plan.id} className="goal-detail-plan-item">
                      <div className="goal-detail-plan-info">
                        <span className="goal-detail-plan-title">
                          {plan.title}
                        </span>
                        <div className="goal-detail-plan-meta">
                          <span>{plan.progress}%</span>
                          <span className="goal-detail-plan-sep">·</span>
                          <span>
                            {plan.completedTasks}/{plan.totalTasks} tasks
                          </span>
                        </div>
                      </div>
                      <div className="goal-detail-plan-bar-track">
                        <div
                          className="goal-detail-plan-bar-fill"
                          style={{ width: `${plan.progress}%` }}
                        />
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        </div>
      </div>

      <LinkPlanModal
        isOpen={isLinkModalOpen}
        goalId={goal.id}
        workspaceId={workspaceId}
        onClose={() => setIsLinkModalOpen(false)}
        onChanged={handleLinksChanged}
      />
    </>
  );
};
