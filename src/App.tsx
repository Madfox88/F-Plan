import { useState } from 'react';
import { WorkspaceProvider, useWorkspace } from './context/WorkspaceContext';
import { AvatarProvider } from './context/AvatarContext';
import { Sidebar } from './components/Sidebar';
import { Header } from './components/Header';
import { MainLayout } from './components/Layout';
import { CreatePlanModal } from './components/CreatePlanModal';
import { CreateWorkspaceModal } from './components/CreateWorkspaceModal';
import { RenameWorkspaceModal } from './components/RenameWorkspaceModal';
import { PlansIndex } from './views/PlansIndex';
import { Dashboard } from './views/Dashboard';
import { Profile } from './views/Profile';
import { createPlan, createDefaultStages } from './lib/database';
import './App.css';

function AppContent() {
  const { activeWorkspace, loading } = useWorkspace();
  const [activeTab, setActiveTab] = useState('plans');
  const [isCreatePlanModalOpen, setIsCreatePlanModalOpen] = useState(false);
  const [isCreateWorkspaceModalOpen, setIsCreateWorkspaceModalOpen] = useState(false);
  const [renameWorkspaceId, setRenameWorkspaceId] = useState<string | null>(null);

  if (loading) {
    return (
      <div className="app-loading">
        <p>Initializing F-Plan...</p>
      </div>
    );
  }

  const handleCreatePlan = async (title: string, description: string) => {
    if (!activeWorkspace) return;

    try {
      const newPlan = await createPlan(activeWorkspace.id, title, description);
      await createDefaultStages(newPlan.id);
      // Refresh plans view
      window.location.reload();
    } catch (error) {
      console.error('Failed to create plan:', error);
      throw error;
    }
  };

  return (
    <div className="app-container">
      <Sidebar activeTab={activeTab} onTabChange={setActiveTab} />
      <Header
        onCreateWorkspace={() => setIsCreateWorkspaceModalOpen(true)}
        onRenameWorkspace={(workspaceId) => setRenameWorkspaceId(workspaceId)}
        onProfileClick={() => setActiveTab('profile')}
        userName="Alex"
      />
      <MainLayout>
        {activeTab === 'plans' && (
          <PlansIndex
            onCreatePlan={() => setIsCreatePlanModalOpen(true)}
            onSelectPlan={(planId) => console.log('Selected plan:', planId)}
          />
        )}
        {activeTab === 'dashboard' && <Dashboard />}
        {activeTab === 'profile' && <Profile />}
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
        <AppContent />
      </AvatarProvider>
    </WorkspaceProvider>
  );
}

export default App;
