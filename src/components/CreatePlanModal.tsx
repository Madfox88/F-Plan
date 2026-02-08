import React, { useState } from 'react';
import './CreatePlanModal.css';

interface CreatePlanModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (
    title: string,
    description: string,
    intent: string,
    useSuggestedStages: boolean,
    isDraft: boolean,
    customStages?: string[],
    dueDate?: string
  ) => Promise<void>;
}

export function CreatePlanModal({ isOpen, onClose, onSubmit }: CreatePlanModalProps) {
  const [title, setTitle] = useState('');
  const [intent, setIntent] = useState('');
  const [description, setDescription] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [useSuggestedStages, setUseSuggestedStages] = useState(true);
  const [isDraft, setIsDraft] = useState(false);
  const [customStages, setCustomStages] = useState<string[]>(['']);
  const [stageAddError, setStageAddError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleAddStage = () => {
    if (customStages.length >= 6) {
      setStageAddError('Maximum 6 custom stages allowed');
      return;
    }
    setStageAddError(null);
    setCustomStages([...customStages, '']);
  };

  const handleRemoveStage = (index: number) => {
    setStageAddError(null);
    setCustomStages(customStages.filter((_, i) => i !== index));
  };

  const handleStageChange = (index: number, value: string) => {
    setStageAddError(null);
    const newStages = [...customStages];
    newStages[index] = value;
    setCustomStages(newStages);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!title.trim()) {
      setError('Plan title is required');
      return;
    }

    if (!useSuggestedStages && customStages.length === 0) {
      setError('Please add at least one custom stage or select suggested stages');
      return;
    }

    try {
      setLoading(true);
      setError(null);
      const customStagesToPass = !useSuggestedStages
        ? customStages.filter((s) => s.trim())
        : undefined;
      await onSubmit(
        title,
        description,
        intent,
        useSuggestedStages,
        isDraft,
        customStagesToPass,
        dueDate || undefined
      );
      setTitle('');
      setIntent('');
      setDescription('');
      setDueDate('');
      setUseSuggestedStages(true);
      setIsDraft(false);
      setCustomStages(['']);
      setStageAddError(null);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create plan');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="create-plan-modal modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>Create New Plan</h2>
          <button className="close-button" onClick={onClose} aria-label="Close">
            <svg
              width="24"
              height="24"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
            >
              <path d="M18 6L6 18M6 6L18 18" strokeWidth="2" strokeLinecap="round" />
            </svg>
          </button>
        </div>

        <form onSubmit={handleSubmit} className="modal-form">
          <div className="form-group">
            <label htmlFor="plan-title" className="form-label">
              Plan Title *
            </label>
            <input
              id="plan-title"
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g., Launch new collection"
              autoFocus
              disabled={loading}
            />
          </div>

          <div className="form-group">
            <label htmlFor="plan-intent" className="form-label">
              Intent (optional)
            </label>
            <input
              id="plan-intent"
              type="text"
              value={intent}
              onChange={(e) => setIntent(e.target.value)}
              placeholder="What is the purpose of this plan?"
              disabled={loading}
            />
          </div>

          <div className="form-group">
            <label htmlFor="plan-description" className="form-label">
              Description (optional)
            </label>
            <textarea
              id="plan-description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Add details about your plan..."
              rows={3}
              disabled={loading}
            />
          </div>

          <div className="form-group">
            <label htmlFor="plan-due-date" className="form-label">
              Due date (optional)
            </label>
            <input
              id="plan-due-date"
              type="date"
              value={dueDate}
              onChange={(e) => {
                setDueDate(e.target.value);
                e.target.blur();
              }}
              disabled={loading}
            />
          </div>

          <div className="form-group">
            <label className="form-label">Start Mode</label>
            <div className="form-radio-group">
              <label className="form-radio">
                <input
                  type="radio"
                  checked={!useSuggestedStages}
                  onChange={() => setUseSuggestedStages(false)}
                  disabled={loading}
                />
                <span>Blank plan (start from scratch)</span>
              </label>
              <label className="form-radio">
                <input
                  type="radio"
                  checked={useSuggestedStages}
                  onChange={() => setUseSuggestedStages(true)}
                  disabled={loading}
                />
                <span>Suggested stages (Thinking, Planning, Execution, Review)</span>
              </label>
              <label className="form-radio">
                <input
                  type="radio"
                  checked={!useSuggestedStages && customStages.length > 0}
                  onChange={() => setUseSuggestedStages(false)}
                  disabled={loading}
                />
                <span>Custom stages</span>
              </label>
            </div>
          </div>

          {!useSuggestedStages && (
            <div className="form-group">
              <label className="form-label">
                Custom Stages ({customStages.filter((s) => s.trim()).length}/6)
              </label>
              <div className="custom-stages-container">
                {customStages.map((stage, index) => (
                  <div key={index} className="stage-input-row">
                    <input
                      type="text"
                      value={stage}
                      onChange={(e) => handleStageChange(index, e.target.value)}
                      placeholder={`Stage ${index + 1}`}
                      disabled={loading}
                      className="stage-input"
                    />
                    {customStages.length > 1 && (
                      <button
                        type="button"
                        onClick={() => handleRemoveStage(index)}
                        className="btn-remove-stage"
                        disabled={loading}
                        aria-label="Remove stage"
                      >
                        ✕
                      </button>
                    )}
                  </div>
                ))}
              </div>
              <button
                type="button"
                onClick={handleAddStage}
                className="btn-add-stage"
                disabled={loading || customStages.length >= 6}
              >
                + Add Stage
              </button>
              {stageAddError && (
                <div className="form-error">{stageAddError}</div>
              )}
            </div>
          )}

          <div className="form-group">
            <label className="form-checkbox">
              <input
                type="checkbox"
                checked={isDraft}
                onChange={(e) => setIsDraft(e.target.checked)}
                disabled={loading}
              />
              <span>Save as draft</span>
            </label>
          </div>

          {error && <div className="form-error">{error}</div>}

          <div className="modal-footer">
            <button type="button" className="btn-secondary" onClick={onClose} disabled={loading}>
              Cancel
            </button>
            <button type="submit" className="btn-primary" disabled={loading}>
              {loading ? 'Creating...' : 'Create Plan'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
