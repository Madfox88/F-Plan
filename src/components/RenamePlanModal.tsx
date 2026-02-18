/**
 * RenamePlanModal — Styled replacement for window.prompt
 *
 * Uses universal popup system (ModalBase.css).
 */

import React, { useState, useEffect } from 'react';
import './RenamePlanModal.css';

interface RenamePlanModalProps {
  isOpen: boolean;
  currentTitle: string;
  onClose: () => void;
  onRename: (newTitle: string) => void;
}

export const RenamePlanModal: React.FC<RenamePlanModalProps> = ({
  isOpen,
  currentTitle,
  onClose,
  onRename,
}) => {
  const [name, setName] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setName(currentTitle);
      setError(null);
    }
  }, [isOpen, currentTitle]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!name.trim()) {
      setError('Plan name is required');
      return;
    }

    if (name.trim() === currentTitle) {
      onClose();
      return;
    }

    setIsLoading(true);
    try {
      await onRename(name.trim());
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to rename plan');
    } finally {
      setIsLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="modal-overlay" onClick={onClose} role="dialog" aria-modal="true">
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>Rename Plan</h2>
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

        <form className="modal-form" onSubmit={handleSubmit}>
          <div className="form-group">
            <label htmlFor="plan-name">New Name</label>
            <input
              id="plan-name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Enter new plan name"
              autoFocus
              disabled={isLoading}
              maxLength={255}
            />
          </div>

          {error && <div className="error-message">{error}</div>}

          <div className="modal-footer">
            <button type="button" className="btn-secondary" onClick={onClose} disabled={isLoading}>
              <span>Cancel</span>
            </button>
            <button
              type="submit"
              className="btn-primary"
              disabled={isLoading || !name.trim() || name.trim() === currentTitle}
            >
              <span>{isLoading ? 'Renaming...' : 'Rename Plan'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
