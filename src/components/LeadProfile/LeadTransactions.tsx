import { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';
import { ArrowUpRight, ArrowDownLeft, Loader2 } from 'lucide-react';

interface Props {
  lead: any;
}

export default function LeadTransactions({ lead }: Props) {
  const [transactions, setTransactions] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (lead?.trading_account_id) {
        fetchTransactions();
    }
  }, [lead]);

  const fetchTransactions = async () => {
    setLoading(true);
    // Fetch transactions where user_id matches the lead's trading ID
    const { data, error } = await supabase
        .from('transactions')
        .select('*')
        .eq('user_id', lead.trading_account_id)
        .order('created_at', { ascending: false });

    if (error) {
        console.error("Error fetching transactions:", error);
    } else {
        setTransactions(data || []);
    }
    setLoading(false);
  };

  if (!lead.trading_account_id) {
      return <div className="p-8 text-center text-gray-500 italic">This lead is not registered on the Platform yet.</div>;
  }

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-300">
      <div className="glass-panel p-6 rounded-2xl border border-white/5">
        <h3 className="text-lg font-bold text-white mb-4">Transactions</h3>
        
        {loading ? (
            <div className="py-12 flex justify-center"><Loader2 className="animate-spin text-blue-500" /></div>
        ) : transactions.length === 0 ? (
            <div className="text-center py-12 border-2 border-dashed border-white/5 rounded-xl">
                <div className="inline-flex p-3 rounded-full bg-white/5 mb-3 text-gray-500">
                    <ArrowUpRight size={24} />
                </div>
                <p className="text-sm text-gray-500">No deposits or withdrawals found.</p>
            </div>
        ) : (
            <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                    <thead className="text-xs text-gray-500 uppercase border-b border-white/5">
                        <tr>
                            <th className="pb-3 pl-2">Type</th>
                            <th className="pb-3 text-right">Amount</th>
                            <th className="pb-3 text-center">Status</th>
                            <th className="pb-3 text-right">Date</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5">
                        {transactions.map((tx) => (
                            <tr key={tx.id} className="hover:bg-white/5 transition">
                                <td className="py-3 pl-2">
                                    <div className="flex items-center gap-3">
                                        <div className={`p-1.5 rounded-full ${tx.type === 'deposit' ? 'bg-green-500/10 text-green-400' : 'bg-red-500/10 text-red-400'}`}>
                                            {tx.type === 'deposit' ? <ArrowDownLeft size={14}/> : <ArrowUpRight size={14}/>}
                                        </div>
                                        <span className="text-gray-300 capitalize">{tx.type}</span>
                                    </div>
                                </td>
                                <td className={`py-3 text-right font-mono font-bold ${tx.type === 'deposit' ? 'text-green-400' : 'text-red-400'}`}>
                                    {tx.type === 'deposit' ? '+' : '-'}${tx.amount?.toLocaleString()}
                                </td>
                                <td className="py-3 text-center">
                                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase inline-flex items-center gap-1 ${
                                        tx.status === 'approved' || tx.status === 'completed' ? 'bg-green-500/10 text-green-400' :
                                        tx.status === 'rejected' ? 'bg-red-500/10 text-red-400' :
                                        'bg-yellow-500/10 text-yellow-400'
                                    }`}>
                                        {tx.status}
                                    </span>
                                </td>
                                <td className="py-3 text-right text-gray-500 text-xs">
                                    {new Date(tx.created_at).toLocaleDateString()}
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        )}
      </div>
    </div>
  );
}