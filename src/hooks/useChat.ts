import { useState, useEffect, useRef } from 'react';
import { supabase } from '../lib/supabase';

export function useChat(roomId: string, currentUserId: string | null) {
  const [messages, setMessages] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [hasMore, setHasMore] = useState(true); 
  
  const isMounted = useRef(false);
  const PAGE_SIZE = 50;

  // --- HELPER: SORT & DEDUPE ---
  // This function forces the messages to ALWAYS be in the correct order
  // regardless of how the database sends them.
  const mergeAndSortMessages = (currentMessages: any[], newBatch: any[]) => {
      // 1. Combine arrays
      const combined = [...currentMessages, ...newBatch];

      // 2. Remove Duplicates (by ID)
      const uniqueMap = new Map();
      combined.forEach(msg => {
          uniqueMap.set(msg.id, msg);
      });
      const uniqueList = Array.from(uniqueMap.values());

      // 3. Strict Sort: Oldest First
      return uniqueList.sort((a, b) => {
          const timeA = new Date(a.created_at).getTime();
          const timeB = new Date(b.created_at).getTime();
          
          // Primary Sort: Time
          if (timeA !== timeB) return timeA - timeB;
          
          // Secondary Sort: ID (Tie-breaker for identical times)
          // We assume higher ID = newer message (if serial). 
          // If UUID, this just keeps order stable so they don't jump around.
          return a.id > b.id ? 1 : -1;
      });
  };

  // 1. Initial Load & Room Switch
  useEffect(() => {
    if (!roomId || !currentUserId) return;
    isMounted.current = true;

    setMessages([]); // Clear instantly
    setHasMore(true);

    const fetchInitialMessages = async () => {
      setLoading(true);
      
      const { data, error } = await supabase
        .from('crm_messages')
        .select('*, sender:crm_users(real_name)')
        .eq('room_id', roomId)
        .order('created_at', { ascending: false }) // Newest first
        .order('id', { ascending: false })         // Tie-breaker
        .range(0, PAGE_SIZE - 1); 
      
      if (!error && data) {
        const safeData = data as any[];
        // We use our helper to sort them correctly (Oldest -> Newest)
        setMessages(mergeAndSortMessages([], safeData)); 
        
        if (safeData.length < PAGE_SIZE) setHasMore(false);
      }
      setLoading(false);
    };

    fetchInitialMessages();

    // 2. Real-time Subscription
    const sub = supabase.channel(`chat-${roomId}`)
      .on('postgres_changes', { 
        event: 'INSERT', 
        schema: 'public', 
        table: 'crm_messages', 
        filter: `room_id=eq.${roomId}` 
      }, async (payload) => {
        const { data: senderData } = await supabase.from('crm_users').select('real_name').eq('id', payload.new.sender_id).single();
        const newMsg: any = { ...payload.new, sender: senderData };
        
        setMessages(prev => mergeAndSortMessages(prev, [newMsg]));
      })
      .subscribe();

    return () => { 
        supabase.removeChannel(sub); 
        isMounted.current = false;
    };
  }, [roomId, currentUserId]);

  // --- 3. LOAD MORE ---
  const loadMore = async () => {
    if (loading || !hasMore || messages.length === 0) return;
    
    setLoading(true);
    
    // Pagination: Skip the number of messages we already have
    const from = messages.length;
    const to = from + PAGE_SIZE - 1;

    const { data, error } = await supabase
      .from('crm_messages')
      .select('*, sender:crm_users(real_name)')
      .eq('room_id', roomId)
      .order('created_at', { ascending: false })
      .order('id', { ascending: false }) // Important for stability
      .range(from, to);

    if (!error && data) {
      const safeData = data as any[];
      
      if (safeData.length > 0) {
          setMessages(prev => mergeAndSortMessages(prev, safeData));
      }
      
      if (safeData.length < PAGE_SIZE) setHasMore(false);
    }
    setLoading(false);
  };

  const sendMessage = async (content: string, mentions: string[] = []) => {
    if (!content.trim() || !currentUserId || !roomId) return;
    setIsSending(true);
    const { error } = await supabase.from('crm_messages').insert({
      room_id: roomId,
      sender_id: currentUserId,
      content,
      mentions,
      reply_to_id: null
    });
    setIsSending(false);
    return error;
  };

  return { messages, loading, sendMessage, isSending, loadMore, hasMore };
}