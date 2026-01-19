import { createClient } from '@supabase/supabase-js';

// Get these from your Supabase Dashboard -> Settings -> API
const supabaseUrl = 'https://zqvvytgglralkoiuhqor.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpxdnZ5dGdnbHJhbGtvaXVocW9yIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njc3Mzk0ODcsImV4cCI6MjA4MzMxNTQ4N30.3Kx0bJUcy_IK-7EPhgvl_c8moLmJhbarqQtB246etqk';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);