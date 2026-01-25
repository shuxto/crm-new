import { useEffect, useState } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { supabase } from './lib/supabase';
import { ShieldAlert } from 'lucide-react';
import type { Session } from '@supabase/supabase-js';
import type { Lead } from './hooks/useLeads'; // <--- NEW IMPORT

// COMPONENTS
import LoginPage from './components/LoginPage';
import Sidebar from './components/Sidebar';
import NotificationSystem from './components/NotificationSystem';
import LeadProfilePage from './components/LeadProfile';

// PAGES
import Dashboard from './pages/Dashboard';
import FileManager from './components/Files';
import TeamManagement from './components/Team'; 
import ShufflePage from './components/Shuffle'; 
import CallsPage from './components/Calls';
import SplitterPage from './components/Splitter';

export default function App() {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  
  // FIXED: Now TypeScript knows this is a Lead object, not random data
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setLoading(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, newSession) => {
      setSession((currentSession) => {
        if (currentSession?.access_token === newSession?.access_token) {
          return currentSession;
        }
        return newSession;
      });
    });

    return () => subscription.unsubscribe();
  }, []);

  // FIXED: 'children' is now ReactNode, which is the correct type for nested components
  const ProtectedRoute = ({ children, allowedRoles }: { children: React.ReactNode, allowedRoles: string[] }) => {
    const role = session?.user?.user_metadata?.role || 'conversion';
    
    if (!allowedRoles.includes(role)) {
      return (
        <div className="h-full flex flex-col items-center justify-center p-10 text-center animate-in zoom-in-95">
            <div className="p-6 bg-red-500/10 rounded-full mb-6 border border-red-500/20">
                <ShieldAlert size={64} className="text-red-500" />
            </div>
            <h2 className="text-3xl font-black text-white mb-2 uppercase tracking-widest">Access Denied</h2>
            <p className="text-gray-400 max-w-md mx-auto mb-8">
                Security Protocol: You do not have the required clearance.
            </p>
        </div>
      );
    }
    // We must cast children to generic JSX to satisfy the return type safely
    return <>{children}</>;
  };

  if (loading) return <div className="min-h-screen flex items-center justify-center text-white">Loading System...</div>;
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
    <BrowserRouter>
      <div className="flex min-h-screen font-sans text-[#e2e8f0]">
        <NotificationSystem />
        <Sidebar role={currentRole} username={session.user.email || 'User'} />
        
        <main className="flex-1 p-6 relative z-10 overflow-y-auto h-screen">
          <Routes>
            <Route path="/" element={
              <Dashboard session={session} onLeadClick={setSelectedLead} />
            } />

            <Route path="/team" element={
              <ProtectedRoute allowedRoles={['admin', 'manager']}>
                <TeamManagement />
              </ProtectedRoute>
            } />

            <Route path="/files" element={
              <ProtectedRoute allowedRoles={['admin', 'manager']}>
                <FileManager />
              </ProtectedRoute>
            } />

            <Route path="/shuffle" element={
              <ProtectedRoute allowedRoles={['admin', 'manager', 'team_leader']}>
                <ShufflePage />
              </ProtectedRoute>
            } />

            <Route path="/splitter" element={
              <ProtectedRoute allowedRoles={['admin', 'manager']}>
                <SplitterPage />
              </ProtectedRoute>
            } />

            <Route path="/calls" element={<CallsPage />} />

            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </main>
      </div>
    </BrowserRouter>
  );
}