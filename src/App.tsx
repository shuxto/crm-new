import { useEffect, useState } from 'react';
import { supabase } from './lib/supabase';

// COMPONENTS
import LoginPage from './components/LoginPage';
import Sidebar from './components/Sidebar';
import StatsGrid from './components/StatsGrid';
import AdvancedFilter from './components/AdvancedFilter';
import LeadsTable from './components/LeadsTable';
import LeadProfilePage from './components/LeadProfile';
import NotificationSystem from './components/NotificationSystem';
import FileManager from './components/Files';
import TeamManagement from './components/Team'; 
import ShufflePage from './components/Shuffle'; // <--- NEW IMPORT

export default function App() {
  const [session, setSession] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  
  const [currentView, setCurrentView] = useState(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      return params.get('view') || 'dashboard';
    }
    return 'dashboard';
  });
  
  const [selectedLead, setSelectedLead] = useState<any>(null);
  
  // --- FILTER STATE ---
  const [activeFilters, setActiveFilters] = useState({
      search: '',
      dateRange: 'all',
      status: [] as string[],
      agent: [] as string[],
      source: [] as string[],
      country: [] as string[],
      limit: 50,
      tab: 'all' as 'all' | 'mine' | 'unassigned'
  });

  // HANDLER FOR STATS GRID CLICK
  const toggleStatus = (status: string) => {
    setActiveFilters(prev => {
      const current = prev.status;
      if (current.includes(status)) {
        return { ...prev, status: current.filter(s => s !== status) };
      } else {
        return { ...prev, status: [...current, status] };
      }
    });
  };

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setLoading(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
    });
    return () => subscription.unsubscribe();
  }, []);

  const handleNavigation = (view: string) => {
    setCurrentView(view);
    const url = new URL(window.location.href);
    url.searchParams.set('view', view);
    window.history.pushState({}, '', url);
  };

  if (loading) return <div className="min-h-screen flex items-center justify-center text-white"><div className="glass-panel p-6 rounded-xl animate-pulse">Loading System...</div></div>;
  if (!session) return <LoginPage />;
  
  if (selectedLead) {
    return (
      <div className="min-h-screen text-[#e2e8f0]">
        <LeadProfilePage lead={selectedLead} onBack={() => setSelectedLead(null)} />
      </div>
    );
  }

  return (
    <div className="flex min-h-screen font-sans text-[#e2e8f0]">
      <NotificationSystem />
      <Sidebar role={session.user.user_metadata?.role || 'admin'} username={session.user.email} activeView={currentView} onNavigate={handleNavigation} />
      
      <main className="flex-1 p-6 relative z-10 overflow-y-auto h-screen">
        
        {currentView === 'dashboard' && (
          <div className="animate-in fade-in duration-500">
            <header className="flex justify-between items-end mb-8">
              <div>
                <h2 className="text-2xl font-bold text-white tracking-tight">Lead Center</h2>
                <p className="text-gray-400 text-[10px] uppercase tracking-[0.2em] mt-1 italic">Real-time Business Intelligence</p>
              </div>
            </header>
            
            <StatsGrid 
              selectedStatuses={activeFilters.status} 
              onToggleStatus={toggleStatus} 
            />
            
            <AdvancedFilter 
              currentFilters={activeFilters} 
              onFilterChange={setActiveFilters} 
              currentUserEmail={session.user.email}
            />
            
            <LeadsTable 
                role={session.user.user_metadata?.role || 'admin'} 
                filters={activeFilters} 
                onLeadClick={(lead) => setSelectedLead(lead)} 
                currentUserEmail={session.user.email}
            />
          </div>
        )}

        {currentView === 'files' && <FileManager />}
        
        {currentView === 'team' && <TeamManagement />} 

        {/* --- ADDED SHUFFLE PAGE --- */}
        {currentView === 'shuffle' && <ShufflePage />}

      </main>
    </div>
  );
}