import { useState } from 'react';
import { createPortal } from 'react-dom';
import { supabase } from '../../lib/supabase';
import { 
  Phone, Mail, Eye, MessageSquare, Trash2, Loader2, ShieldCheck, ShieldAlert, Shield, 
  ChevronLeft, ChevronRight, CheckSquare, X, Users, RefreshCw, Download, UserMinus 
} from 'lucide-react';
import { useLeads, type Lead } from '../../hooks/useLeads'; 
import StatusCell from './StatusCell'; 
import AssignAgentCell from './AssignAgentCell'; 
import KYCModal from './KYCModal'; 
import ConfirmationModal from '../Team/ConfirmationModal';
import NotesSidebar from './NotesSidebar'; 

interface LeadsTableProps {
  role?: 'admin' | 'manager' | 'team_leader' | 'conversion' | 'retention' | 'compliance';
  filters?: any;
  onLeadClick: (lead: Lead) => void;
  currentUserEmail?: string;
  onPageChange?: (page: number) => void;
}

export default function LeadsTable({ role = 'admin', filters, onLeadClick, currentUserEmail, onPageChange }: LeadsTableProps) {
  const { 
    leads, totalCount, statusOptions, agents, loading, 
    updateLeadStatus, updateLeadAgent, deleteLead,
    bulkUpdateStatus, bulkUpdateAgent, bulkDeleteLeads,
    updateLocalLead // <--- We use this to color the icon instantly
  } = useLeads(filters, currentUserEmail);
  
  // STATE
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [kycLead, setKycLead] = useState<Lead | null>(null);
  const [activeNoteLead, setActiveNoteLead] = useState<Lead | null>(null);
  const [leadToDelete, setLeadToDelete] = useState<Lead | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [actionMode, setActionMode] = useState<'none' | 'assign' | 'status'>('none');
  const [isProcessing, setIsProcessing] = useState(false);
  const [showBulkDeleteConfirm, setShowBulkDeleteConfirm] = useState(false);

  // Update KYC Status Logic
  const updateKycStatus = async (id: string, status: string) => {
    const { error } = await supabase.from('crm_leads').update({ kyc_status: status }).eq('id', id);
    if (error) console.error("Error updating KYC:", error);
  };

  // Role Helpers
  const isAdmin = role === 'admin';
  const isManager = role === 'manager';
  const showCheckbox = isAdmin || isManager;
  const showAssign = isAdmin || isManager;
  const showDelete = isAdmin || isManager;

  const currentPage = filters?.page || 1;
  const limit = filters?.limit || 50;
  const totalPages = Math.ceil((totalCount || 0) / limit);

  const toggleSelectAll = () => selectedIds.length === leads.length ? setSelectedIds([]) : setSelectedIds(leads.map(l => l.id));
  const toggleSelectOne = (id: string) => selectedIds.includes(id) ? setSelectedIds(selectedIds.filter(i => i !== id)) : setSelectedIds([...selectedIds, id]);

  const handleDeleteClick = (lead: Lead) => setLeadToDelete(lead);

  const confirmDelete = async () => {
    if (!leadToDelete) return;
    setIsDeleting(true);
    await deleteLead(leadToDelete.id);
    setIsDeleting(false);
    setLeadToDelete(null); 
  };

  const handleBulkAssign = async (agentId: string | null) => {
    setIsProcessing(true);
    await bulkUpdateAgent(selectedIds, agentId);
    const msg = agentId ? `Assigned ${selectedIds.length} leads` : `Unassigned ${selectedIds.length} leads`;
    window.dispatchEvent(new CustomEvent('crm-toast', { detail: { message: msg, type: 'success' } }));
    setIsProcessing(false);
    setActionMode('none');
    setSelectedIds([]); 
  };

  const handleBulkStatus = async (status: string) => {
    setIsProcessing(true);
    await bulkUpdateStatus(selectedIds, status);
    window.dispatchEvent(new CustomEvent('crm-toast', { detail: { message: `Updated ${selectedIds.length} leads to ${status}`, type: 'success' } }));
    setIsProcessing(false);
    setActionMode('none');
    setSelectedIds([]);
  };

  const confirmBulkDelete = async () => {
    setIsDeleting(true); 
    await bulkDeleteLeads(selectedIds);
    setIsDeleting(false);
    setShowBulkDeleteConfirm(false);
    window.dispatchEvent(new CustomEvent('crm-toast', { detail: { message: `Deleted ${selectedIds.length} leads`, type: 'success' } }));
    setSelectedIds([]);
  };

  const handleBulkDownload = () => {
    const csvContent = "data:text/csv;charset=utf-8," 
        + "ID,Name,Surname,Phone,Email,Status,Country,Source\n"
        + leads.filter(l => selectedIds.includes(l.id)).map(e => `${e.id},${e.name},${e.surname},${e.phone},${e.email},${e.status},${e.country},${e.source_file}`).join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `crm_export_${new Date().toISOString().slice(0,10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // INSTANT ICON UPDATE
  const handleNoteCountChange = (newCount: number) => {
      if (activeNoteLead) {
          // Update Sidebar Prop State
          setActiveNoteLead({ ...activeNoteLead, note_count: newCount });
          // Update Table State Instantly
          updateLocalLead(activeNoteLead.id, { note_count: newCount });
      }
  };

  if (loading && leads.length === 0) return <div className="glass-panel rounded-xl p-12 flex justify-center items-center"><Loader2 className="animate-spin text-blue-500" size={32} /></div>;

  return (
    <div className="glass-panel rounded-xl shadow-2xl overflow-hidden border border-white/5 relative z-10 flex flex-col h-full">
      <div className="overflow-x-auto flex-1">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-[#1e293b]/80 border-b border-gray-700 text-[10px] font-bold uppercase tracking-wider text-gray-200">
              {showCheckbox && <th className="p-4 w-10 text-center"><input type="checkbox" onChange={toggleSelectAll} checked={selectedIds.length === leads.length && leads.length > 0} className="cursor-pointer accent-cyan-500" /></th>}
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
              <tr key={lead.id} className={`hover:bg-white/5 transition duration-150 group ${selectedIds.includes(lead.id) ? 'bg-cyan-900/10' : ''}`}>
                {showCheckbox && <td className="p-4 text-center"><input type="checkbox" checked={selectedIds.includes(lead.id)} onChange={() => toggleSelectOne(lead.id)} className="cursor-pointer accent-cyan-500" /></td>}
                <td className="p-4 hidden md:table-cell"><span className="bg-gray-800/50 text-gray-400 text-[10px] px-2 py-1 rounded border border-gray-700/50 block truncate max-w-25">{lead.source_file || 'Manual'}</span></td>
                <td className="p-4"><div className="flex flex-col"><span className="text-sm font-bold text-white leading-tight">{lead.name} {lead.surname}</span><span className="text-[10px] text-gray-600 font-mono">ID: {lead.id.substring(0,8)}...</span></div></td>
                <td className="p-4 hidden md:table-cell"><span className="text-[10px] bg-gray-800 px-1.5 py-0.5 rounded text-gray-400 border border-gray-700">{lead.country}</span></td>
                <td className="p-4"><div className="flex flex-col gap-1"><div className="flex items-center gap-2 text-gray-400 hover:text-blue-400 cursor-pointer"><Phone size={10} /><span className="font-mono text-xs">{lead.phone}</span></div><div className="flex items-center gap-2 text-gray-500"><Mail size={10} /><span className="text-[10px] truncate max-w-37.5">{lead.email}</span></div></div></td>
                <td className="p-4 text-center align-middle">
                    <button onClick={() => setKycLead(lead)} className="transition transform hover:scale-110 active:scale-95" title="Manage KYC">
                        {lead.kyc_status === 'Approved' ? <ShieldCheck size={18} className="text-green-400 mx-auto drop-shadow-[0_0_8px_rgba(74,222,128,0.5)]" /> 
                        : lead.kyc_status === 'Pending' ? <Shield size={18} className="text-yellow-400 mx-auto drop-shadow-[0_0_8px_rgba(250,204,21,0.5)]" /> 
                        : <ShieldAlert size={18} className="text-gray-600 mx-auto hover:text-gray-400" />}
                    </button>
                </td>
                <td className="p-4 align-middle"><StatusCell currentStatus={lead.status} leadId={lead.id} options={statusOptions} onUpdate={updateLeadStatus} rowIndex={index} totalRows={leads.length} /></td>
                {showAssign && <td className="p-4 hidden md:table-cell"><AssignAgentCell leadId={lead.id} currentAgentId={lead.assigned_to} agents={agents} onUpdate={updateLeadAgent} rowIndex={index} totalRows={leads.length} /></td>}
                
                {/* NOTES BUTTON (Instant Update Color) */}
                <td className="p-4 text-center">
                    <button 
                        onClick={() => setActiveNoteLead(lead)}
                        className={`transition p-2 rounded-lg hover:bg-white/5 ${(lead.note_count || 0) > 0 ? 'text-blue-400 drop-shadow-[0_0_8px_rgba(96,165,250,0.5)]' : 'text-gray-600'}`}
                    >
                        <MessageSquare size={16} />
                    </button>
                </td>

                <td className="p-4 text-center"><button onClick={() => onLeadClick(lead)} className="p-1.5 bg-blue-600/10 text-blue-400 border border-blue-500/30 hover:bg-blue-600 hover:text-white rounded-lg transition-all shadow-lg shadow-blue-500/10"><Eye size={14} /></button></td>
                {showDelete && <td className="p-4 text-center"><button onClick={() => handleDeleteClick(lead)} className="text-gray-600 hover:text-red-400 hover:bg-red-500/10 transition p-1.5 rounded-lg"><Trash2 size={14} /></button></td>}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="p-4 border-t border-white/10 bg-[#1e293b]/50 backdrop-blur-sm flex items-center justify-between">
          <div className="text-xs text-gray-400 font-mono">Showing <span className="text-white font-bold">{leads.length}</span> of <span className="text-white font-bold">{totalCount}</span> leads</div>
          <div className="flex items-center gap-2">
              <button onClick={() => onPageChange?.(currentPage - 1)} disabled={currentPage === 1 || loading} className="p-2 rounded-lg bg-white/5 hover:bg-white/10 disabled:opacity-30 disabled:cursor-not-allowed transition text-white border border-white/5"><ChevronLeft size={16} /></button>
              <div className="px-4 py-2 bg-black/20 rounded-lg text-xs font-bold text-cyan-400 border border-white/5 font-mono shadow-inner">Page {currentPage} / {totalPages || 1}</div>
              <button onClick={() => onPageChange?.(currentPage + 1)} disabled={currentPage >= totalPages || loading} className="p-2 rounded-lg bg-white/5 hover:bg-white/10 disabled:opacity-30 disabled:cursor-not-allowed transition text-white border border-white/5"><ChevronRight size={16} /></button>
          </div>
      </div>

      {selectedIds.length > 0 && createPortal(
        <div className="fixed bottom-10 left-1/2 -translate-x-1/2 z-9999 animate-in slide-in-from-bottom-20 fade-in duration-500 ease-out">
           <div className="glass-panel border border-cyan-500/30 bg-[#020617]/90 backdrop-blur-xl rounded-2xl shadow-[0_0_20px_rgba(34,211,238,0.2)] p-2 flex items-center gap-2 ring-1 ring-white/10 transform transition-all hover:scale-105">
              
              <div className="bg-cyan-500/10 text-cyan-400 px-4 py-2 rounded-xl font-bold font-mono text-sm border border-cyan-500/20 flex items-center gap-2 shadow-[0_0_10px_rgba(34,211,238,0.1)]">
                  <CheckSquare size={16} />
                  {selectedIds.length} Selected
              </div>

              <div className="w-px h-8 bg-white/10 mx-2" />

              {showAssign && (
                <div className="relative group">
                    <button 
                        onClick={() => setActionMode(actionMode === 'assign' ? 'none' : 'assign')}
                        disabled={isProcessing}
                        className={`p-3 rounded-xl transition flex items-center gap-2 font-bold text-sm ${actionMode === 'assign' ? 'bg-cyan-600 text-white shadow-lg shadow-cyan-500/20' : 'hover:bg-white/5 text-gray-300 hover:text-white'}`}
                    >
                        <Users size={18} /> Assign
                    </button>

                    {actionMode === 'assign' && (
                        <div className="absolute bottom-full left-0 mb-4 w-64 bg-crm-bg border border-white/10 rounded-xl shadow-2xl overflow-hidden animate-in slide-in-from-bottom-2 zoom-in-95">
                            <div className="p-2 bg-black/20 text-[10px] uppercase font-bold text-gray-500 tracking-wider">Select Agent</div>
                            <div className="max-h-60 overflow-y-auto custom-scrollbar p-1">
                                <button 
                                    onClick={() => handleBulkAssign(null)}
                                    className="w-full text-left px-3 py-2 text-sm text-red-400 hover:bg-red-500/10 hover:text-red-300 rounded-lg transition flex items-center gap-2 mb-2 border-b border-white/5 pb-2"
                                >
                                    <UserMinus size={14} />
                                    Unassign (Release)
                                </button>
                                {agents.map(agent => (
                                    <button 
                                        key={agent.id}
                                        onClick={() => handleBulkAssign(agent.id)}
                                        className="w-full text-left px-3 py-2 text-sm text-gray-300 hover:bg-cyan-500/20 hover:text-white rounded-lg transition flex items-center gap-2"
                                    >
                                        <div className="w-2 h-2 rounded-full bg-green-400" />
                                        {agent.real_name}
                                    </button>
                                ))}
                            </div>
                        </div>
                    )}
                </div>
              )}

              <div className="relative group">
                    <button 
                        onClick={() => setActionMode(actionMode === 'status' ? 'none' : 'status')}
                        disabled={isProcessing}
                        className={`p-3 rounded-xl transition flex items-center gap-2 font-bold text-sm ${actionMode === 'status' ? 'bg-purple-600 text-white shadow-lg shadow-purple-500/20' : 'hover:bg-white/5 text-gray-300 hover:text-white'}`}
                    >
                        <RefreshCw size={18} /> Status
                    </button>

                     {actionMode === 'status' && (
                        <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-4 w-56 bg-crm-bg border border-white/10 rounded-xl shadow-2xl overflow-hidden animate-in slide-in-from-bottom-2 zoom-in-95">
                            <div className="p-2 bg-black/20 text-[10px] uppercase font-bold text-gray-500 tracking-wider">Select Status</div>
                            <div className="p-1">
                                {statusOptions.map((status: any) => (
                                    <button 
                                        key={status.label}
                                        onClick={() => handleBulkStatus(status.label)}
                                        className="w-full text-left px-3 py-2 text-sm text-gray-300 hover:bg-white/10 hover:text-white rounded-lg transition flex items-center gap-2 mb-1"
                                    >
                                        <div className="w-3 h-3 rounded-full" style={{ backgroundColor: status.hex_color }} />
                                        {status.label}
                                    </button>
                                ))}
                            </div>
                        </div>
                    )}
              </div>

              <button 
                onClick={handleBulkDownload}
                disabled={isProcessing}
                className="p-3 rounded-xl hover:bg-white/5 text-gray-300 hover:text-white transition flex items-center gap-2 font-bold text-sm"
              >
                  <Download size={18} /> CSV
              </button>

              {showDelete && (
                  <button 
                    onClick={() => setShowBulkDeleteConfirm(true)}
                    disabled={isProcessing}
                    className="p-3 rounded-xl hover:bg-red-500/10 text-gray-300 hover:text-red-400 transition flex items-center gap-2 font-bold text-sm"
                  >
                      <Trash2 size={18} />
                  </button>
              )}
              
              <div className="w-px h-8 bg-white/10 mx-2" />
              
              <button 
                onClick={() => setSelectedIds([])}
                disabled={isProcessing}
                className="p-3 rounded-xl hover:bg-white/10 text-gray-400 hover:text-white transition"
              >
                  <X size={18} />
              </button>
           </div>
        </div>,
        document.body 
      )}

      {kycLead && (
        <KYCModal leadId={kycLead.id} leadName={`${kycLead.name} ${kycLead.surname}`} phone={kycLead.phone} email={kycLead.email} currentStatus={kycLead.kyc_status} onClose={() => setKycLead(null)} onUpdateStatus={updateKycStatus} />
      )}

      {/* --- NOTES SIDEBAR (Slides In Smoothly) --- */}
      {activeNoteLead && (
        <NotesSidebar 
            lead={activeNoteLead} 
            onClose={() => setActiveNoteLead(null)} 
            currentUserEmail={currentUserEmail}
            role={role}
            onNoteCountChange={handleNoteCountChange}
        />
      )}

      <ConfirmationModal isOpen={!!leadToDelete} type="danger" title="Delete Lead?" message={`Are you sure you want to delete ${leadToDelete?.name} ${leadToDelete?.surname}?`} onConfirm={confirmDelete} onClose={() => setLeadToDelete(null)} loading={isDeleting} />

      <ConfirmationModal isOpen={showBulkDeleteConfirm} type="danger" title={`Delete ${selectedIds.length} Leads?`} message={`Are you sure you want to PERMANENTLY delete ${selectedIds.length} selected leads? This cannot be undone.`} onConfirm={confirmBulkDelete} onClose={() => setShowBulkDeleteConfirm(false)} loading={isDeleting} />

    </div>
  );
}