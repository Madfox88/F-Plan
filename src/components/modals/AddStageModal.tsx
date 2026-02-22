import React, { useState, useEffect, useRef } from 'react';
import { useEscapeKey } from '../../hooks/useEscapeKey';
import './AddStageModal.css';

interface AddStageModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (name: string) => void;
}

export const AddStageModal: React.FC<AddStageModalProps> = ({
  isOpen,
  onClose,
  onSubmit,
}) => {
  const [name, setName] = useState('');
  const [error, setError] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  /* eslint-disable react-hooks/set-state-in-effect -- resetting form state on open is idiomatic */
  useEffect(() => {
    if (isOpen) {
      setName('');
      setError('');
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [isOpen]);
  /* eslint-enable react-hooks/set-state-in-effect */

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = name.trim();
    if (!trimmed) {
      setError('Stage name is required');
      return;
    }
    onSubmit(trimmed);
    onClose();
  };

  useEscapeKey(isOpen, onClose);

  if (!isOpen) return null;

  return (
    <div className="modal-overlay" onClick={onClose} role="dialog" aria-modal="true">
      <div
        className="add-stage-modal modal-content"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="modal-header">
          <h2>Add Stage</h2>
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
            <label className="form-label" htmlFor="stage-name">Stage Name</label>
            <input
              id="stage-name"
              ref={inputRef}
              type="text"
              placeholder="e.g. Research, Design, Development..."
              value={name}
              onChange={(e) => {
                setName(e.target.value);
                if (error) setError('');
              }}
              maxLength={100}
            />
            {error && <span className="error-message">{error}</span>}
          </div>

          <div className="modal-footer">
            <button type="button" className="btn-secondary" onClick={onClose}>
              <span>Cancel</span>
            </button>
            <button type="submit" className="btn-primary">
              <span>Add Stage</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
