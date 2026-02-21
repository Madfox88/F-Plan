import React, { useState, useEffect } from 'react';
import { getActivePlans, getTagsByWorkspace } from '../lib/database';
import { TagPicker } from './TagPicker';
import type { Plan, Tag } from '../types/database';
import './CreateGoalModal.css';

interface CreateGoalModalProps {
  isOpen: boolean;
  workspaceId: string;
  onClose: () => void;
  onSubmit: (title: string, description: string, planIds: string[], dueDate: string, tagIds: string[]) => Promise<void>;
}

export const CreateGoalModal: React.FC<CreateGoalModalProps> = ({
  isOpen,
  workspaceId,
  onClose,
  onSubmit,
}) => {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [selectedTagIds, setSelectedTagIds] = useState<string[]>([]);
  const [workspaceTags, setWorkspaceTags] = useState<Tag[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  /* Plan picker state */
  const [plans, setPlans] = useState<Plan[]>([]);
  const [plansLoading, setPlansLoading] = useState(false);
  const [selectedPlanIds, setSelectedPlanIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (isOpen) {
      setTitle('');
      setDescription('');
      setDueDate('');
      setSelectedTagIds([]);
      setError(null);
      setSelectedPlanIds(new Set());

      /* Load active plans */
      setPlansLoading(true);
      getActivePlans(workspaceId)
        .then((data) => setPlans(data))
        .catch(() => setPlans([]))
        .finally(() => setPlansLoading(false));

      /* Load workspace tags */
      getTagsByWorkspace(workspaceId)
        .then((data) => setWorkspaceTags(data))
        .catch(() => setWorkspaceTags([]));
    }
  }, [isOpen, workspaceId]);

  const togglePlan = (planId: string) => {
    setSelectedPlanIds((prev) => {
      const next = new Set(prev);
      if (next.has(planId)) {
        next.delete(planId);
      } else {
        next.add(planId);
      }
      return next;
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!title.trim()) {
      setError('Goal title is required');
      return;
    }

    setIsLoading(true);
    try {
      await onSubmit(title.trim(), description.trim(), Array.from(selectedPlanIds), dueDate, selectedTagIds);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create goal');
    } finally {
      setIsLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="modal-overlay" onClick={onClose} role="dialog" aria-modal="true">
      <div
        className="create-goal-modal modal-content"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="modal-header">
          <h2>Create New Goal</h2>
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

        <form className="modal-form" onSubmit={handleSubmit}>
          <div className="form-group">
            <label htmlFor="goal-title">Title</label>
            <input
              id="goal-title"
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="What outcome are you working toward?"
              autoFocus
              disabled={isLoading}
              maxLength={255}
            />
          </div>

          <div className="form-group">
            <label htmlFor="goal-description">Description (optional)</label>
            <textarea
              id="goal-description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Why does this goal matter?"
              disabled={isLoading}
              rows={3}
            />
          </div>

          {/* Target date */}
          <div className="form-group">
            <label htmlFor="goal-due-date">Target date (optional)</label>
            <input
              id="goal-due-date"
              type="date"
              value={dueDate}
              onChange={(e) => {
                setDueDate(e.target.value);
                e.target.blur();
              }}
              disabled={isLoading}
            />
          </div>

          {/* Tags */}
          <div className="form-group">
            <label>Tags (optional)</label>
            <TagPicker
              workspaceTags={workspaceTags}
              selectedTagIds={selectedTagIds}
              onChange={setSelectedTagIds}
              workspaceId={workspaceId}
              onTagCreated={(tag) => setWorkspaceTags((prev) => [...prev, tag].sort((a, b) => a.label.localeCompare(b.label)))}
              disabled={isLoading}
            />
          </div>

          {/* Plan picker */}
          <div className="form-group">
            <label>Link to Plans (optional)</label>
            {plansLoading ? (
              <div className="plan-picker-loading">Loading plans...</div>
            ) : plans.length === 0 ? (
              <div className="plan-picker-empty">No active plans to link.</div>
            ) : (
              <ul className="plan-picker-list">
                {plans.map((plan) => {
                  const isSelected = selectedPlanIds.has(plan.id);
                  return (
                    <li
                      key={plan.id}
                      className={`plan-picker-item ${isSelected ? 'selected' : ''}`}
                      onClick={() => !isLoading && togglePlan(plan.id)}
                      role="checkbox"
                      aria-checked={isSelected}
                      tabIndex={0}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' || e.key === ' ') {
                          e.preventDefault();
                          togglePlan(plan.id);
                        }
                      }}
                    >
                      <span className={`plan-picker-check ${isSelected ? 'checked' : ''}`}>
                        {isSelected ? '✓' : ''}
                      </span>
                      <span className="plan-picker-title">{plan.title}</span>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>

          {error && <div className="error-message">{error}</div>}

          <div className="modal-footer">
            <button
              type="button"
              className="btn-secondary"
              onClick={onClose}
              disabled={isLoading}
            >
              <span>Cancel</span>
            </button>
            <button
              type="submit"
              className="btn-primary"
              disabled={isLoading || !title.trim()}
            >
              <span>{isLoading ? 'Creating...' : 'Create Goal'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
