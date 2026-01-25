import { 
  LayoutDashboard, Users, Phone, 
  LogOut, Shield, Briefcase, 
  Shuffle, Split, FolderOpen 
} from 'lucide-react';
import { supabase } from '../lib/supabase';

interface SidebarProps {
  role: string;
  username: string;
  activeView: string;
  onNavigate: (view: string) => void;
}

export default function Sidebar({ role, username, activeView, onNavigate }: SidebarProps) {
  
  const handleLogout = async () => {
    await supabase.auth.signOut();
  };

  const menuItems = [
    { id: 'dashboard', label: 'Leads', icon: LayoutDashboard, roles: ['admin', 'manager', 'retention', 'conversion', 'team_leader'] },
    { id: 'team', label: 'Team', icon: Users, roles: ['admin', 'manager'] },
    { id: 'shuffle', label: 'Shuffle', icon: Shuffle, roles: ['admin', 'manager', 'team_leader'] },
    { id: 'splitter', label: 'Splitter', icon: Split, roles: ['admin', 'manager'] },
    { id: 'files', label: 'Files', icon: FolderOpen, roles: ['admin', 'manager'] },
    { id: 'calls', label: 'Call Logs', icon: Phone, roles: ['admin', 'manager'] },
  ];

  const filteredMenu = menuItems.filter(item => item.roles.includes(role));

  return (
    // 1. FIXED: Changed hex code to 'bg-crm-bg'
    <aside className="w-64 bg-crm-bg border-r border-white/5 flex flex-col z-50 h-screen">
      <div className="p-6">
        <div className="flex items-center gap-3 mb-8">
          <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center shadow-lg shadow-blue-500/20">
            <Briefcase size={18} className="text-white" />
          </div>
          {/* 2. FIXED: Changed 'bg-gradient-to-r' to 'bg-linear-to-r' */}
          <h1 className="text-xl font-bold bg-linear-to-r from-white to-gray-400 bg-clip-text text-transparent">
            CRM Pro
          </h1>
        </div>

        <nav className="space-y-1">
          {filteredMenu.map((item) => {
            const isActive = activeView === item.id;
            return (
              <div
                key={item.id}
                onClick={() => onNavigate(item.id)}
                className={`
                  w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 group cursor-pointer
                  ${isActive 
                    ? 'bg-blue-600 text-white shadow-lg shadow-blue-900/20 translate-x-1' 
                    : 'text-gray-400 hover:bg-white/5 hover:text-white hover:translate-x-1'
                  }
                `}
              >
                <item.icon 
                  size={18} 
                  className={`transition-colors ${isActive ? 'text-white' : 'text-gray-500 group-hover:text-blue-400'}`} 
                />
                <span className="font-medium text-sm">{item.label}</span>
                
                {isActive && (
                    <div className="ml-auto w-1.5 h-1.5 rounded-full bg-white animate-pulse" />
                )}
              </div>
            );
          })}
        </nav>
      </div>

      <div className="mt-auto p-6 border-t border-white/5 bg-black/20">
        <div className="flex items-center gap-3 mb-4 px-2">
          {/* 3. FIXED: Changed 'bg-gradient-to-br' to 'bg-linear-to-br' */}
          <div className="w-8 h-8 rounded-full bg-linear-to-br from-gray-700 to-gray-900 border border-white/10 flex items-center justify-center">
            <Shield size={14} className="text-gray-400" />
          </div>
          <div className="flex-1 overflow-hidden">
            <p className="text-sm font-bold text-white truncate">{username}</p>
            <p className="text-xs text-gray-500 capitalize truncate">{role}</p>
          </div>
        </div>
        
        <button 
          onClick={handleLogout}
          className="w-full flex items-center justify-center gap-2 p-2 rounded-lg text-gray-400 hover:text-red-400 hover:bg-red-500/10 transition-all text-sm font-medium border border-transparent hover:border-red-500/20 cursor-pointer"
        >
          <LogOut size={16} />
          <span>Sign Out</span>
        </button>
      </div>
    </aside>
  );
}