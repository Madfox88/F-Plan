import { useState, useEffect } from 'react';
import { WorkspaceProvider, useWorkspace } from './context/WorkspaceContext';
import { AvatarProvider } from './context/AvatarContext';
import { UserProvider, useCurrentUser } from './context/UserContext';
import { Sidebar } from './components/Sidebar';
import { Header } from './components/Header';
import { MainLayout } from './components/Layout';
import { PageHeaderCard } from './components/PageHeaderCard';
import { CreatePlanModal } from './components/CreatePlanModal';
import { CreateWorkspaceModal } from './components/CreateWorkspaceModal';
import { RenameWorkspaceModal } from './components/RenameWorkspaceModal';
import { PlansIndex } from './views/PlansIndex';
import { GoalsIndex } from './views/GoalsIndex';
import { Dashboard } from './views/Dashboard';
import { Profile } from './views/Profile';
import { PlanDetail } from './views/PlanDetail';
import { Tasks } from './views/Tasks';
import { Calendar } from './views/Calendar';
import { FocusLog } from './views/FocusLog';
import { supabaseConfigured } from './lib/supabase';
import { createPlan, createSuggestedStages, createCustomStages, getPlanById } from './lib/database';
import type { Plan } from './types/database';
import './App.css';

function AppContent() {
  const { activeWorkspace, loading } = useWorkspace();
  const { displayName } = useCurrentUser();
  const userName = displayName ? displayName.split(' ')[0] : 'User';
  const [activeTab, setActiveTab] = useState(() => {
    return localStorage.getItem('activeTab') || 'dashboard';
  });
  const [isCreatePlanModalOpen, setIsCreatePlanModalOpen] = useState(false);
  const [isCreateWorkspaceModalOpen, setIsCreateWorkspaceModalOpen] = useState(false);
  const [renameWorkspaceId, setRenameWorkspaceId] = useState<string | null>(null);
  const [selectedPlanId, setSelectedPlanId] = useState<string | null>(null);
  const [selectedPlan, setSelectedPlan] = useState<Plan | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    if (selectedPlanId) {
      const fetchPlan = async () => {
        try {
          const plan = await getPlanById(selectedPlanId);
          setSelectedPlan(plan);
        } catch (error) {
          console.error('Failed to fetch plan:', error);
          setSelectedPlanId(null);
        }
      };
      fetchPlan();
    }
  }, [selectedPlanId]);

  const handleTabChange = (tabId: string) => {
    setActiveTab(tabId);
    setSelectedPlanId(null);
    setSelectedPlan(null);
    localStorage.setItem('activeTab', tabId);
  };

  const handlePlanSelect = (planId: string) => {
    setSelectedPlanId(planId);
    setActiveTab('plans');
    localStorage.setItem('activeTab', 'plans');
  };

  const pageMeta: Record<string, { title: string; subtitle: string }> = {
    dashboard: {
      title: 'Dashboard',
      subtitle: 'Track your business overview',
    },
    goals: {
      title: 'Goals',
      subtitle: 'Define and track your objectives',
    },
    plans: {
      title: 'Plans',
      subtitle: 'Manage your planning projects',
    },
    tasks: {
      title: 'Tasks',
      subtitle: 'Organize your daily work',
    },
    calendar: {
      title: 'Calendar',
      subtitle: 'Schedule and timeline view',
    },
    focus: {
      title: 'Focus',
      subtitle: 'Session history and insights',
    },
    profile: {
      title: 'Profile',
      subtitle: 'Your account details',
    },
  };

  const activePage = pageMeta[activeTab] ?? pageMeta.plans;

  if (loading) {
    return (
      <div className="app-loading">
        <p>Initializing F-Plan...</p>
      </div>
    );
  }

  const handleCreatePlan = async (
    title: string,
    description: string,
    intent: string,
    useSuggestedStages: boolean,
    isDraft: boolean,
    customStages?: string[],
    dueDate?: string
  ) => {
    if (!activeWorkspace) return;

    try {
      const newPlan = await createPlan(
        activeWorkspace.id,
        title,
        description,
        intent,
        isDraft ? 'draft' : 'active',
        dueDate
      );
      if (useSuggestedStages) {
        await createSuggestedStages(newPlan.id);
      } else if (customStages && customStages.length > 0) {
        await createCustomStages(newPlan.id, customStages);
      }
      setSelectedPlanId(newPlan.id);
      setIsCreatePlanModalOpen(false);
    } catch (error) {
      console.error('Failed to create plan:', error);
      throw error;
    }
  };

  return (
    <div className="app-container">
      {!supabaseConfigured && (
        <div className="env-warning" role="alert">
          Supabase credentials are missing. Demo mode is active and data will not persist.
        </div>
      )}
      <Sidebar 
        activeTab={activeTab} 
        onTabChange={handleTabChange}
        onPlanSelect={handlePlanSelect}
        refreshKey={refreshKey}
      />
      <Header
        onCreateWorkspace={() => setIsCreateWorkspaceModalOpen(true)}
        onRenameWorkspace={(workspaceId) => setRenameWorkspaceId(workspaceId)}
        onProfileClick={() => handleTabChange('profile')}
        userName={userName}
      />
      <MainLayout>
        {selectedPlanId && selectedPlan ? (
          <PlanDetail planId={selectedPlanId} plan={selectedPlan} />
        ) : (
          <div className="page-stack">
            <PageHeaderCard 
              title={activePage.title} 
              subtitle={activePage.subtitle}
            />
            {activeTab === 'dashboard' && <Dashboard />}
            {activeTab === 'goals' && <GoalsIndex />}
            {activeTab === 'plans' && (
              <PlansIndex
                onCreatePlan={() => setIsCreatePlanModalOpen(true)}
                onSelectPlan={(planId) => setSelectedPlanId(planId)}
                onPinToggle={() => setRefreshKey((k) => k + 1)}
              />
            )}
            {activeTab === 'tasks' && (
              <Tasks />
            )}
            {activeTab === 'calendar' && (
              <Calendar />
            )}
            {activeTab === 'focus' && <FocusLog />}
            {activeTab === 'profile' && <Profile />}
          </div>
        )}
      </MainLayout>

      <CreatePlanModal
        isOpen={isCreatePlanModalOpen}
        onClose={() => setIsCreatePlanModalOpen(false)}
        onSubmit={handleCreatePlan}
      />

      <CreateWorkspaceModal
        isOpen={isCreateWorkspaceModalOpen}
        onClose={() => setIsCreateWorkspaceModalOpen(false)}
      />

      <RenameWorkspaceModal
        isOpen={renameWorkspaceId !== null}
        workspaceId={renameWorkspaceId}
        onClose={() => setRenameWorkspaceId(null)}
      />
    </div>
  );
}

function App() {
  return (
    <WorkspaceProvider>
      <AvatarProvider>
        <UserProvider>
          <AppContent />
        </UserProvider>
      </AvatarProvider>
    </WorkspaceProvider>
  );
}

export default App;
