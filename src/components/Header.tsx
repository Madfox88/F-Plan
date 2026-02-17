import { WorkspaceSwitcher } from './WorkspaceSwitcher';
import { ThemeToggle } from './ThemeToggle';
import { ProfileAvatar } from './ProfileAvatar';
import { HeaderGreeting } from './HeaderGreeting';
import './Header.css';

interface HeaderProps {
  onCreateWorkspace: () => void;
  onRenameWorkspace: (workspaceId: string) => void;
  onProfileClick: () => void;
  onSignOut: () => void;
  userName?: string;
}

export function Header({
  onCreateWorkspace,
  onRenameWorkspace,
  onProfileClick,
  onSignOut,
  userName = 'User',
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
        <div className="header-text">
          <HeaderGreeting userName={userName} />
        </div>
      </div>
    </header>
  );
}
