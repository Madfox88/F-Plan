import React, { useState, useEffect } from 'react';
import { getActivePlans } from '../lib/database';
import type { Plan } from '../types/database';
import type { GoalTag, GoalTagColor } from '../types/database';
import './CreateGoalModal.css';

const TAG_COLORS: { value: GoalTagColor; hex: string }[] = [
  { value: 'neutral', hex: '#9ca3af' },
  { value: 'blue', hex: '#3b82f6' },
  { value: 'green', hex: '#22c55e' },
  { value: 'orange', hex: '#f97316' },
  { value: 'red', hex: '#ef4444' },
  { value: 'purple', hex: '#a855f7' },
];

function hexToTagColor(hex: string): GoalTagColor {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  let best: GoalTagColor = 'neutral';
  let bestDist = Infinity;
  for (const c of TAG_COLORS) {
    const cr = parseInt(c.hex.slice(1, 3), 16);
    const cg = parseInt(c.hex.slice(3, 5), 16);
    const cb = parseInt(c.hex.slice(5, 7), 16);
    const dist = (r - cr) ** 2 + (g - cg) ** 2 + (b - cb) ** 2;
    if (dist < bestDist) {
      bestDist = dist;
      best = c.value;
    }
  }
  return best;
}

interface CreateGoalModalProps {
  isOpen: boolean;
  workspaceId: string;
  onClose: () => void;
  onSubmit: (title: string, description: string, planIds: string[], dueDate: string, tags: GoalTag[]) => Promise<void>;
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
  const [tags, setTags] = useState<GoalTag[]>([]);
  const [tagInput, setTagInput] = useState('');
  const [tagColorHex, setTagColorHex] = useState('#3b82f6');
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
      setTags([]);
      setTagInput('');
      setTagColorHex('#3b82f6');
      setError(null);
      setSelectedPlanIds(new Set());

      /* Load active plans */
      setPlansLoading(true);
      getActivePlans(workspaceId)
        .then((data) => setPlans(data))
        .catch(() => setPlans([]))
        .finally(() => setPlansLoading(false));
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

  const addTag = () => {
    const label = tagInput.trim();
    if (!label) return;
    if (label.length > 24) {
      setError('Tag label must be 24 characters or fewer');
      return;
    }
    if (tags.length >= 10) {
      setError('Maximum 10 tags allowed');
      return;
    }
    if (tags.some((t) => t.label.toLowerCase() === label.toLowerCase())) {
      setError('Tag already exists');
      return;
    }
    setError(null);
    setTags((prev) => [...prev, { label, color: hexToTagColor(tagColorHex) }]);
    setTagInput('');
    setTagColorHex('#3b82f6');
  };

  const removeTag = (label: string) => {
    setTags((prev) => prev.filter((t) => t.label !== label));
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
      await onSubmit(title.trim(), description.trim(), Array.from(selectedPlanIds), dueDate, tags);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create goal');
    } finally {
      setIsLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="modal-overlay" onClick={onClose}>
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
            <div className="tag-input-row">
              <input
                type="text"
                className="tag-label-input"
                placeholder="Tag label"
                value={tagInput}
                onChange={(e) => setTagInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    addTag();
                  }
                }}
                disabled={isLoading}
                maxLength={24}
              />
              <input
                className="color-input"
                type="color"
                value={tagColorHex}
                onChange={(e) => setTagColorHex(e.target.value)}
                title="Choose color"
                disabled={isLoading}
              />
              <button
                type="button"
                className="btn-secondary tag-add-btn"
                onClick={addTag}
                disabled={isLoading || !tagInput.trim()}
              >
                <span>Add</span>
              </button>
            </div>
            {tags.length > 0 && (
              <div className="tag-pills">
                {tags.map((tag) => (
                  <span key={tag.label} className={`goal-tag goal-tag--${tag.color}`}>
                    {tag.label}
                    <button
                      type="button"
                      className="tag-remove-btn"
                      onClick={() => removeTag(tag.label)}
                      aria-label={`Remove ${tag.label}`}
                    >
                      ×
                    </button>
                  </span>
                ))}
              </div>
            )}
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
