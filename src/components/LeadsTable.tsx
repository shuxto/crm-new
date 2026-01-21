import { useState, useEffect, useRef } from 'react';
import { supabase } from '../lib/supabase';
import { Phone, Mail, UserPlus, Eye, MessageSquare, Trash2, Loader2, ShieldCheck, ShieldAlert, Shield, ChevronDown, Check } from 'lucide-react';

// --- TYPES ---
interface Lead {
  id: number;
  name: string;
  surname: string;
  country: string;
  status: string;
  kyc_status: string | null;
  phone: string;
  email: string;
  created_at: string;
  source_file: string;
  assigned_to: string | null;
  note_count: number;
}

interface StatusDefinition {
  label: string;
  hex_color: string;
}

interface LeadsTableProps {
  // UPDATED ROLES HERE
  role?: 'admin' | 'manager' | 'team_leader' | 'conversion' | 'retention' | 'compliance';
  filters?: any;
  onLeadClick: (lead: Lead) => void;
  currentUserEmail?: string;
}

// --- SUB-COMPONENT: STATUS CELL ---
const StatusCell = ({ currentStatus, leadId, options, onUpdate, rowIndex, totalRows }: any) => {
  const [isOpen, setIsOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  const activeDef = options.find((o: any) => o.label === currentStatus);
  const activeColor = activeDef ? activeDef.hex_color : '#64748b';
  const openUpwards = rowIndex > totalRows - 5; 

  useEffect(() => {
    const handleClickOutside = (event: any) => {
      if (menuRef.current && !menuRef.current.contains(event.target)) setIsOpen(false);
    };
    if (isOpen) document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [isOpen]);

  const handleSelect = (newStatus: string) => {
    if (newStatus !== currentStatus) {
        onUpdate(leadId, newStatus);
    }
    setIsOpen(false);
  };

  return (
    <div className="relative flex justify-center w-full" ref={menuRef}>
      <button 
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center justify-between gap-2 px-3 py-1.5 rounded-lg border transition-all duration-200 w-32 group hover:brightness-110"
        style={{ backgroundColor: `${activeColor}15`, borderColor: `${activeColor}40`, color: activeColor }}
      >
        <span className="text-[10px] font-bold uppercase tracking-wider truncate flex-1 text-center">{currentStatus}</span>
        <ChevronDown size={10} className={`opacity-50 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {isOpen && (
        <div className={`absolute left-1/2 -translate-x-1/2 w-48 bg-[#1e293b] border border-gray-600 rounded-lg shadow-2xl z-50 overflow-hidden animate-in fade-in zoom-in-95 duration-100 max-h-64 overflow-y-auto custom-scrollbar ${openUpwards ? 'bottom-full mb-1' : 'top-full mt-1'}`}>
          <div className="py-1">
            {options.map((opt: any) => (
              <button key={opt.label} onClick={() => handleSelect(opt.label)} className="w-full text-left px-3 py-2 text-xs text-gray-300 hover:bg-white/5 flex items-center gap-2 transition-colors">
                <div className="w-2 h-2 rounded-full shadow-[0_0_5px]" style={{ backgroundColor: opt.hex_color, boxShadow: `0 0 5px ${opt.hex_color}` }} />
                <span className={opt.label === currentStatus ? 'text-white font-bold' : ''}>{opt.label}</span>
                {opt.label === currentStatus && <Check size={10} className="ml-auto text-blue-400" />}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

// --- MAIN TABLE COMPONENT ---
export default function LeadsTable({ role = 'admin', filters, onLeadClick, currentUserEmail }: LeadsTableProps) {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [statusOptions, setStatusOptions] = useState<StatusDefinition[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedIds, setSelectedIds] = useState<number[]>([]);

  // 1. INIT: Fetch Leads & Status Definitions
  useEffect(() => {
    fetchData(false); // Initial load = Show Spinner

    // Realtime: Listen for DB changes
    const leadSub = supabase.channel('table-leads').on('postgres_changes', { event: '*', schema: 'public', table: 'crm_leads' }, () => {
        fetchData(true); // Background Update = NO Spinner (Prevents Jumping)
    }).subscribe();

    const statusSub = supabase.channel('table-statuses').on('postgres_changes', { event: '*', schema: 'public', table: 'crm_statuses' }, () => {
        fetchData(true);
    }).subscribe();

    return () => { 
      supabase.removeChannel(leadSub); 
      supabase.removeChannel(statusSub); 
    };
  }, [filters]);

  async function fetchData(isBackground = false) {
    if (!isBackground) setLoading(true); // Only show spinner on initial load or filter change

    // A. Fetch Status Definitions
    const { data: stData } = await supabase.from('crm_statuses').select('label, hex_color').eq('is_active', true).order('order_index', { ascending: true });
    if (stData) setStatusOptions(stData);

    // B. Fetch Leads
    let query = supabase.from('crm_leads').select('*')
        .order('created_at', { ascending: false }) // Primary Sort (Newest First)
        .order('id', { ascending: false });        // Secondary Sort (Stability Guarantee)

    if (filters) {
        if (filters.status?.length > 0) query = query.in('status', filters.status);
        if (filters.search?.trim()) {
            const s = filters.search.trim();
            query = query.or(`name.ilike.%${s}%,surname.ilike.%${s}%,email.ilike.%${s}%,phone.ilike.%${s}%`);
        }
        if (filters.dateRange && filters.dateRange !== 'all') {
            const now = new Date();
            let dateStr = '';
            if (filters.dateRange === 'today') {
                dateStr = now.toISOString().split('T')[0];
                query = query.gte('created_at', dateStr);
            } else if (filters.dateRange === 'yesterday') {
                const yest = new Date(now); yest.setDate(yest.getDate() - 1);
                dateStr = yest.toISOString().split('T')[0];
                const todayStr = now.toISOString().split('T')[0];
                query = query.gte('created_at', dateStr).lt('created_at', todayStr);
            }
        }
        if (filters.agent?.length > 0) query = query.in('assigned_to', filters.agent);
        if (filters.source?.length > 0) query = query.in('source_file', filters.source);
        if (filters.country?.length > 0) query = query.in('country', filters.country);
        if (filters.tab === 'unassigned') query = query.is('assigned_to', null);
        else if (filters.tab === 'mine' && currentUserEmail) query = query.ilike('assigned_to', `%${currentUserEmail}%`);
    }

    query = query.limit(filters?.limit || 50);

    const { data, error } = await query;
    if (!error) {
        setLeads(data || []);
    }
    setLoading(false); // Always turn off loading at end
  }

  // 2. HANDLE STATUS CHANGE (Optimistic & Instant)
  const handleStatusChange = async (leadId: number, newStatus: string) => {
    // 1. Get Old Status (So we know which counter to decrease)
    const lead = leads.find(l => l.id === leadId);
    const oldStatus = lead?.status;

    // 2. Optimistic Update (Table)
    setLeads(prev => prev.map(l => l.id === leadId ? { ...l, status: newStatus } : l));

    // 3. INSTANT UPDATE: Tell StatsGrid to update numbers NOW
    if (oldStatus && oldStatus !== newStatus) {
        window.dispatchEvent(new CustomEvent('crm-lead-update', { 
            detail: { oldStatus, newStatus } 
        }));
    }

    // 4. Notification
    window.dispatchEvent(new CustomEvent('crm-toast', { 
        detail: { message: `Status updated to ${newStatus}`, type: 'success' } 
    }));

    // 5. DB Update (Happens in background)
    const { error } = await supabase.from('crm_leads').update({ status: newStatus }).eq('id', leadId);
    
    // 6. Revert if Error
    if (error) {
        window.dispatchEvent(new CustomEvent('crm-toast', { detail: { message: `Update failed`, type: 'error' } }));
        fetchData(true); // Re-fetch to fix data
    }
  };

  // --- RENDER HELPERS (UPDATED) ---
  const isAdmin = role === 'admin';
  const isManager = role === 'manager'; // CHANGED from isMod
  
  const showCheckbox = isAdmin || isManager;
  const showAssign = isAdmin || isManager;
  const showDelete = isAdmin;
  
  const toggleSelectAll = () => {
    if (selectedIds.length === leads.length) setSelectedIds([]);
    else setSelectedIds(leads.map(l => l.id));
  };
  const toggleSelectOne = (id: number) => {
    if (selectedIds.includes(id)) setSelectedIds(selectedIds.filter(i => i !== id));
    else setSelectedIds([...selectedIds, id]);
  };

  if (loading && leads.length === 0) return <div className="glass-panel rounded-xl p-12 flex justify-center items-center"><Loader2 className="animate-spin text-blue-500" size={32} /></div>;

  return (
    <div className="glass-panel rounded-xl shadow-2xl overflow-hidden border border-white/5 relative z-10">
      <div className="overflow-x-auto min-h-100">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-[#1e293b]/80 border-b border-gray-700 text-[10px] font-bold uppercase tracking-wider text-gray-200">
              {showCheckbox && (
                <th className="p-4 w-10 text-center">
                  <input type="checkbox" onChange={toggleSelectAll} checked={selectedIds.length === leads.length && leads.length > 0} className="cursor-pointer accent-blue-500" />
                </th>
              )}
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
            ) : leads.map((lead, index) => (
              <tr key={lead.id} className="hover:bg-white/5 transition duration-150 group">
                {showCheckbox && (
                  <td className="p-4 text-center">
                    <input type="checkbox" checked={selectedIds.includes(lead.id)} onChange={() => toggleSelectOne(lead.id)} className="cursor-pointer accent-blue-500" />
                  </td>
                )}
                
                {/* Source */}
                <td className="p-4 hidden md:table-cell">
                  <span className="bg-gray-800/50 text-gray-400 text-[10px] px-2 py-1 rounded border border-gray-700/50 whitespace-nowrap max-w-25 truncate block" title={lead.source_file}>
                    {lead.source_file || 'Manual'}
                  </span>
                </td>

                {/* Lead Info */}
                <td className="p-4">
                  <div className="flex flex-col">
                    <span className="text-sm font-bold text-white leading-tight">{lead.name} {lead.surname}</span>
                    <span className="text-[10px] text-gray-600 font-mono">ID: {lead.id}</span>
                  </div>
                </td>

                {/* Country */}
                <td className="p-4 hidden md:table-cell">
                  <div className="flex items-center gap-1">
                    <span className="text-[10px] bg-gray-800 px-1.5 py-0.5 rounded text-gray-400 border border-gray-700">{lead.country}</span>
                  </div>
                </td>

                {/* Contact */}
                <td className="p-4">
                  <div className="flex flex-col gap-1">
                    <div className="flex items-center gap-2 text-gray-400 hover:text-blue-400 transition cursor-pointer" title="Click to copy">
                      <Phone size={10} className="opacity-50" /> <span className="font-mono text-xs">{lead.phone}</span>
                    </div>
                    {lead.email && (
                      <div className="flex items-center gap-2 text-gray-500">
                        <Mail size={10} className="opacity-50" /> <span className="text-[10px] truncate max-w-37.5" title={lead.email}>{lead.email}</span>
                      </div>
                    )}
                  </div>
                </td>

                {/* S-KYC */}
                <td className="p-4 text-center align-middle">
                    {lead.kyc_status === 'Approved' ? (
                        <div className="flex justify-center" title="KYC Approved"><ShieldCheck size={16} className="text-green-400" /></div>
                    ) : lead.kyc_status === 'Pending' ? (
                        <div className="flex justify-center" title="KYC Pending"><Shield size={16} className="text-yellow-400" /></div>
                    ) : (
                         <div className="flex justify-center opacity-20" title="No KYC"><ShieldAlert size={16} className="text-gray-500" /></div>
                    )}
                </td>

                {/* STATUS PICKER */}
                <td className="p-4 align-middle">
                  <StatusCell 
                    currentStatus={lead.status} 
                    leadId={lead.id} 
                    options={statusOptions} 
                    onUpdate={handleStatusChange} 
                    rowIndex={index} 
                    totalRows={leads.length}
                  />
                </td>

                {/* Assigned To */}
                {showAssign && (
                  <td className="p-4 hidden md:table-cell">
                    <div className="flex items-center gap-2">
                      <UserPlus size={12} className="text-gray-600" />
                      <select className="bg-transparent border-b border-gray-700 text-xs text-gray-300 focus:border-blue-500 outline-none cursor-pointer w-32 hover:text-white transition pb-1" defaultValue={lead.assigned_to || ""}>
                        <option value="" className="bg-gray-800 text-gray-400">-- Unassigned --</option>
                        <option value="Agent 006" className="bg-gray-800 text-white">Agent 006</option>
                      </select>
                    </div>
                  </td>
                )}

                <td className="p-4 text-center">
                  <button className={`transition p-2 rounded-lg hover:bg-white/5 ${(lead.note_count || 0) > 0 ? 'text-blue-400' : 'text-gray-600'}`}><MessageSquare size={16} /></button>
                </td>
                <td className="p-4 text-center">
                  <button onClick={() => onLeadClick(lead)} className="p-1.5 bg-blue-600/10 text-blue-400 border border-blue-500/30 hover:bg-blue-600 hover:text-white rounded-lg transition-all shadow-lg shadow-blue-500/10" title="Open Profile"><Eye size={14} /></button>
                </td>
                {showDelete && (
                  <td className="p-4 text-center">
                    <button className="text-gray-600 hover:text-red-400 transition p-1.5"><Trash2 size={14} /></button>
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}