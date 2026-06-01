import { supabase } from './supabase';

const isDevelopment = import.meta.env.DEV;
const hasRealSupabase = import.meta.env.VITE_SUPABASE_URL && import.meta.env.VITE_SUPABASE_ANON_KEY;

// Mock session for development
const mockSession = {
  access_token: 'dev_token_123',
  user: {
    id: 'dev-user-id',
    email: 'admin@dev.com',
    user_metadata: { username: 'admin' }
  }
};

// In development the backend provisions a mock user; all sign-in methods route
// through it so local dev doesn't need a real Supabase project.
async function devSignin(email: string) {
  const response = await fetch('/api/auth/signin', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify({ email }),
  });
  if (!response.ok) throw new Error('Failed to sign in');
  const data = await response.json();
  setTimeout(() => {
    window.dispatchEvent(new CustomEvent('auth-signin', { detail: { email, user: data.user } }));
  }, 300);
}

// Returns true if a session was established immediately (vs. needing email
// confirmation, which only happens when Supabase "Confirm email" is enabled).
export interface SignUpResult {
  session: boolean;
  message?: string;
}

export const auth = {
  async signInWithPassword(email: string, password: string) {
    if (isDevelopment) return devSignin(email);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw error;
  },

  async signUpWithPassword(email: string, password: string): Promise<SignUpResult> {
    if (isDevelopment) {
      await devSignin(email);
      return { session: true };
    }
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: { emailRedirectTo: window.location.origin },
    });
    if (error) throw error;
    // If email confirmation is disabled in Supabase, a session is returned and
    // the user is signed in immediately. Otherwise they must confirm by email.
    if (data.session) return { session: true };
    return { session: false, message: 'Account created. Check your email to confirm, then sign in.' };
  },

  async signInWithGoogle() {
    if (isDevelopment) return devSignin('admin@dev.com');
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: window.location.origin },
    });
    if (error) throw error;
  },

  async signInWithMagicLink(email: string) {
    if (isDevelopment) return devSignin(email);
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: { emailRedirectTo: window.location.origin },
    });
    if (error) throw error;
  },

  async signOut() {
    if (isDevelopment) {
      console.log('Development mode: Simulating sign-out');
      window.dispatchEvent(new CustomEvent('auth-signout'));
      return;
    }

    const { error } = await supabase.auth.signOut();
    if (error) throw error;
  },

  async getSession() {
    if (isDevelopment) {
      return mockSession;
    }

    const { data: { session } } = await supabase.auth.getSession();
    return session;
  },

  async getUser() {
    if (isDevelopment) {
      return mockSession.user;
    }

    const { data: { user } } = await supabase.auth.getUser();
    return user;
  },

  onAuthStateChange(callback: (event: string, session: any) => void) {
    if (isDevelopment) {
      // Listen for custom auth events in development
      const handleSignIn = () => callback('SIGNED_IN', mockSession);
      const handleSignOut = () => callback('SIGNED_OUT', null);
      
      window.addEventListener('auth-signin', handleSignIn);
      window.addEventListener('auth-signout', handleSignOut);
      
      // Simulate being signed in from the start
      setTimeout(() => callback('SIGNED_IN', mockSession), 100);
      
      return { 
        data: { 
          subscription: { 
            unsubscribe: () => {
              window.removeEventListener('auth-signin', handleSignIn);
              window.removeEventListener('auth-signout', handleSignOut);
            } 
          } 
        } 
      };
    }

    return supabase.auth.onAuthStateChange(callback);
  },
};
