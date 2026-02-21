import { useState, useEffect, lazy, Suspense } from 'react';
import { WorkspaceProvider, useWorkspace } from './context/WorkspaceContext';
import { AvatarProvider } from './context/AvatarContext';
import { AuthProvider, useAuth } from './context/AuthContext';
import { UserProvider, useCurrentUser } from './context/UserContext';
import { Sidebar } from './components/Sidebar';
import { Header } from './components/Header';
import { MainLayout } from './components/Layout';
import { PageHeaderCard } from './components/PageHeaderCard';
import { CreatePlanModal } from './components/CreatePlanModal';
import { CreateWorkspaceModal } from './components/CreateWorkspaceModal';
import { RenameWorkspaceModal } from './components/RenameWorkspaceModal';

import { PendingInvitationsBanner } from './components/PendingInvitationsBanner';
import { PlansIndex } from './views/PlansIndex';
import { LoginPage } from './views/LoginPage';
import { SignupPage } from './views/SignupPage';
import { ForgotPasswordPage } from './views/ForgotPasswordPage';
import { ResetPasswordPage } from './views/ResetPasswordPage';
import { supabaseConfigured } from './lib/supabase';
import { createPlan, createSuggestedStages, createCustomStages, getPlanById, setPlanTags } from './lib/database';
import type { Plan } from './types/database';
import './App.css';

/* Lazy-loaded heavy views */
const Dashboard = lazy(() => import('./views/Dashboard').then(m => ({ default: m.Dashboard })));
const GoalsIndex = lazy(() => import('./views/GoalsIndex').then(m => ({ default: m.GoalsIndex })));
const PlanDetail = lazy(() => import('./views/PlanDetail').then(m => ({ default: m.PlanDetail })));
const Tasks = lazy(() => import('./views/Tasks').then(m => ({ default: m.Tasks })));
const Calendar = lazy(() => import('./views/Calendar').then(m => ({ default: m.Calendar })));
const FocusLog = lazy(() => import('./views/FocusLog').then(m => ({ default: m.FocusLog })));
const Profile = lazy(() => import('./views/Profile').then(m => ({ default: m.Profile })));
const Settings = lazy(() => import('./views/Settings').then(m => ({ default: m.Settings })));

function LazyFallback() {
  return <div className="app-loading"><p>Loading…</p></div>;
}

function AppContent() {
  const { activeWorkspace, loading } = useWorkspace();
  const { displayName } = useCurrentUser();
  const { signOut } = useAuth();
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
  const [sidebarOpen, setSidebarOpen] = useState(false);

  useEffect(() => {
    if (selectedPlanId) {
      const fetchPlan = async () => {
        try {
          const plan = await getPlanById(selectedPlanId);
          setSelectedPlan(plan);
        } catch (err) {
          console.warn('Failed to fetch plan', selectedPlanId, err);
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
    settings: {
      title: 'Settings',
      subtitle: 'Manage your workspace',
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
    dueDate?: string,
    tagIds?: string[]
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
      if (tagIds && tagIds.length > 0) {
        await setPlanTags(newPlan.id, tagIds);
      }
      setSelectedPlanId(newPlan.id);
      setIsCreatePlanModalOpen(false);
    } catch (error) {
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
        onSettingsClick={() => {}}
        onLogoutClick={() => signOut()}
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
      />
      <Header
        onCreateWorkspace={() => setIsCreateWorkspaceModalOpen(true)}
        onRenameWorkspace={(workspaceId) => setRenameWorkspaceId(workspaceId)}
        onProfileClick={() => handleTabChange('profile')}
        onSignOut={() => signOut()}
        userName={userName}
        onToggleSidebar={() => setSidebarOpen((prev) => !prev)}
      />
      <MainLayout>
        <PendingInvitationsBanner />
        {selectedPlanId && selectedPlan ? (
          <Suspense fallback={<LazyFallback />}>
            <PlanDetail
              planId={selectedPlanId}
              plan={selectedPlan}
              onBack={() => {
                setSelectedPlanId(null);
                setSelectedPlan(null);
              }}
              onPlanDeleted={() => {
                setSelectedPlanId(null);
                setSelectedPlan(null);
                setRefreshKey((k) => k + 1);
              }}
              onPlanUpdated={() => {
                setRefreshKey((k) => k + 1);
                // Re-fetch plan to reflect rename/archive
                getPlanById(selectedPlanId).then(setSelectedPlan).catch(() => {
                  setSelectedPlanId(null);
                  setSelectedPlan(null);
                });
              }}
            />
          </Suspense>
        ) : (
          <div className="page-stack">
            <PageHeaderCard 
              title={activePage.title} 
              subtitle={activePage.subtitle}
            />
            {activeTab === 'dashboard' && <Suspense fallback={<LazyFallback />}><Dashboard onNavigate={handleTabChange} /></Suspense>}
            {activeTab === 'goals' && <Suspense fallback={<LazyFallback />}><GoalsIndex /></Suspense>}
            {activeTab === 'plans' && (
              <PlansIndex
                onCreatePlan={() => setIsCreatePlanModalOpen(true)}
                onSelectPlan={(planId) => setSelectedPlanId(planId)}
                onPinToggle={() => setRefreshKey((k) => k + 1)}
              />
            )}
            {activeTab === 'tasks' && (
              <Suspense fallback={<LazyFallback />}><Tasks /></Suspense>
            )}
            {activeTab === 'calendar' && (
              <Suspense fallback={<LazyFallback />}><Calendar /></Suspense>
            )}
            {activeTab === 'focus' && <Suspense fallback={<LazyFallback />}><FocusLog /></Suspense>}
            {activeTab === 'profile' && <Suspense fallback={<LazyFallback />}><Profile /></Suspense>}
            {activeTab === 'settings' && <Suspense fallback={<LazyFallback />}><Settings /></Suspense>}
          </div>
        )}
      </MainLayout>

      <CreatePlanModal
        isOpen={isCreatePlanModalOpen}
        onClose={() => setIsCreatePlanModalOpen(false)}
        onSubmit={handleCreatePlan}
        workspaceId={activeWorkspace?.id}
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

/**
 * AuthGate — Shows auth pages when signed out, main app when signed in.
 * Also handles the /reset-password recovery flow.
 */
function AuthGate() {
  const { session, loading: authLoading } = useAuth();

  // Detect invite link: ?invite=<id>
  const inviteParam = new URLSearchParams(window.location.search).get('invite');

  const [authPage, setAuthPage] = useState<'login' | 'signup' | 'forgot'>(
    inviteParam ? 'signup' : 'login'
  );

  // Detect password recovery flow from URL hash
  const isRecoveryFlow =
    window.location.hash.includes('type=recovery') ||
    window.location.pathname === '/reset-password';

  if (authLoading) {
    return (
      <div className="app-loading">
        <p>Initializing F-Plan...</p>
      </div>
    );
  }

  // Password recovery: user clicked the reset link in their email
  if (isRecoveryFlow && session) {
    return (
      <ResetPasswordPage
        onComplete={() => {
          // Clear the hash/path and go to main app
          window.history.replaceState(null, '', '/');
          window.location.reload();
        }}
      />
    );
  }

  // Not signed in — show auth pages
  if (!session) {
    if (authPage === 'signup') {
      return <SignupPage onNavigate={(p) => setAuthPage(p)} />;
    }
    if (authPage === 'forgot') {
      return <ForgotPasswordPage onNavigate={(p) => setAuthPage(p)} />;
    }
    return <LoginPage onNavigate={(p) => setAuthPage(p)} />;
  }

  // Clean up invite param from URL once authenticated
  if (inviteParam) {
    const url = new URL(window.location.href);
    url.searchParams.delete('invite');
    window.history.replaceState(null, '', url.pathname + url.hash);
  }

  // Signed in — show the main app
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

function App() {
  return (
    <AuthProvider>
      <AuthGate />
    </AuthProvider>
  );
}

export default App;
