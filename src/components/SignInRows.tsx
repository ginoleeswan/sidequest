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
 * The account, as one optional row rather than a gate.
 *
 * Everything above this on the You screen works signed out and keeps
 * working signed in. What an account adds is that the same library
 * appears on the next device — which is worth offering plainly and
 * never worth interrupting anybody for.
 *
 * So: no modal, no full-screen wall, no "sign in to continue". A
 * section that can be ignored forever.
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
        <ActivityIndicator size="small" color={COLORS.white} />
      ) : (
        <Ionicons name={icon} size={18} color={COLORS.white} />
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
    AppleAuthentication.isAvailableAsync().then(setAppleReady);
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
      <View style={styles.section}>
        <Text style={styles.eyebrow}>SYNCED</Text>
        <Text style={styles.signedIn}>{session.user.email ?? 'Signed in'}</Text>
        <Text style={styles.blurb}>
          Your library and plan follow you to any device you sign in on.
        </Text>
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
      </View>
    );
  }

  return (
    <View style={styles.section}>
      <Text style={styles.eyebrow}>OPTIONAL</Text>
      <Text style={styles.title}>Use this on another device?</Text>
      <Text style={styles.blurb}>
        Signing in syncs your library and plan. It doesn’t unlock anything —
        everything here already works without it.
      </Text>

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
          placeholder="your@email.com"
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
          <Ionicons name="arrow-forward" size={16} color={COLORS.darkGrey} />
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  section: { marginTop: SPACING.xl, gap: SPACING.xs },
  eyebrow: { ...TYPE.micro, color: COLORS.accent },
  title: { ...TYPE.h3, color: COLORS.white },
  blurb: {
    ...TYPE.caption,
    color: COLORS.mediumGrey,
    marginBottom: SPACING.sm,
  },
  signedIn: { ...TYPE.body, color: COLORS.white },

  providers: { gap: SPACING.sm },
  provider: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: SPACING.sm,
    paddingVertical: SPACING.md,
    borderRadius: RADIUS.lg,
    borderWidth: 1,
    borderColor: COLORS.stroke,
  },
  pressed: { opacity: 0.6 },
  providerLabel: { ...TYPE.body, color: COLORS.white },

  emailRow: { flexDirection: 'row', gap: SPACING.sm, marginTop: SPACING.sm },
  emailInput: {
    flex: 1,
    paddingVertical: SPACING.md,
    paddingHorizontal: SPACING.md,
    borderRadius: RADIUS.lg,
    borderWidth: 1,
    borderColor: COLORS.stroke,
    ...TYPE.body,
    color: COLORS.white,
  },
  emailSend: {
    width: 48,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: RADIUS.lg,
    backgroundColor: COLORS.white,
  },
  emailSendOff: { opacity: 0.3 },

  signOut: { paddingVertical: SPACING.sm },
  signOutLabel: { ...TYPE.body, color: COLORS.mediumGrey },
});
