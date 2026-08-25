import Ionicons from '@expo/vector-icons/Ionicons';
import * as AppleAuthentication from 'expo-apple-authentication';
import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

import { useToast } from './Toast';
import { useAuth } from '@/lib/auth';
import { COLORS } from '@/styles/colors';
import { RADIUS, SPACING } from '@/styles/theme';
import { TYPE } from '@/styles/typography';

/**
 * The account, as controls and nothing else.
 *
 * This used to carry its own eyebrow, heading and paragraph — which put
 * the promise ("signing in only syncs, it never unlocks") on the You
 * screen three times, once here, once in the eyebrow at the top and
 * once in the closing line. The words belong to the screen; the buttons
 * belong here. Whoever renders this says who you are and what signing
 * in would do.
 *
 * Everything above it works signed out and keeps working signed in, so
 * there is no modal, no wall and no "sign in to continue" — a section
 * that can be ignored forever.
 */

function Provider({
  icon,
  label,
  onPress,
  busy,
}: {
  icon: React.ComponentProps<typeof Ionicons>['name'];
  label: string;
  onPress: () => void;
  busy: boolean;
}) {
  return (
    <Pressable
      onPress={onPress}
      disabled={busy}
      style={({ pressed }) => [styles.provider, pressed && styles.pressed]}
      accessibilityRole="button"
      accessibilityLabel={label}
    >
      {busy ? (
        <ActivityIndicator size="small" color={COLORS.navy} />
      ) : (
        <Ionicons name={icon} size={18} color={COLORS.navy} />
      )}
      <Text style={styles.providerLabel}>{label}</Text>
    </Pressable>
  );
}

export function SignInRows() {
  const {
    session,
    loading,
    available,
    signInWithApple,
    signInWithGoogle,
    signInWithEmail,
    signOut,
  } = useAuth();
  const toast = useToast();
  const [busy, setBusy] = useState<string | null>(null);
  const [email, setEmail] = useState('');
  const [appleReady, setAppleReady] = useState(false);

  /**
   * Apple's button is only shown where Apple can honour it.
   *
   * `isAvailableAsync` is false on a simulator without an iCloud
   * account and on every non-Apple platform. Offering a button that
   * throws is worse than offering nothing.
   */
  useEffect(() => {
    if (Platform.OS !== 'ios') return;
    // The probe itself can throw where the native module is missing
    // (Expo Go) — the exact situation it exists to detect — and it can
    // resolve after this screen is gone.
    let alive = true;
    AppleAuthentication.isAvailableAsync()
      .then((ready) => alive && setAppleReady(ready))
      .catch(() => alive && setAppleReady(false));
    return () => {
      alive = false;
    };
  }, []);

  if (!available) return null;

  const run = async (name: string, fn: () => Promise<void>, done?: string) => {
    setBusy(name);
    try {
      await fn();
      if (done) toast(done);
    } catch (error) {
      // A cancelled sheet is a decision, not a failure — it should not
      // produce an error message telling somebody off for changing
      // their mind.
      const message = error instanceof Error ? error.message : String(error);
      const cancelled =
        /cancel/i.test(message) || /ERR_REQUEST_CANCELED/.test(message);
      if (!cancelled) toast(`Could not sign in — ${message}`);
    } finally {
      setBusy(null);
    }
  };

  if (loading) {
    return (
      <View style={styles.section}>
        <ActivityIndicator size="small" color={COLORS.mediumGrey} />
      </View>
    );
  }

  if (session) {
    return (
      <Pressable
        onPress={() =>
          run('out', signOut, 'Signed out — everything stayed here')
        }
        accessibilityRole="button"
        style={styles.signOut}
      >
        <Text style={styles.signOutLabel}>
          {busy === 'out' ? 'Signing out…' : 'Sign out'}
        </Text>
      </Pressable>
    );
  }

  return (
    <View style={styles.section}>
      {/* Solid, not outlined. Two hairline ghosts on a dark card read as
          disabled controls; a provider button is the one thing on this
          screen somebody might be looking for, and both Apple and
          Google publish a light button as a supported style. */}
      <View style={styles.providers}>
        {appleReady && (
          <Provider
            icon="logo-apple"
            label="Continue with Apple"
            busy={busy === 'apple'}
            onPress={() => run('apple', signInWithApple)}
          />
        )}
        <Provider
          icon="logo-google"
          label="Continue with Google"
          busy={busy === 'google'}
          onPress={() => run('google', signInWithGoogle)}
        />
      </View>

      <View style={styles.emailRow}>
        <TextInput
          value={email}
          onChangeText={setEmail}
          placeholder="or your@email.com"
          placeholderTextColor={COLORS.mediumGrey}
          keyboardType="email-address"
          autoCapitalize="none"
          autoComplete="email"
          style={styles.emailInput}
          accessibilityLabel="Email address"
        />
        <Pressable
          onPress={() =>
            run(
              'email',
              () => signInWithEmail(email.trim()),
              'Check your email for the link'
            )
          }
          disabled={!email.includes('@') || busy === 'email'}
          style={[
            styles.emailSend,
            (!email.includes('@') || busy === 'email') && styles.emailSendOff,
          ]}
          accessibilityRole="button"
          accessibilityLabel="Send sign-in link"
        >
          <Ionicons name="arrow-forward" size={16} color={COLORS.navy} />
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  section: { gap: SPACING.sm },

  providers: { gap: SPACING.sm },
  provider: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: SPACING.sm,
    paddingVertical: SPACING.md - 2,
    borderRadius: RADIUS.md,
    backgroundColor: COLORS.white,
  },
  pressed: { opacity: 0.7 },
  providerLabel: { ...TYPE.label, color: COLORS.navy },

  emailRow: { flexDirection: 'row', gap: SPACING.sm },
  emailInput: {
    flex: 1,
    paddingVertical: SPACING.md - 2,
    paddingHorizontal: SPACING.md,
    borderRadius: RADIUS.md,
    borderWidth: 1,
    borderColor: COLORS.strokeStrong,
    ...TYPE.body,
    color: COLORS.white,
  },
  emailSend: {
    width: 48,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: RADIUS.md,
    backgroundColor: COLORS.white,
  },
  emailSendOff: { opacity: 0.3 },

  signOut: { paddingVertical: SPACING.sm, alignSelf: 'flex-start' },
  signOutLabel: { ...TYPE.label, color: COLORS.mediumGrey },
});
