import { useState } from 'react';
import { AppProvider, useApp } from './context/AppContext';
import { Sidebar } from './components/Sidebar';
import { Header } from './components/Header';
import { MainLayout } from './components/Layout';
import { CreatePlanModal } from './components/CreatePlanModal';
import { PlansIndex } from './views/PlansIndex';
import { Dashboard } from './views/Dashboard';
import { createPlan, createDefaultStages } from './lib/database';
import './App.css';

function AppContent() {
  const { workspace, loading } = useApp();
  const [activeTab, setActiveTab] = useState('plans');
  const [isCreatePlanModalOpen, setIsCreatePlanModalOpen] = useState(false);

  if (loading) {
    return (
      <div className="app-loading">
        <p>Initializing F-Plan...</p>
      </div>
    );
  }

  const handleCreatePlan = async (title: string, description: string) => {
    if (!workspace) return;

    try {
      const newPlan = await createPlan(workspace.id, title, description);
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
        title={activeTab === 'plans' ? 'Plans' : 'Dashboard'}
        subtitle={
          activeTab === 'plans' ? 'Manage your planning projects' : 'Overview and progress'
        }
      />
      <MainLayout>
        {activeTab === 'plans' && (
          <PlansIndex
            onCreatePlan={() => setIsCreatePlanModalOpen(true)}
            onSelectPlan={(planId) => console.log('Selected plan:', planId)}
          />
        )}
        {activeTab === 'dashboard' && <Dashboard />}
      </MainLayout>

      <CreatePlanModal
        isOpen={isCreatePlanModalOpen}
        onClose={() => setIsCreatePlanModalOpen(false)}
        onSubmit={handleCreatePlan}
      />
    </div>
  );
}

function App() {
  return (
    <AppProvider>
      <AppContent />
    </AppProvider>
  );
}

export default App;
