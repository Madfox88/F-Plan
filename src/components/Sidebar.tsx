import Logo from '../assets/Logo.png';
import LogoDark from '../assets/logo_dark.png';
import LogoutIcon from '../assets/icons/logout.svg';
import SettingsSlidersIcon from '../assets/icons/settings-sliders.svg';
import DashboardIcon from '../assets/icons/dashboard.svg';
import GoalsIcon from '../assets/icons/goals.svg';
import PlansIcon from '../assets/icons/Plans.svg';
import TasksIcon from '../assets/icons/tasks.svg';
import CalendarIcon from '../assets/icons/calendar.svg';
import './Sidebar.css';

type NavigationItem = {
  id: string;
  label: string;
  icon: string;
};

const NAV_ITEMS: NavigationItem[] = [
  { id: 'dashboard', label: 'Dashboard', icon: DashboardIcon },
  { id: 'goals', label: 'Goals', icon: GoalsIcon },
  { id: 'plans', label: 'Plans', icon: PlansIcon },
  { id: 'tasks', label: 'Tasks', icon: TasksIcon },
  { id: 'calendar', label: 'Calendar', icon: CalendarIcon },
];

interface SidebarProps {
  activeTab: string;
  onTabChange: (tabId: string) => void;
}

export function Sidebar({ activeTab, onTabChange }: SidebarProps) {
  return (
    <aside className="sidebar glass">
      <div className="sidebar-header">
        <img src={Logo} alt="F-Plan" className="sidebar-logo sidebar-logo-default" />
        <img src={LogoDark} alt="F-Plan" className="sidebar-logo sidebar-logo-light" />
      </div>

      <nav className="sidebar-nav">
        {NAV_ITEMS.map((item) => (
          <button
            key={item.id}
            className={`nav-item ${activeTab === item.id ? 'active' : ''}`}
            onClick={() => onTabChange(item.id)}
          >
            <img src={item.icon} alt="" className="nav-icon-img" />
            <span className="nav-label">{item.label}</span>
          </button>
        ))}
      </nav>

      <div className="sidebar-footer">
        <button className="sidebar-footer-button">
          <img src={SettingsSlidersIcon} alt="" className="sidebar-footer-icon" />
          <span>Settings</span>
        </button>
        <button className="sidebar-footer-button">
          <img src={LogoutIcon} alt="" className="sidebar-footer-icon" />
          <span>Logout</span>
        </button>
      </div>
    </aside>
  );
}
