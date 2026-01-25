import { useState, useEffect, useRef } from 'react';
import { MessageCircle, X, Send, Minus, ChevronLeft, Hash, Plus, Search, Loader2 } from 'lucide-react';
import { supabase } from '../../lib/supabase';

interface ChatBubbleProps {
  currentUserId: string;
  onClose: () => void;
  onRoomChange: (roomId: string | null) => void;
}

export default function ChatBubble({ currentUserId, onClose, onRoomChange }: ChatBubbleProps) {
  const [isOpen, setIsOpen] = useState(false); 
  const [view, setView] = useState<'list' | 'chat' | 'new_chat'>('list');
  
  const [activeRoom, setActiveRoom] = useState<string>('');
  const [activeRoomName, setActiveRoomName] = useState('');

  const [messages, setMessages] = useState<any[]>([]);
  const [activeChats, setActiveChats] = useState<any[]>([]); 
  const [allUsers, setAllUsers] = useState<any[]>([]); 
  
  const [newMessage, setNewMessage] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [loadingMessages, setLoadingMessages] = useState(false);

  // --- TAGGING STATE ---
  const [showTagList, setShowTagList] = useState(false);
  const [tagQuery, setTagQuery] = useState('');
  const [mentionIds, setMentionIds] = useState<string[]>([]);
  // ---------------------

  // --- SMART POSITIONING STATE ---
  const [position, setPosition] = useState({ x: window.innerWidth - 100, y: window.innerHeight - 100 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const [openDirectionX, setOpenDirectionX] = useState<'left' | 'right'>('left');
  const [openDirectionY, setOpenDirectionY] = useState<'up' | 'down'>('up');

  const bubbleRef = useRef<HTMLDivElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Notify App
  useEffect(() => {
      onRoomChange(view === 'chat' ? activeRoom : null);
  }, [view, activeRoom]);

  // 1. Fetch Active Chats
  useEffect(() => {
    if (!isOpen || view !== 'list') return;
    fetchActiveChats();
  }, [isOpen, view]);

  const fetchActiveChats = async () => {
      const { data, error } = await supabase.rpc('get_my_active_dms', { p_user_id: currentUserId });
      if (!error && data) setActiveChats(data);
  };

  const fetchAllUsers = async () => {
      const { data } = await supabase.from('crm_users').select('id, real_name, role').neq('id', currentUserId).order('real_name');
      if (data) setAllUsers(data);
  };

  // 2. Fetch Messages
  useEffect(() => {
    if (!isOpen || view !== 'chat' || !activeRoom) return;

    setMessages([]); 
    setLoadingMessages(true);

    const fetchMessages = async () => {
      const { data } = await supabase
        .from('crm_messages')
        .select('*, sender:crm_users(real_name)')
        .eq('room_id', activeRoom) 
        .order('created_at', { ascending: false })
        .limit(50);
      
      if (data) setMessages(data.reverse());
      setLoadingMessages(false);
    };

    fetchMessages();

    const sub = supabase.channel(`bubble-${activeRoom}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'crm_messages', filter: `room_id=eq.${activeRoom}` }, () => {
         fetchMessages(); 
      })
      .subscribe();

    return () => { supabase.removeChannel(sub); };
  }, [isOpen, view, activeRoom]);

  useEffect(() => {
      if(view === 'chat') messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, view, loadingMessages]);

  // --- SMART DRAGGING ---
  const handleMouseDown = (e: React.MouseEvent) => {
    if (!bubbleRef.current) return;
    setIsDragging(true);
    setDragOffset({ 
        x: e.clientX - bubbleRef.current.getBoundingClientRect().left, 
        y: e.clientY - bubbleRef.current.getBoundingClientRect().top 
    });
  };

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isDragging) return;
      let newX = e.clientX - dragOffset.x;
      let newY = e.clientY - dragOffset.y;

      const maxX = window.innerWidth - 60; 
      const maxY = window.innerHeight - 60;
      
      if (newX < 10) newX = 10;
      if (newY < 10) newY = 10;
      if (newX > maxX) newX = maxX;
      if (newY > maxY) newY = maxY;

      setPosition({ x: newX, y: newY });
    };

    const handleMouseUp = () => {
        setIsDragging(false);
        calculateOpenDirection(position.x, position.y);
    };

    if (isDragging) { 
        window.addEventListener('mousemove', handleMouseMove); 
        window.addEventListener('mouseup', handleMouseUp); 
    }
    return () => { 
        window.removeEventListener('mousemove', handleMouseMove); 
        window.removeEventListener('mouseup', handleMouseUp); 
    };
  }, [isDragging, dragOffset, position]);

  const calculateOpenDirection = (x: number, y: number) => {
      setOpenDirectionX(x > window.innerWidth / 2 ? 'left' : 'right');
      setOpenDirectionY(y > window.innerHeight / 2 ? 'up' : 'down');
  };

  useEffect(() => {
      calculateOpenDirection(position.x, position.y);
  }, []);

  // --- TAGGING LOGIC ---
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const val = e.target.value;
      setNewMessage(val);

      if (activeRoomName === 'Global Chat') {
        const lastWord = val.split(' ').pop();
        if (lastWord && lastWord.startsWith('@') && lastWord.length > 1) {
            setTagQuery(lastWord.substring(1));
            if(allUsers.length === 0) fetchAllUsers();
            setShowTagList(true);
        } else {
            setShowTagList(false);
        }
      }
  };

  const addTag = (user: any) => {
      const words = newMessage.split(' ');
      words.pop(); 
      setNewMessage(words.join(' ') + ` @${user.real_name} `);
      setMentionIds(prev => [...prev, user.id]);
      setShowTagList(false);
  };

  const handleStartDM = async (otherId: string, name: string) => {
      const { data, error } = await supabase.rpc('create_or_get_dm_room', { other_user_id: otherId });
      if(!error && data) {
          setActiveRoom(data);
          setActiveRoomName(name);
          setView('chat');
      }
  };

  const handleOpenGlobal = () => {
      setActiveRoom('00000000-0000-0000-0000-000000000000');
      setActiveRoomName('Global Chat');
      setView('chat');
  };

  const sendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim()) return;
    
    await supabase.from('crm_messages').insert({ 
        room_id: activeRoom, 
        sender_id: currentUserId, 
        content: newMessage,
        mentions: mentionIds
    });
    
    setNewMessage('');
    setMentionIds([]);
    setShowTagList(false);
  };

  const filteredUsers = allUsers.filter(u => u.real_name.toLowerCase().includes(searchTerm.toLowerCase()));
  const filteredTags = allUsers.filter(u => u.real_name.toLowerCase().startsWith(tagQuery.toLowerCase()));

  const windowStyle = {
      position: 'absolute' as const,
      ...(openDirectionX === 'left' ? { right: 0 } : { left: 0 }),
      ...(openDirectionY === 'up' ? { bottom: 0 } : { top: 0 }),
  };

  return (
    <div 
      ref={bubbleRef}
      style={{ top: position.y, left: position.x, position: 'fixed' }}
      // Fixed: Removed arbitrary value []
      className="z-100"
    >
      {!isOpen ? (
        <div className="relative group">
            <div 
                onMouseDown={handleMouseDown}
                onClick={() => setIsOpen(true)}
                className="w-14 h-14 bg-blue-600 rounded-full flex items-center justify-center shadow-[0_0_20px_rgba(37,99,235,0.5)] cursor-move hover:scale-110 transition-transform active:scale-95 border-2 border-white/20"
            >
                <MessageCircle size={24} className="text-white" />
            </div>
            
            <button 
                onClick={(e) => { e.stopPropagation(); onClose(); }}
                className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 rounded-full flex items-center justify-center text-white text-xs opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer shadow-lg"
            >
                <X size={10} />
            </button>
        </div>
      ) : (
        <div className="relative w-14 h-14"> 
            <div 
                style={windowStyle}
                // Fixed: Removed hex color
                className="w-80 h-96 bg-crm-bg/95 backdrop-blur-xl border border-white/20 rounded-2xl shadow-2xl flex flex-col overflow-hidden animate-in zoom-in-95 duration-200"
            >
                {/* Header */}
                <div onMouseDown={handleMouseDown} className="h-12 bg-white/5 border-b border-white/10 flex items-center justify-between px-3 cursor-move select-none shrink-0">
                    <div className="flex items-center gap-2">
                        {view !== 'list' && (
                            <button onClick={() => setView('list')} className="p-1.5 hover:bg-white/10 rounded-lg text-gray-400 hover:text-white transition">
                                <ChevronLeft size={16} />
                            </button>
                        )}
                        <span className="text-xs font-bold text-white flex items-center gap-2">
                            {view === 'list' ? 'Conversations' : (view === 'new_chat' ? 'New Message' : activeRoomName)}
                        </span>
                    </div>
                    <button onClick={() => setIsOpen(false)} className="p-1 hover:bg-white/10 rounded"><Minus size={14} className="text-gray-400" /></button>
                </div>

                {/* LIST */}
                {view === 'list' && (
                    <div className="flex-1 overflow-y-auto p-2 custom-scrollbar">
                        <div onClick={handleOpenGlobal} className="p-3 bg-blue-600/10 border border-blue-500/20 rounded-xl flex items-center gap-3 cursor-pointer hover:bg-blue-600/20 mb-3 group transition">
                            <div className="w-10 h-10 bg-blue-600 rounded-full flex items-center justify-center text-white shadow-lg"><Hash size={18} /></div>
                            <div>
                                <p className="text-white text-xs font-bold group-hover:text-blue-300 transition">Global Chat</p>
                                <p className="text-[9px] text-gray-400">Headquarters</p>
                            </div>
                        </div>

                        <div className="flex items-center justify-between px-2 mb-2">
                            <p className="text-[10px] text-gray-500 font-bold uppercase tracking-wider">Recent</p>
                            <button onClick={() => { setView('new_chat'); fetchAllUsers(); }} className="p-1 bg-white/5 hover:bg-blue-500 rounded text-gray-400 hover:text-white transition" title="Start New Chat">
                                <Plus size={12} />
                            </button>
                        </div>

                        <div className="space-y-1">
                            {activeChats.map(chat => (
                                <div key={chat.room_id} onClick={() => { setActiveRoom(chat.room_id); setActiveRoomName(chat.other_user_name); setView('chat'); }} className="p-2 hover:bg-white/5 rounded-lg flex items-center gap-3 cursor-pointer group transition">
                                    <div className="w-8 h-8 bg-gray-700 rounded-lg flex items-center justify-center text-[10px] text-white font-bold group-hover:bg-gray-600 transition">
                                        {chat.other_user_name.substring(0,2).toUpperCase()}
                                    </div>
                                    <div>
                                        <p className="text-gray-300 text-xs font-medium group-hover:text-white">{chat.other_user_name}</p>
                                        <p className="text-[9px] text-gray-600">{new Date(chat.last_msg_at).toLocaleDateString()}</p>
                                    </div>
                                </div>
                            ))}
                            {activeChats.length === 0 && <div className="text-center py-4 text-gray-600 text-xs italic">No recent chats.</div>}
                        </div>
                    </div>
                )}

                {/* NEW CHAT */}
                {view === 'new_chat' && (
                    <div className="flex-1 flex flex-col p-2">
                        <div className="relative mb-2">
                            <Search className="absolute left-2.5 top-2.5 text-gray-500" size={14} />
                            <input autoFocus placeholder="Search people..." className="w-full bg-black/40 border border-white/10 rounded-lg py-2 pl-8 text-xs text-white focus:border-blue-500 outline-none" onChange={(e) => setSearchTerm(e.target.value)} />
                        </div>
                        <div className="flex-1 overflow-y-auto space-y-1 custom-scrollbar">
                            {filteredUsers.map(u => (
                                <div key={u.id} onClick={() => handleStartDM(u.id, u.real_name)} className="p-2 hover:bg-white/5 rounded-lg flex items-center gap-3 cursor-pointer">
                                    <div className="w-8 h-8 bg-gray-700 rounded-full flex items-center justify-center text-[10px] text-white font-bold">{u.real_name.substring(0,2).toUpperCase()}</div>
                                    <div className="flex-1">
                                        <p className="text-gray-300 text-xs font-medium">{u.real_name}</p>
                                        <p className="text-[9px] text-gray-500 capitalize">{u.role}</p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* CHAT */}
                {view === 'chat' && (
                    <>
                        <div className="flex-1 overflow-y-auto p-3 space-y-2 custom-scrollbar bg-black/20">
                            {loadingMessages ? (
                                <div className="h-full flex items-center justify-center text-gray-500"><Loader2 size={24} className="animate-spin" /></div>
                            ) : (
                                <>
                                    {messages.length === 0 && <div className="h-full flex items-center justify-center text-gray-600 text-xs italic">Say hello! 👋</div>}
                                    {messages.map(msg => {
                                        const isMe = msg.sender_id === currentUserId;
                                        const isMentioned = msg.mentions && msg.mentions.includes(currentUserId);

                                        return (
                                            <div key={msg.id} className={`flex flex-col ${isMe ? 'items-end' : 'items-start'} animate-in slide-in-from-bottom-2 duration-300`}>
                                                <div className={`max-w-[85%] px-3 py-2 rounded-xl text-xs shadow-sm 
                                                    ${isMe 
                                                        ? 'bg-blue-600 text-white rounded-br-none' 
                                                        : (isMentioned 
                                                            ? 'bg-yellow-500/20 border border-yellow-500 text-yellow-100' 
                                                            : 'bg-[#1e293b] text-gray-200 border border-white/5')
                                                    } 
                                                    ${!isMe && !isMentioned ? 'rounded-bl-none' : 'rounded-xl'}`
                                                }>
                                                    {!isMe && <span className="block text-[9px] text-blue-400 font-bold mb-0.5">{msg.sender?.real_name}</span>}
                                                    {msg.content}
                                                </div>
                                                <span className="text-[9px] text-gray-600 mt-1 px-1">{new Date(msg.created_at).toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'})}</span>
                                            </div>
                                        );
                                    })}
                                    <div ref={messagesEndRef} />
                                </>
                            )}
                        </div>

                        {/* TAG POPUP */}
                        {showTagList && filteredTags.length > 0 && (
                            <div className="absolute bottom-12 left-2 bg-crm-bg border border-white/20 rounded-xl shadow-2xl w-40 overflow-hidden z-50 animate-in slide-in-from-bottom-2">
                                {filteredTags.map(u => (
                                    <div key={u.id} onClick={() => addTag(u)} className="px-3 py-2 hover:bg-blue-600 hover:text-white text-gray-300 text-xs cursor-pointer flex items-center gap-2">
                                        <div className="w-4 h-4 bg-gray-700 rounded-full flex items-center justify-center font-bold text-[8px]">{u.real_name.substring(0,2).toUpperCase()}</div>
                                        {u.real_name}
                                    </div>
                                ))}
                            </div>
                        )}

                        <form onSubmit={sendMessage} className="p-3 border-t border-white/10 bg-crm-bg flex gap-2">
                            <input 
                                className="flex-1 bg-gray-800/50 border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:border-blue-500 outline-none transition"
                                placeholder="Type a message..."
                                value={newMessage}
                                onChange={handleInputChange} 
                            />
                            <button type="submit" className="p-2 bg-blue-600 rounded-xl text-white hover:bg-blue-500 shadow-lg shadow-blue-900/20 active:scale-95 transition">
                                <Send size={14} />
                            </button>
                        </form>
                    </>
                )}
            </div>
        </div>
      )}
    </div>
  );
}