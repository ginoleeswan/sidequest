import * as AppleAuthentication from 'expo-apple-authentication';
import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { Platform } from 'react-native';

import type { Session } from '@supabase/supabase-js';

import { authConfigured, supabase } from './supabase';
import { kv } from './storage';

/**
 * Signing in, as something the app can live without.
 *
 * Every consumer of this can be handed `null` forever and must still
 * work. That is not defensive coding for its own sake — it is the
 * product promise expressed as a type: an account buys sync, and never
 * a feature, so a signed-out reader is not in a degraded state. They
 * are in the normal one.
 */

interface AuthValue {
  session: Session | null;
  /** Still working out whether there is a stored session. */
  loading: boolean;
  /** False when the app was built without Supabase configuration. */
  available: boolean;
  signInWithApple: () => Promise<void>;
  signInWithGoogle: () => Promise<void>;
  signInWithEmail: (email: string) => Promise<void>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(authConfigured);

  useEffect(() => {
    if (!authConfigured) return;

    // Guarded on both ends: a rejected read (corrupt persisted session,
    // storage briefly unavailable) must resolve to "not signed in", not
    // an unhandled rejection at startup — and neither branch may touch
    // state after this provider has unmounted.
    let alive = true;
    supabase.auth
      .getSession()
      .then(({ data }) => {
        if (!alive) return;
        setSession(data.session);
        setLoading(false);
      })
      .catch(() => {
        if (!alive) return;
        setSession(null);
        setLoading(false);
      });

    const { data: sub } = supabase.auth.onAuthStateChange((_event, next) => {
      setSession(next);
      setLoading(false);
    });
    return () => {
      alive = false;
      sub.subscription.unsubscribe();
    };
  }, []);

  const value = useMemo<AuthValue>(
    () => ({
      session,
      loading,
      available: authConfigured,

      /**
       * Native Apple: the system sheet, not a browser.
       *
       * `signInWithIdToken` takes the credential Apple hands back
       * directly, which is what keeps this a Face ID confirmation
       * rather than a web page pretending to be one. It also means
       * Supabase validates the token's audience against the BUNDLE id
       * — not the Services id the web flow uses — which is why both are
       * listed in the dashboard.
       */
      signInWithApple: async () => {
        const credential = await AppleAuthentication.signInAsync({
          requestedScopes: [
            AppleAuthentication.AppleAuthenticationScope.FULL_NAME,
            AppleAuthentication.AppleAuthenticationScope.EMAIL,
          ],
        });
        if (!credential.identityToken) {
          throw new Error('Apple returned no identity token.');
        }
        const { error } = await supabase.auth.signInWithIdToken({
          provider: 'apple',
          token: credential.identityToken,
        });
        if (error) throw error;
      },

      /**
       * Google is imported where it is used, not at module load.
       *
       * The native module is absent on web and in the test runner, and
       * a top-level import would take the whole app down at import time
       * on both. Auth is optional here; its dependencies must be too.
       */
      signInWithGoogle: async () => {
        if (Platform.OS === 'web') {
          const { error } = await supabase.auth.signInWithOAuth({
            provider: 'google',
            options: { redirectTo: window.location.origin },
          });
          if (error) throw error;
          return;
        }
        const { GoogleSignin } =
          await import('@react-native-google-signin/google-signin');
        GoogleSignin.configure({
          iosClientId: process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID,
          webClientId: process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID,
        });
        await GoogleSignin.hasPlayServices();
        const result = await GoogleSignin.signIn();
        const token = result.data?.idToken;
        if (!token) throw new Error('Google returned no identity token.');
        const { error } = await supabase.auth.signInWithIdToken({
          provider: 'google',
          token,
        });
        if (error) throw error;
      },

      /** A link in the inbox — no password to invent, lose or reuse. */
      signInWithEmail: async (email: string) => {
        const { error } = await supabase.auth.signInWithOtp({
          email,
          options: {
            emailRedirectTo:
              Platform.OS === 'web' ? window.location.origin : undefined,
          },
        });
        if (error) throw error;
      },

      /**
       * Sign out clears the session and nothing else.
       *
       * The library, the plan and the drops stay exactly where they
       * were, because they were never the account's to begin with —
       * they are this device's. Deleting them here would turn signing
       * out into data loss and make the account load-bearing after all.
       */
      signOut: async () => {
        await supabase.auth.signOut();
        // The persisted query cache is the one thing that DOES go: it
        // can hold synced shelves, and on a shared browser the next
        // person would see the previous person's games painted on first
        // frame. It is a cache — dropping it costs a refetch, nothing
        // more, and the device-owned library above is untouched.
        kv.removeItem('sidequest.query-cache.v1');
      },
    }),
    [session, loading]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider');
  return ctx;
}
