// src/hooks/useChat.ts
import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';

export function useChat(roomId: string, currentUserId: string | null) {
  const [messages, setMessages] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [hasMore, setHasMore] = useState(true); // Track if there are more messages to load
  const PAGE_SIZE = 50;

  // 1. Initial Load & Room Switch
  useEffect(() => {
    if (!roomId || !currentUserId) return;

    const fetchInitialMessages = async () => {
      setLoading(true);
      const { data, error } = await supabase
        .from('crm_messages')
        .select('*, sender:crm_users(real_name)')
        .eq('room_id', roomId)
        .order('created_at', { ascending: false })
        .range(0, PAGE_SIZE - 1); // Get first 50
      
      if (!error && data) {
        setMessages(data.reverse());
        setHasMore(data.length === PAGE_SIZE); // If we got 50, there might be more
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
        const newMsg = { ...payload.new, sender: senderData };
        setMessages(prev => [...prev, newMsg]);
      })
      .subscribe();

    return () => { supabase.removeChannel(sub); };
  }, [roomId, currentUserId]);

  // --- 3. NEW: LOAD MORE FUNCTION ---
  const loadMore = async () => {
    if (loading || !hasMore) return;
    
    setLoading(true);
    const currentCount = messages.length;

    const { data, error } = await supabase
      .from('crm_messages')
      .select('*, sender:crm_users(real_name)')
      .eq('room_id', roomId)
      .order('created_at', { ascending: false })
      .range(currentCount, currentCount + PAGE_SIZE - 1); // Skip what we already have

    if (!error && data) {
      if (data.length < PAGE_SIZE) setHasMore(false);
      // Prepend old messages to the top
      setMessages(prev => [...data.reverse(), ...prev]);
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