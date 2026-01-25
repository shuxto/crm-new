import { 
  LayoutDashboard, Users, Phone, 
  LogOut, Shield, Briefcase, 
  Shuffle, Split, FolderOpen 
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import { NavLink } from 'react-router-dom'; // <--- NEW IMPORT

interface SidebarProps {
  role: string;
  username: string;
}

export default function Sidebar({ role, username }: SidebarProps) {
  
  const handleLogout = async () => {
    await supabase.auth.signOut();
  };

  const menuItems = [
    // Changed IDs to paths (e.g., 'dashboard' -> '/')
    { path: '/', label: 'Leads', icon: LayoutDashboard, roles: ['admin', 'manager', 'retention', 'conversion', 'team_leader'] },
    { path: '/team', label: 'Team', icon: Users, roles: ['admin', 'manager'] },
    { path: '/shuffle', label: 'Shuffle', icon: Shuffle, roles: ['admin', 'manager', 'team_leader'] },
    { path: '/splitter', label: 'Splitter', icon: Split, roles: ['admin', 'manager'] },
    { path: '/files', label: 'Files', icon: FolderOpen, roles: ['admin', 'manager'] },
    { path: '/calls', label: 'Call Logs', icon: Phone, roles: ['admin', 'manager'] },
  ];

  const filteredMenu = menuItems.filter(item => item.roles.includes(role));

  return (
    <aside className="w-64 bg-crm-bg border-r border-white/5 flex flex-col z-50 h-screen">
      <div className="p-6">
        <div className="flex items-center gap-3 mb-8">
          <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center shadow-lg shadow-blue-500/20">
            <Briefcase size={18} className="text-white" />
          </div>
          <h1 className="text-xl font-bold bg-linear-to-r from-white to-gray-400 bg-clip-text text-transparent">
            CRM Pro
          </h1>
        </div>

        <nav className="space-y-1">
          {filteredMenu.map((item) => (
            <NavLink
              key={item.path}
              to={item.path}
              className={({ isActive }) => `
                w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 group cursor-pointer
                ${isActive 
                  ? 'bg-blue-600 text-white shadow-lg shadow-blue-900/20 translate-x-1' 
                  : 'text-gray-400 hover:bg-white/5 hover:text-white hover:translate-x-1'
                }
              `}
            >
              <item.icon size={18} />
              <span className="font-medium text-sm">{item.label}</span>
            </NavLink>
          ))}
        </nav>
      </div>

      <div className="mt-auto p-6 border-t border-white/5 bg-black/20">
        <div className="flex items-center gap-3 mb-4 px-2">
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