import Ionicons from '@expo/vector-icons/Ionicons';
import { StyleSheet, Text, View } from 'react-native';

import { Chip } from './Chip';
import { CoverImage } from './CoverImage';
import { GameTile } from './GameTile';
import type { Game } from '@/api/types';
import { DROP_REASONS } from '@/lib/drops';
import { COLORS } from '@/styles/colors';
import { RADIUS, SPACING } from '@/styles/theme';
import { TYPE } from '@/styles/typography';

/**
 * The claim, and the thing itself underneath it.
 *
 * Three sentences about what an app does are three sentences; the same
 * three with the actual interface beside them are a demonstration. Every
 * fragment here is the app's own component fed real data, not a drawing
 * of one — so it cannot drift out of date, and nobody has to take the
 * sentence on trust.
 *
 * This is also why there are no icons. A row of glyphs above a row of
 * headings is what a page reaches for when it has nothing to show.
 */
export function LandingProof({
  kind,
  game,
  width,
  hue = COLORS.accent,
}: {
  kind: 'length' | 'tonight' | 'drop';
  game?: Game;
  /** The beat's own colour; the evidence speaks in it too. */
  hue?: string;
  /**
   * How much room there is, in pixels.
   *
   * These were drawn at the size a shelf draws them, which made sense
   * as "the real component, not a picture of it" and made no sense at
   * all optically: a 210px tile alone in a 500px column beside a claim
   * set at forty points is a stamp in a field, and the field is what
   * anybody notices. Evidence is told its measure and fills it.
   */
  width: number;
}) {
  const wide = width > 340;
  if (kind === 'length') {
    if (!game) return null;
    return (
      <View style={styles.frame}>
        <GameTile game={game} width={Math.min(width, 460)} />
      </View>
    );
  }

  if (kind === 'tonight') {
    if (!game) return null;
    return (
      <View
        style={[styles.frame, styles.card, wide && styles.cardWide, { width }]}
      >
        <CoverImage
          uri={game.background_image}
          style={[styles.art, wide && styles.artWide]}
          size="thumb"
        />
        <View style={styles.body}>
          <View style={styles.eyebrowRow}>
            <Ionicons name="moon" size={12} color={hue} />
            <Text style={[styles.eyebrow, { color: hue }]}>
              TONIGHT · 90 MINUTES
            </Text>
          </View>
          <Text style={styles.title} numberOfLines={1}>
            Finish {game.name}
          </Text>
          <Text style={styles.reason}>
            You could see the credits before bed.
          </Text>
        </View>
      </View>
    );
  }

  /**
   * The drop bar as the app draws it, prompt included.
   *
   * Four bare chips floating in half a row read as leftover UI: there
   * was nothing to say what they were for, and nothing holding them
   * together, so they had no more presence than a caption. The real
   * thing is a bar with a question on it, and the question is the part
   * that makes the point.
   */
  return (
    <View style={[styles.frame, styles.bar, wide && styles.barWide, { width }]}>
      <Text style={[styles.prompt, { color: hue }]}>
        Why this one? Optional.
      </Text>
      <View style={styles.reasons}>
        {DROP_REASONS.map((reason) => (
          <Chip key={reason.key} title={reason.label} quiet />
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  frame: { alignSelf: 'flex-start' },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.md,
    padding: SPACING.md,
    borderRadius: RADIUS.md,
    borderWidth: 1,
    borderColor: COLORS.stroke,
    backgroundColor: COLORS.raised,
    maxWidth: 520,
  },
  cardWide: { padding: SPACING.lg, gap: SPACING.lg },
  artWide: { width: 104, height: 70 },
  art: {
    width: 74,
    height: 50,
    borderRadius: RADIUS.sm,
    overflow: 'hidden',
    backgroundColor: COLORS.navy,
  },
  body: { flex: 1, gap: 2 },
  eyebrowRow: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  eyebrow: { ...TYPE.tag },
  title: { ...TYPE.h3, color: COLORS.white },
  reason: { ...TYPE.caption },
  bar: {
    gap: SPACING.md,
    padding: SPACING.md,
    borderRadius: RADIUS.md,
    borderWidth: 1,
    borderColor: COLORS.stroke,
    backgroundColor: COLORS.raised,
    maxWidth: 520,
  },
  barWide: { padding: SPACING.lg },
  prompt: { ...TYPE.tag },
  reasons: { flexDirection: 'row', flexWrap: 'wrap', gap: SPACING.sm },
});
