import { useState, useEffect } from 'react';
import { auth } from '@/lib/auth';
import type { User, Tenant } from '@shared/schema';

export function useAuth() {
  const [user, setUser] = useState<User | null>(null);
  const [tenant, setTenant] = useState<Tenant | null>(null);
  const [session, setSession] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchUser = async (accessToken: string) => {
      try {
        const response = await fetch('/api/auth/user', {
          headers: {
            'Authorization': `Bearer ${accessToken}`,
          },
        });

        if (response.ok) {
          const data: { user: User; tenant: Tenant } = await response.json();
          setUser(data.user ?? null);
          setTenant(data.tenant ?? null);
        }
      } catch (error) {
        console.error('Error fetching user data:', error);
      }
    };

    const initAuth = async () => {
      try {
        // Get initial session
        const session = await auth.getSession();
        setSession(session);

        if (session?.access_token) {
          await fetchUser(session.access_token);
        }

        setLoading(false);
      } catch (error) {
        console.error('Error initializing auth:', error);
        setLoading(false);
      }
    };

    initAuth();

    // Listen for auth changes
    const { data: { subscription } } = auth.onAuthStateChange(async (event, session) => {
      setSession(session);

      if (session?.access_token) {
        await fetchUser(session.access_token);
      } else {
        setUser(null);
        setTenant(null);
      }

      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  const signIn = async (email: string) => {
    await auth.signInWithMagicLink(email);
  };

  const signOut = async () => {
    await auth.signOut();
    setUser(null);
    setTenant(null);
    setSession(null);
  };

  const isAuthenticated = !!session;
  const hasActiveSubscription = tenant?.subscriptionStatus === 'active';
  const isAdmin = user?.role === 'owner' || user?.role === 'admin';

  return {
    user,
    tenant,
    session,
    loading,
    isAuthenticated,
    hasActiveSubscription,
    isAdmin,
    signIn,
    signOut,
  };
}
