import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { Wallet, Plus, ArrowRightLeft, TrendingUp, ArrowDownLeft, ArrowUpRight, Loader2, Briefcase, X, AlertCircle, Building2, Landmark } from 'lucide-react';
import SuccessModal from '../Team/SuccessModal';

interface Props {
  lead: any;
}

export default function TradingAccountsTab({ lead }: Props) {
  const [loading, setLoading] = useState(true);
  const [mainBalance, setMainBalance] = useState(0);
  const [accounts, setAccounts] = useState<any[]>([]);
  
  // ACTIONS
  const [isCreatingOpen, setIsCreatingOpen] = useState(false);
  const [newAccountName, setNewAccountName] = useState('');
  const [isCreating, setIsCreating] = useState(false);
  
  // TRANSFER STATES
  const [transferMode, setTransferMode] = useState<{ 
      type: 'deposit' | 'withdraw' | 'main_transfer', 
      accountId?: string, 
      accountName?: string 
  } | null>(null);
  
  const [amount, setAmount] = useState('');
  const [selectedTargetRoom, setSelectedTargetRoom] = useState('');
  const [isTransferring, setIsTransferring] = useState(false);

  // ADD FUNDS STATE
  const [isAddingFunds, setIsAddingFunds] = useState(false);
  const [addAmount, setAddAmount] = useState('');

  // SUCCESS MODAL
  const [successOpen, setSuccessOpen] = useState(false);
  const [successMessage, setSuccessMessage] = useState({ title: '', message: '' });

  useEffect(() => {
    if (!lead?.trading_account_id) {
        setLoading(false);
        return;
    }

    fetchData();
    
    const channel = supabase.channel('accounts-realtime')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'trading_accounts', filter: `user_id=eq.${lead.trading_account_id}` }, () => fetchData())
        .on('postgres_changes', { event: '*', schema: 'public', table: 'profiles', filter: `id=eq.${lead.trading_account_id}` }, () => fetchData())
        .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [lead]);

  const fetchData = async () => {
    try {
        const { data: profile } = await supabase.from('profiles').select('balance').eq('id', lead.trading_account_id).single();
        if (profile) setMainBalance(profile.balance);

        const { data: rooms } = await supabase.from('trading_accounts').select('*').eq('user_id', lead.trading_account_id).order('created_at', { ascending: true });
        if (rooms) setAccounts(rooms || []);
    } catch (e) { console.error(e); } finally { setLoading(false); }
  };

  const totalRoomBalance = accounts.reduce((sum, acc) => sum + (acc.balance || 0), 0);
  const totalNetWorth = mainBalance + totalRoomBalance;

  // --- 1. CREATE ACCOUNT ---
  const handleCreateAccount = async () => {
    if (!newAccountName.trim()) return;
    setIsCreating(true);
    try {
        const { data, error } = await supabase.from('trading_accounts').insert({
            user_id: lead.trading_account_id,
            name: newAccountName,
            balance: 0, 
        }).select().single();

        if (error) throw error;

        if (data) setAccounts(prev => [...prev, data]);
        
        setNewAccountName('');
        setIsCreatingOpen(false); 
        
        setSuccessMessage({ title: 'ROOM DEPLOYED', message: `Trading room "${newAccountName}" created.` });
        setSuccessOpen(true);

    } catch (e: any) { alert("Error: " + e.message); } finally { setIsCreating(false); }
  };

  // --- 2. ADD BALANCE TO MAIN WALLET ---
  const handleAddMainFunds = async () => {
      if (!addAmount || isNaN(Number(addAmount))) return;
      setIsCreating(true); 
      const val = Number(addAmount);

      try {
          const { data, error } = await supabase.from('profiles')
            .update({ balance: mainBalance + val })
            .eq('id', lead.trading_account_id)
            .select()
            .maybeSingle(); 
          
          if (error) throw error;
          if (!data) throw new Error("Permission Denied: Could not update Main Wallet.");

          setMainBalance(data.balance); 
          setIsAddingFunds(false);
          setAddAmount('');
          
          setSuccessMessage({ title: 'FUNDS ADDED', message: `$${val.toLocaleString()} added to Main Wallet.` });
          setSuccessOpen(true);
      } catch(e: any) { alert("Error: " + e.message); } finally { setIsCreating(false); }
  };

  // --- 3. TRANSFER / INJECTION LOGIC (Refined) ---
  const handleTransfer = async () => {
    if (!transferMode || !amount || isNaN(Number(amount)) || Number(amount) <= 0) return;
    if (transferMode.type === 'main_transfer' && !selectedTargetRoom) {
        alert("Please select a target room.");
        return;
    }

    setIsTransferring(true);
    const val = Number(amount);
    const targetRoomId = transferMode.type === 'main_transfer' ? selectedTargetRoom : transferMode.accountId!;
    
    try {
        const targetAccount = accounts.find(a => a.id === targetRoomId);
        if (!targetAccount) throw new Error("Account not found");

        // === CASE A: DEPOSIT (INJECTION) ===
        // Just adds money to room. Does NOT touch Main Wallet.
        if (transferMode.type === 'deposit') {
             const { data: roomData, error: e2 } = await supabase.from('trading_accounts')
                .update({ balance: targetAccount.balance + val })
                .eq('id', targetRoomId)
                .select()
                .maybeSingle();
             
             if (e2) throw e2;
             if (!roomData) throw new Error("Permission Denied: Could not update Trading Room balance.");

             // Update State
             setAccounts(prev => prev.map(a => a.id === targetRoomId ? { ...a, balance: roomData.balance } : a));
             setSuccessMessage({ title: 'FUNDS INJECTED', message: `$${val.toLocaleString()} added to ${targetAccount.name}.` });
        }

        // === CASE B: MAIN TRANSFER (REAL TRANSFER) ===
        // Deducts Main Wallet -> Adds to Room
        else if (transferMode.type === 'main_transfer') {
             if (mainBalance < val) throw new Error("Insufficient Main Wallet Funds");
             
             // 1. UPDATE ROOM
             const { data: roomData, error: e2 } = await supabase.from('trading_accounts')
                .update({ balance: targetAccount.balance + val })
                .eq('id', targetRoomId)
                .select()
                .maybeSingle();
             
             if (e2) throw e2;
             if (!roomData) throw new Error("Permission Denied: Room Update Failed.");

             // 2. UPDATE MAIN
             const { data: mainData, error: e1 } = await supabase.from('profiles')
                .update({ balance: mainBalance - val })
                .eq('id', lead.trading_account_id)
                .select()
                .maybeSingle();

             if (e1) throw e1;
             if (!mainData) throw new Error("Permission Denied: Main Wallet Update Failed.");

             // Update State
             setMainBalance(mainData.balance);
             setAccounts(prev => prev.map(a => a.id === targetRoomId ? { ...a, balance: roomData.balance } : a));
             setSuccessMessage({ title: 'TRANSFER COMPLETE', message: `$${val.toLocaleString()} moved from Main Wallet to ${targetAccount.name}.` });
        }

        // === CASE C: WITHDRAWAL (ROOM -> MAIN) ===
        else {
             if (targetAccount.balance < val) throw new Error("Insufficient Room Funds");

             // 1. UPDATE ROOM (Deduct)
             const { data: roomData, error: e2 } = await supabase.from('trading_accounts')
                .update({ balance: targetAccount.balance - val })
                .eq('id', targetRoomId)
                .select()
                .maybeSingle();

             if (e2) throw e2;
             if (!roomData) throw new Error("Permission Denied: Room Update Failed.");

             // 2. UPDATE MAIN (Add)
             const { data: mainData, error: e1 } = await supabase.from('profiles')
                .update({ balance: mainBalance + val })
                .eq('id', lead.trading_account_id)
                .select()
                .maybeSingle();

             if (e1) throw e1;
             if (!mainData) throw new Error("Permission Denied: Main Wallet Update Failed.");

             // Update State
             setMainBalance(mainData.balance);
             setAccounts(prev => prev.map(a => a.id === targetRoomId ? { ...a, balance: roomData.balance } : a));
             setSuccessMessage({ title: 'WITHDRAWAL COMPLETE', message: `$${val.toLocaleString()} moved from ${targetAccount.name} to Main Wallet.` });
        }

        setTransferMode(null);
        setAmount('');
        setSelectedTargetRoom('');
        setSuccessOpen(true);

    } catch (e: any) {
        alert("Action Failed: " + e.message);
    } finally {
        setIsTransferring(false);
    }
  };

  if (loading) return <div className="p-12 flex justify-center"><Loader2 className="animate-spin text-cyan-400" /></div>;

  if (!lead.trading_account_id) {
      return (
          <div className="p-12 border-2 border-dashed border-white/10 rounded-2xl bg-white/5 text-center animate-in fade-in">
              <div className="inline-flex p-4 rounded-full bg-white/5 mb-4 text-gray-500"><AlertCircle size={32} /></div>
              <h3 className="text-lg font-bold text-white mb-2">Client Not Registered</h3>
              <p className="text-gray-400 text-sm max-w-md mx-auto">This lead does not have a linked Trading Account ID.</p>
          </div>
      );
  }

  // --- DYNAMIC MODAL TEXT ---
  const getModalTitle = () => {
      if (transferMode?.type === 'deposit') return 'Inject Funds';
      if (transferMode?.type === 'withdraw') return 'Withdraw to Wallet';
      return 'Transfer to Room';
  }

  const getModalDesc = () => {
      if (!transferMode) return '';
      if (transferMode.type === 'deposit') return `Directly add funds to ${transferMode.accountName}`;
      if (transferMode.type === 'withdraw') return `${transferMode.accountName} ➝ Main Wallet`;
      return `Main Wallet ➝ Room`;
  }

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-300">
      
      <SuccessModal isOpen={successOpen} onClose={() => setSuccessOpen(false)} title={successMessage.title} message={successMessage.message} />

      {/* TOP STATS BAR */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* MAIN WALLET */}
          <div className="glass-panel p-6 rounded-2xl border border-white/5 bg-linear-to-r from-blue-600/10 to-purple-600/10 relative overflow-hidden group">
             <div className="absolute top-0 right-0 p-6 opacity-10 pointer-events-none"><Wallet size={120} className="text-white"/></div>
             <div className="relative z-10 flex flex-col h-full justify-between">
                <div>
                    <h2 className="text-xs font-bold text-blue-400 uppercase tracking-widest flex items-center gap-2 mb-2">
                        <Wallet size={14}/> Main Wallet
                    </h2>
                    <div className="text-4xl font-mono font-bold text-white tracking-tight">
                        ${mainBalance.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                    </div>
                </div>
                {/* BOTTOM ACTION BUTTONS */}
                <div className="flex gap-3 mt-6 pt-4 border-t border-white/10">
                    <button onClick={() => setIsAddingFunds(true)} className="flex-1 flex items-center justify-center gap-2 py-2 rounded-lg bg-green-500/20 hover:bg-green-500/30 text-green-400 text-xs font-bold transition border border-green-500/20 cursor-pointer">
                        <Plus size={14} /> Add Funds
                    </button>
                    <button onClick={() => setTransferMode({ type: 'main_transfer' })} className="flex-1 flex items-center justify-center gap-2 py-2 rounded-lg bg-blue-500/20 hover:bg-blue-500/30 text-blue-400 text-xs font-bold transition border border-blue-500/20 cursor-pointer">
                        <ArrowRightLeft size={14} /> Transfer
                    </button>
                </div>
             </div>
          </div>

          {/* Total Net Worth */}
          <div className="glass-panel p-6 rounded-2xl border border-white/5 bg-linear-to-r from-emerald-600/10 to-teal-600/10 relative overflow-hidden">
             <div className="absolute top-0 right-0 p-6 opacity-10"><TrendingUp size={80} className="text-white"/></div>
             <div className="relative z-10 flex flex-col justify-center h-full">
                <h2 className="text-xs font-bold text-emerald-400 uppercase tracking-widest flex items-center gap-2 mb-2">
                    <TrendingUp size={14}/> Total Net Worth
                </h2>
                <div className="text-4xl font-mono font-bold text-white tracking-tight">
                    ${totalNetWorth.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                </div>
                <p className="text-[10px] text-gray-400 mt-2">Combined balance across all wallets & rooms.</p>
             </div>
          </div>
      </div>

      {/* ACCOUNTS LIST */}
      <div className="space-y-4">
        <div className="flex items-center justify-between bg-white/5 p-4 rounded-xl border border-white/5">
            <h3 className="text-lg font-bold text-white flex items-center gap-2">
                <Briefcase size={18} className="text-yellow-400"/> Trading Rooms
                <span className="bg-white/10 text-white text-[10px] px-2 py-0.5 rounded-full">{accounts.length}</span>
            </h3>
            <button onClick={() => setIsCreatingOpen(true)} className="flex items-center gap-2 px-4 py-2 bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-bold rounded-lg transition shadow-lg shadow-cyan-500/20 cursor-pointer">
                <Plus size={14} /> New Room
            </button>
        </div>

        <div className="grid grid-cols-1 gap-3">
            {accounts.length === 0 ? (
                <div className="p-8 border-2 border-dashed border-white/10 rounded-xl text-center text-gray-500 text-sm">No trading accounts active.</div>
            ) : accounts.map(acc => (
                <div key={acc.id} className="glass-panel p-5 rounded-xl border border-white/5 hover:border-white/10 transition flex flex-col sm:flex-row justify-between items-center gap-4">
                    <div className="flex items-center gap-4 w-full sm:w-auto">
                        <div className="w-10 h-10 rounded-full bg-yellow-500/10 flex items-center justify-center text-yellow-500"><Building2 size={20} /></div>
                        <div>
                            <h4 className="font-bold text-white text-sm">{acc.name}</h4>
                            <span className="text-[10px] text-gray-500 font-mono">ID: {acc.id.split('-')[0]}...</span>
                        </div>
                    </div>
                    <div className="text-right w-full sm:w-auto">
                        <div className="font-mono font-bold text-white text-xl">${acc.balance.toLocaleString(undefined, { minimumFractionDigits: 2 })}</div>
                        <span className="text-[10px] text-gray-500 uppercase tracking-wider">Available Margin</span>
                    </div>
                    <div className="flex gap-2 w-full sm:w-auto justify-end">
                        <button onClick={() => setTransferMode({ type: 'deposit', accountId: acc.id, accountName: acc.name })} className="flex-1 sm:flex-none px-4 py-2 rounded-lg bg-green-500/10 border border-green-500/20 text-green-400 text-xs font-bold hover:bg-green-500/20 transition cursor-pointer flex items-center justify-center gap-2"><ArrowDownLeft size={14} /> Deposit</button>
                        <button onClick={() => setTransferMode({ type: 'withdraw', accountId: acc.id, accountName: acc.name })} className="flex-1 sm:flex-none px-4 py-2 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-xs font-bold hover:bg-red-500/20 transition cursor-pointer flex items-center justify-center gap-2"><ArrowUpRight size={14} /> Transfer</button>
                    </div>
                </div>
            ))}
        </div>
      </div>

      {/* MODAL: CREATE ROOM */}
      {isCreatingOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in">
              <div className="bg-[#1e232d] border border-white/10 w-full max-w-sm rounded-2xl shadow-2xl p-6 relative animate-in zoom-in-95">
                  <button onClick={() => setIsCreatingOpen(false)} className="absolute top-4 right-4 text-gray-500 hover:text-white cursor-pointer"><X size={18}/></button>
                  <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2"><Plus size={18} className="text-cyan-400"/> Create Trading Room</h3>
                  <div className="space-y-4">
                      <input value={newAccountName} onChange={(e) => setNewAccountName(e.target.value)} placeholder="Room Name" className="w-full bg-black/30 border border-white/10 rounded-xl p-3 text-white text-sm outline-none" autoFocus />
                      <button onClick={handleCreateAccount} disabled={!newAccountName || isCreating} className="w-full py-3 bg-cyan-600 hover:bg-cyan-500 text-white font-bold rounded-xl transition cursor-pointer disabled:opacity-50">{isCreating ? <Loader2 className="animate-spin mx-auto" size={16}/> : 'Create Room'}</button>
                  </div>
              </div>
          </div>
      )}

      {/* MODAL: ADD FUNDS TO MAIN */}
      {isAddingFunds && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in">
              <div className="bg-[#1e232d] border border-white/10 w-full max-w-sm rounded-2xl shadow-2xl p-6 relative animate-in zoom-in-95">
                  <button onClick={() => setIsAddingFunds(false)} className="absolute top-4 right-4 text-gray-500 hover:text-white cursor-pointer"><X size={18}/></button>
                  <div className="text-center mb-6">
                      <div className="w-12 h-12 rounded-full mx-auto flex items-center justify-center mb-3 bg-green-500/20 text-green-400"><Landmark size={24}/></div>
                      <h3 className="text-lg font-bold text-white uppercase">Top Up Main Wallet</h3>
                  </div>
                  <div className="space-y-4">
                      <div className="relative"><span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500 font-mono">$</span><input type="number" value={addAmount} onChange={(e) => setAddAmount(e.target.value)} autoFocus className="w-full bg-black/30 border border-white/10 rounded-xl p-4 pl-8 text-white text-xl font-mono font-bold focus:border-white/30 outline-none" placeholder="0.00"/></div>
                      <button onClick={handleAddMainFunds} disabled={!addAmount || isCreating} className="w-full py-3 bg-green-600 hover:bg-green-500 text-white font-bold rounded-xl transition cursor-pointer">{isCreating ? <Loader2 className="animate-spin mx-auto" size={16}/> : 'Add Funds'}</button>
                  </div>
              </div>
          </div>
      )}

      {/* MODAL: TRANSFER / INJECT / WITHDRAW */}
      {transferMode && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in">
              <div className="bg-[#1e232d] border border-white/10 w-full max-w-sm rounded-2xl shadow-2xl p-6 relative animate-in zoom-in-95">
                  <button onClick={() => setTransferMode(null)} className="absolute top-4 right-4 text-gray-500 hover:text-white cursor-pointer"><X size={18}/></button>
                  
                  <div className="text-center mb-6">
                      <div className={`w-12 h-12 rounded-full mx-auto flex items-center justify-center mb-3 ${transferMode.type === 'withdraw' ? 'bg-red-500/20 text-red-400' : 'bg-green-500/20 text-green-400'}`}>
                          {transferMode.type === 'withdraw' ? <ArrowUpRight size={24}/> : <ArrowDownLeft size={24}/>}
                      </div>
                      <h3 className="text-lg font-bold text-white uppercase">{getModalTitle()}</h3>
                      <p className="text-xs text-gray-400 mt-1">{getModalDesc()}</p>
                  </div>

                  <div className="space-y-4">
                      {transferMode.type === 'main_transfer' && (
                          <div>
                              <label className="text-xs font-bold text-gray-500 uppercase mb-1 block">Select Target Room</label>
                              <select 
                                  value={selectedTargetRoom} 
                                  onChange={(e) => setSelectedTargetRoom(e.target.value)}
                                  className="w-full bg-black/30 border border-white/10 rounded-xl p-3 text-white text-sm outline-none mb-3 appearance-none"
                              >
                                  <option value="">-- Choose Room --</option>
                                  {accounts.map(acc => <option key={acc.id} value={acc.id}>{acc.name} (${acc.balance})</option>)}
                              </select>
                          </div>
                      )}

                      <div className="relative">
                          <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500 font-mono">$</span>
                          <input type="number" value={amount} onChange={(e) => setAmount(e.target.value)} autoFocus className="w-full bg-black/30 border border-white/10 rounded-xl p-4 pl-8 text-white text-xl font-mono font-bold focus:border-white/30 outline-none" placeholder="0.00"/>
                      </div>
                      
                      {transferMode.type !== 'deposit' && (
                          <div className="flex justify-between text-[10px] uppercase font-bold text-gray-500 px-1">
                              <span>Available:</span>
                              <span className="text-white">
                                  ${(transferMode.type === 'main_transfer' ? mainBalance : accounts.find(a => a.id === transferMode.accountId)?.balance || 0).toLocaleString()}
                              </span>
                          </div>
                      )}

                      <div className="grid grid-cols-2 gap-3 pt-2">
                          <button onClick={() => setTransferMode(null)} className="py-3 rounded-xl bg-white/5 hover:bg-white/10 text-gray-300 font-bold text-xs transition cursor-pointer">Cancel</button>
                          <button onClick={handleTransfer} disabled={isTransferring} className={`py-3 rounded-xl font-bold text-white text-xs transition cursor-pointer flex items-center justify-center gap-2 ${transferMode.type === 'withdraw' ? 'bg-red-600 hover:bg-red-500' : 'bg-green-600 hover:bg-green-500'}`}>
                              {isTransferring ? <Loader2 className="animate-spin" size={14}/> : 'Confirm'}
                          </button>
                      </div>
                  </div>
              </div>
          </div>
      )}
    </div>
  );
}