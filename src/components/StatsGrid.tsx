import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { 
  UserPlus, PhoneOff, Mic, PhoneForwarded, XCircle, 
  TrendingDown, Clock, Star, Loader2, Activity, 
  Globe, Shuffle, PhoneMissed, Phone 
} from 'lucide-react';

interface StatsGridProps {
  selectedStatuses: string[];
  onToggleStatus: (status: string) => void;
  currentUserId?: string;
  role?: string;
}

const getIconForLabel = (label: string) => {
  const l = label.toLowerCase();
  if (l.includes('new')) return UserPlus;
  if (l.includes('no answer')) return PhoneOff;
  if (l.includes('voice')) return Mic;
  if (l.includes('hang')) return PhoneForwarded;
  if (l.includes('not interested')) return XCircle;
  if (l.includes('wrong')) return PhoneMissed;
  if (l.includes('low')) return TrendingDown;
  if (l.includes('call back')) return Clock;
  if (l.includes('interested') || l.includes('sale')) return Star;
  if (l.includes('barrier') || l.includes('language')) return Globe;
  if (l.includes('transfer')) return Phone;
  if (l.includes('shuffle')) return Shuffle;
  return Activity;
};

const hexToRgba = (hex: string, alpha: number) => {
  if (!hex) return 'rgba(255,255,255,0.1)';
  hex = hex.replace('#', '');
  const r = parseInt(hex.substring(0, 2), 16);
  const g = parseInt(hex.substring(2, 4), 16);
  const b = parseInt(hex.substring(4, 6), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
};

export default function StatsGrid({ selectedStatuses, onToggleStatus, currentUserId, role }: StatsGridProps) {
  const [stats, setStats] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchData();

    // Optimistic UI Update Logic
    const handleInstantUpdate = (e: any) => {
        const { oldStatus, newStatus } = e.detail;
        setStats(currentStats => currentStats.map(stat => {
            
            // Handle spelling variations for Real-time Update
            const isTransferredStat = stat.label.includes('Transfer');
            const isNewTransferred = newStatus.includes('Transfer');
            const isOldTransferred = oldStatus?.includes('Transfer');

            if (stat.label === oldStatus || (isTransferredStat && isOldTransferred)) {
                 return { ...stat, count: Math.max(0, stat.count - 1) };
            }
            if (stat.label === newStatus || (isTransferredStat && isNewTransferred)) {
                 return { ...stat, count: stat.count + 1 };
            }
            return stat;
        }));
    };

    window.addEventListener('crm-lead-update', handleInstantUpdate);
    return () => { window.removeEventListener('crm-lead-update', handleInstantUpdate); };
  }, [currentUserId, role]); 

  async function fetchData() {
    try {
      const { data: statusList } = await supabase
        .from('crm_statuses')
        .select('*')
        .eq('is_active', true)
        .order('order_index', { ascending: true });

      if (!statusList) return;

      let query = supabase.from('crm_leads').select('status');

      const isAdmin = ['admin', 'manager'].includes(role || '');
      
      // Filter by User ID if not admin
      if (!isAdmin && currentUserId) {
         query = query.eq('assigned_to', currentUserId);
      } else if (!isAdmin && !currentUserId) {
         // Security Fallback: If no ID, show nothing
         query = query.eq('id', '00000000-0000-0000-0000-000000000000');
      }

      const { data: leadsData, error: leadsError } = await query;

      if (leadsError) throw leadsError;

      // Count Logic
      const counts: Record<string, number> = {};
      leadsData?.forEach((lead) => {
        let s = lead.status || 'New';
        // Normalize "Transfered" to "Transferred" just in case DB has old data
        if (s === 'Transfered') s = 'Transferred'; 
        counts[s] = (counts[s] || 0) + 1;
      });

      // 1. FILTER: HIDE "UP SALE" AND "TRANSFERRED" FOR CONVERSION
      const finalStats = statusList
        .filter(st => {
            const l = st.label.toLowerCase().replace(/\s/g, ''); 

            if (role === 'conversion') {
                // HIDE UP SALE
                if (l.includes('upsale')) return false;
                // HIDE TRANSFERRED (matches "Transferred", "Transfered", "Transfer")
                if (l.includes('transfer')) return false; 
            }
            return true;
        })
        .map((st) => {
            // Combine counts if needed
            let count = counts[st.label] || 0;
            if (st.label === 'Transferred' || st.label === 'Transfered') {
                count = (counts['Transferred'] || 0) + (counts['Transfered'] || 0);
            }

            return {
                label: st.label,
                count: count,
                color: st.hex_color,
                Icon: getIconForLabel(st.label)
            };
        });

      setStats(finalStats);
    } catch (error) {
      console.error("Error fetching stats:", error);
    } finally {
      setLoading(false);
    }
  }

  if (loading) {
    return <div className="h-32 flex items-center justify-center text-gray-500 italic"><Loader2 className="animate-spin mr-2" size={16}/> Loading Pipeline...</div>;
  }

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 xl:grid-cols-8 gap-3 mb-6">
      {stats.map((stat) => {
        const isActive = selectedStatuses.includes(stat.label);
        const color = stat.color; 

        return (
          <div 
            key={stat.label}
            onClick={() => onToggleStatus(stat.label)}
            style={{
              borderColor: isActive ? color : hexToRgba(color, 0.2),
              backgroundColor: isActive ? hexToRgba(color, 0.25) : hexToRgba(color, 0.05),
              boxShadow: isActive ? `0 0 15px ${hexToRgba(color, 0.4)}` : 'none',
            }}
            className={`
              glass-panel p-3 rounded-xl border 
              transition-all duration-300 ease-out 
              cursor-pointer group select-none relative overflow-hidden
              ${isActive ? 'scale-105 z-10 ring-1' : 'hover:-translate-y-1 hover:opacity-100 opacity-80'}
            `}
          >
            {isActive && (
                <div 
                    className="absolute inset-0 rounded-xl pointer-events-none" 
                    style={{ border: `1px solid ${color}` }} 
                />
            )}

            <div className="flex justify-between items-start mb-2 relative z-10">
              <stat.Icon 
                size={14} 
                style={{ color: isActive ? '#fff' : color }}
                className={`transition-transform duration-300 ${isActive ? 'scale-125 rotate-6' : 'group-hover:scale-125 group-hover:rotate-6'}`} 
              />
              <span className={`text-sm font-bold transition-all duration-300 ${isActive ? 'text-white' : 'text-white/80'}`}>
                {stat.count}
              </span>
            </div>
            
            <p className={`text-[9px] font-bold uppercase tracking-wider truncate transition-colors ${isActive ? 'text-white text-shadow-sm' : 'text-gray-500 group-hover:text-gray-300'}`}>
              {stat.label}
            </p>
          </div>
        );
      })}
    </div>
  );
}