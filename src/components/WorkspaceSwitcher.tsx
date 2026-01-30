import React, { useState, useRef, useEffect } from 'react';
import { useWorkspace } from '../context/WorkspaceContext';
import './WorkspaceSwitcher.css';

interface WorkspaceSwitcherProps {
  onCreateClick: () => void;
  onRenameClick: (workspaceId: string) => void;
}

export const WorkspaceSwitcher: React.FC<WorkspaceSwitcherProps> = ({
  onCreateClick,
  onRenameClick,
}) => {
  const { workspaces, activeWorkspace, setActiveWorkspace, deleteWorkspace } = useWorkspace();
  const [isOpen, setIsOpen] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleDeleteWorkspace = async (workspaceId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setDeleteError(null);

    try {
      await deleteWorkspace(workspaceId);
      setIsOpen(false);
    } catch (error) {
      setDeleteError(error instanceof Error ? error.message : 'Failed to delete workspace');
    }
  };

  const handleRenameClick = (workspaceId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    onRenameClick(workspaceId);
    setIsOpen(false);
  };

  const handleSelectWorkspace = (workspaceId: string) => {
    setActiveWorkspace(workspaceId);
    setIsOpen(false);
  };

  if (!activeWorkspace) {
    return <div className="workspace-switcher">Loading...</div>;
  }

  return (
    <div className="workspace-switcher" ref={dropdownRef}>
      <button
        className="workspace-button"
        onClick={() => setIsOpen(!isOpen)}
        title={activeWorkspace.name}
      >
        <span className="workspace-name">{activeWorkspace.name}</span>
        <svg
          className={`chevron-icon ${isOpen ? 'open' : ''}`}
          width="20"
          height="20"
          viewBox="0 0 20 20"
          fill="none"
          stroke="currentColor"
        >
          <path d="M6 8L10 12L14 8" strokeWidth="2" strokeLinecap="round" />
        </svg>
      </button>

      {isOpen && (
        <div className="workspace-dropdown">
          {deleteError && <div className="error-message">{deleteError}</div>}

          <div className="workspace-list">
            {workspaces.map((workspace) => (
              <div
                key={workspace.id}
                className={`workspace-item ${
                  workspace.id === activeWorkspace.id ? 'active' : ''
                }`}
                onClick={() => handleSelectWorkspace(workspace.id)}
              >
                <span className="workspace-item-name">{workspace.name}</span>
                <div className="workspace-item-actions">
                  <button
                    className="action-button rename-button"
                    onClick={(e) => handleRenameClick(workspace.id, e)}
                    title="Rename"
                    aria-label="Rename workspace"
                  >
                    <svg
                      width="16"
                      height="16"
                      viewBox="0 0 16 16"
                      fill="none"
                      stroke="currentColor"
                    >
                      <path d="M3 14h10M11 2L14 5M2 13L5 10L14 1" strokeWidth="1.5" strokeLinecap="round" />
                    </svg>
                  </button>
                  <button
                    className="action-button delete-button"
                    onClick={(e) => handleDeleteWorkspace(workspace.id, e)}
                    title="Delete"
                    aria-label="Delete workspace"
                  >
                    <svg
                      width="16"
                      height="16"
                      viewBox="0 0 16 16"
                      fill="none"
                      stroke="currentColor"
                    >
                      <path d="M13 3H3M6 6v5M10 6v5M2 3h12v11c0 0.5-0.5 1-1 1H3c-0.5 0-1-0.5-1-1V3Z" strokeWidth="1.5" strokeLinecap="round" />
                    </svg>
                  </button>
                </div>
              </div>
            ))}
          </div>

          <button className="create-workspace-button" onClick={onCreateClick}>
            <span>+ New Workspace</span>
          </button>
        </div>
      )}
    </div>
  );
};
