import { Wallet, History, CreditCard, Activity, FileText } from 'lucide-react';
import ProfileHeader from './ProfileHeader';

interface LeadProfilePageProps {
  lead: any;
  onBack: () => void;
}

export default function LeadProfilePage({ lead, onBack }: LeadProfilePageProps) {
  if (!lead) return null;

  return (
    // Fixed: max-w-[1600px] -> max-w-400
    <div className="animate-in fade-in slide-in-from-bottom-4 duration-300 p-6 max-w-400 mx-auto">
      
      <ProfileHeader lead={lead} onBack={onBack} />

      <div className="grid grid-cols-12 gap-6">
        
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
          {/* Fixed: min-h-[400px] -> min-h-100 */}
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

        {/* RIGHT COLUMN */}
        <div className="col-span-12 lg:col-span-4 space-y-6">
          <div className="glass-panel p-6 rounded-xl border border-white/5 h-full">
            <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
              <FileText size={18} className="text-yellow-500" /> 
              Agent Notes
            </h3>
            <textarea 
              className="w-full h-32 bg-black/20 border border-white/10 rounded-xl p-4 text-sm text-white focus:outline-none focus:border-blue-500/50 resize-none"
              placeholder="Type a new note here..."
            ></textarea>
            <button className="w-full mt-3 bg-blue-600 hover:bg-blue-500 text-white font-bold py-3 rounded-xl transition text-xs uppercase tracking-widest">
              Save Note
            </button>

            <div className="mt-8 space-y-4">
              <div className="p-4 bg-white/5 rounded-xl border-l-2 border-blue-500">
                <p className="text-sm text-gray-300">Client asked for a callback on Monday.</p>
                <span className="text-[10px] text-gray-500 mt-2 block">Jan 12, 10:30 AM • Admin</span>
              </div>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}