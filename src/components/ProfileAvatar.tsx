import { useState, useRef, useEffect, useMemo } from 'react';
import { createPortal } from 'react-dom';
import './ProfileAvatar.css';
import { useAvatar } from '../context/AvatarContext';

const CLOSE_MENUS_EVENT = 'fplan:close-menus';

interface ProfileAvatarProps {
  onProfileClick: () => void;
  onSignOut: () => void;
}

export function ProfileAvatar({ onProfileClick, onSignOut }: ProfileAvatarProps) {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const avatarRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const { avatarUrl } = useAvatar();

  const menuPosition = useMemo(() => {
    if (!isMenuOpen || !avatarRef.current) {
      return null;
    }

    const rect = avatarRef.current.getBoundingClientRect();
    return {
      top: rect.bottom + 6,
      right: window.innerWidth - rect.right,
    };
  }, [isMenuOpen]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Node;
      const clickedAvatar = avatarRef.current?.contains(target);
      const clickedMenu = menuRef.current?.contains(target);

      if (!clickedAvatar && !clickedMenu) {
        setIsMenuOpen(false);
      }
    };

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setIsMenuOpen(false);
      }
    };

    const handleCloseMenus = (event: Event) => {
      const customEvent = event as CustomEvent<string>;
      if (customEvent.detail !== 'profile') {
        setIsMenuOpen(false);
      }
    };

    if (isMenuOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      document.addEventListener('keydown', handleEscape);
      window.addEventListener(CLOSE_MENUS_EVENT, handleCloseMenus);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleEscape);
      window.removeEventListener(CLOSE_MENUS_EVENT, handleCloseMenus);
    };
  }, [isMenuOpen]);

  const handleAvatarClick = () => {
    setIsMenuOpen((prev) => {
      const next = !prev;
      if (next) {
        window.dispatchEvent(new CustomEvent(CLOSE_MENUS_EVENT, { detail: 'profile' }));
      }
      return next;
    });
  };

  return (
    <div className="profile-avatar-container">
      <button
        ref={avatarRef}
        className="profile-avatar"
        onClick={handleAvatarClick}
        aria-label="Profile menu"
        aria-expanded={isMenuOpen}
      >
        {avatarUrl ? (
          <img src={avatarUrl} alt="" className="avatar-image" />
        ) : (
          <div className="avatar-placeholder" />
        )}
      </button>

      {isMenuOpen && menuPosition &&
        createPortal(
          <div
            ref={menuRef}
            className="profile-menu"
            style={{ top: menuPosition.top, right: menuPosition.right }}
          >
            <div
              className="profile-menu-item"
              role="button"
              onClick={() => {
                onProfileClick();
                setIsMenuOpen(false);
              }}
            >
              Profile
            </div>
            <div
              className="profile-menu-item"
              role="button"
              onClick={() => {
                setIsMenuOpen(false);
                onSignOut();
              }}
            >
              Sign out
            </div>
          </div>,
          document.body
        )}
    </div>
  );
}
