import React, { useState, useRef, useEffect } from 'react';
import { useWorkspace } from '../context/WorkspaceContext';
import './WorkspaceSwitcher.css';
import WorkspaceIcon from '../assets/icons/workspace.svg';
import AngleDownIcon from '../assets/icons/angle-small-down.svg';
import AngleUpIcon from '../assets/icons/angle-small-up.svg';
import TrashIcon from '../assets/icons/trash.svg';
import PenSquareIcon from '../assets/icons/pen-square.svg';

const CLOSE_MENUS_EVENT = 'fplan:close-menus';

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

    const handleCloseMenus = (event: Event) => {
      const customEvent = event as CustomEvent<string>;
      if (customEvent.detail !== 'workspace') {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    window.addEventListener(CLOSE_MENUS_EVENT, handleCloseMenus);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      window.removeEventListener(CLOSE_MENUS_EVENT, handleCloseMenus);
    };
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
        onClick={() => {
          setIsOpen((prev) => {
            const next = !prev;
            if (next) {
              window.dispatchEvent(new CustomEvent(CLOSE_MENUS_EVENT, { detail: 'workspace' }));
            }
            return next;
          });
        }}
        title={activeWorkspace.name}
      >
        <img src={WorkspaceIcon} alt="" className="workspace-icon" />
        <span className="workspace-name">{activeWorkspace.name}</span>
        <img 
          src={isOpen ? AngleUpIcon : AngleDownIcon} 
          alt="" 
          className="chevron-icon" 
        />
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
                    <img src={PenSquareIcon} alt="" />
                  </button>
                  <button
                    className="action-button delete-button"
                    onClick={(e) => handleDeleteWorkspace(workspace.id, e)}
                    title="Delete"
                    aria-label="Delete workspace"
                  >
                    <img src={TrashIcon} alt="" />
                  </button>
                </div>
              </div>
            ))}
          </div>

          <div className="separator"></div>

          <button className="create-workspace-button" onClick={onCreateClick}>
            <span>+ New Workspace</span>
          </button>
        </div>
      )}
    </div>
  );
};
