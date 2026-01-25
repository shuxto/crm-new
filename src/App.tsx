import { useEffect, useState } from 'react';
import { supabase } from './lib/supabase';
import { ShieldAlert } from 'lucide-react';

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
import ShufflePage from './components/Shuffle'; 
import CallsPage from './components/Calls';
import SplitterPage from './components/Splitter';

export default function App() {
  const [session, setSession] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  
  // 1. Store ID
  const [currentUserId, setCurrentUserId] = useState<string | undefined>(undefined);

  const [currentView, setCurrentView] = useState(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      return params.get('view') || 'dashboard';
    }
    return 'dashboard';
  });
  
  const [selectedLead, setSelectedLead] = useState<any>(null);
  
  // 2. DEFAULT IS 'mine' (Safety First)
  const [activeFilters, setActiveFilters] = useState({
      search: '',
      dateRange: 'all',
      status: [] as string[],
      agent: [] as string[],
      source: [] as string[],
      country: [] as string[],
      limit: 50,
      page: 1, 
      tab: 'mine' as 'all' | 'mine' | 'unassigned'
  });

  const toggleStatus = (status: string) => {
    setActiveFilters(prev => {
      const current = prev.status;
      const newState = { ...prev, page: 1 }; 
      if (current.includes(status)) {
        return { ...newState, status: current.filter(s => s !== status) };
      } else {
        return { ...newState, status: [...current, status] };
      }
    });
  };

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      if (session) {
          setCurrentUserId(session.user.id);
          
          // 3. ADMIN AUTO-SWITCH to 'all'
          const role = session.user.user_metadata?.role || 'conversion';
          if (['admin', 'manager'].includes(role)) {
              setActiveFilters(prev => ({ ...prev, tab: 'all' }));
          }
      }
      setLoading(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      if (session) setCurrentUserId(session.user.id);
    });
    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    const handleBackButtonClick = () => {
      const params = new URLSearchParams(window.location.search);
      const view = params.get('view') || 'dashboard';
      setCurrentView(view);
    };
    window.addEventListener('popstate', handleBackButtonClick);
    return () => window.removeEventListener('popstate', handleBackButtonClick);
  }, []);

  const handleNavigation = (view: string) => {
    setCurrentView(view);
    const url = new URL(window.location.href);
    url.searchParams.set('view', view);
    window.history.pushState({}, '', url);
  };

  const renderProtectedView = (Component: React.ReactNode, allowedRoles: string[]) => {
      const role = session?.user?.user_metadata?.role || 'conversion';
      if (allowedRoles.includes(role)) return Component;

      return (
          <div className="h-full flex flex-col items-center justify-center p-10 text-center animate-in zoom-in-95">
              <div className="p-6 bg-red-500/10 rounded-full mb-6 border border-red-500/20">
                  <ShieldAlert size={64} className="text-red-500" />
              </div>
              <h2 className="text-3xl font-black text-white mb-2 uppercase tracking-widest">Access Denied</h2>
              <p className="text-gray-400 max-w-md mx-auto mb-8">
                  Security Protocol: You do not have the required clearance to access this area.
              </p>
              <button 
                  onClick={() => handleNavigation('dashboard')}
                  className="px-6 py-3 bg-white/10 hover:bg-white/20 text-white rounded-lg font-bold transition-all border border-white/10"
              >
                  Return to Dashboard
              </button>
          </div>
      );
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

  const currentRole = session.user.user_metadata?.role || 'conversion';

  return (
    <div className="flex min-h-screen font-sans text-[#e2e8f0]">
      <NotificationSystem />
      <Sidebar role={currentRole} username={session.user.email} activeView={currentView} onNavigate={handleNavigation} />
      
      <main className="flex-1 p-6 relative z-10 overflow-y-auto h-screen">
        
        {currentView === 'dashboard' && (
          <div className="animate-in fade-in duration-500">
            <header className="flex justify-between items-end mb-8">
              <div>
                <h2 className="text-2xl font-bold text-white tracking-tight">Lead Center</h2>
                <p className="text-gray-400 text-[10px] uppercase tracking-[0.2em] mt-1 italic">Real-time Business Intelligence</p>
              </div>
            </header>
            
            {/* 4. PASSING ROLE AND ID TO STATS GRID */}
            <StatsGrid 
              selectedStatuses={activeFilters.status} 
              onToggleStatus={toggleStatus} 
              currentUserId={currentUserId}
              role={currentRole}
            />
            
            <AdvancedFilter 
              currentFilters={activeFilters} 
              onFilterChange={setActiveFilters} 
              currentUserEmail={session.user.email}
            />
            
            <LeadsTable 
                role={currentRole} 
                filters={activeFilters} 
                onLeadClick={(lead) => setSelectedLead(lead)} 
                currentUserEmail={currentUserId} 
                onPageChange={(newPage) => setActiveFilters(prev => ({ ...prev, page: newPage }))}
            />
          </div>
        )}

        {currentView === 'files' && renderProtectedView(<FileManager />, ['admin', 'manager'])}
        {currentView === 'team' && renderProtectedView(<TeamManagement />, ['admin', 'manager'])} 
        {currentView === 'shuffle' && renderProtectedView(<ShufflePage />, ['admin', 'manager', 'team_leader'])}
        {currentView === 'calls' && <CallsPage />}
        {currentView === 'splitter' && renderProtectedView(<SplitterPage />, ['admin', 'manager'])}
      </main>
    </div>
  );
}