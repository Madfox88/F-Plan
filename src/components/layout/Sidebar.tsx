import { useState, useEffect } from 'react';
import { useWorkspace } from '../../context/WorkspaceContext';
import { getPinnedPlans } from '../../lib/db';
import type { Plan } from '../../types/database';
import Logo from '../../assets/Logo.png';
import LogoDark from '../../assets/logo_dark.png';
import LogoutIcon from '../../assets/icons/logout.svg';
import SettingsSlidersIcon from '../../assets/icons/settings-sliders.svg';
import DashboardIcon from '../../assets/icons/dashboard.svg';
import GoalsIcon from '../../assets/icons/goals.svg';
import PlansIcon from '../../assets/icons/Plans.svg';
import TasksIcon from '../../assets/icons/tasks.svg';
import CalendarIcon from '../../assets/icons/calendar.svg';
import FocusIcon from '../../assets/icons/focus.svg';
import ActivityIcon from '../../assets/icons/activity.svg';
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
  { id: 'focus', label: 'Focus', icon: FocusIcon },
  { id: 'activity', label: 'Activity', icon: ActivityIcon },
];

interface SidebarProps {
  activeTab: string;
  onTabChange: (tabId: string) => void;
  onPlanSelect?: (planId: string) => void;
  refreshKey?: number;
  onSettingsClick?: () => void;
  onLogoutClick?: () => void;
  isOpen?: boolean;
  onClose?: () => void;
}

export function Sidebar({ activeTab, onTabChange, onPlanSelect, refreshKey, onLogoutClick, isOpen, onClose }: SidebarProps) {
  const { activeWorkspace } = useWorkspace();
  const [pinnedPlans, setPinnedPlans] = useState<Plan[]>([]);

  useEffect(() => {
    const loadPinnedPlans = async () => {
      if (!activeWorkspace) return;
      try {
        const plans = await getPinnedPlans(activeWorkspace.id);
        setPinnedPlans(plans);
      } catch (err) {
        console.warn('Failed to load pinned plans', err);
        // Non-critical — sidebar still functions without pinned plans
      }
    };

    loadPinnedPlans();
  }, [activeWorkspace, refreshKey]);
  const handleNavClick = (tabId: string) => {
    onTabChange(tabId);
    onClose?.();
  };

  const handlePlanClick = (planId: string) => {
    onPlanSelect?.(planId);
    onClose?.();
  };

  return (
    <>
      <div
        className={`sidebar-backdrop${isOpen ? ' sidebar-backdrop-visible' : ''}`}
        onClick={onClose}
      />
      <aside className={`sidebar glass${isOpen ? ' sidebar-open' : ''}`}>
      <div className="sidebar-header">
        <img src={Logo} alt="F-Plan" className="sidebar-logo sidebar-logo-default" />
        <img src={LogoDark} alt="F-Plan" className="sidebar-logo sidebar-logo-light" />
      </div>

      <nav className="sidebar-nav">
        {NAV_ITEMS.map((item) => (
          <button
            key={item.id}
            className={`nav-item ${activeTab === item.id ? 'active' : ''}`}
            onClick={() => handleNavClick(item.id)}
          >
            <img src={item.icon} alt="" className="nav-icon-img" />
            <span className="nav-label">{item.label}</span>
          </button>
        ))}
        
        {pinnedPlans.length > 0 && (
          <div className="pinned-plans-section">
            <div className="pinned-section-header">Pinned</div>
            <div className="pinned-plans-list">
              {pinnedPlans.map((plan) => (
                <button
                  key={plan.id}
                  className="pinned-plan-item"
                  onClick={() => handlePlanClick(plan.id)}
                  title={plan.title}
                >
                  <span className="pinned-plan-bullet">•</span>
                  <span className="pinned-plan-title">{plan.title}</span>
                </button>
              ))}
            </div>
          </div>
        )}
      </nav>

      <div className="sidebar-footer">
        <button
          className={`sidebar-footer-button${activeTab === 'settings' ? ' active' : ''}`}
          onClick={() => handleNavClick('settings')}
        >
          <img src={SettingsSlidersIcon} alt="" className="sidebar-footer-icon" />
          <span>Settings</span>
        </button>
        <button className="sidebar-footer-button" onClick={() => { onLogoutClick?.(); onClose?.(); }}>
          <img src={LogoutIcon} alt="" className="sidebar-footer-icon" />
          <span>Logout</span>
        </button>
      </div>
    </aside>
    </>
  );
}
