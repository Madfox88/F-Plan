/**
 * TaskReadOnlyModal — Read-only task popup for Calendar (CALENDAR_RULES.md §7.1)
 *
 * Must show: Title, Status, Completion state, Priority, Due date,
 * Description, Labels/tags, Checklist progress, Plan name, Stage name,
 * Created date, Updated date.
 *
 * No edit controls. No inline toggles. No checkbox mutation.
 * Uses universal popup system (ModalBase.css).
 */

import type { TaskWithContext } from '../lib/database';
import './TaskReadOnlyModal.css';

interface TaskReadOnlyModalProps {
  isOpen: boolean;
  task: TaskWithContext;
  onClose: () => void;
}

export function TaskReadOnlyModal({ isOpen, task, onClose }: TaskReadOnlyModalProps) {
  if (!isOpen) return null;

  const checklistItems = task.checklists || [];
  const checklistDone = checklistItems.filter((c) => c.completed).length;
  const checklistTotal = checklistItems.length;

  const statusLabel = (task.status || (task.completed ? 'completed' : 'not_started'))
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (c) => c.toUpperCase());

  const priorityLabel = (task.priority || 'medium')
    .replace(/\b\w/g, (c) => c.toUpperCase());

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content task-readonly-modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>Task Details</h2>
          <button className="close-button" onClick={onClose} aria-label="Close">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor">
              <path d="M18 6L6 18M6 6L18 18" strokeWidth="2" strokeLinecap="round" />
            </svg>
          </button>
        </div>

        <div className="modal-body">
          <h3 className="tro-title">{task.title}</h3>

          <div className="tro-meta-grid">
            <div className="tro-meta-item">
              <span className="tro-meta-label">Status</span>
              <span className="tro-meta-value">{statusLabel}</span>
            </div>
            <div className="tro-meta-item">
              <span className="tro-meta-label">Completed</span>
              <span className="tro-meta-value">{task.completed ? 'Yes' : 'No'}</span>
            </div>
            <div className="tro-meta-item">
              <span className="tro-meta-label">Priority</span>
              <span className={`tro-meta-value tro-priority tro-priority--${task.priority || 'medium'}`}>
                {priorityLabel}
              </span>
            </div>
            <div className="tro-meta-item">
              <span className="tro-meta-label">Due Date</span>
              <span className="tro-meta-value">
                {task.due_date
                  ? new Date(task.due_date + 'T00:00:00').toLocaleDateString(undefined, {
                      year: 'numeric', month: 'short', day: 'numeric',
                    })
                  : '—'}
              </span>
            </div>
            <div className="tro-meta-item">
              <span className="tro-meta-label">Plan</span>
              <span className="tro-meta-value">{task.plan_title}</span>
            </div>
            <div className="tro-meta-item">
              <span className="tro-meta-label">Stage</span>
              <span className="tro-meta-value">{task.stage_title}</span>
            </div>
          </div>

          {task.description && (
            <div className="tro-section">
              <span className="tro-section-label">Description</span>
              <p className="tro-description">{task.description}</p>
            </div>
          )}

          {task.labels && task.labels.length > 0 && (
            <div className="tro-section">
              <span className="tro-section-label">Labels</span>
              <div className="tro-labels">
                {task.labels.map((label) => (
                  <span
                    key={label.id}
                    className="tro-label"
                    style={{ borderColor: label.color }}
                  >
                    {label.name}
                  </span>
                ))}
              </div>
            </div>
          )}

          {checklistTotal > 0 && (
            <div className="tro-section">
              <span className="tro-section-label">
                Checklist ({checklistDone}/{checklistTotal})
              </span>
              <div className="tro-checklist-bar">
                <div
                  className="tro-checklist-fill"
                  style={{ width: `${(checklistDone / checklistTotal) * 100}%` }}
                />
              </div>
            </div>
          )}

          <div className="tro-footer-meta">
            <span>Created: {new Date(task.created_at).toLocaleDateString(undefined, {
              year: 'numeric', month: 'short', day: 'numeric',
            })}</span>
          </div>
        </div>

        <div className="modal-footer">
          <button className="btn-primary" onClick={onClose}>Done</button>
        </div>
      </div>
    </div>
  );
}
