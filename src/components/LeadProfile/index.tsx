import { useState, useEffect } from 'react';
import { LayoutDashboard, FileText, PenTool, Wallet, History, CreditCard, Activity, Trash2, Server, ArrowRightLeft, TrendingUp } from 'lucide-react';
import { supabase } from '../../lib/supabase'; 
import ProfileHeader from './ProfileHeader';
import KYCSummary from './KYCSummary';
import KYCForm from './KYCForm';
import PlatformRegistration from './PlatformRegistration';
import LeadTransactions from './LeadTransactions';
import LeadTradeHistory from './LeadTradeHistory';

// ⚠️ YOUR API KEY from marketSocket.ts
const TWELVE_DATA_KEY = "05e7f5f30b384f11936a130f387c4092"; 

interface LeadProfilePageProps {
  lead: any;
  onBack: () => void;
}

export default function LeadProfilePage({ lead, onBack }: LeadProfilePageProps) {
  const [activeTab, setActiveTab] = useState<'overview' | 'resume' | 'update' | 'platform' | 'transactions' | 'history'>(() => {
    const saved = localStorage.getItem('crm_profile_active_tab');
    return (saved as any) || 'overview';
  });

  useEffect(() => { localStorage.setItem('crm_profile_active_tab', activeTab); }, [activeTab]);

  // --- STATE ---
  const [dbTrades, setDbTrades] = useState<any[]>([]); // Static DB Data
  const [livePrices, setLivePrices] = useState<Record<string, number>>({}); // Live Websocket Data
  const [financials, setFinancials] = useState({
    mainBalance: 0,
    roomBalance: 0,
    totalEquity: 0,
    openPnL: 0
  });
  const [loadingData, setLoadingData] = useState(false);

  // --- 1. FETCH STATIC DB DATA ---
  useEffect(() => {
    if (lead?.trading_account_id && activeTab === 'overview') {
        fetchOverviewData();

        // Listen for DB changes (New trades / Closed trades)
        const channel = supabase
            .channel('crm-live-db')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'trades', filter: `user_id=eq.${lead.trading_account_id}` }, () => fetchOverviewData())
            .on('postgres_changes', { event: '*', schema: 'public', table: 'trading_accounts', filter: `user_id=eq.${lead.trading_account_id}` }, () => fetchOverviewData())
            .subscribe();

        return () => { supabase.removeChannel(channel); };
    }
  }, [lead, activeTab]);

  const fetchOverviewData = async () => {
    if (dbTrades.length === 0) setLoadingData(true);
    try {
        const userId = lead.trading_account_id;
        // Balances
        const { data: profile } = await supabase.from('profiles').select('balance').eq('id', userId).single();
        const { data: rooms } = await supabase.from('trading_accounts').select('balance').eq('user_id', userId);
        const mainBal = profile?.balance || 0;
        const roomsBal = rooms?.reduce((sum, room) => sum + (room.balance || 0), 0) || 0;

        // Active Trades
        const { data: trades } = await supabase.from('trades').select('*').eq('user_id', userId).eq('status', 'open');
        
        setDbTrades(trades || []);
        setFinancials(prev => ({ ...prev, mainBalance: mainBal, roomBalance: roomsBal }));

    } catch (error) { console.error("Error:", error); }
    setLoadingData(false);
  };

  // --- 2. WEBSOCKET CONNECTION (THE HEARTBEAT) ---
  useEffect(() => {
    if (dbTrades.length === 0 || activeTab !== 'overview') return;

    // Get unique symbols to subscribe to (e.g. "BTC/USD,ETH/USD")
    const symbols = Array.from(new Set(dbTrades.map(t => t.symbol))).join(',');
    const ws = new WebSocket(`wss://ws.twelvedata.com/v1/quotes/price?apikey=${TWELVE_DATA_KEY}`);

    ws.onopen = () => {
        // Subscribe to all active symbols
        ws.send(JSON.stringify({ action: "subscribe", params: { symbols } }));
    };

    ws.onmessage = (event) => {
        const data = JSON.parse(event.data);
        if (data.event === 'price' && data.symbol && data.price) {
            setLivePrices(prev => ({
                ...prev,
                [data.symbol]: parseFloat(data.price)
            }));
        }
    };

    // Heartbeat to keep connection alive
    const heartbeat = setInterval(() => {
        if (ws.readyState === WebSocket.OPEN) {
            ws.send(JSON.stringify({ action: "heartbeat" }));
        }
    }, 10000);

    return () => {
        clearInterval(heartbeat);
        ws.close();
    };
  }, [dbTrades, activeTab]);

  // --- 3. CALCULATE LIVE PnL & EQUITY (FIXED) ---
  const activeTradesWithLiveStats = dbTrades.map(trade => {
      const currentPrice = livePrices[trade.symbol] || trade.entry_price; 
      
      let pnl = 0;
      
      // 🛠️ FIX: Use Percentage Change Formula because 'size' is in USD
      // Formula: ((Current - Entry) / Entry) * Size
      if (trade.type === 'buy') {
          pnl = ((currentPrice - trade.entry_price) / trade.entry_price) * trade.size;
      } else {
          pnl = ((trade.entry_price - currentPrice) / trade.entry_price) * trade.size;
      }

      // Margin is purely for ROE calculation
      const margin = trade.margin || (trade.size / trade.leverage);
      
      // Calculate ROE
      const roe = margin > 0 ? ((pnl / margin) * 100).toFixed(2) : "0.00";

      return { ...trade, currentPrice, pnl, roe, margin };
  });

  const totalOpenPnL = activeTradesWithLiveStats.reduce((sum, t) => sum + t.pnl, 0);
  const totalEquity = financials.mainBalance + financials.roomBalance + totalOpenPnL;


  // --- NOTES LOGIC (Preserved) ---
  const [notes, setNotes] = useState<any[]>([]);
  const [newNote, setNewNote] = useState('');
  const [savingNote, setSavingNote] = useState(false);
  const [userRole, setUserRole] = useState(''); 
  useEffect(() => { if(lead?.id) { fetchNotes(); fetchUserRole(); } }, [lead.id]);
  const fetchUserRole = async () => { const { data: { user } } = await supabase.auth.getUser(); setUserRole(user?.user_metadata?.role || 'conversion'); };
  const fetchNotes = async () => { const { data } = await supabase.from('crm_lead_notes').select('*').eq('lead_id', lead.id).order('created_at', { ascending: false }); if (data) setNotes(data); };
  const handleSaveNote = async () => { if (!newNote.trim()) return; setSavingNote(true); const { data: { user } } = await supabase.auth.getUser(); await supabase.from('crm_lead_notes').insert({ lead_id: lead.id, content: newNote, agent_email: user?.email }); setNewNote(''); fetchNotes(); setSavingNote(false); };
  const handleDeleteNote = async (id: string) => { if(confirm('Delete?')) { await supabase.from('crm_lead_notes').delete().eq('id', id); fetchNotes(); } };
  const canDelete = ['admin', 'manager', 'retention'].includes(userRole);

  if (!lead) return null;

  return (
    <div className="animate-in fade-in slide-in-from-bottom-4 duration-300 p-6 max-w-400 mx-auto">
      <ProfileHeader lead={lead} onBack={onBack} />

      {/* TABS */}
      <div className="flex items-center gap-2 mb-6 border-b border-white/10 pb-1 overflow-x-auto">
        <TabButton active={activeTab === 'overview'} onClick={() => setActiveTab('overview')} icon={<LayoutDashboard size={16}/>} label="Overview" />
        <TabButton active={activeTab === 'transactions'} onClick={() => setActiveTab('transactions')} icon={<ArrowRightLeft size={16}/>} label="Transactions" />
        <TabButton active={activeTab === 'history'} onClick={() => setActiveTab('history')} icon={<History size={16}/>} label="History" />
        <TabButton active={activeTab === 'resume'} onClick={() => setActiveTab('resume')} icon={<FileText size={16}/>} label="KYC" />
        <TabButton active={activeTab === 'update'} onClick={() => setActiveTab('update')} icon={<PenTool size={16}/>} label="Update" />
        <TabButton active={activeTab === 'platform'} onClick={() => setActiveTab('platform')} icon={<Server size={16}/>} label="Platform" />
      </div>

      {activeTab === 'overview' && (
        <div className="grid grid-cols-12 gap-6 animate-in fade-in duration-300">
          
          {/* FINANCIALS & TRADES */}
          <div className="col-span-12 lg:col-span-8 space-y-6">
            
            {/* 3 CARDS - NOW LIVE UPDATING */}
            <div className="grid grid-cols-3 gap-4">
              <div className="glass-panel p-6 rounded-xl border border-white/5 relative overflow-hidden">
                <div className="flex items-center gap-3 text-gray-400 mb-2">
                  <Wallet size={18} /> <span className="text-xs font-bold uppercase">Total Equity</span>
                </div>
                <p className="text-3xl font-bold text-white">
                    {loadingData ? "..." : `$${totalEquity.toLocaleString(undefined, {minimumFractionDigits: 2})}`}
                </p>
              </div>
              <div className="glass-panel p-6 rounded-xl border border-white/5 relative overflow-hidden">
                <div className="flex items-center gap-3 text-gray-400 mb-2">
                  <CreditCard size={18} /> <span className="text-xs font-bold uppercase">Main Wallet</span>
                </div>
                <p className="text-3xl font-bold text-blue-400">
                    {loadingData ? "..." : `$${financials.mainBalance.toLocaleString(undefined, {minimumFractionDigits: 2})}`}
                </p>
              </div>
              <div className="glass-panel p-6 rounded-xl border border-white/5 relative overflow-hidden">
                <div className="flex items-center gap-3 text-gray-400 mb-2">
                  <Activity size={18} /> <span className="text-xs font-bold uppercase">Open P&L</span>
                </div>
                <p className={`text-3xl font-bold ${totalOpenPnL >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                    {loadingData ? "..." : `${totalOpenPnL > 0 ? '+' : ''}$${totalOpenPnL.toLocaleString(undefined, {minimumFractionDigits: 2})}`}
                </p>
              </div>
            </div>

            {/* ✅ LIVE MARKET TABLE */}
            <div className="glass-panel p-6 rounded-xl border border-white/5 min-h-100 overflow-hidden">
               <div className="flex justify-between items-center mb-4">
                   <h3 className="text-lg font-bold text-white flex items-center gap-2">
                     <TrendingUp size={18} className="text-green-500" /> 
                     Active Open Positions
                   </h3>
                   <div className="flex items-center gap-2">
                      <span className="flex items-center gap-1.5 px-2 py-1 bg-green-500/10 rounded text-[10px] text-green-400 font-bold uppercase border border-green-500/20">
                          <span className="relative flex h-2 w-2">
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                            <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span>
                          </span>
                          Live Feed
                      </span>
                   </div>
               </div>
               
               {activeTradesWithLiveStats.length === 0 ? (
                   <div className="w-full h-64 border-2 border-dashed border-white/10 rounded-xl flex items-center justify-center text-gray-500 text-sm italic">
                     No active positions open.
                   </div>
               ) : (
                   <div className="overflow-x-auto">
                       <table className="w-full text-left text-xs">
                           <thead className="text-gray-500 uppercase border-b border-white/5">
                               <tr>
                                   <th className="pb-3 pl-2">Symbol</th>
                                   <th className="pb-3 text-center">Side</th>
                                   <th className="pb-3 text-center">Size</th>
                                   <th className="pb-3 text-right">Entry</th>
                                   <th className="pb-3 text-right">Mark Price</th>
                                   <th className="pb-3 text-right">TP</th>
                                   <th className="pb-3 text-right">SL</th>
                                   <th className="pb-3 text-right">Liq.</th>
                                   <th className="pb-3 text-right pr-2">PnL (ROE%)</th>
                               </tr>
                           </thead>
                           <tbody className="divide-y divide-white/5">
                               {activeTradesWithLiveStats.map(t => {
                                   const isProfit = t.pnl >= 0;
                                   const sideColor = t.type === 'buy' ? 'text-green-400 bg-green-400/10' : 'text-red-400 bg-red-400/10';
                                   
                                   return (
                                       <tr key={t.id} className="hover:bg-white/5 transition">
                                           {/* Symbol */}
                                           <td className="py-3 pl-2 font-bold text-white">
                                               {t.symbol}
                                               <span className="block text-[9px] text-gray-500 font-normal">{t.leverage}x</span>
                                           </td>
                                           
                                           {/* Side */}
                                           <td className="py-3 text-center">
                                               <span className={`px-1.5 py-0.5 rounded text-[9px] font-black uppercase ${sideColor}`}>
                                                   {t.type}
                                               </span>
                                           </td>

                                           {/* Size */}
                                           <td className="py-3 text-center text-gray-300">
                                               {Number(t.size).toLocaleString()}
                                           </td>

                                           {/* Entry Price */}
                                           <td className="py-3 text-right text-gray-300">
                                               {Number(t.entry_price).toLocaleString()}
                                           </td>

                                           {/* Mark Price (LIVE) */}
                                           <td className="py-3 text-right text-yellow-500 font-mono font-bold animate-pulse">
                                               {Number(t.currentPrice).toLocaleString()}
                                           </td>

                                           {/* TP */}
                                           <td className="py-3 text-right text-green-400/70 font-mono">
                                               {t.take_profit ? Number(t.take_profit).toLocaleString() : '-'}
                                           </td>

                                           {/* SL */}
                                           <td className="py-3 text-right text-red-400/70 font-mono">
                                               {t.stop_loss ? Number(t.stop_loss).toLocaleString() : '-'}
                                           </td>

                                           {/* Liq Price */}
                                           <td className="py-3 text-right text-orange-400/70 font-mono">
                                                {t.liquidation_price ? Number(t.liquidation_price).toLocaleString() : '-'}
                                           </td>

                                           {/* PnL (ROE%) - LIVE */}
                                           <td className="py-3 text-right pr-2">
                                               <div className={`font-bold font-mono text-sm ${isProfit ? 'text-green-400' : 'text-red-400'}`}>
                                                   {isProfit ? '+' : ''}{Number(t.pnl).toFixed(2)}
                                               </div>
                                               <div className={`text-[9px] font-bold ${isProfit ? 'text-green-500/70' : 'text-red-500/70'}`}>
                                                   ({isProfit ? '+' : ''}{t.roe}%)
                                               </div>
                                           </td>
                                       </tr>
                                   );
                               })}
                           </tbody>
                       </table>
                   </div>
               )}
            </div>

          </div>

          {/* RIGHT: NOTES */}
          <div className="col-span-12 lg:col-span-4 space-y-6">
            <div className="glass-panel p-6 rounded-xl border border-white/5 h-full flex flex-col">
              <h3 className="text-lg font-bold text-white mb-4">Agent Notes</h3>
              <div className="relative">
                <textarea value={newNote} onChange={(e) => setNewNote(e.target.value)} className="w-full h-32 bg-black/20 border border-white/10 rounded-xl p-4 text-sm text-white resize-none" placeholder="Type note..."></textarea>
                <button onClick={handleSaveNote} disabled={savingNote || !newNote.trim()} className="cursor-pointer w-full mt-3 bg-blue-600 hover:bg-blue-500 text-white font-bold py-3 rounded-xl transition text-xs uppercase">{savingNote ? 'Saving...' : 'Save Note'}</button>
              </div>
              <div className="mt-8 space-y-4 flex-1 overflow-y-auto max-h-125 pr-2 custom-scrollbar">
                {notes.map((note) => (
                    <div key={note.id} className="p-4 bg-white/5 rounded-xl border-l-2 border-blue-500 relative group">
                        <p className="text-sm text-gray-300">{note.content}</p>
                        <div className="flex justify-between mt-3 pt-3 border-t border-white/5 text-[10px] text-gray-500">
                             <span>{note.agent_email?.split('@')[0]}</span>
                             <span>{new Date(note.created_at).toLocaleString()}</span>
                        </div>
                        {canDelete && <button onClick={() => handleDeleteNote(note.id)} className="cursor-pointer absolute top-2 right-2 p-1 text-red-500 opacity-0 group-hover:opacity-100"><Trash2 size={12} /></button>}
                    </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* OTHER TABS */}
      {activeTab === 'transactions' && <LeadTransactions lead={lead} />}
      {activeTab === 'history' && <LeadTradeHistory lead={lead} />}
      {activeTab === 'resume' && <KYCSummary lead={lead} />}
      {activeTab === 'update' && <KYCForm lead={lead} />}
      {activeTab === 'platform' && <PlatformRegistration lead={lead} />}
    </div>
  );
}

function TabButton({ active, onClick, icon, label }: any) {
    return (
        <button onClick={onClick} className={`cursor-pointer whitespace-nowrap flex items-center gap-2 px-4 py-2 text-sm font-bold rounded-t-lg transition-all border-b-2 ${active ? 'text-cyan-400 border-cyan-400 bg-cyan-500/5' : 'text-gray-400 border-transparent hover:text-white hover:bg-white/5'}`}>
          {icon} {label}
        </button>
    );
}