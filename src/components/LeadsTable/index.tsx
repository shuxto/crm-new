import { useState } from 'react';
import { supabase } from '../../lib/supabase';
import { Phone, Mail, Eye, MessageSquare, Trash2, Loader2, ShieldCheck, ShieldAlert, Shield } from 'lucide-react';
import { useLeads, type Lead } from '../../hooks/useLeads'; 
import StatusCell from './StatusCell'; 
import AssignAgentCell from './AssignAgentCell'; 
import KYCModal from './KYCModal'; 

interface LeadsTableProps {
  role?: 'admin' | 'manager' | 'team_leader' | 'conversion' | 'retention' | 'compliance';
  filters?: any;
  onLeadClick: (lead: Lead) => void;
  currentUserEmail?: string;
}

export default function LeadsTable({ role = 'admin', filters, onLeadClick, currentUserEmail }: LeadsTableProps) {
  // 1. USE THE HOOK
  const { leads, statusOptions, agents, loading, updateLeadStatus, updateLeadAgent } = useLeads(filters, currentUserEmail);
  
  // STATE
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [kycLead, setKycLead] = useState<Lead | null>(null);

  // Update KYC Status Logic
  const updateKycStatus = async (id: string, status: string) => {
    const { error } = await supabase.from('crm_leads').update({ kyc_status: status }).eq('id', id);
    if (error) {
       console.error("Error updating KYC:", error);
    }
  };

  // Role Helpers
  const isAdmin = role === 'admin';
  const isManager = role === 'manager';
  const showCheckbox = isAdmin || isManager;
  const showAssign = isAdmin || isManager;
  const showDelete = isAdmin;

  // Selection Logic
  const toggleSelectAll = () => selectedIds.length === leads.length ? setSelectedIds([]) : setSelectedIds(leads.map(l => l.id));
  const toggleSelectOne = (id: string) => selectedIds.includes(id) ? setSelectedIds(selectedIds.filter(i => i !== id)) : setSelectedIds([...selectedIds, id]);

  // Loading State
  if (loading && leads.length === 0) return <div className="glass-panel rounded-xl p-12 flex justify-center items-center"><Loader2 className="animate-spin text-blue-500" size={32} /></div>;

  return (
    <div className="glass-panel rounded-xl shadow-2xl overflow-hidden border border-white/5 relative z-10">
      <div className="overflow-x-auto min-h-100">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-[#1e293b]/80 border-b border-gray-700 text-[10px] font-bold uppercase tracking-wider text-gray-200">
              {showCheckbox && <th className="p-4 w-10 text-center"><input type="checkbox" onChange={toggleSelectAll} checked={selectedIds.length === leads.length && leads.length > 0} className="cursor-pointer accent-blue-500" /></th>}
              <th className="p-4 hidden md:table-cell">Source</th>
              <th className="p-4">Lead Info</th>
              <th className="p-4 hidden md:table-cell">Country</th>
              <th className="p-4">Contact</th>
              <th className="p-4 text-center">S-KYC</th>
              <th className="p-4 text-center w-40">Status</th>
              {showAssign && <th className="p-4 hidden md:table-cell">Assigned To</th>}
              <th className="p-4 text-center">Notes</th>
              <th className="p-4 text-center">Actions</th>
              {showDelete && <th className="p-4 text-center">Del</th>}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-800/50">
            {leads.length === 0 ? (
                <tr><td colSpan={11} className="p-8 text-center text-gray-500 italic">No leads found matching your filters.</td></tr>
            ) : leads.map((lead: Lead, index: number) => (
              <tr key={lead.id} className="hover:bg-white/5 transition duration-150 group">
                
                {/* CHECKBOX */}
                {showCheckbox && <td className="p-4 text-center"><input type="checkbox" checked={selectedIds.includes(lead.id)} onChange={() => toggleSelectOne(lead.id)} className="cursor-pointer accent-blue-500" /></td>}
                
                {/* SOURCE */}
                <td className="p-4 hidden md:table-cell"><span className="bg-gray-800/50 text-gray-400 text-[10px] px-2 py-1 rounded border border-gray-700/50 block truncate max-w-25">{lead.source_file || 'Manual'}</span></td>

                {/* LEAD INFO */}
                <td className="p-4"><div className="flex flex-col"><span className="text-sm font-bold text-white leading-tight">{lead.name} {lead.surname}</span><span className="text-[10px] text-gray-600 font-mono">ID: {lead.id.substring(0,8)}...</span></div></td>

                {/* COUNTRY */}
                <td className="p-4 hidden md:table-cell"><span className="text-[10px] bg-gray-800 px-1.5 py-0.5 rounded text-gray-400 border border-gray-700">{lead.country}</span></td>

                {/* CONTACT */}
                <td className="p-4"><div className="flex flex-col gap-1"><div className="flex items-center gap-2 text-gray-400 hover:text-blue-400 cursor-pointer"><Phone size={10} /><span className="font-mono text-xs">{lead.phone}</span></div><div className="flex items-center gap-2 text-gray-500"><Mail size={10} /><span className="text-[10px] truncate max-w-37.5">{lead.email}</span></div></div></td>

                {/* KYC BUTTON (Triggers Modal) */}
                <td className="p-4 text-center align-middle">
                    <button 
                        onClick={() => setKycLead(lead)} 
                        className="transition transform hover:scale-110 active:scale-95"
                        title="Manage KYC"
                    >
                        {lead.kyc_status === 'Approved' ? <ShieldCheck size={18} className="text-green-400 mx-auto drop-shadow-[0_0_8px_rgba(74,222,128,0.5)]" /> 
                        : lead.kyc_status === 'Pending' ? <Shield size={18} className="text-yellow-400 mx-auto drop-shadow-[0_0_8px_rgba(250,204,21,0.5)]" /> 
                        : <ShieldAlert size={18} className="text-gray-600 mx-auto hover:text-gray-400" />}
                    </button>
                </td>

                {/* STATUS (Widget) */}
                <td className="p-4 align-middle">
                  <StatusCell currentStatus={lead.status} leadId={lead.id} options={statusOptions} onUpdate={updateLeadStatus} rowIndex={index} totalRows={leads.length} />
                </td>

                {/* ASSIGNED TO (Widget) */}
                {showAssign && (
                    <td className="p-4 hidden md:table-cell">
                        <AssignAgentCell 
                            leadId={lead.id} 
                            currentAgentId={lead.assigned_to} 
                            agents={agents} 
                            onUpdate={updateLeadAgent} 
                            rowIndex={index}
                            totalRows={leads.length}
                        />
                    </td>
                )}

                {/* ACTIONS */}
                <td className="p-4 text-center"><button className={`transition p-2 rounded-lg hover:bg-white/5 ${(lead.note_count || 0) > 0 ? 'text-blue-400' : 'text-gray-600'}`}><MessageSquare size={16} /></button></td>
                <td className="p-4 text-center"><button onClick={() => onLeadClick(lead)} className="p-1.5 bg-blue-600/10 text-blue-400 border border-blue-500/30 hover:bg-blue-600 hover:text-white rounded-lg transition-all shadow-lg shadow-blue-500/10"><Eye size={14} /></button></td>
                {showDelete && <td className="p-4 text-center"><button className="text-gray-600 hover:text-red-400 transition p-1.5"><Trash2 size={14} /></button></td>}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* --- RENDER KYC MODAL --- */}
      {kycLead && (
        <KYCModal 
            leadId={kycLead.id}
            leadName={`${kycLead.name} ${kycLead.surname}`}
            phone={kycLead.phone}
            email={kycLead.email}
            currentStatus={kycLead.kyc_status}
            onClose={() => setKycLead(null)}
            onUpdateStatus={updateKycStatus}
        />
      )}

    </div>
  );
}