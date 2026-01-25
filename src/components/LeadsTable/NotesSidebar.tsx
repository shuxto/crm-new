import { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { supabase } from '../../lib/supabase';
import { X, Send, Trash2, MessageSquare, Clock, User, ShieldAlert, Sparkles } from 'lucide-react';

interface Note {
  id: string;
  content: string;
  created_at: string;
  author_name: string;
}

interface NotesSidebarProps {
  lead: { id: string; name: string; surname: string; note_count?: number };
  onClose: () => void;
  currentUserEmail?: string; // This is actually receiving the ID now
  role: string;
  onNoteCountChange: (newCount: number) => void;
}

export default function NotesSidebar({ lead, onClose, currentUserEmail, role, onNoteCountChange }: NotesSidebarProps) {
  const [notes, setNotes] = useState<Note[]>([]);
  const [newNote, setNewNote] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [isClosing, setIsClosing] = useState(false);
  
  // NEW: Store the Real Name here
  const [currentRealName, setCurrentRealName] = useState('Agent');
  
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // --- HELPER: HANDLE CLOSING ANIMATION ---
  const handleClose = () => {
    setIsClosing(true); 
    setTimeout(() => { onClose(); }, 350);
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  // 0. NEW: FETCH REAL NAME (Fixes the ID issue)
  useEffect(() => {
    const fetchMyName = async () => {
        if (!currentUserEmail) return;
        // currentUserEmail holds the ID now. Let's get the name.
        const { data } = await supabase
            .from('crm_users')
            .select('real_name')
            .eq('id', currentUserEmail) // Compare ID to ID
            .single();
        
        if (data?.real_name) {
            setCurrentRealName(data.real_name);
        }
    };
    fetchMyName();
  }, [currentUserEmail]);

  // 1. FETCH & SUBSCRIBE
  useEffect(() => {
    const fetchNotes = async () => {
      const { data } = await supabase
        .from('crm_notes')
        .select('*')
        .eq('lead_id', lead.id)
        .order('created_at', { ascending: true });
      
      if (data) setNotes(data);
      setLoading(false);
      setTimeout(scrollToBottom, 100);
    };

    fetchNotes();

    const channel = supabase
      .channel(`notes-${lead.id}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'crm_notes', filter: `lead_id=eq.${lead.id}` }, (payload) => {
        if (payload.eventType === 'INSERT') {
          const newNote = payload.new as Note;
          // Prevent duplicates if our optimistic update already added it
          setNotes((prev) => {
            if (prev.some(n => n.id === newNote.id)) return prev;
            return [...prev, newNote];
          });
          setTimeout(scrollToBottom, 100);
        } else if (payload.eventType === 'DELETE') {
          setNotes((prev) => prev.filter((n) => n.id !== payload.old.id));
        }
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [lead.id]);

  // 2. ESC TO CLOSE
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') handleClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // 3. SEND NOTE (OPTIMISTIC UPDATE - INSTANT)
  const handleSend = async () => {
    if (!newNote.trim()) return;
    setSending(true);

    const noteContent = newNote.trim();
    // CHANGED: Use the fetched name, NOT the email/ID
    const authorName = currentRealName;
    
    // A. INSTANTLY UPDATE UI (Fake ID)
    const tempId = Math.random().toString(36).substr(2, 9);
    const optimisticNote: Note = {
        id: tempId,
        content: noteContent,
        author_name: authorName,
        created_at: new Date().toISOString()
    };

    setNotes(prev => [...prev, optimisticNote]);
    setNewNote('');
    setTimeout(scrollToBottom, 50); 

    // B. SEND TO DB
    const { data, error } = await supabase
        .from('crm_notes')
        .insert({
            lead_id: lead.id,
            content: noteContent,
            author_name: authorName,
        })
        .select()
        .single();

    if (error) {
      alert('Error sending note');
      setNotes(prev => prev.filter(n => n.id !== tempId)); // Revert
    } else {
      // C. SWAP FAKE ID WITH REAL ID
      setNotes(prev => prev.map(n => n.id === tempId ? data : n));
      const newCount = (notes.length || 0) + 1;
      onNoteCountChange(newCount); 
      await supabase.from('crm_leads').update({ note_count: newCount }).eq('id', lead.id);
    }
    setSending(false);
  };

  // 4. DELETE NOTE (OPTIMISTIC UPDATE - INSTANT)
  const handleDelete = async (noteId: string) => {
    if (!confirm('Delete this note?')) return;
    
    const previousNotes = [...notes];
    setNotes(prev => prev.filter(n => n.id !== noteId)); // Remove instantly

    const { error } = await supabase.from('crm_notes').delete().eq('id', noteId);
    
    if (error) {
       alert("Failed to delete");
       setNotes(previousNotes); // Revert
    } else {
       const newCount = Math.max(0, notes.length - 1);
       onNoteCountChange(newCount);
       await supabase.from('crm_leads').update({ note_count: newCount }).eq('id', lead.id);
    }
  };

  const handleInputKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const canDelete = role === 'admin' || role === 'manager';

  // --- CSS KEYFRAMES ---
  const animationStyles = `
    @keyframes slideInRight {
      from { transform: translateX(100%); opacity: 0; }
      to { transform: translateX(0); opacity: 1; }
    }
    @keyframes slideOutRight {
      from { transform: translateX(0); opacity: 1; }
      to { transform: translateX(100%); opacity: 0; }
    }
    @keyframes fadeInBackdrop {
      from { opacity: 0; }
      to { opacity: 1; }
    }
    @keyframes fadeOutBackdrop {
      from { opacity: 1; }
      to { opacity: 0; }
    }
    
    .animate-enter { animation: slideInRight 0.35s cubic-bezier(0.16, 1, 0.3, 1) forwards; }
    .animate-exit { animation: slideOutRight 0.35s cubic-bezier(0.16, 1, 0.3, 1) forwards; }
    
    .backdrop-enter { animation: fadeInBackdrop 0.3s ease-out forwards; }
    .backdrop-exit { animation: fadeOutBackdrop 0.3s ease-out forwards; }
  `;

  return createPortal(
    <>
      <style>{animationStyles}</style>
      
      {/* BACKDROP */}
      <div 
        className={`fixed inset-0 bg-[#000000]/60 backdrop-blur-md z-9998 ${isClosing ? 'backdrop-exit' : 'backdrop-enter'}`} 
        onClick={handleClose} 
      />

      {/* SIDEBAR CONTAINER */}
      <div className={`fixed top-0 right-0 h-full w-100 bg-[#020617]/95 border-l border-cyan-500/30 shadow-[0_0_50px_rgba(6,182,212,0.15)] z-9999 flex flex-col ${isClosing ? 'animate-exit' : 'animate-enter'}`}>
        
        {/* HEADER (shrink-0 prevents squash) */}
        <div className="p-5 border-b border-white/10 bg-crm-bg/50 flex justify-between items-center shadow-lg relative overflow-hidden shrink-0">
          <div className="absolute top-0 left-0 w-full h-1 bg-linear-to-r from-cyan-500 via-blue-500 to-purple-500 opacity-50" />
          
          <div className="flex items-center gap-3">
            <div className="p-2 bg-cyan-500/10 rounded-lg border border-cyan-500/20 text-cyan-400">
                <MessageSquare size={20} />
            </div>
            <div>
              <h3 className="text-white font-bold text-lg leading-none tracking-tight">{lead.name} {lead.surname}</h3>
              <div className="flex items-center gap-1.5 mt-1">
                <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
                <span className="text-[10px] text-gray-400 uppercase tracking-widest font-mono">Live Notes</span>
              </div>
            </div>
          </div>
          
          <button 
            onClick={handleClose} 
            className="text-gray-400 hover:text-white transition p-2 hover:bg-white/10 rounded-lg cursor-pointer active:scale-95"
          >
            <X size={22} />
          </button>
        </div>

        {/* NOTES LIST */}
        <div className="flex-1 overflow-y-auto p-5 space-y-5 custom-scrollbar bg-linear-to-b from-[#020617] to-crm-bg">
          {loading ? (
            <div className="flex flex-col items-center justify-center h-64 text-gray-500 space-y-3 animate-pulse">
                <Sparkles size={24} className="text-cyan-500/50" />
                <span className="text-xs uppercase tracking-widest">Decrypting Data...</span>
            </div>
          ) : notes.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-gray-500 space-y-4 opacity-50">
                <div className="p-4 bg-white/5 rounded-full border border-white/5">
                    <MessageSquare size={32} />
                </div>
                <div className="text-center">
                    <p className="text-sm font-bold text-gray-400">No Intel Yet</p>
                    <p className="text-xs text-gray-600 mt-1">Start the conversation log.</p>
                </div>
            </div>
          ) : (
            notes.map((note) => (
              <div key={note.id} className="group relative">
                {/* Visual Connector Line */}
                <div className="absolute left-3 top-8 -bottom-5 w-px bg-white/5 last:hidden" />
                
                <div className="flex gap-3">
                    {/* Avatar / Icon (shrink-0 protects from crushing) */}
                    <div className="shrink-0 mt-1">
                        <div className="w-7 h-7 rounded-lg bg-[#1e293b] flex items-center justify-center text-cyan-400 text-xs font-bold border border-white/10 shadow-inner">
                            {note.author_name ? note.author_name[0].toUpperCase() : <User size={12} />}
                        </div>
                    </div>

                    {/* CONTENT BUBBLE WRAPPER (min-w-0 fixes horizontal scroll) */}
                    <div className="flex-1 min-w-0">
                        <div className="flex justify-between items-center mb-1.5">
                            <span className="text-xs font-bold text-cyan-200/90 truncate mr-2">{note.author_name}</span>
                            <div className="flex items-center gap-2 shrink-0">
                                <span className="text-[10px] text-gray-600 font-mono flex items-center gap-1">
                                    <Clock size={10} />
                                    {new Date(note.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                </span>
                                {canDelete && (
                                    <button 
                                        onClick={() => handleDelete(note.id)}
                                        className="opacity-0 group-hover:opacity-100 text-gray-600 hover:text-red-400 transition cursor-pointer"
                                        title="Delete Log"
                                    >
                                        <Trash2 size={12} />
                                    </button>
                                )}
                            </div>
                        </div>

                        {/* BUBBLE (wrap-break-word fixes overflow) */}
                        <div className="bg-[#1e293b]/60 border border-white/5 p-3 rounded-tr-xl rounded-br-xl rounded-bl-xl text-sm text-gray-300 leading-relaxed shadow-sm hover:border-white/10 transition-colors wrap-break-word whitespace-pre-wrap">
                            {note.content}
                        </div>
                    </div>
                </div>
              </div>
            ))
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* FOOTER INPUT (shrink-0 prevents squash) */}
        <div className="p-5 bg-[#020617] border-t border-white/10 relative z-20 shrink-0">
          <div className="relative group">
            {/* Glowing border effect */}
            <div className="absolute -inset-0.5 bg-linear-to-r from-cyan-500 to-blue-500 rounded-xl blur opacity-0 group-focus-within:opacity-20 transition duration-500" />
            
            <textarea
              value={newNote}
              onChange={(e) => setNewNote(e.target.value)}
              onKeyDown={handleInputKeyDown}
              placeholder="Type secure note..."
              className="relative w-full bg-crm-bg border border-gray-700 rounded-xl p-4 pr-12 text-sm text-white placeholder-gray-600 focus:border-cyan-500/50 focus:ring-0 outline-none resize-none shadow-inner custom-scrollbar transition-colors"
              rows={3}
              autoFocus
            />
            
            <button 
              onClick={handleSend}
              disabled={sending || !newNote.trim()}
              className="absolute bottom-3 right-3 p-2 bg-linear-to-r from-cyan-600 to-blue-600 text-white rounded-lg hover:from-cyan-500 hover:to-blue-500 disabled:opacity-30 disabled:cursor-not-allowed transition shadow-lg shadow-cyan-500/20 cursor-pointer active:scale-95"
            >
              <Send size={16} />
            </button>
          </div>
          
          <div className="mt-3 flex justify-between items-center px-1">
             <div className="flex items-center gap-2 text-[10px] text-gray-500 font-mono">
                <ShieldAlert size={10} className="text-gray-600" />
                <span>Encrypted Log</span>
             </div>
             <div className="text-[10px] text-gray-600 font-mono">
                <span className="bg-white/5 px-1.5 py-0.5 rounded border border-white/5 text-gray-400">Enter</span> to send
             </div>
          </div>
        </div>

      </div>
    </>,
    document.body 
  );
}