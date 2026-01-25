import { useState, useEffect, useRef } from 'react';
import { supabase } from '../lib/supabase';
import { Send, Users, Hash, Smile, MessageSquare, Search, Reply, X } from 'lucide-react';
import EmojiPicker, { Theme } from 'emoji-picker-react'; 

export default function ChatPage() {
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [activeRoom, setActiveRoom] = useState<string>('00000000-0000-0000-0000-000000000000'); 
  const [activeRoomName, setActiveRoomName] = useState('Global Headquarters');
  
  const [messages, setMessages] = useState<any[]>([]);
  const [users, setUsers] = useState<any[]>([]);
  
  const [newMessage, setNewMessage] = useState('');
  const [showPicker, setShowPicker] = useState(false);
  
  // Reply State (Only affects Input, not the message look)
  const [replyingTo, setReplyingTo] = useState<any | null>(null);
  
  // Tagging State
  const [showTagList, setShowTagList] = useState(false);
  const [tagQuery, setTagQuery] = useState('');
  const [mentionIds, setMentionIds] = useState<string[]>([]);
  const [cursorPosition, setCursorPosition] = useState(0); 

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const [userSearch, setUserSearch] = useState('');

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setCurrentUser(data.user));
    supabase.from('crm_users').select('id, real_name, role').order('real_name')
      .then(({ data }) => { if(data) setUsers(data); });

    const params = new URLSearchParams(window.location.search);
    const roomId = params.get('room_id');
    if (roomId) {
        setActiveRoom(roomId);
        window.history.replaceState({}, '', '/chat');
    }
  }, []);

  useEffect(() => {
    fetchMessages();
    const sub = supabase.channel(`room-${activeRoom}`)
        .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'crm_messages', filter: `room_id=eq.${activeRoom}` }, () => {
            fetchMessages(); 
        })
        .subscribe();
    return () => { supabase.removeChannel(sub); };
  }, [activeRoom]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const fetchMessages = async () => {
    // SIMPLIFIED QUERY: No complex joins, just the message and sender
    const { data } = await supabase.from('crm_messages')
        .select('*, sender:crm_users!sender_id(real_name)')
        .eq('room_id', activeRoom)
        .order('created_at', { ascending: true });
    if(data) setMessages(data);
  };

  // --- TAGGING LOGIC ---
  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
      const val = e.target.value;
      setNewMessage(val);
      
      const selectionStart = e.target.selectionStart;
      setCursorPosition(selectionStart);

      const lastAt = val.lastIndexOf('@', selectionStart);
      if (lastAt !== -1) {
          const query = val.substring(lastAt + 1, selectionStart);
          if (!query.includes(' ')) {
              setTagQuery(query);
              setShowTagList(true);
              return;
          }
      }
      setShowTagList(false);
  };

  const addTag = (user: any) => {
      const lastAt = newMessage.lastIndexOf('@', cursorPosition);
      const prefix = newMessage.substring(0, lastAt);
      const suffix = newMessage.substring(cursorPosition);
      
      const inserted = `@${user.real_name} `;
      setNewMessage(`${prefix}${inserted}${suffix}`);
      setMentionIds(prev => [...prev, user.id]);
      setShowTagList(false);
      
      if(inputRef.current) inputRef.current.focus();
  };

  const startDM = async (otherUserId: string, otherUserName: string) => {
    if(!currentUser) return;
    try {
        const { data, error } = await supabase.rpc('create_or_get_dm_room', { other_user_id: otherUserId });
        if(error) throw error;
        setActiveRoom(data);
        setActiveRoomName(otherUserName);
    } catch (err) {
        console.error("DM Error:", err);
    }
  };

  const sendMessage = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!newMessage.trim() || !currentUser) return;

    await supabase.from('crm_messages').insert({
        room_id: activeRoom,
        sender_id: currentUser.id,
        content: newMessage,
        mentions: mentionIds,
        // We still save the link in DB, but we don't show the ugly block
        reply_to_id: replyingTo ? replyingTo.id : null 
    });
    
    setNewMessage('');
    setMentionIds([]);
    setReplyingTo(null); 
    setShowPicker(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        sendMessage();
    }
  };

  // --- CLEAN RENDER (TAGS ONLY) ---
  const renderMessageContent = (content: string) => {
      if (!content) return null;
      const parts = content.split(/(@[\w\s]+)/g);
      
      return parts.map((part, index) => {
          if (part.startsWith('@')) {
              // Simple pill style for tags
              return (
                  <span key={index} className="inline-block bg-blue-500/20 text-blue-300 px-1.5 rounded mx-0.5 text-xs font-bold border border-blue-500/30">
                      {part}
                  </span>
              );
          }
          return part;
      });
  };

  const filteredTags = users.filter(u => u.real_name.toLowerCase().startsWith(tagQuery.toLowerCase()));
  const filteredUsers = users.filter(u => u.id !== currentUser?.id && u.real_name.toLowerCase().includes(userSearch.toLowerCase()));

  return (
    <div className="h-[calc(100vh-2rem)] flex gap-4">
        
        {/* LEFT SIDEBAR */}
        <div className="w-72 bg-black/20 border border-white/5 rounded-3xl p-4 hidden md:flex flex-col">
            <h2 className="text-xl font-bold text-white mb-4 px-2">Chats</h2>
            <div 
                onClick={() => { setActiveRoom('00000000-0000-0000-0000-000000000000'); setActiveRoomName('Global Headquarters'); }}
                className={`p-3 mb-6 rounded-xl flex items-center gap-3 cursor-pointer transition ${activeRoom.includes('0000') ? 'bg-blue-600 text-white shadow-lg' : 'bg-white/5 text-gray-400 hover:bg-white/10'}`}
            >
                <div className="w-10 h-10 bg-white/10 rounded-full flex items-center justify-center"><Hash size={20} /></div>
                <div>
                    <p className="font-bold text-sm">Global Chat</p>
                    <p className="text-[10px] opacity-70">Everyone</p>
                </div>
            </div>

            <div className="flex items-center justify-between px-2 mb-2">
                <h3 className="text-xs font-bold text-gray-500 uppercase tracking-widest">Direct Messages</h3>
            </div>
            
            <div className="relative mb-2">
                <Search className="absolute left-3 top-2.5 text-gray-500" size={14} />
                <input 
                    type="text" 
                    placeholder="Search people..." 
                    className="w-full bg-black/40 border border-white/10 rounded-lg py-2 pl-9 text-xs text-white focus:border-blue-500 outline-none"
                    onChange={(e) => setUserSearch(e.target.value)}
                />
            </div>

            <div className="flex-1 overflow-y-auto space-y-1 custom-scrollbar">
                {filteredUsers.map(user => (
                    <div 
                        key={user.id} 
                        onClick={() => startDM(user.id, user.real_name)}
                        className={`p-2 rounded-lg flex items-center gap-3 cursor-pointer group transition ${activeRoomName === user.real_name ? 'bg-white/10' : 'hover:bg-white/5'}`}
                    >
                        <div className="w-8 h-8 bg-gray-700 rounded-full flex items-center justify-center text-xs font-bold text-white group-hover:bg-blue-500 transition">
                            {user.real_name.substring(0,2).toUpperCase()}
                        </div>
                        <div className="flex-1 min-w-0">
                            <p className="text-gray-300 text-sm font-medium truncate group-hover:text-white">{user.real_name}</p>
                            <p className="text-[10px] text-gray-600 truncate capitalize">{user.role}</p>
                        </div>
                        <MessageSquare size={14} className="text-gray-600 group-hover:text-blue-400 opacity-0 group-hover:opacity-100" />
                    </div>
                ))}
            </div>
        </div>

        {/* CHAT AREA */}
        <div className="flex-1 bg-black/40 border border-white/10 rounded-3xl flex flex-col overflow-hidden relative shadow-2xl">
            {/* Header */}
            <div className="h-16 border-b border-white/5 flex items-center px-6 bg-white/5 justify-between shrink-0">
                <div className="flex items-center gap-3">
                    {activeRoomName.includes('Global') ? <Hash className="text-blue-400" /> : <Users className="text-green-400" />}
                    <h3 className="text-lg font-bold text-white">{activeRoomName}</h3>
                </div>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-6 space-y-4 custom-scrollbar">
                {messages.map((msg, i) => {
                    const isMe = msg.sender_id === currentUser?.id;
                    const showAvatar = i === 0 || messages[i-1].sender_id !== msg.sender_id;
                    const isMentioned = msg.mentions && msg.mentions.includes(currentUser?.id);

                    return (
                        <div key={msg.id} className={`flex flex-col group ${isMe ? 'items-end' : 'items-start'}`}>
                             
                             <div className={`flex gap-3 max-w-[70%] ${isMe ? 'flex-row-reverse' : ''}`}>
                                {/* Avatar */}
                                <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 text-xs font-bold ${isMe ? 'bg-indigo-500 text-white' : 'bg-gray-700 text-gray-300'} ${!showAvatar ? 'opacity-0' : ''}`}>
                                    {msg.sender?.real_name?.substring(0,2).toUpperCase()}
                                </div>
                                
                                <div className={`flex flex-col ${isMe ? 'items-end' : ''}`}>
                                    
                                    {/* Sender Name */}
                                    {showAvatar && !isMe && <span className="text-[10px] text-gray-400 ml-1 mb-1">{msg.sender?.real_name}</span>}
                                    
                                    {/* MESSAGE BUBBLE (Clean, no weird blocks on top) */}
                                    <div className={`
                                        px-4 py-2 rounded-2xl text-sm leading-relaxed whitespace-pre-wrap relative
                                        ${isMe 
                                            ? 'bg-indigo-600 text-white rounded-tr-none' 
                                            : (isMentioned 
                                                ? 'bg-yellow-500/20 border border-yellow-500 text-yellow-100 rounded-tl-none shadow-[0_0_15px_rgba(234,179,8,0.3)]' 
                                                : 'bg-[#1e293b] text-gray-200 rounded-tl-none border border-white/5')
                                        }
                                    `}>
                                        {renderMessageContent(msg.content)}
                                        
                                        {/* REPLY BUTTON (Visible ONLY on Hover) */}
                                        <button 
                                            onClick={() => {
                                                setReplyingTo(msg);
                                                if(inputRef.current) inputRef.current.focus();
                                            }}
                                            className={`
                                                absolute -top-3 p-1 rounded-full bg-gray-700 text-white shadow-md opacity-0 group-hover:opacity-100 transition-opacity
                                                ${isMe ? '-left-8' : '-right-8'}
                                            `}
                                            title="Reply to this message"
                                        >
                                            <Reply size={12} />
                                        </button>
                                    </div>

                                    <span className="text-[9px] text-gray-600 px-1 opacity-50 mt-1">
                                        {new Date(msg.created_at).toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'})}
                                    </span>
                                </div>
                             </div>
                        </div>
                    );
                })}
                <div ref={messagesEndRef} />
            </div>

            <div className="p-4 bg-white/5 border-t border-white/5 relative">
                
                {/* --- REPLY BANNER (This ONLY appears above Input) --- */}
                {replyingTo && (
                    <div className="flex items-center justify-between bg-black/40 border border-white/10 rounded-t-xl px-4 py-2 text-xs text-gray-300 -mb-px mx-1">
                        <div className="flex items-center gap-2">
                            <Reply size={14} className="text-blue-400" />
                            <span>Replying to <strong className="text-white">{replyingTo.sender?.real_name}</strong></span>
                        </div>
                        <button onClick={() => setReplyingTo(null)} className="hover:text-white"><X size={14} /></button>
                    </div>
                )}

                {/* --- TAG SUGGESTION POPUP --- */}
                {showTagList && filteredTags.length > 0 && (
                    <div className="absolute bottom-20 left-14 bg-crm-bg/95 backdrop-blur-xl border border-white/20 rounded-xl shadow-[0_0_30px_rgba(0,0,0,0.5)] w-56 overflow-hidden z-50 animate-in slide-in-from-bottom-2">
                        <div className="px-3 py-2 text-[10px] font-bold text-gray-500 uppercase tracking-wider border-b border-white/10">Suggestions</div>
                        {filteredTags.map(u => (
                            <div 
                                key={u.id} 
                                onClick={() => addTag(u)}
                                className="px-3 py-2.5 hover:bg-blue-600 hover:text-white text-gray-300 text-xs cursor-pointer flex items-center gap-3 transition-colors border-b border-white/5 last:border-0"
                            >
                                <div className="w-6 h-6 bg-gray-700 rounded-full flex items-center justify-center font-bold text-[10px] text-white border border-white/10">
                                    {u.real_name.substring(0,2).toUpperCase()}
                                </div>
                                <span className="font-medium">{u.real_name}</span>
                            </div>
                        ))}
                    </div>
                )}

                {showPicker && (
                    <div className="absolute bottom-20 left-4 z-50 animate-in zoom-in-95">
                        <EmojiPicker onEmojiClick={(e) => setNewMessage(prev => prev + e.emoji)} theme={Theme.DARK} width={300} height={400} />
                    </div>
                )}
                
                <form className="relative flex gap-2 items-end z-20">
                    <button type="button" onClick={() => setShowPicker(!showPicker)} className="p-3 bg-white/5 hover:bg-white/10 rounded-xl text-gray-400 hover:text-yellow-400 transition">
                        <Smile size={20} />
                    </button>
                    
                    <textarea 
                        ref={inputRef}
                        className={`w-full bg-black/40 border border-white/10 rounded-xl py-3 pl-4 pr-12 text-white focus:border-indigo-500 outline-none transition shadow-inner resize-none custom-scrollbar ${replyingTo ? 'rounded-tl-none rounded-tr-none border-t-0' : ''}`}
                        placeholder={`Message ${activeRoomName}...`}
                        value={newMessage}
                        onChange={handleInputChange} 
                        onKeyDown={handleKeyDown}
                        rows={1}
                        style={{ minHeight: '46px', maxHeight: '120px' }}
                    />

                    <button onClick={(e) => { e.preventDefault(); sendMessage(); }} className="p-3 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl transition shadow-lg shadow-indigo-500/20">
                        <Send size={20} />
                    </button>
                </form>
            </div>
        </div>
    </div>
  );
}