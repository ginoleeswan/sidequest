import Ionicons from '@expo/vector-icons/Ionicons';
import { Image } from 'expo-image';
import { useState } from 'react';
import { StyleSheet, Text, TextInput, View } from 'react-native';

import { PrimaryButton } from './PrimaryButton';
import { useToast } from './Toast';
import { IconButton, Touchable } from './Touchable';
import { connectSteam, steamLibrary, type SteamSnapshot } from '@/api/steam';
import { useLibrary } from '@/lib/library';
import { progressForLibrary } from '@/lib/steamMatch';
import { usePersistedState } from '@/hooks/usePersistedState';
import { COLORS } from '@/styles/colors';
import { ICON, RADIUS, SPACING, innerRadius } from '@/styles/theme';
import { FONT_SCALE, TYPE } from '@/styles/typography';
import { countOf } from '@/lib/format';

interface Props {
  /** Called with the measured pace when the user applies it. */
  onUsePace: (hoursPerWeek: number) => void;
  /** Take me to the import screen. */
  onImport?: () => void;
  /**
   * Told the moment a profile connects, for a screen that holds its
   * own copy of the snapshot — the persisted value is read once per
   * mount, so a page waiting on it would not see this one land.
   */
  onConnected?: (snapshot: SteamSnapshot) => void;
}

export function SteamConnect({ onUsePace, onImport, onConnected }: Props) {
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
      onConnected?.(snap);
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
          <Ionicons
            name="logo-steam"
            size={ICON.md}
            color={COLORS.mediumGrey}
          />
          <Text style={TYPE.micro} maxFontSizeMultiplier={FONT_SCALE.label}>
            Measure your real pace
          </Text>
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
          <PrimaryButton
            label="Connect"
            onPress={() => connect(input)}
            disabled={input.trim() === ''}
            busy={busy}
          />
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
            {countOf(snapshot.gameCount, 'game')} ·{' '}
            {snapshot.hoursPerWeek > 0
              ? `playing ${snapshot.hoursPerWeek}h a week`
              : 'quiet fortnight on Steam'}
          </Text>
        </View>
        <IconButton
          icon="close"
          size="md"
          color={COLORS.mediumGrey}
          onPress={() => setSnapshot(null)}
          accessibilityLabel="Disconnect Steam"
        />
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
        <Touchable
          onPress={onImport}
          hitSlop="text"
          accessibilityRole="link"
          style={styles.importLink}
        >
          <Ionicons
            name="download-outline"
            size={ICON.sm}
            color={COLORS.lightGrey}
          />
          <Text style={styles.importText}>Bring my Steam library in</Text>
        </Touchable>
      )}

      {snapshot.hoursPerWeek > 0 && (
        <PrimaryButton
          label={`Use my measured pace — ${snapshot.hoursPerWeek}h/week`}
          onPress={() => {
            onUsePace(snapshot.hoursPerWeek);
            toast(
              `Pace set to ${snapshot.hoursPerWeek}h a week`,
              'speedometer'
            );
          }}
          block
        />
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
    gap: SPACING.sm2,
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
    minHeight: 48,
    paddingHorizontal: SPACING.md,
    // See SearchInput: under 16px iOS zooms on focus.
    color: COLORS.lightGrey,
  },
  error: {
    ...TYPE.caption,
    color: COLORS.coralText,
  },
  profileRow: { flexDirection: 'row', alignItems: 'center', gap: SPACING.md },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: innerRadius(RADIUS.md, SPACING.lg),
  },
  avatarFallback: {
    backgroundColor: COLORS.raised,
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
  importLink: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    alignSelf: 'flex-start',
  },
  /** A way somewhere, not the primary act: amber is for that and for hours. */
  importText: {
    ...TYPE.labelSmall,
    color: COLORS.lightGrey,
  },
});
