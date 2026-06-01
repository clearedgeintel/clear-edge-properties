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

export const auth = {
  async signInWithMagicLink(email: string) {
    if (isDevelopment) {
      // In development mode, call the backend signin endpoint
      console.log('Development mode: Signing in with backend for', email);
      
      try {
        const response = await fetch('/api/auth/signin', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          credentials: 'include',
          body: JSON.stringify({ email }),
        });
        
        if (response.ok) {
          const data = await response.json();
          // Trigger auth state change after successful signin
          setTimeout(() => {
            window.dispatchEvent(new CustomEvent('auth-signin', { detail: { email, user: data.user } }));
          }, 500);
        } else {
          throw new Error('Failed to sign in');
        }
      } catch (error) {
        console.error('Development signin failed:', error);
        throw error;
      }
      return;
    }

    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: {
        emailRedirectTo: window.location.origin,
      },
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
