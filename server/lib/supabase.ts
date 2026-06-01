import { createClient } from '@supabase/supabase-js';

// Development mode fallbacks
const isDevelopment = process.env.NODE_ENV === 'development';

if (!process.env.SUPABASE_URL && !isDevelopment) {
  throw new Error('Missing Supabase environment variables: SUPABASE_URL');
}

if (!process.env.SUPABASE_SERVICE_ROLE_KEY && !isDevelopment) {
  throw new Error('Missing Supabase environment variables: SUPABASE_SERVICE_ROLE_KEY');
}

// Use dummy values in development if not provided
const supabaseUrl = process.env.SUPABASE_URL || (isDevelopment ? 'https://dummy.supabase.co' : '');
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || (isDevelopment ? 'dummy_service_role_key' : '');

export const supabase = supabaseUrl.startsWith('https://') ? createClient(
  supabaseUrl,
  supabaseKey
) : null;

export async function verifySupabaseUser(token: string) {
  // In development mode without real Supabase, return a mock user
  if (isDevelopment && !process.env.SUPABASE_URL) {
    return {
      id: 'dev-user-id',
      email: 'dev@example.com',
      user_metadata: { username: 'devuser' }
    };
  }

  if (!supabase) return null;

  try {
    const { data: { user }, error } = await supabase.auth.getUser(token);
    if (error) throw error;
    return user;
  } catch (error) {
    return null;
  }
}
