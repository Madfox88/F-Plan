import { useRef, useEffect, useState } from 'react';
import type { Plan } from '../../types/database';
import PenSquareIcon from '../../assets/icons/pen-square.svg';
import PinIcon from '../../assets/icons/pin.svg';
import PinFilledIcon from '../../assets/icons/pin-filled.svg';
import TrashIcon from '../../assets/icons/trash.svg';
import ChevronDownIcon from '../../assets/icons/angle-small-down.svg';
import HideIcon from '../../assets/icons/hide.svg';
import ShowIcon from '../../assets/icons/show.svg';
import './PlanHeaderMenu.css';

interface PlanHeaderMenuProps {
  plan: Plan;
  onRename: (planId: string) => void;
  onTogglePin: (planId: string, isPinned: boolean) => void;
  onHide: (planId: string, status: Plan['status']) => void;
  onDelete: (planId: string) => void;
}

export function PlanHeaderMenu({ plan, onRename, onTogglePin, onHide, onDelete }: PlanHeaderMenuProps) {
  const [isOpen, setIsOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  return (
    <div className="plan-header-menu-wrapper" ref={menuRef}>
      <button
        className="plan-header-menu-btn"
        onClick={() => setIsOpen(!isOpen)}
        aria-label="Plan options"
      >
        <img src={ChevronDownIcon} alt="" className="plan-header-menu-icon" />
      </button>

      {isOpen && (
        <div className="plan-header-menu-dropdown">
          <button
            className="menu-item"
            onClick={() => {
              onRename(plan.id);
              setIsOpen(false);
            }}
          >
            <img src={PenSquareIcon} alt="" />
            <span>Rename</span>
          </button>

          <button
            className="menu-item"
            onClick={() => {
              onTogglePin(plan.id, !plan.is_pinned);
              setIsOpen(false);
            }}
          >
            <img src={plan.is_pinned ? PinFilledIcon : PinIcon} alt="" />
            <span>{plan.is_pinned ? 'Unpin' : 'Pin'}</span>
          </button>

          <button
            className="menu-item"
            onClick={() => {
              onHide(plan.id, plan.status);
              setIsOpen(false);
            }}
          >
            <img src={plan.status === 'archived' ? ShowIcon : HideIcon} alt="" />
            <span>{plan.status === 'archived' ? 'Show' : 'Hide'}</span>
          </button>

          <button
            className="menu-item menu-item-danger"
            onClick={() => {
              if (window.confirm('Delete this plan?')) {
                onDelete(plan.id);
                setIsOpen(false);
              }
            }}
          >
            <img src={TrashIcon} alt="" />
            <span>Delete</span>
          </button>
        </div>
      )}
    </div>
  );
}
