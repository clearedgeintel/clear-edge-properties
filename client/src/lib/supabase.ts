import { createClient } from '@supabase/supabase-js';

// Development mode fallbacks
const isDevelopment = import.meta.env.DEV;

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || (isDevelopment ? 'https://dummy.supabase.co' : '');
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || (isDevelopment ? 'dummy_anon_key' : '');

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables');
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
