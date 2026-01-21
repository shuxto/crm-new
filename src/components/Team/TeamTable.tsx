import { Briefcase, Key, Trash2, Users, TrendingUp, CheckCircle2 } from 'lucide-react';
import type { CRMUser } from './types';

interface Props {
  users: CRMUser[]; activeTab: string; allUsers: CRMUser[];
  onDelete: (id: string) => void;
  onManageLeader?: (leader: CRMUser) => void;
  onManagePerms?: (manager: CRMUser) => void;
  onPromoteTrading?: (user: CRMUser) => void;
}

export default function TeamTable({ users, activeTab, allUsers, onDelete, onManageLeader, onManagePerms, onPromoteTrading }: Props) {
  const filteredUsers = users.filter(u => {
    if (activeTab === 'staff') return true;
    if (activeTab === 'admins') return u.role === 'admin';
    if (activeTab === 'managers') return u.role === 'manager';
    if (activeTab === 'leaders') return u.role === 'team_leader';
    return u.role === activeTab;
  });

  return (
    <div className="glass-panel rounded-2xl overflow-hidden shadow-2xl">
      <table className="w-full text-left text-sm text-gray-400">
        <thead className="bg-crm-bg text-gray-200 uppercase text-[10px] font-bold tracking-wider border-b border-gray-700">
          <tr><th className="p-5">User</th><th className="p-5">Role</th><th className="p-5">Details</th><th className="p-5 text-right">Actions</th></tr>
        </thead>
        <tbody className="divide-y divide-gray-800/50">
          {filteredUsers.map(user => {
            const leader = allUsers.find(u => u.id === user.team_leader_id);
            const teamSize = allUsers.filter(u => u.team_leader_id === user.id).length;
            const folderCount = user.allowed_sources ? user.allowed_sources.split(',').length : 0;

            return (
              <tr key={user.id} className="group hover:bg-white/5 transition duration-200">
                <td className="p-5">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-linear-to-br from-gray-700 to-gray-800 flex items-center justify-center text-white font-bold shadow-inner group-hover:scale-105 transition">
                      {user.real_name?.substring(0,2).toUpperCase() || 'UN'}
                    </div>
                    <div>
                      <div className="text-white font-bold group-hover:text-cyan-400 transition">{user.real_name || 'Unknown User'}</div>
                      <div className="text-xs text-gray-500">{user.email}</div>
                    </div>
                  </div>
                </td>
                <td className="p-5">
                  <span className={`px-2 py-1 rounded text-[10px] font-bold uppercase tracking-wider border ${
                    user.role === 'admin' ? 'bg-red-500/10 text-red-400 border-red-500/20' :
                    user.role === 'manager' ? 'bg-purple-500/10 text-purple-400 border-purple-500/20' :
                    user.role === 'team_leader' ? 'bg-cyan-500/10 text-cyan-400 border-cyan-500/20' :
                    user.role === 'retention' ? 'bg-fuchsia-500/10 text-fuchsia-400 border-fuchsia-500/20' :
                    user.role === 'compliance' ? 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20' :
                    'bg-green-500/10 text-green-400 border-green-500/20'
                  }`}>
                    {user.role === 'conversion' ? 'Conversion' : user.role.replace('_', ' ')}
                  </span>
                </td>
                <td className="p-5">
                  {user.role === 'team_leader' ? (<div className="text-white font-bold">{teamSize} <span className="text-gray-500 font-normal text-xs">Agents</span></div>) : 
                   user.role === 'manager' ? (<div className="text-white font-bold">{folderCount} <span className="text-gray-500 font-normal text-xs">Folders</span></div>) : 
                   leader ? (<div className="flex items-center gap-2 text-cyan-300"><Briefcase size={12} /> {leader.real_name}</div>) : 
                   (<span className="text-gray-600 text-xs">-</span>)}
                </td>
                <td className="p-5 text-right flex justify-end gap-2">
                  
                  {/* --- SMART SYNC BUTTON (Admin / Manager / Compliance) --- */}
                  {['admin', 'manager', 'compliance'].includes(user.role) && (
                    user.is_synced ? (
                        <div className="bg-blue-900/20 text-blue-400 border border-blue-500/30 px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1 cursor-default">
                            <CheckCircle2 size={12} /> {user.role === 'admin' ? 'Linked' : 'Synced'}
                        </div>
                    ) : (
                        <button 
                            onClick={() => onPromoteTrading?.(user)} 
                            className="bg-green-600/20 hover:bg-green-600 text-green-500 hover:text-white border border-green-600/50 px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1 cursor-pointer"
                        >
                            <TrendingUp size={12} /> Sync Role
                        </button>
                    )
                  )}

                  {/* --- ROLE SPECIFIC ACTIONS --- */}
                  {user.role === 'team_leader' && (
                    <button onClick={() => onManageLeader?.(user)} className="bg-cyan-600 hover:bg-cyan-500 text-white px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1 cursor-pointer shadow-lg shadow-cyan-900/20">
                        <Users size={12} /> Team
                    </button>
                  )}
                  {user.role === 'manager' && (
                    <button onClick={() => onManagePerms?.(user)} className="bg-purple-600/20 hover:bg-purple-600 text-purple-500 hover:text-white border border-purple-600/50 px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1 cursor-pointer">
                        <Key size={12} /> Access
                    </button>
                  )}
                  <button onClick={() => onDelete(user.id)} className="text-gray-600 hover:text-red-400 transition p-2 hover:bg-red-500/10 rounded-lg cursor-pointer">
                    <Trash2 size={16} />
                  </button>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}