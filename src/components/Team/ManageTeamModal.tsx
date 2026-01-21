import { useState } from 'react';
import { supabase } from '../../lib/supabase';
import { Briefcase, X, Search, Loader2, UserMinus } from 'lucide-react';
import type { CRMUser } from './types';

interface Props {
  leader: CRMUser;
  allUsers: CRMUser[];
  onClose: () => void;
  onSuccess: () => void;
  onConfirmRemove: (agentIds: string[]) => void;
}

export default function ManageTeamModal({ leader, allUsers, onClose, onSuccess, onConfirmRemove }: Props) {
  // LEFT SIDE STATE (Adding)
  const [selectedAddIds, setSelectedAddIds] = useState<string[]>([]);
  const [searchAdd, setSearchAdd] = useState('');
  
  // RIGHT SIDE STATE (Removing)
  const [selectedRemoveIds, setSelectedRemoveIds] = useState<string[]>([]);
  const [searchRemove, setSearchRemove] = useState('');
  
  const [saving, setSaving] = useState(false);

  // Filter Logic
  const myAgents = allUsers.filter(u => u.team_leader_id === leader.id);
  const freeAgents = allUsers.filter(u => (u.role === 'conversion' || u.role === 'retention') && !u.team_leader_id);

  // ADD AGENTS
  const handleAdd = async () => {
    if (selectedAddIds.length === 0) return;
    setSaving(true);
    const { error } = await supabase.from('crm_users').update({ team_leader_id: leader.id }).in('id', selectedAddIds);
    setSaving(false);
    if (!error) {
        setSelectedAddIds([]); // Clear selection
        onSuccess();
    }
  };

  // REMOVE AGENTS (Triggers Parent Popup)
  const handleRemoveClick = () => {
    if (selectedRemoveIds.length === 0) return;
    onConfirmRemove(selectedRemoveIds);
  };

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in">
      <div className="bg-[#1e293b] border border-gray-700 w-full max-w-5xl rounded-2xl shadow-2xl flex flex-col max-h-[90vh] overflow-hidden">
        
        {/* HEADER */}
        <div className="p-6 border-b border-gray-700 flex justify-between items-center bg-crm-bg">
          <div>
            <h3 className="text-xl font-bold text-white flex items-center gap-2"><Briefcase className="text-cyan-400" /> Manage Team</h3>
            <p className="text-sm text-gray-400">Leader: <span className="text-white font-bold">{leader.real_name}</span></p>
          </div>
          <button onClick={onClose}><X className="text-gray-500 hover:text-white" /></button>
        </div>

        <div className="flex-1 grid grid-cols-1 md:grid-cols-2 divide-x divide-gray-700 min-h-0">
          
          {/* LEFT: ADD AGENTS */}
          <div className="flex flex-col min-h-0">
            <div className="p-4 bg-blue-900/10 border-b border-blue-500/10">
              <h4 className="text-xs font-bold text-blue-300 uppercase mb-2">Available to Add</h4>
              <div className="relative">
                <Search className="absolute left-3 top-2.5 text-gray-500" size={14} />
                <input type="text" placeholder="Search available agents..." className="w-full bg-crm-bg border border-gray-600 pl-9 py-2 rounded-lg text-sm text-white focus:border-blue-500 outline-none"
                  onChange={(e) => setSearchAdd(e.target.value)} />
              </div>
            </div>
            <div className="flex-1 overflow-y-auto p-2 space-y-1 custom-scrollbar">
              {freeAgents.filter(a => a.real_name.toLowerCase().includes(searchAdd.toLowerCase())).map(agent => (
                <label key={agent.id} className={`flex items-center gap-3 p-3 rounded-lg cursor-pointer transition border ${selectedAddIds.includes(agent.id) ? 'bg-blue-600/20 border-blue-500/50' : 'hover:bg-white/5 border-transparent'}`}>
                  <input type="checkbox" className="w-4 h-4 rounded bg-gray-700 border-gray-600 accent-blue-500"
                    checked={selectedAddIds.includes(agent.id)}
                    onChange={(e) => {
                      if(e.target.checked) setSelectedAddIds([...selectedAddIds, agent.id]);
                      else setSelectedAddIds(selectedAddIds.filter(id => id !== agent.id));
                    }} />
                  <div><div className="text-sm font-bold text-white">{agent.real_name}</div><div className="text-[10px] text-gray-500 uppercase">{agent.role}</div></div>
                </label>
              ))}
              {freeAgents.length === 0 && <div className="p-4 text-center text-gray-500 text-sm italic">No free agents found.</div>}
            </div>
            <div className="p-4 border-t border-gray-700 bg-crm-bg">
              <button onClick={handleAdd} disabled={selectedAddIds.length === 0 || saving} className="w-full bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white py-3 rounded-xl font-bold transition flex items-center justify-center gap-2 shadow-lg shadow-blue-900/20">
                {saving ? <Loader2 className="animate-spin" size={16} /> : "Add Selected"}
              </button>
            </div>
          </div>

          {/* RIGHT: REMOVE AGENTS (MULTI-SELECT) */}
          <div className="flex flex-col min-h-0 bg-crm-bg/50">
            <div className="p-4 bg-red-900/10 border-b border-red-500/10">
                <h4 className="text-xs font-bold text-red-300 uppercase mb-2">Current Team Members</h4>
                <div className="relative">
                    <Search className="absolute left-3 top-2.5 text-gray-500" size={14} />
                    <input type="text" placeholder="Search team..." className="w-full bg-crm-bg border border-gray-700 pl-9 py-2 rounded-lg text-sm text-white focus:border-red-500 outline-none"
                    onChange={(e) => setSearchRemove(e.target.value)} />
                </div>
            </div>
            <div className="flex-1 overflow-y-auto p-2 space-y-1 custom-scrollbar">
              {myAgents.filter(a => a.real_name.toLowerCase().includes(searchRemove.toLowerCase())).map(member => (
                <label key={member.id} className={`flex items-center justify-between p-3 rounded-lg border cursor-pointer transition ${selectedRemoveIds.includes(member.id) ? 'bg-red-500/10 border-red-500/50' : 'bg-white/5 border-white/5 hover:border-white/10'}`}>
                  <div className="flex items-center gap-3">
                    <input type="checkbox" className="w-4 h-4 rounded bg-gray-700 border-gray-600 accent-red-500"
                        checked={selectedRemoveIds.includes(member.id)}
                        onChange={(e) => {
                        if(e.target.checked) setSelectedRemoveIds([...selectedRemoveIds, member.id]);
                        else setSelectedRemoveIds(selectedRemoveIds.filter(id => id !== member.id));
                        }} 
                    />
                    <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-gray-700 flex items-center justify-center text-xs font-bold text-white">{member.real_name.substring(0,2)}</div>
                        <div><div className="text-sm font-bold text-gray-200">{member.real_name}</div><div className="text-[10px] text-gray-500 uppercase">{member.role}</div></div>
                    </div>
                  </div>
                </label>
              ))}
              {myAgents.length === 0 && <div className="text-center text-gray-500 italic mt-10">No agents assigned yet.</div>}
            </div>
            <div className="p-4 border-t border-gray-700 bg-crm-bg">
                <button onClick={handleRemoveClick} disabled={selectedRemoveIds.length === 0} className="w-full bg-red-900/20 hover:bg-red-600 border border-red-500/30 hover:border-red-500 disabled:opacity-50 text-red-400 hover:text-white py-3 rounded-xl font-bold transition flex items-center justify-center gap-2">
                    <UserMinus size={16} /> Remove Selected ({selectedRemoveIds.length})
                </button>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}