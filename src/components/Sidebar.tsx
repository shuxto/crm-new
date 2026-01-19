import { PieChart, Users, FolderOpen, Headset, Shuffle, Share2, Power, LayoutGrid, ShieldAlert } from 'lucide-react';
import { supabase } from '../lib/supabase';

type UserRole = 'admin' | 'manager' | 'team_leader' | 'retention' | 'conversion' | 'compliance';

interface SidebarProps {
  role?: UserRole;
  username?: string;
  activeView: string;             // To highlight the correct button
  onNavigate: (view: string) => void; // To change the page
}

export default function Sidebar({ role = 'admin', username = 'User', activeView, onNavigate }: SidebarProps) {
  
  const styles: Record<UserRole, { color: string; label: string; bg: string }> = {
    admin:       { color: 'text-blue-500',    label: 'Admin',      bg: 'bg-blue-600' },
    manager:     { color: 'text-purple-500',  label: 'Manager',    bg: 'bg-purple-600' },
    team_leader: { color: 'text-cyan-500',    label: 'Team Lead',  bg: 'bg-cyan-600' },
    retention:   { color: 'text-fuchsia-500', label: 'Retention',  bg: 'bg-fuchsia-600' },
    conversion:  { color: 'text-green-500',   label: 'Conversion', bg: 'bg-green-600' },
    compliance:  { color: 'text-yellow-500',  label: 'Compliance', bg: 'bg-yellow-600' }
  };

  const currentStyle = styles[role] || styles.conversion;

  const menuItems = [
    { id: 'dashboard', name: 'Dashboard', icon: PieChart }, 
    { id: 'team',      name: 'Team',      icon: Users,       allowed: ['admin', 'manager', 'team_leader', 'compliance'] },
    // FILES: Only Admin & Manager
    { id: 'files',     name: 'Files',     icon: FolderOpen,  allowed: ['admin', 'manager'] }, 
    { id: 'calls',     name: 'Calls',     icon: Headset },
    { id: 'shuffle',   name: 'Shuffle',   icon: Shuffle,     allowed: ['admin', 'manager', 'team_leader'] },
    { id: 'splitter',  name: 'Splitter',  icon: Share2,      allowed: ['admin', 'manager'] },
    { id: 'compliance', name: 'KYC Center', icon: ShieldAlert, allowed: ['admin', 'compliance', 'manager'] }
  ];

  return (
    <aside className="w-48 h-screen sticky top-0 glass-panel flex flex-col p-4 z-50 shadow-2xl">
      {/* BRANDING */}
      <div className="flex items-center gap-2 mb-8 overflow-hidden">
        <div className={`w-8 h-8 ${currentStyle.bg} rounded-lg flex items-center justify-center shadow-lg shadow-blue-500/30`}>
          <LayoutGrid size={16} className="text-white" />
        </div>
        <h1 className="text-sm font-bold text-white whitespace-nowrap">
          CRM <span className={currentStyle.color}>{currentStyle.label}</span>
        </h1>
      </div>

      {/* NAV */}
      <nav className="flex-1 space-y-1">
        {menuItems.map((link) => {
          const isVisible = role === 'admin' || !link.allowed || link.allowed.includes(role);
          if (!isVisible) return null;

          // Is this the button we are currently looking at?
          const isActive = activeView === link.id;

          return (
            <button 
              key={link.id} 
              onClick={() => onNavigate(link.id)} // CLICK HANDLER
              className={`w-full flex items-center gap-2 px-3 py-2 rounded-lg text-[11px] font-bold transition-all ${isActive ? 'bg-blue-600 text-white shadow-lg' : 'text-gray-400 hover:text-white hover:bg-white/5'}`}
            >
              <link.icon size={14} /> {link.name}
            </button>
          );
        })}
      </nav>

      {/* FOOTER */}
      <div className="mt-auto pt-4 border-t border-white/5 space-y-4">
        
        <div className="bg-black/20 rounded-xl p-3 border border-white/5 text-center">
          <span className={`text-[8px] font-bold uppercase tracking-widest ${currentStyle.color}`}>{role}</span>
          <p className="text-[10px] font-bold text-white truncate">{username}</p>
          <button onClick={() => supabase.auth.signOut()} className="mt-2 w-full flex items-center justify-center gap-1 text-[9px] bg-red-500/10 text-red-400 border border-red-500/20 py-1.5 rounded-lg font-bold hover:bg-red-500/20 transition-colors">
            <Power size={10} /> Logout
          </button>
        </div>
      </div>
    </aside>
  );
}