import { Ionicons } from '@expo/vector-icons';
import { useState } from 'react';
import {
  Modal,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

import { COLORS } from '@/styles/colors';
import { formatHours, parseHours, type Duration } from '@/lib/duration';
import { useDurations } from '@/lib/durations';
import { RADIUS, SPACING } from '@/styles/theme';
import { TYPE } from '@/styles/typography';

/** Lengths people actually reach for, so most corrections are one tap. */
const PRESETS = [2, 5, 10, 20, 40, 80];

interface Props {
  game: { id: number; name: string } | null;
  duration: Duration | null;
  onClose: () => void;
}

/**
 * Correcting how long a game takes.
 *
 * The plan is built on estimates that are sometimes wrong, and the person
 * looking at it usually knows better than the average. This makes their
 * number the one that counts — one tap for the common lengths, free text
 * for anything else, and a way back to the estimate.
 */
export function DurationSheet({ game, duration, onClose }: Props) {
  if (!game) return null;
  // Keyed by game: each game opens the sheet fresh, so the field starts
  // from that game's length without an effect syncing it after the fact.
  return (
    <Sheet key={game.id} game={game} duration={duration} onClose={onClose} />
  );
}

function Sheet({
  game,
  duration,
  onClose,
}: Props & { game: NonNullable<Props['game']> }) {
  const { setDuration, clearDuration } = useDurations();
  const [text, setText] = useState(
    duration?.hours ? String(duration.hours) : ''
  );

  const typed = parseHours(text);
  const commit = (hours: number) => {
    setDuration(game.id, hours);
    onClose();
  };

  return (
    <Modal transparent animationType="fade" onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose}>
        <Pressable style={styles.sheet} onPress={(e) => e.stopPropagation()}>
          <Text style={styles.eyebrow}>HOW LONG DOES IT TAKE?</Text>
          <Text style={styles.title} numberOfLines={2}>
            {game.name}
          </Text>
          <Text style={styles.detail}>
            {duration?.source === 'yours'
              ? `Your answer: ${formatHours(duration.hours)}. The plan uses it everywhere.`
              : duration?.source === 'unknown'
                ? 'No estimate exists for this one, so the plan can’t place it yet.'
                : `Estimated at ${formatHours(duration?.hours ?? 0)}${
                    duration?.rough ? ' — but that number looks shaky.' : '.'
                  }`}
          </Text>

          <View style={styles.presets}>
            {PRESETS.map((hours) => {
              const selected =
                duration?.source === 'yours' && duration.hours === hours;
              return (
                <Pressable
                  key={hours}
                  onPress={() => commit(hours)}
                  style={[styles.preset, selected && styles.presetOn]}
                  accessibilityRole="button"
                >
                  <Text
                    style={[styles.presetText, selected && styles.presetTextOn]}
                  >
                    {hours}h
                  </Text>
                </Pressable>
              );
            })}
          </View>

          <View style={styles.exactRow}>
            <TextInput
              value={text}
              onChangeText={setText}
              placeholder="or type it — 14, 2.5, 90m"
              placeholderTextColor={COLORS.mediumGrey}
              keyboardType="numeric"
              style={styles.input}
              onSubmitEditing={() => typed && commit(typed)}
              accessibilityLabel="Hours to finish"
            />
            <Pressable
              onPress={() => typed && commit(typed)}
              disabled={!typed}
              style={[styles.save, !typed && styles.saveOff]}
              accessibilityRole="button"
            >
              <Text style={styles.saveText}>Save</Text>
            </Pressable>
          </View>

          {duration?.source === 'yours' && (
            <Pressable
              onPress={() => {
                clearDuration(game.id);
                onClose();
              }}
              style={styles.reset}
            >
              <Ionicons name="refresh" size={14} color={COLORS.mediumGrey} />
              <Text style={styles.resetText}>Use the estimate again</Text>
            </Pressable>
          )}
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(13,17,25,0.82)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: SPACING.lg,
  },
  sheet: {
    width: '100%',
    maxWidth: 420,
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.strokeStrong,
    borderRadius: RADIUS.md,
    padding: SPACING.lg,
    gap: SPACING.sm,
  },
  eyebrow: {
    ...TYPE.tag,
    color: COLORS.accent,
  },
  title: {
    ...TYPE.h2,
    color: COLORS.white,
  },
  detail: {
    ...TYPE.p,
    color: COLORS.mediumGrey,
  },
  presets: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: SPACING.sm,
    marginTop: SPACING.xs,
  },
  preset: {
    borderWidth: 1,
    borderColor: COLORS.strokeStrong,
    borderRadius: RADIUS.lg,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
  },
  presetOn: { backgroundColor: COLORS.white, borderColor: COLORS.white },
  presetText: {
    ...TYPE.labelSmall,
    color: COLORS.lightGrey,
  },
  presetTextOn: { color: COLORS.darkGrey },
  exactRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
    marginTop: SPACING.xs,
  },
  input: {
    ...TYPE.body,
    flex: 1,
    borderWidth: 1,
    borderColor: COLORS.strokeStrong,
    borderRadius: RADIUS.sm,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm + 1,
    // 16px or larger: iOS zooms the page for anything smaller.
    color: COLORS.lightGrey,
    outlineWidth: 0,
  },
  save: {
    backgroundColor: COLORS.white,
    borderRadius: RADIUS.sm,
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.sm + 3,
  },
  saveOff: { opacity: 0.4 },
  saveText: {
    ...TYPE.h4,
    color: COLORS.darkGrey,
  },
  reset: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    alignSelf: 'flex-start',
    paddingVertical: SPACING.xs,
  },
  resetText: {
    ...TYPE.labelSmall,
    color: COLORS.mediumGrey,
  },
});
