import { useState, useEffect } from 'react';
import { LayoutDashboard, FileText, PenTool, Wallet, History, CreditCard, Activity, Loader2, Save, Trash2 } from 'lucide-react';
import { supabase } from '../../lib/supabase'; // Import Supabase
import ProfileHeader from './ProfileHeader';
import KYCSummary from './KYCSummary';
import KYCForm from './KYCForm';

interface LeadProfilePageProps {
  lead: any;
  onBack: () => void;
}

export default function LeadProfilePage({ lead, onBack }: LeadProfilePageProps) {
  // Tab Persistence
  const [activeTab, setActiveTab] = useState<'overview' | 'resume' | 'update'>(() => {
    const saved = localStorage.getItem('crm_profile_active_tab');
    return (saved as 'overview' | 'resume' | 'update') || 'overview';
  });

  useEffect(() => {
    localStorage.setItem('crm_profile_active_tab', activeTab);
  }, [activeTab]);

  // --- NOTES LOGIC ---
  const [notes, setNotes] = useState<any[]>([]);
  const [newNote, setNewNote] = useState('');
  const [savingNote, setSavingNote] = useState(false);
  const [loadingNotes, setLoadingNotes] = useState(false);
  const [userRole, setUserRole] = useState<string>(''); // <--- Store User Role

  // Fetch Notes & User Role on Load
  useEffect(() => {
    if (activeTab === 'overview' && lead?.id) {
      fetchNotes();
      fetchUserRole();
    }
  }, [lead.id, activeTab]);

  const fetchUserRole = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    // Assuming role is stored in user_metadata (standard Supabase pattern)
    const role = user?.user_metadata?.role || 'conversion'; 
    setUserRole(role);
  };

  const fetchNotes = async () => {
    setLoadingNotes(true);
    const { data } = await supabase
      .from('crm_lead_notes')
      .select('*')
      .eq('lead_id', lead.id)
      .order('created_at', { ascending: false });
    
    if (data) setNotes(data);
    setLoadingNotes(false);
  };

  const handleSaveNote = async () => {
    if (!newNote.trim()) return;
    setSavingNote(true);

    const { data: { user } } = await supabase.auth.getUser();

    const { error } = await supabase.from('crm_lead_notes').insert({
      lead_id: lead.id,
      content: newNote,
      agent_email: user?.email || 'Unknown Agent'
    });

    if (error) {
      alert('Error saving note');
    } else {
      setNewNote('');
      fetchNotes(); 
    }
    setSavingNote(false);
  };

  // --- NEW: DELETE NOTE LOGIC ---
  const handleDeleteNote = async (noteId: string) => {
    if (!confirm('Are you sure you want to delete this note?')) return;

    const { error } = await supabase
        .from('crm_lead_notes')
        .delete()
        .eq('id', noteId);

    if (error) {
        alert('Error deleting note: ' + error.message);
    } else {
        fetchNotes(); // Refresh list
    }
  };

  // Check if user is allowed to delete
  const canDelete = ['admin', 'manager', 'retention'].includes(userRole);

  if (!lead) return null;

  return (
    <div className="animate-in fade-in slide-in-from-bottom-4 duration-300 p-6 max-w-400 mx-auto">
      
      <ProfileHeader lead={lead} onBack={onBack} />

      {/* --- 3-WAY TAB NAVIGATION --- */}
      <div className="flex items-center gap-2 mb-6 border-b border-white/10 pb-1">
        <TabButton 
            active={activeTab === 'overview'} 
            onClick={() => setActiveTab('overview')} 
            icon={<LayoutDashboard size={16}/>} 
            label="Overview" 
        />
        <TabButton 
            active={activeTab === 'resume'} 
            onClick={() => setActiveTab('resume')} 
            icon={<FileText size={16}/>} 
            label="KYC Profile" 
        />
        <TabButton 
            active={activeTab === 'update'} 
            onClick={() => setActiveTab('update')} 
            icon={<PenTool size={16}/>} 
            label="Update / Upload" 
        />
      </div>

      {/* --- TAB CONTENT: OVERVIEW --- */}
      {activeTab === 'overview' && (
        <div className="grid grid-cols-12 gap-6 animate-in fade-in duration-300">
          
          {/* LEFT COLUMN */}
          <div className="col-span-12 lg:col-span-8 space-y-6">
            
            {/* FINANCE CARDS */}
            <div className="grid grid-cols-3 gap-4">
              <div className="glass-panel p-6 rounded-xl border border-white/5 relative overflow-hidden group">
                <div className="absolute right-0 top-0 w-24 h-24 bg-green-500/10 rounded-full blur-2xl -mr-10 -mt-10 transition group-hover:bg-green-500/20"></div>
                <div className="flex items-center gap-3 text-gray-400 mb-2">
                  <Wallet size={18} />
                  <span className="text-xs font-bold uppercase tracking-widest">Total Balance</span>
                </div>
                <p className="text-3xl font-bold text-white">$12,450.00</p>
                <div className="mt-4 flex gap-2">
                  <button className="flex-1 bg-green-600 hover:bg-green-500 text-white text-xs font-bold py-2 rounded-lg transition">DEPOSIT</button>
                  <button className="flex-1 bg-white/5 hover:bg-white/10 text-white text-xs font-bold py-2 rounded-lg border border-white/10 transition">WITHDRAW</button>
                </div>
              </div>

              <div className="glass-panel p-6 rounded-xl border border-white/5 relative overflow-hidden group">
                <div className="absolute right-0 top-0 w-24 h-24 bg-blue-500/10 rounded-full blur-2xl -mr-10 -mt-10 transition group-hover:bg-blue-500/20"></div>
                <div className="flex items-center gap-3 text-gray-400 mb-2">
                  <CreditCard size={18} />
                  <span className="text-xs font-bold uppercase tracking-widest">Net Deposit</span>
                </div>
                <p className="text-3xl font-bold text-blue-400">$5,000.00</p>
              </div>

              <div className="glass-panel p-6 rounded-xl border border-white/5 relative overflow-hidden group">
                <div className="absolute right-0 top-0 w-24 h-24 bg-purple-500/10 rounded-full blur-2xl -mr-10 -mt-10 transition group-hover:bg-purple-500/20"></div>
                <div className="flex items-center gap-3 text-gray-400 mb-2">
                  <Activity size={18} />
                  <span className="text-xs font-bold uppercase tracking-widest">Open P&L</span>
                </div>
                <p className="text-3xl font-bold text-green-400">+$245.50</p>
              </div>
            </div>

            {/* TRADING TABLE PLACEHOLDER */}
            <div className="glass-panel p-6 rounded-xl border border-white/5 min-h-100">
               <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                 <History size={18} className="text-blue-500" /> 
                 Trade History
               </h3>
               <div className="w-full h-64 border-2 border-dashed border-white/10 rounded-xl flex items-center justify-center text-gray-500 text-sm italic">
                 Waiting for Platform connection...
               </div>
            </div>

          </div>

          {/* RIGHT COLUMN - AGENT NOTES */}
          <div className="col-span-12 lg:col-span-4 space-y-6">
            <div className="glass-panel p-6 rounded-xl border border-white/5 h-full flex flex-col">
              <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                <FileText size={18} className="text-yellow-500" /> 
                Agent Notes
              </h3>
              
              <div className="relative">
                <textarea 
                    value={newNote}
                    onChange={(e) => setNewNote(e.target.value)}
                    className="w-full h-32 bg-black/20 border border-white/10 rounded-xl p-4 text-sm text-white focus:outline-none focus:border-blue-500/50 resize-none placeholder:text-gray-600"
                    placeholder="Type a new note here..."
                ></textarea>
                <button 
                    onClick={handleSaveNote}
                    disabled={savingNote || !newNote.trim()}
                    className="w-full mt-3 bg-blue-600 hover:bg-blue-500 disabled:bg-blue-600/50 text-white font-bold py-3 rounded-xl transition text-xs uppercase tracking-widest flex items-center justify-center gap-2"
                >
                    {savingNote ? <Loader2 size={14} className="animate-spin"/> : <Save size={14} />}
                    {savingNote ? 'SAVING...' : 'SAVE NOTE'}
                </button>
              </div>

              {/* NOTES LIST */}
              <div className="mt-8 space-y-4 flex-1 overflow-y-auto max-h-125 pr-2 custom-scrollbar">
                {loadingNotes ? (
                    <div className="text-center text-gray-500 py-4"><Loader2 className="animate-spin mx-auto"/></div>
                ) : notes.length === 0 ? (
                    <div className="text-center text-gray-600 text-xs italic py-4">No notes yet. Be the first to add one!</div>
                ) : (
                    notes.map((note) => (
                        <div key={note.id} className="p-4 bg-white/5 rounded-xl border-l-2 border-blue-500 animate-in fade-in slide-in-from-right-4 duration-300 group relative">
                            <p className="text-sm text-gray-300 whitespace-pre-wrap">{note.content}</p>
                            
                            <div className="flex items-center justify-between mt-3 pt-3 border-t border-white/5">
                                <span className="text-[10px] text-blue-400 font-bold uppercase">{note.agent_email?.split('@')[0]}</span>
                                <span className="text-[10px] text-gray-500">{new Date(note.created_at).toLocaleString()}</span>
                            </div>

                            {/* DELETE BUTTON: Only visible for Admin/Manager/Retention */}
                            {canDelete && (
                                <button 
                                    onClick={() => handleDeleteNote(note.id)}
                                    className="absolute top-2 right-2 p-1.5 rounded-lg bg-red-500/10 text-red-500 opacity-0 group-hover:opacity-100 transition hover:bg-red-500/20"
                                    title="Delete Note"
                                >
                                    <Trash2 size={14} />
                                </button>
                            )}
                        </div>
                    ))
                )}
              </div>
            </div>
          </div>

        </div>
      )}

      {/* --- TAB CONTENT: RESUME --- */}
      {activeTab === 'resume' && <KYCSummary lead={lead} />}

      {/* --- TAB CONTENT: UPDATE FORM --- */}
      {activeTab === 'update' && <KYCForm lead={lead} />}

    </div>
  );
}

// Helper for Tab Buttons
function TabButton({ active, onClick, icon, label }: any) {
    return (
        <button 
          onClick={onClick}
          className={`flex items-center gap-2 px-4 py-2 text-sm font-bold rounded-t-lg transition-all duration-200 border-b-2 ${active ? 'text-cyan-400 border-cyan-400 bg-cyan-500/5' : 'text-gray-400 border-transparent hover:text-white hover:bg-white/5'}`}
        >
          {icon}
          {label}
        </button>
    );
}