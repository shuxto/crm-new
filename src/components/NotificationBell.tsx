import { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { Bell, Check, Trash2, ExternalLink } from 'lucide-react';
import { supabase } from '../lib/supabase';

interface Notification {
  id: string;
  title: string;
  message: string;
  is_read: boolean;
  created_at: string;
  related_lead_id?: string; // <--- ADDED THIS FIELD
}

export default function NotificationBell({ userId }: { userId: string }) {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  
  // We need coordinates to position the floating menu
  const [coords, setCoords] = useState({ top: 0, left: 0 });
  
  const buttonRef = useRef<HTMLButtonElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // 1. Fetch & Subscribe
  useEffect(() => {
    if (!userId) return;

    const fetchNotifs = async () => {
      const { data } = await supabase
        .from('crm_notifications')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(20);
      
      if (data) {
        setNotifications(data);
        setUnreadCount(data.filter(n => !n.is_read).length);
      }
    };

    fetchNotifs();

    const sub = supabase
      .channel('my-notifications')
      .on('postgres_changes', { 
        event: 'INSERT', 
        schema: 'public', 
        table: 'crm_notifications', 
        filter: `user_id=eq.${userId}` 
      }, (payload) => {
        const newNotif = payload.new as Notification;
        setNotifications(prev => [newNotif, ...prev]);
        setUnreadCount(prev => prev + 1);
      })
      .subscribe();

    return () => { supabase.removeChannel(sub); };
  }, [userId]);

  // 2. Smart Toggle (Calculates Position)
  const toggleOpen = () => {
    if (!isOpen && buttonRef.current) {
        const rect = buttonRef.current.getBoundingClientRect();
        setCoords({
            top: rect.bottom + 10, // 10px below the bell
            left: rect.left        // Aligned with left edge of bell
        });
    }
    setIsOpen(!isOpen);
  };

  // 3. Click Outside Handler
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Node;
      if (buttonRef.current && buttonRef.current.contains(target)) return;
      if (dropdownRef.current && dropdownRef.current.contains(target)) return;
      setIsOpen(false);
    };

    if (isOpen) {
        document.addEventListener("mousedown", handleClickOutside);
        window.addEventListener("resize", () => setIsOpen(false));
    }
    return () => {
        document.removeEventListener("mousedown", handleClickOutside);
        window.removeEventListener("resize", () => setIsOpen(false));
    };
  }, [isOpen]);

  // 4. Actions
  const markAsRead = async (id: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, is_read: true } : n));
    setUnreadCount(prev => Math.max(0, prev - 1));
    await supabase.from('crm_notifications').update({ is_read: true }).eq('id', id);
  };

  const markAllRead = async () => {
    const unreadIds = notifications.filter(n => !n.is_read).map(n => n.id);
    if (unreadIds.length === 0) return;
    setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
    setUnreadCount(0);
    await supabase.from('crm_notifications').update({ is_read: true }).in('id', unreadIds);
  };

  const deleteNotif = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const isUnread = notifications.find(n => n.id === id)?.is_read === false;
    setNotifications(prev => prev.filter(n => n.id !== id));
    if (isUnread) setUnreadCount(prev => Math.max(0, prev - 1));
    await supabase.from('crm_notifications').delete().eq('id', id);
  };

  // --- NEW: HANDLE NOTIFICATION CLICK ---
  const handleNotifClick = (n: Notification) => {
      if (n.related_lead_id) {
          window.dispatchEvent(new CustomEvent('crm-open-lead-id', { detail: n.related_lead_id }));
          setIsOpen(false);
          markAsRead(n.id);
      }
  };

  return (
    <>
      {/* BELL BUTTON (Stays in Sidebar) */}
      <button 
        ref={buttonRef}
        onClick={toggleOpen}
        className={`relative p-2.5 rounded-xl transition border group ${isOpen ? 'bg-blue-600 border-blue-500 text-white' : 'bg-white/5 border-white/5 hover:bg-white/10 text-gray-400 hover:text-white'}`}
      >
        <Bell size={18} className={unreadCount > 0 ? "animate-[swing_1s_ease-in-out_infinite]" : ""} />
        {unreadCount > 0 && (
          // FIXED: Replaced border-[#0f172a] with border-crm-bg
          <span className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 rounded-full shadow-lg border-2 border-crm-bg flex items-center justify-center text-[8px] font-bold text-white">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {/* DROPDOWN MENU (Teleported to Body) */}
      {isOpen && createPortal(
        <div 
            ref={dropdownRef}
            // FIXED: Replaced z-[9999] with z-50
            // FIXED: Replaced bg-[#0f172a] with bg-crm-bg
            className="fixed z-50 w-80 sm:w-96 bg-crm-bg/95 backdrop-blur-xl border border-white/10 rounded-2xl shadow-[0_0_50px_rgba(0,0,0,0.5)] overflow-hidden animate-in fade-in zoom-in-95 duration-200"
            style={{ 
                top: coords.top, 
                left: coords.left,
                maxWidth: 'calc(100vw - 20px)' 
            }}
        >
          
          {/* Header */}
          <div className="p-4 border-b border-white/10 flex justify-between items-center bg-white/5">
            <h3 className="text-sm font-bold text-white tracking-wide flex items-center gap-2">
                <Bell size={14} className="text-blue-400" /> Notifications
            </h3>
            {unreadCount > 0 && (
              <button onClick={markAllRead} className="text-[10px] text-blue-400 hover:text-blue-300 uppercase font-bold tracking-wider cursor-pointer hover:underline">
                Mark all read
              </button>
            )}
          </div>

          {/* List */}
          <div className="max-h-[60vh] overflow-y-auto custom-scrollbar">
            {notifications.length === 0 ? (
              <div className="p-12 text-center flex flex-col items-center gap-3">
                <div className="w-12 h-12 rounded-full bg-white/5 flex items-center justify-center text-gray-600">
                    <Bell size={20} />
                </div>
                <p className="text-gray-500 text-xs italic">All caught up!</p>
              </div>
            ) : (
              notifications.map(n => (
                <div 
                    key={n.id} 
                    onClick={() => handleNotifClick(n)}
                    className={`
                        p-4 border-b border-white/5 flex gap-3 transition group relative
                        ${n.related_lead_id ? 'cursor-pointer hover:bg-blue-500/10' : 'hover:bg-white/5'}
                        ${n.is_read ? 'opacity-60 grayscale-[0.5]' : 'bg-blue-500/5'}
                    `}
                >
                  
                  {/* Status Dot */}
                  <div className={`mt-1.5 w-2 h-2 rounded-full shrink-0 ${n.is_read ? 'bg-transparent border border-white/20' : 'bg-blue-500 shadow-[0_0_8px_rgba(59,130,246,0.8)]'}`} />
                  
                  <div className="flex-1 min-w-0 pr-6">
                    <h4 className={`text-xs font-bold mb-1 truncate ${n.is_read ? 'text-gray-400' : 'text-white'}`}>
                        {n.title}
                        {n.related_lead_id && <ExternalLink size={10} className="inline ml-1.5 opacity-50" />}
                    </h4>
                    
                    <p className="text-[11px] text-gray-400 leading-relaxed mb-2 wrap-break-word">{n.message}</p>
                    
                    <span className="text-[9px] text-gray-600 font-mono uppercase tracking-wider">
                      {new Date(n.created_at).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})} • {new Date(n.created_at).toLocaleDateString()}
                    </span>
                  </div>

                  {/* Hover Actions */}
                  <div className="flex flex-col gap-1 opacity-0 group-hover:opacity-100 transition-opacity absolute right-2 top-2">
                    {!n.is_read && (
                      <button onClick={(e) => markAsRead(n.id, e)} className="p-1.5 rounded-lg bg-blue-500/10 text-blue-400 hover:bg-blue-500 hover:text-white transition" title="Mark Read">
                        <Check size={12} />
                      </button>
                    )}
                    <button onClick={(e) => deleteNotif(n.id, e)} className="p-1.5 rounded-lg bg-red-500/10 text-red-400 hover:bg-red-500 hover:text-white transition" title="Delete">
                      <Trash2 size={12} />
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>,
        document.body 
      )}
    </>
  );
}