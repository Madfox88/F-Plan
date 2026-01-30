import { WorkspaceSwitcher } from './WorkspaceSwitcher';
import './Header.css';

interface HeaderProps {
  title: string;
  subtitle?: string;
  onCreateWorkspace: () => void;
  onRenameWorkspace: (workspaceId: string) => void;
}

export function Header({
  title,
  subtitle,
  onCreateWorkspace,
  onRenameWorkspace,
}: HeaderProps) {
  return (
    <header className="header glass">
      <div className="header-content">
        <WorkspaceSwitcher
          onCreateClick={onCreateWorkspace}
          onRenameClick={onRenameWorkspace}
        />
        <div className="header-text">
          <h1 className="header-title">{title}</h1>
          {subtitle && <p className="header-subtitle">{subtitle}</p>}
        </div>
      </div>
    </header>
  );
}
