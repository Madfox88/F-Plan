import './Sidebar.css';

type NavigationItem = {
  id: string;
  label: string;
  icon: string;
};

const NAV_ITEMS: NavigationItem[] = [
  { id: 'plans', label: 'Plans', icon: '📋' },
  { id: 'dashboard', label: 'Dashboard', icon: '📊' },
];

interface SidebarProps {
  activeTab: string;
  onTabChange: (tabId: string) => void;
}

export function Sidebar({ activeTab, onTabChange }: SidebarProps) {
  return (
    <aside className="sidebar glass">
      <div className="sidebar-header">
        <h1 className="sidebar-title">F-Plan</h1>
      </div>

      <nav className="sidebar-nav">
        {NAV_ITEMS.map((item) => (
          <button
            key={item.id}
            className={`nav-item ${activeTab === item.id ? 'active' : ''}`}
            onClick={() => onTabChange(item.id)}
          >
            <span className="nav-icon">{item.icon}</span>
            <span className="nav-label">{item.label}</span>
          </button>
        ))}
      </nav>

      <div className="sidebar-footer">
        <button className="sidebar-button">⚙️ Settings</button>
      </div>
    </aside>
  );
}
