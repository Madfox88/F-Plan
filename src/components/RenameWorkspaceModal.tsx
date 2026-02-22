import React, { useState, useEffect } from 'react';
import { useWorkspace } from '../context/WorkspaceContext';
import { useEscapeKey } from '../hooks/useEscapeKey';
import './RenameWorkspaceModal.css';

interface RenameWorkspaceModalProps {
  isOpen: boolean;
  workspaceId: string | null;
  onClose: () => void;
}

export const RenameWorkspaceModal: React.FC<RenameWorkspaceModalProps> = ({
  isOpen,
  workspaceId,
  onClose,
}) => {
  const [name, setName] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const { workspaces, renameWorkspace } = useWorkspace();

  const workspace = workspaceId ? workspaces.find((w) => w.id === workspaceId) : null;

  useEffect(() => {
    if (isOpen && workspace) {
      setName(workspace.name);
      setError(null);
    }
  }, [isOpen, workspace]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!name.trim()) {
      setError('Workspace name is required');
      return;
    }

    if (name.trim() === workspace?.name) {
      onClose();
      return;
    }

    setIsLoading(true);
    try {
      if (workspaceId) {
        await renameWorkspace(workspaceId, name.trim());
      }
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to rename workspace');
    } finally {
      setIsLoading(false);
    }
  };

  useEscapeKey(isOpen, onClose);

  if (!isOpen || !workspace) return null;

  return (
    <div className="modal-overlay" onClick={onClose} role="dialog" aria-modal="true">
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>Rename Workspace</h2>
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
            <label htmlFor="workspace-name">New Name</label>
            <input
              id="workspace-name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Enter new workspace name"
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
              disabled={isLoading || !name.trim() || name.trim() === workspace.name}
            >
              <span>{isLoading ? 'Renaming...' : 'Rename Workspace'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
