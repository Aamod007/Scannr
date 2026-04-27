import { useState } from 'react';
import type { ViewPage } from './types';
import Sidebar from './components/Sidebar';
import DashboardView from './components/DashboardView';
import QueueView from './components/QueueView';
import HealthView from './components/HealthView';
import OperatorsView from './components/OperatorsView';

const VIEWS: Record<ViewPage, React.FC> = {
  dashboard: DashboardView,
  queue: QueueView,
  health: HealthView,
  operators: OperatorsView,
};

function App() {
  const [activePage, setActivePage] = useState<ViewPage>('dashboard');
  const ActiveView = VIEWS[activePage];

  return (
    <div className="flex h-screen w-screen bg-brand-dark text-gray-300 overflow-hidden">
      <Sidebar activePage={activePage} onNavigate={setActivePage} />
      <ActiveView />
    </div>
  );
}

export default App;
