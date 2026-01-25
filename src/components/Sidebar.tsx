import { useState, useEffect } from 'react';
import { 
  LayoutDashboard, Users, Phone, 
  LogOut, Shield, Briefcase, 
  Shuffle, Split, FolderOpen,
  Menu, ChevronLeft, ChevronRight
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import { NavLink } from 'react-router-dom';
import NotificationBell from './NotificationBell'; 

interface SidebarProps {
  role: string;
  username: string;
  isCollapsed: boolean;      // <--- NEW PROP
  onToggle: () => void;      // <--- NEW PROP
}

export default function Sidebar({ role, username, isCollapsed, onToggle }: SidebarProps) {
  const [userId, setUserId] = useState<string | null>(null);
  const [isMobileOpen, setIsMobileOpen] = useState(false); // Mobile state stays internal

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (data.user?.id) setUserId(data.user.id);
    });
  }, []);
  
  const handleLogout = async () => {
    await supabase.auth.signOut();
  };

  const menuItems = [
    { path: '/', label: 'Leads', icon: LayoutDashboard, roles: ['admin', 'manager', 'retention', 'conversion', 'team_leader'] },
    { path: '/team', label: 'Team', icon: Users, roles: ['admin', 'manager'] },
    { path: '/shuffle', label: 'Shuffle', icon: Shuffle, roles: ['admin', 'manager', 'team_leader'] },
    { path: '/splitter', label: 'Splitter', icon: Split, roles: ['admin', 'manager'] },
    { path: '/files', label: 'Files', icon: FolderOpen, roles: ['admin', 'manager'] },
    { path: '/calls', label: 'Call Logs', icon: Phone, roles: ['admin', 'manager'] },
  ];

  const filteredMenu = menuItems.filter(item => item.roles.includes(role));

  return (
    <>
      {/* --- MOBILE: OVERLAY --- */}
      {isMobileOpen && (
        <div 
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40 md:hidden animate-in fade-in"
          onClick={() => setIsMobileOpen(false)}
        />
      )}

      {/* --- MOBILE: HAMBURGER BUTTON --- */}
      <button 
        onClick={() => setIsMobileOpen(true)}
        className="md:hidden fixed top-4 left-4 z-50 p-2 bg-crm-bg border border-white/10 rounded-lg text-white shadow-lg active:scale-95 transition"
      >
        <Menu size={24} />
      </button>

      {/* --- SIDEBAR CONTAINER --- */}
      <aside 
        className={`
          fixed inset-y-0 left-0 z-50 h-screen bg-crm-bg border-r border-white/5 flex flex-col transition-all duration-300
          ${isMobileOpen ? 'translate-x-0' : '-translate-x-full'} 
          md:translate-x-0 
          ${isCollapsed ? 'md:w-20' : 'md:w-64'} 
          w-64
        `}
      >
        {/* DESKTOP TOGGLE BUTTON */}
        <button
            onClick={onToggle}
            className="hidden md:flex absolute -right-3 top-9 w-6 h-6 bg-blue-600 rounded-full items-center justify-center text-white shadow-lg cursor-pointer hover:bg-blue-500 hover:scale-110 transition z-50 border border-crm-bg"
        >
            {isCollapsed ? <ChevronRight size={14} /> : <ChevronLeft size={14} />}
        </button>

        <div className="p-6 flex flex-col h-full">
          
          {/* HEADER */}
          <div className={`flex items-center mb-8 transition-all ${isCollapsed ? 'justify-center flex-col gap-4' : 'justify-between'}`}>
              <div className="flex items-center gap-3">
                  <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center shadow-lg shadow-blue-500/20 shrink-0">
                      <Briefcase size={18} className="text-white" />
                  </div>
                  {!isCollapsed && (
                    <h1 className="text-xl font-bold bg-linear-to-r from-white to-gray-400 bg-clip-text text-transparent whitespace-nowrap animate-in fade-in duration-300">
                        CRM Pro
                    </h1>
                  )}
              </div>
              
              {/* BELL */}
              {userId && (
                <div className={isCollapsed ? "" : ""}>
                   <NotificationBell userId={userId} />
                </div>
              )}
          </div>

          {/* MENU */}
          <nav className="space-y-1 flex-1">
            {filteredMenu.map((item) => (
              <NavLink
                key={item.path}
                to={item.path}
                onClick={() => setIsMobileOpen(false)}
                className={({ isActive }) => `
                  w-full flex items-center gap-3 px-3 py-3 rounded-xl transition-all duration-200 group cursor-pointer
                  ${isCollapsed ? 'justify-center' : ''}
                  ${isActive 
                    ? 'bg-blue-600 text-white shadow-lg shadow-blue-900/20 translate-x-1' 
                    : 'text-gray-400 hover:bg-white/5 hover:text-white hover:translate-x-1'
                  }
                `}
                title={isCollapsed ? item.label : undefined}
              >
                <item.icon size={20} className="shrink-0" />
                {!isCollapsed && (
                   <span className="font-medium text-sm whitespace-nowrap animate-in fade-in slide-in-from-left-2 duration-300">
                     {item.label}
                   </span>
                )}
              </NavLink>
            ))}
          </nav>

          {/* FOOTER */}
          <div className={`mt-auto pt-6 border-t border-white/5 ${isCollapsed ? 'flex flex-col items-center' : ''}`}>
             {!isCollapsed ? (
                <div className="bg-black/20 p-4 rounded-xl animate-in fade-in duration-300">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-8 h-8 rounded-full bg-linear-to-br from-gray-700 to-gray-900 border border-white/10 flex items-center justify-center shrink-0">
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
             ) : (
                <div className="flex flex-col gap-4 items-center animate-in fade-in duration-300">
                    <div className="w-8 h-8 rounded-full bg-gray-800 border border-white/10 flex items-center justify-center shrink-0" title={username}>
                      <Shield size={14} className="text-gray-400" />
                    </div>
                    <button 
                        onClick={handleLogout}
                        className="p-2 rounded-lg text-gray-400 hover:text-red-400 hover:bg-red-500/10 transition"
                        title="Sign Out"
                    >
                        <LogOut size={18} />
                    </button>
                </div>
             )}
          </div>
        </div>
      </aside>
    </>
  );
}