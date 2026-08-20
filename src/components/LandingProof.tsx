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
}: {
  kind: 'length' | 'tonight' | 'drop';
  game?: Game;
}) {
  if (kind === 'length') {
    if (!game) return null;
    // The real tile, at the size a shelf draws it.
    return (
      <View style={styles.frame}>
        <GameTile game={game} width={210} />
      </View>
    );
  }

  if (kind === 'tonight') {
    if (!game) return null;
    return (
      <View style={[styles.frame, styles.card]}>
        <CoverImage
          uri={game.background_image}
          style={styles.art}
          size="thumb"
        />
        <View style={styles.body}>
          <View style={styles.eyebrowRow}>
            <Ionicons name="moon" size={12} color={COLORS.accent} />
            <Text style={styles.eyebrow}>TONIGHT · 90 MINUTES</Text>
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

  return (
    <View style={[styles.frame, styles.reasons]}>
      {DROP_REASONS.map((reason) => (
        <Chip key={reason.key} title={reason.label} quiet />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  frame: { marginTop: SPACING.lg, alignSelf: 'flex-start' },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.md,
    padding: SPACING.md,
    borderRadius: RADIUS.md,
    borderWidth: 1,
    borderColor: COLORS.stroke,
    backgroundColor: COLORS.raised,
    maxWidth: 380,
  },
  art: {
    width: 74,
    height: 50,
    borderRadius: RADIUS.sm,
    overflow: 'hidden',
    backgroundColor: COLORS.navy,
  },
  body: { flex: 1, gap: 2 },
  eyebrowRow: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  eyebrow: { ...TYPE.tag, color: COLORS.accent },
  title: { ...TYPE.h3, color: COLORS.white },
  reason: { ...TYPE.caption },
  reasons: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: SPACING.sm,
    maxWidth: 400,
  },
});
