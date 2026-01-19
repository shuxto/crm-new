import { createClient } from '@supabase/supabase-js';

// 1. Load variables
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

// 2. THE FIX: Validate them immediately
// This tells TypeScript: "If these don't exist, crash the app. If we pass this line, they are 100% strings."
if (!supabaseUrl || !supabaseKey) {
  throw new Error('MISSING SUPABASE KEYS: Check your .env file');
}

// 3. Create Client (Now TypeScript is happy because it knows they are strings)
export const supabase = createClient(supabaseUrl, supabaseKey);