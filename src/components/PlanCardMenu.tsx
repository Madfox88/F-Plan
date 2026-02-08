import { useState, useRef, useEffect } from 'react';
import type { Plan } from '../types/database';
import MoreIcon from '../assets/icons/more.svg';
import PinIcon from '../assets/icons/pin.svg';
import PinFilledIcon from '../assets/icons/pin-filled.svg';
import PenIcon from '../assets/icons/pen-square.svg';
import HideIcon from '../assets/icons/hide.svg';
import ShowIcon from '../assets/icons/show.svg';
import TrashIcon from '../assets/icons/trash.svg';
import './PlanCardMenu.css';

interface PlanCardMenuProps {
  plan: Plan;
  onOpen: (planId: string) => void;
  onRename: (planId: string) => void;
  onPin: (planId: string, isPinned: boolean) => Promise<void>;
  onHide: (planId: string, status: Plan['status']) => void;
  onDelete: (planId: string) => void;
  onLinkGoal?: (planId: string) => void;
}

export function PlanCardMenu({ plan, onOpen, onRename, onPin, onHide, onDelete, onLinkGoal }: PlanCardMenuProps) {
  const [isOpen, setIsOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [isOpen]);

  const handleMenuClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsOpen(!isOpen);
  };

  const handleMenuItemClick = async (action: () => void | Promise<void>, e: React.MouseEvent) => {
    e.stopPropagation();
    await action();
    setIsOpen(false);
  };

  return (
    <div className="plan-card-menu" ref={menuRef}>
      <button
        className="plan-menu-btn"
        onClick={handleMenuClick}
        aria-label="Plan options"
        title="Plan options"
      >
        <img src={MoreIcon} alt="" className="plan-menu-icon" />
      </button>

      {isOpen && (
        <div className="plan-menu-dropdown glass">
          <button
            className="menu-item"
            onClick={(e) => handleMenuItemClick(() => onOpen(plan.id), e)}
          >
            <svg className="menu-item-icon" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2zM22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z" />
            </svg>
            <span>Open</span>
          </button>

          <button
            className="menu-item"
            onClick={(e) => handleMenuItemClick(() => onRename(plan.id), e)}
          >
            <img src={PenIcon} alt="" className="menu-item-icon" />
            <span>Rename</span>
          </button>

          {onLinkGoal && (
            <button
              className="menu-item"
              onClick={(e) => handleMenuItemClick(() => onLinkGoal(plan.id), e)}
            >
              <svg className="menu-item-icon" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="12" cy="12" r="10" />
                <path d="M8 12h8M12 8v8" />
              </svg>
              <span>Link Goal</span>
            </button>
          )}

          <button
            className="menu-item"
            onClick={(e) => handleMenuItemClick(() => onPin(plan.id, !plan.is_pinned), e)}
          >
            <img src={plan.is_pinned ? PinFilledIcon : PinIcon} alt="" className="menu-item-icon" />
            <span>{plan.is_pinned ? 'Unpin' : 'Pin'}</span>
          </button>

          <button
            className="menu-item"
            onClick={(e) => handleMenuItemClick(() => onHide(plan.id, plan.status), e)}
          >
            <img src={plan.status === 'archived' ? ShowIcon : HideIcon} alt="" className="menu-item-icon" />
            <span>{plan.status === 'archived' ? 'Show' : 'Hide'}</span>
          </button>

          <button
            className="menu-item menu-item-danger"
            onClick={(e) => handleMenuItemClick(() => onDelete(plan.id), e)}
          >
            <img src={TrashIcon} alt="" className="menu-item-icon" />
            <span>Delete</span>
          </button>
        </div>
      )}
    </div>
  );
}
