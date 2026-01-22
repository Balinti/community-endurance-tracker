'use client';

import { useEffect, useState, useCallback } from 'react';
import { createClient, User } from '@supabase/supabase-js';

// Shared Supabase instance for Google OAuth
const SHARED_SUPABASE_URL = 'https://qdrtpwpnbzvkpqjilyfh.supabase.co';
const SHARED_SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFkcnRwd3BuYnp2a3Bxamlsehn1IIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzYzNjM5MjksImV4cCI6MjA1MTkzOTkyOX0.H2j0Z6WMZhdNWgNK4fVCb18hzYEaQ5o6VE9w0VqJWM4';

const sharedSupabase = createClient(SHARED_SUPABASE_URL, SHARED_SUPABASE_ANON_KEY);

declare global {
  interface Window {
    AUTH_USER: User | null;
  }
}

async function trackUserLogin(user: User) {
  const APP_SLUG = 'community-endurance-tracker';

  try {
    const { error } = await sharedSupabase
      .from('user_tracking')
      .upsert(
        {
          user_id: user.id,
          email: user.email,
          app_slug: APP_SLUG,
          last_login_at: new Date().toISOString(),
        },
        { onConflict: 'user_id,app_slug' }
      );

    if (error) {
      console.error('Error tracking user login:', error);
    }
  } catch (err) {
    console.error('Failed to track user login:', err);
  }
}

export function useAuth() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Initial session check
    sharedSupabase.auth.getSession().then(({ data: { session } }) => {
      const currentUser = session?.user ?? null;
      setUser(currentUser);
      window.AUTH_USER = currentUser;
      setLoading(false);
    });

    // Listen for auth changes
    const { data: { subscription } } = sharedSupabase.auth.onAuthStateChange(
      async (event, session) => {
        const currentUser = session?.user ?? null;
        setUser(currentUser);
        window.AUTH_USER = currentUser;

        if (event === 'SIGNED_IN' && currentUser) {
          await trackUserLogin(currentUser);
        }
      }
    );

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const signInWithGoogle = useCallback(async () => {
    const { error } = await sharedSupabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}/app`,
      },
    });
    if (error) {
      console.error('Error signing in with Google:', error);
    }
  }, []);

  const signOut = useCallback(async () => {
    const { error } = await sharedSupabase.auth.signOut();
    if (error) {
      console.error('Error signing out:', error);
    }
  }, []);

  return { user, loading, signInWithGoogle, signOut };
}

export default function GoogleAuth() {
  const { user, loading, signInWithGoogle, signOut } = useAuth();

  if (loading) {
    return (
      <div className="flex items-center gap-2 text-sm text-gray-500">
        Loading...
      </div>
    );
  }

  if (user) {
    return (
      <div className="flex items-center gap-3">
        <span className="text-sm text-gray-700 truncate max-w-[200px]">
          {user.email}
        </span>
        <button
          onClick={signOut}
          className="px-3 py-1.5 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 transition-colors"
        >
          Sign Out
        </button>
      </div>
    );
  }

  return (
    <button
      onClick={signInWithGoogle}
      className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 transition-colors shadow-sm"
    >
      <svg className="w-5 h-5" viewBox="0 0 24 24">
        <path
          fill="#4285F4"
          d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
        />
        <path
          fill="#34A853"
          d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
        />
        <path
          fill="#FBBC05"
          d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
        />
        <path
          fill="#EA4335"
          d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
        />
      </svg>
      Sign in with Google
    </button>
  );
}
