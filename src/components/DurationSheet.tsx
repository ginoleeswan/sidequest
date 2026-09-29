import Ionicons from '@expo/vector-icons/Ionicons';
import { useState } from 'react';
import { Platform, StyleSheet, Text, TextInput, View } from 'react-native';

import { BottomSheet } from './BottomSheet';
import { PrimaryButton } from './PrimaryButton';
import { Touchable } from './Touchable';
import { COLORS } from '@/styles/colors';
import { formatHours, parseHours, type Duration } from '@/lib/duration';
import { useDurations } from '@/lib/durations';
import { impact } from '@/lib/haptics';
import { ICON, RADIUS, SPACING, TOUCH, innerRadius } from '@/styles/theme';
import { FONT_SCALE, TYPE } from '@/styles/typography';

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
 *
 * A sheet from the bottom edge, not a dialog in the middle: the numeric
 * keyboard used to rise straight over Save, because nothing held the
 * dialog above it. The sheet rides the keyboard, and committing a
 * length lands with a small bump — the plan just moved.
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
    <BottomSheet
      visible
      onClose={onClose}
      accessibilityLabel={`How long ${game.name} takes`}
    >
      <Text style={styles.eyebrow} maxFontSizeMultiplier={FONT_SCALE.label}>
        HOW LONG DOES IT TAKE?
      </Text>
      <Text
        style={styles.title}
        numberOfLines={2}
        accessibilityRole="header"
        maxFontSizeMultiplier={FONT_SCALE.display}
      >
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
            <Touchable
              key={hours}
              onPress={() => commit(hours)}
              haptic="impact"
              style={[styles.preset, selected && styles.presetOn]}
              accessibilityState={{ selected }}
              accessibilityLabel={`${hours} hours`}
            >
              <Text
                style={[styles.presetText, selected && styles.presetTextOn]}
                maxFontSizeMultiplier={FONT_SCALE.label}
              >
                {hours}h
              </Text>
            </Touchable>
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
          style={[styles.input, WEB_INPUT]}
          onSubmitEditing={() => {
            if (!typed) return;
            impact();
            commit(typed);
          }}
          accessibilityLabel="Hours to finish"
        />
        <PrimaryButton
          label="Save"
          onPress={() => {
            if (typed) commit(typed);
          }}
          disabled={!typed}
        />
      </View>

      {duration?.source === 'yours' && (
        <Touchable
          onPress={() => {
            clearDuration(game.id);
            onClose();
          }}
          hitSlop="text"
          style={styles.reset}
        >
          <Ionicons name="refresh" size={ICON.sm} color={COLORS.mediumGrey} />
          <Text style={styles.resetText}>Use the estimate again</Text>
        </Touchable>
      )}
    </BottomSheet>
  );
}

/** 16 on web, or iOS Safari zooms the page on focus and stays there. */
const WEB_INPUT = Platform.OS === 'web' ? { fontSize: 16 } : null;

const styles = StyleSheet.create({
  eyebrow: {
    ...TYPE.tag,
    // How long is time, and time is amber.
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
  /**
   * Squared to the sheet they sit in. Pills at 30 inside a sheet at 22
   * were two shape languages in one card; these take the sheet's corner
   * less its padding.
   */
  preset: {
    minWidth: 56,
    minHeight: TOUCH.min,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: COLORS.strokeStrong,
    borderRadius: innerRadius(RADIUS.md, SPACING.lg),
    paddingHorizontal: SPACING.md,
  },
  /** The length you gave, in the colour lengths are. */
  presetOn: { backgroundColor: COLORS.accent, borderColor: COLORS.accent },
  presetText: {
    ...TYPE.labelSmall,
    color: COLORS.lightGrey,
  },
  presetTextOn: { color: COLORS.navy },
  exactRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
    marginTop: SPACING.xs,
  },
  input: {
    ...TYPE.body,
    flex: 1,
    minHeight: 48,
    borderWidth: 1,
    borderColor: COLORS.strokeStrong,
    borderRadius: RADIUS.sm,
    paddingHorizontal: SPACING.md,
    // 16px or larger: iOS zooms the page for anything smaller.
    color: COLORS.lightGrey,
    outlineWidth: 0,
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
