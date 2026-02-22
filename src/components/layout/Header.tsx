import { WorkspaceSwitcher } from '../workspace/WorkspaceSwitcher';
import { ThemeToggle } from '../ui/ThemeToggle';
import { ProfileAvatar } from '../profile/ProfileAvatar';
import { HeaderGreeting } from './HeaderGreeting';
import './Header.css';

interface HeaderProps {
  onCreateWorkspace: () => void;
  onRenameWorkspace: (workspaceId: string) => void;
  onProfileClick: () => void;
  onSignOut: () => void;
  userName?: string;
  onToggleSidebar?: () => void;
}

export function Header({
  onCreateWorkspace,
  onRenameWorkspace,
  onProfileClick,
  onSignOut,
  userName = 'User',
  onToggleSidebar,
}: HeaderProps) {
  return (
    <header className="header glass">
      <div className="header-content">
        <div className="header-controls">
          <WorkspaceSwitcher
            onCreateClick={onCreateWorkspace}
            onRenameClick={onRenameWorkspace}
          />
          <ThemeToggle />
          <ProfileAvatar onProfileClick={onProfileClick} onSignOut={onSignOut} />
        </div>
        {onToggleSidebar && (
          <button className="header-hamburger" onClick={onToggleSidebar} aria-label="Toggle menu">
            ☰
          </button>
        )}
        <div className="header-text">
          <HeaderGreeting userName={userName} />
        </div>
      </div>
    </header>
  );
}
