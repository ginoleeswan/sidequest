import Ionicons from '@expo/vector-icons/Ionicons';
import { Image } from 'expo-image';
import { useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

import { useToast } from './Toast';
import { connectSteam, steamLibrary, type SteamSnapshot } from '@/api/steam';
import { useLibrary } from '@/lib/library';
import { progressForLibrary } from '@/lib/steamMatch';
import { usePersistedState } from '@/hooks/usePersistedState';
import { COLORS } from '@/styles/colors';
import { RADIUS, SPACING } from '@/styles/theme';
import { TYPE } from '@/styles/typography';

interface Props {
  /** Called with the measured pace when the user applies it. */
  onUsePace: (hoursPerWeek: number) => void;
  /** Take me to the import screen. */
  onImport?: () => void;
}

export function SteamConnect({ onUsePace, onImport }: Props) {
  const toast = useToast();
  const { entries, setProgress } = useLibrary();
  const [snapshot, setSnapshot] = usePersistedState<SteamSnapshot | null>(
    'sidequest.steam.v1',
    null
  );
  const [input, setInput] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const connect = async (raw: string) => {
    setBusy(true);
    setError(null);
    try {
      const snap = await connectSteam(raw);
      setSnapshot(snap);
      toast(`Connected as ${snap.name}`, 'logo-steam');
      // Progress for games already saved costs nothing extra: the whole
      // library is in the same response, and a name that matches is a
      // game whose hours we now know.
      const library = Object.values(entries);
      if (library.length > 0) {
        const games = await steamLibrary(snap.steamid).catch(() => []);
        const measured = progressForLibrary(games, library);
        const known = Object.keys(measured).length;
        if (known > 0) {
          setProgress(measured);
          toast(
            `Found your hours on ${known} saved ${known === 1 ? 'game' : 'games'}`,
            'time'
          );
        }
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Steam connection failed');
    } finally {
      setBusy(false);
    }
  };

  if (!snapshot) {
    return (
      <View style={styles.card}>
        <View style={styles.head}>
          <Ionicons name="logo-steam" size={16} color={COLORS.mediumGrey} />
          <Text style={TYPE.micro}>Measure your real pace</Text>
        </View>
        <Text style={styles.lede}>
          Connect Steam and the plan uses your actual hours instead of a guess.
          Public profile required — nothing is stored off this device.
        </Text>
        <View style={styles.inputRow}>
          <TextInput
            value={input}
            onChangeText={setInput}
            placeholder="Profile URL or vanity name…"
            placeholderTextColor={COLORS.mediumGrey}
            autoCapitalize="none"
            autoCorrect={false}
            style={styles.input}
            onSubmitEditing={() => input.trim() && connect(input)}
          />
          <Pressable
            onPress={() => connect(input)}
            disabled={busy || input.trim() === ''}
            style={[
              styles.button,
              (busy || input.trim() === '') && styles.buttonDisabled,
            ]}
          >
            {busy ? (
              <ActivityIndicator size="small" color={COLORS.darkGrey} />
            ) : (
              <Text style={styles.buttonText}>Connect</Text>
            )}
          </Pressable>
        </View>
        {error ? <Text style={styles.error}>{error}</Text> : null}
      </View>
    );
  }

  return (
    <View style={styles.card}>
      <View style={styles.profileRow}>
        {snapshot.avatar ? (
          <Image source={{ uri: snapshot.avatar }} style={styles.avatar} />
        ) : (
          <View style={[styles.avatar, styles.avatarFallback]}>
            <Ionicons name="logo-steam" size={18} color={COLORS.mediumGrey} />
          </View>
        )}
        <View style={styles.profileBody}>
          <Text style={styles.profileName}>{snapshot.name}</Text>
          <Text style={styles.profileMeta}>
            {snapshot.gameCount.toLocaleString()} games ·{' '}
            {snapshot.hoursPerWeek > 0
              ? `playing ${snapshot.hoursPerWeek}h a week`
              : 'quiet fortnight on Steam'}
          </Text>
        </View>
        <Pressable
          onPress={() => setSnapshot(null)}
          hitSlop={8}
          accessibilityLabel="Disconnect Steam"
        >
          <Ionicons name="close" size={16} color={COLORS.mediumGrey} />
        </Pressable>
      </View>

      {snapshot.recent.length > 0 && (
        <Text style={styles.recent} numberOfLines={2}>
          Lately:{' '}
          {snapshot.recent
            .slice(0, 3)
            .map((g) => `${g.name} (${Math.round(g.minutes2Weeks / 60)}h)`)
            .join(' · ')}
        </Text>
      )}

      {onImport && (
        <Pressable
          onPress={onImport}
          accessibilityRole="link"
          style={styles.importLink}
        >
          <Ionicons name="download-outline" size={14} color={COLORS.accent} />
          <Text style={styles.importText}>Bring my Steam library in</Text>
        </Pressable>
      )}

      {snapshot.hoursPerWeek > 0 && (
        <Pressable
          onPress={() => {
            onUsePace(snapshot.hoursPerWeek);
            toast(
              `Pace set to ${snapshot.hoursPerWeek}h a week`,
              'speedometer'
            );
          }}
          style={styles.button}
        >
          <Text style={styles.buttonText}>
            Use my measured pace — {snapshot.hoursPerWeek}h/week
          </Text>
        </Pressable>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.stroke,
    borderRadius: RADIUS.md,
    padding: SPACING.lg,
    gap: SPACING.sm + 2,
  },
  head: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  lede: {
    ...TYPE.p,
    color: COLORS.mediumGrey,
  },
  inputRow: { flexDirection: 'row', gap: SPACING.sm },
  input: {
    ...TYPE.body,
    flex: 1,
    borderWidth: 1,
    borderColor: COLORS.strokeStrong,
    borderRadius: RADIUS.sm,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm + 1,
    // See SearchInput: under 16px iOS zooms on focus.
    color: COLORS.lightGrey,
  },
  button: {
    backgroundColor: COLORS.white,
    borderRadius: RADIUS.sm,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm + 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonDisabled: { opacity: 0.45 },
  buttonText: {
    ...TYPE.labelSmall,
    color: COLORS.darkGrey,
  },
  error: {
    ...TYPE.caption,
    color: '#FC8B7E',
  },
  profileRow: { flexDirection: 'row', alignItems: 'center', gap: SPACING.md },
  avatar: { width: 40, height: 40, borderRadius: 8 },
  avatarFallback: {
    backgroundColor: 'rgba(255,255,255,0.06)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  profileBody: { flex: 1, gap: 1 },
  profileName: {
    ...TYPE.h3,
    color: COLORS.lightGrey,
  },
  profileMeta: {
    ...TYPE.caption,
    color: COLORS.mediumGrey,
  },
  recent: {
    ...TYPE.caption,
    color: COLORS.mediumGrey,
  },
  importLink: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  importText: {
    ...TYPE.labelSmall,
    color: COLORS.accent,
  },
});
