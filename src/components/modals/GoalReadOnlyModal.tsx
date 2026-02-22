/**
 * GoalReadOnlyModal — Read-only goal popup for Calendar (CALENDAR_RULES.md §7.2)
 *
 * Must show: Title, Description, Due date, Tags, Progress percentage,
 * Completed/Total tasks, Linked plan summary, Created date, Updated date.
 *
 * No edit controls. No linking controls. No mutation actions.
 * Uses universal popup system (ModalBase.css).
 */

import type { GoalForCalendar } from '../../lib/db';
import type { GoalTag } from '../../types/database';
import { useEscapeKey } from '../../hooks/useEscapeKey';
import './GoalReadOnlyModal.css';

interface GoalReadOnlyModalProps {
  isOpen: boolean;
  goal: GoalForCalendar;
  onClose: () => void;
}

export function GoalReadOnlyModal({ isOpen, goal, onClose }: GoalReadOnlyModalProps) {
  useEscapeKey(isOpen, onClose);

  if (!isOpen) return null;

  const tags = (goal.tags || []) as GoalTag[];

  return (
    <div className="modal-overlay" onClick={onClose} role="dialog" aria-modal="true">
      <div className="modal-content goal-readonly-modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>Goal Details</h2>
          <button className="close-button" onClick={onClose} aria-label="Close">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor">
              <path d="M18 6L6 18M6 6L18 18" strokeWidth="2" strokeLinecap="round" />
            </svg>
          </button>
        </div>

        <div className="modal-body">
          <h3 className="gro-title">{goal.title}</h3>

          {goal.description && (
            <p className="gro-description">{goal.description}</p>
          )}

          <div className="gro-meta-grid">
            <div className="gro-meta-item">
              <span className="gro-meta-label">Due Date</span>
              <span className="gro-meta-value">
                {goal.due_date
                  ? new Date(goal.due_date + 'T00:00:00').toLocaleDateString(undefined, {
                      year: 'numeric', month: 'short', day: 'numeric',
                    })
                  : '—'}
              </span>
            </div>
            <div className="gro-meta-item">
              <span className="gro-meta-label">Progress</span>
              <span className="gro-meta-value">{goal.progress}%</span>
            </div>
            <div className="gro-meta-item">
              <span className="gro-meta-label">Tasks</span>
              <span className="gro-meta-value">
                {goal.completedTasks} / {goal.totalTasks} completed
              </span>
            </div>
            <div className="gro-meta-item">
              <span className="gro-meta-label">Linked Plans</span>
              <span className="gro-meta-value">
                {goal.linkedPlanNames.length > 0
                  ? `${goal.linkedPlanNames[0]}${goal.linkedPlanNames.length > 1 ? ` +${goal.linkedPlanNames.length - 1} more` : ''}`
                  : 'None'}
              </span>
            </div>
          </div>

          {/* Progress bar */}
          <div className="gro-progress">
            <div className="gro-progress-track">
              <div
                className="gro-progress-fill"
                style={{ width: `${goal.progress}%` }}
              />
            </div>
          </div>

          {tags.length > 0 && (
            <div className="gro-section">
              <span className="gro-section-label">Tags</span>
              <div className="gro-tags">
                {tags.map((tag) => (
                  <span key={tag.label} className={`gro-tag gro-tag--${tag.color}`}>
                    {tag.label}
                  </span>
                ))}
              </div>
            </div>
          )}

          <div className="gro-footer-meta">
            <span>Created: {new Date(goal.created_at).toLocaleDateString(undefined, {
              year: 'numeric', month: 'short', day: 'numeric',
            })}</span>
          </div>
        </div>

        <div className="modal-footer">
          <button className="btn-primary" onClick={onClose}><span>Done</span></button>
        </div>
      </div>
    </div>
  );
}
