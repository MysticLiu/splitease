import { useCallback, useEffect, useMemo, useState } from 'react';
import type { AuthError, Session } from '@supabase/supabase-js';
import { supabase } from '../../lib/supabaseClient';

type AuthResult = { error: AuthError | null };

export type AuthDomain = {
  session: Session | null;
  loading: boolean;
  userId: string;
  userEmail: string;
  signUp: (email: string, password: string, fullName: string) => Promise<AuthResult>;
  signInWithPassword: (email: string, password: string) => Promise<AuthResult>;
  signInWithGoogle: () => Promise<unknown>;
  signOut: () => Promise<unknown>;
};

export function useAuthDomain(): AuthDomain {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    supabase.auth.getSession().then(({ data }) => {
      if (mounted) {
        setSession(data.session || null);
        setLoading(false);
      }
    });

    const { data: authListener } = supabase.auth.onAuthStateChange((_event, newSession) => {
      setSession(newSession);
      setLoading(false);
    });

    return () => {
      mounted = false;
      authListener.subscription.unsubscribe();
    };
  }, []);

  const signUp = useCallback(async (email: string, password: string, fullName: string) => {
    return supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          full_name: fullName,
        },
      },
    });
  }, []);

  const signInWithPassword = useCallback(async (email: string, password: string) => {
    return supabase.auth.signInWithPassword({ email, password });
  }, []);

  const signInWithGoogle = useCallback(async () => {
    return supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: window.location.origin,
      },
    });
  }, []);

  const signOut = useCallback(async () => {
    return supabase.auth.signOut();
  }, []);

  const userId = session?.user?.id ?? '';
  const userEmail = session?.user?.email ?? '';

  return useMemo(
    () => ({
      session,
      loading,
      userId,
      userEmail,
      signUp,
      signInWithPassword,
      signInWithGoogle,
      signOut,
    }),
    [
      session,
      loading,
      userId,
      userEmail,
      signUp,
      signInWithPassword,
      signInWithGoogle,
      signOut,
    ]
  );
}
