import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';

export interface Lead {
  id: string; 
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

export interface Agent {
  id: string;
  real_name: string;
  role: string;
}

export function useLeads(filters: any, currentUserEmail?: string) {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [totalCount, setTotalCount] = useState(0); 
  const [statusOptions, setStatusOptions] = useState<any[]>([]);
  const [agents, setAgents] = useState<Agent[]>([]);
  const [loading, setLoading] = useState(true);

  // --- FETCH DATA ---
  const fetchData = async () => {
    setLoading(true);

    const { data: stData } = await supabase.from('crm_statuses').select('label, hex_color').eq('is_active', true).order('order_index', { ascending: true });
    if (stData) setStatusOptions(stData);

    const { data: agentData } = await supabase.from('crm_users').select('id, real_name, role').in('role', ['conversion', 'retention', 'team_leader']).order('real_name', { ascending: true });
    if (agentData) setAgents(agentData);

    // FIX: STABLE SORTING
    // We sort by 'created_at' DESC first (Newest leads top).
    // CRITICAL: We also sort by 'id' DESC as a tie-breaker. 
    // This ensures that if you edit a lead, it DOES NOT jump around on refresh.
    let query = supabase.from('crm_leads')
        .select('*', { count: 'exact' }) 
        .order('created_at', { ascending: false })
        .order('id', { ascending: false });

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

    const page = filters?.page || 1;
    const limit = filters?.limit || 50;
    const from = (page - 1) * limit;
    const to = from + limit - 1;
    
    query = query.range(from, to);

    const { data, count, error } = await query;
    
    if (!error) {
        setLeads(data || []);
        setTotalCount(count || 0);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchData();
    
    // --- QUOTA SAVER MODE ---
    // Only listen for NEW leads (INSERT). 
    // Updates/Deletes are ignored to prevent message explosion.
    const leadSub = supabase.channel('table-leads')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'crm_leads' }, (payload) => {
          setLeads(currentLeads => [payload.new as Lead, ...currentLeads]);
          setTotalCount(prev => prev + 1);
      })
      .subscribe();
      
    return () => { supabase.removeChannel(leadSub); };
  }, [filters]);

  // --- ACTIONS ---

  const updateLocalLead = (id: string, updates: Partial<Lead>) => {
    setLeads(prev => prev.map(l => l.id === id ? { ...l, ...updates } : l));
  };

  const updateLeadStatus = async (leadId: string, newStatus: string) => {
    const lead = leads.find(l => l.id === leadId);
    const oldStatus = lead ? lead.status : null;

    // Optimistic Update (Instant & In-Place)
    // We use .map() so the lead stays at the EXACT same index.
    setLeads(prev => prev.map(l => l.id === leadId ? { ...l, status: newStatus } : l));
    
    if (oldStatus && oldStatus !== newStatus) {
        window.dispatchEvent(new CustomEvent('crm-lead-update', { detail: { oldStatus, newStatus } }));
    }

    const { error } = await supabase.from('crm_leads').update({ status: newStatus }).eq('id', leadId);
    if (error) console.error("Status Update Failed", error);
    else window.dispatchEvent(new CustomEvent('crm-toast', { detail: { message: `Status updated`, type: 'success' } }));
  };

  const updateLeadAgent = async (leadId: string, agentId: string | null) => {
    // Optimistic Update
    setLeads(prev => prev.map(l => l.id === leadId ? { ...l, assigned_to: agentId } : l));
    const { error } = await supabase.from('crm_leads').update({ assigned_to: agentId }).eq('id', leadId);
    if (error) alert("Failed to assign agent");
    else window.dispatchEvent(new CustomEvent('crm-toast', { detail: { message: `Agent assigned`, type: 'success' } }));
  };

  const deleteLead = async (leadId: string) => {
    const { error } = await supabase.from('crm_leads').delete().eq('id', leadId);
    if (error) {
      window.dispatchEvent(new CustomEvent('crm-toast', { detail: { message: 'Failed to delete lead', type: 'error' } }));
      return false;
    }
    setLeads(prev => prev.filter(l => l.id !== leadId));
    setTotalCount(prev => prev - 1);
    window.dispatchEvent(new CustomEvent('crm-toast', { detail: { message: 'Lead deleted successfully', type: 'success' } }));
    return true;
  };

  const bulkUpdateStatus = async (ids: string[], status: string) => {
    setLeads(prev => prev.map(l => ids.includes(l.id) ? { ...l, status } : l));
    const { error } = await supabase.from('crm_leads').update({ status }).in('id', ids);
    if (error) return false;
    return true;
  };

  const bulkUpdateAgent = async (ids: string[], agentId: string | null) => {
    setLeads(prev => prev.map(l => ids.includes(l.id) ? { ...l, assigned_to: agentId } : l));
    const { error } = await supabase.from('crm_leads').update({ assigned_to: agentId }).in('id', ids);
    if (error) return false;
    return true;
  };

  const bulkDeleteLeads = async (ids: string[]) => {
    const { error } = await supabase.from('crm_leads').delete().in('id', ids);
    if (error) return false;
    setLeads(prev => prev.filter(l => !ids.includes(l.id)));
    setTotalCount(prev => prev - ids.length);
    return true;
  };

  return { 
    leads, totalCount, statusOptions, agents, loading, 
    updateLeadStatus, updateLeadAgent, deleteLead,
    bulkUpdateStatus, bulkUpdateAgent, bulkDeleteLeads,
    updateLocalLead 
  };
}