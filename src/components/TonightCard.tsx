import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useMemo } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { CoverImage } from './CoverImage';
import { formatHours } from '@/lib/duration';
import { useDurations } from '@/lib/durations';
import { useLibrary } from '@/lib/library';
import { pickTonight } from '@/lib/scheduler';
import { COLORS } from '@/styles/colors';
import { RADIUS, SPACING } from '@/styles/theme';
import { TYPE } from '@/styles/typography';

/** An evening most people actually have. */
const SESSION_MINUTES = 90;

/**
 * The one thing to play tonight, on the home page.
 *
 * Everything else here is a storefront — the same rows for everyone. This
 * is the part only Sidequest can show: given what you saved and how long
 * those games take, here is the one you could actually finish this
 * evening. It appears the moment there is something to say and stays out
 * of the way when there isn't.
 */
export function TonightCard() {
  const router = useRouter();
  const { byStatus } = useLibrary();
  const { durationOf } = useDurations();

  const { pick, verb, reason } = useMemo(() => {
    const entries = [
      ...byStatus('playing').map((e) => ({ entry: e, playing: true })),
      ...byStatus('wishlist').map((e) => ({ entry: e, playing: false })),
    ];

    const tonight = pickTonight(
      entries.map(({ entry, playing }) => ({
        id: entry.game.id,
        name: entry.game.name,
        // Half of what's left, for something already under way.
        hours: durationOf(entry.game).hours * (playing ? 0.5 : 1),
        playing,
      })),
      SESSION_MINUTES
    );

    const chosen =
      tonight.finishable ?? tonight.continueGame ?? tonight.shortest;
    const game = entries.find((e) => e.entry.game.id === chosen?.id)?.entry
      .game;

    return {
      pick: chosen && game ? { ...chosen, game } : null,
      verb: tonight.finishable
        ? 'Finish'
        : tonight.continueGame
          ? 'Continue'
          : 'Start',
      reason: tonight.finishable
        ? 'You could see the credits before bed.'
        : tonight.continueGame
          ? 'Already under way — chip away at it.'
          : 'The shortest thing you’ve saved.',
    };
  }, [byStatus, durationOf]);

  if (!pick) return null;

  return (
    <Pressable
      style={styles.card}
      onPress={() => router.push(`/game/${pick.game.id}`)}
      accessibilityRole="link"
      accessibilityLabel={`Tonight: ${verb} ${pick.game.name}`}
    >
      <CoverImage
        uri={pick.game.background_image}
        style={styles.art}
        size="thumb"
        iconSize={22}
      />
      <View style={styles.body}>
        <View style={styles.eyebrowRow}>
          <Ionicons name="moon" size={12} color={COLORS.accent} />
          <Text style={styles.eyebrow}>TONIGHT</Text>
        </View>
        <Text style={styles.title} numberOfLines={2}>
          {verb} {pick.game.name}
        </Text>
        <Text style={styles.reason} numberOfLines={2}>
          {pick.hours > 0 ? `${formatHours(pick.hours)} · ` : ''}
          {reason}
        </Text>
      </View>
      <Pressable
        onPress={() => router.push('/plan')}
        style={styles.planLink}
        accessibilityRole="link"
      >
        <Text style={styles.planText}>Plan</Text>
        <Ionicons name="chevron-forward" size={13} color={COLORS.mediumGrey} />
      </Pressable>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.md,
    padding: SPACING.md,
    borderRadius: RADIUS.md,
    borderWidth: 1,
    borderColor: COLORS.stroke,
    backgroundColor: 'rgba(255,255,255,0.035)',
  },
  art: {
    width: 84,
    height: 56,
    borderRadius: RADIUS.sm,
    overflow: 'hidden',
    backgroundColor: COLORS.navy,
  },
  body: { flex: 1, gap: 2 },
  eyebrowRow: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  eyebrow: {
    ...TYPE.tag,
    color: COLORS.accent,
  },
  title: {
    ...TYPE.h3,
    color: COLORS.white,
  },
  reason: {
    ...TYPE.caption,
    color: COLORS.mediumGrey,
  },
  planLink: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    paddingLeft: SPACING.sm,
  },
  planText: {
    ...TYPE.labelTiny,
    color: COLORS.mediumGrey,
  },
});
