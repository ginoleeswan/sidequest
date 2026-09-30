import { useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import Ionicons from '@expo/vector-icons/Ionicons';
import { LinearGradient } from 'expo-linear-gradient';

import { CoverImage } from './CoverImage';
import { Rail } from './Rail';
import { ScaleButton } from './ScaleButton';
import { SectionHeader } from './SectionHeader';
import { useToast } from './Toast';
import { warmGame } from '@/api/gameDetail';
import { useHydrated } from '@/hooks/useHydrated';
import {
  clearRecent,
  readRecent,
  rememberGame,
  type RecentGame,
} from '@/lib/recent';
import { alpha, COLORS } from '@/styles/colors';
import { ICON, RADIUS, SHADOW, SPACING } from '@/styles/theme';
import { FONT_SCALE, OVER_IMAGE, TYPE } from '@/styles/typography';

/**
 * Where you left off.
 *
 * Browsing is a lot of opening things and going back, and until now the
 * app forgot every one of them. Read once per mount — this is a list of
 * twelve on the device, not something worth a subscription.
 */
export function RecentShelf({ inset = SPACING.md }: { inset?: number }) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const hydrated = useHydrated();
  const toast = useToast();
  const [games, setGames] = useState(() => (hydrated ? readRecent() : []));
  // The pre-rendered HTML had no history, so the hydration render must
  // not either; the real list arrives on the next commit.
  const [adopted, setAdopted] = useState(hydrated);
  if (hydrated && !adopted) {
    setAdopted(true);
    setGames(readRecent());
  }

  if (games.length < 2) return null;

  /**
   * Clear, with a way back.
   *
   * Twelve games of history went in one tap on a small grey word, with
   * nothing to say it had happened and no way to have it back. The toast
   * now offers Undo, which writes the list back oldest first so the
   * newest ends up at the front, exactly as it was.
   */
  const clear = () => {
    const previous: RecentGame[] = games;
    clearRecent();
    setGames([]);
    toast('Cleared where you left off', 'trash-outline', {
      label: 'Undo',
      onPress: () => {
        for (const game of [...previous].reverse())
          rememberGame({ ...game, slug: game.slug ?? '' }, game.seenAt);
        setGames(readRecent());
      },
    });
  };

  return (
    <View style={styles.block}>
      {/* Bare, exactly as a Shelf sets its own header. The rail below
          bleeds out by its inset and pays it back as content padding,
          so its tiles land on the page's edge - a header that padded
          itself as well sat one whole gutter inside them, which is
          what put this title and Clear out of line with everything. */}
      <SectionHeader
        eyebrow="Pick up the thread"
        title="Where you left off"
        actionLabel="Clear"
        actionAccessibilityLabel="Clear where you left off"
        onAction={clear}
      />
      {/* A rail, not a wrapping grid. Wrapped, a two-line title made
          its own row taller than the others, so the gaps between rows
          stopped matching and the block read as badly spaced - and the
          eighth game landed on a second row of one. Continue-watching
          is a rail in every app that has one, for exactly this. */}
      <Rail
        data={games.slice(0, 12)}
        keyExtractor={(game) => String(game.id)}
        inset={inset}
        renderItem={(game) => (
          /* A card, in the billboard's grammar: the picture is the
             object, the name is set on it over a scrim, and a small
             resume glyph says what tapping does. The thumbnail-with-a-
             grey-caption it replaces was a list row lying on its side;
             every continue-watching row in the reference apps is a
             frame you could press play on. */
          <ScaleButton
            onPress={() => router.push(`/game/${game.id}`)}
            onPressIn={() => warmGame(queryClient, game.id)}
            style={styles.card}
            activeScale={0.97}
            hoverScale={1.03}
            accessibilityLabel={`Back to ${game.name}`}
          >
            <CoverImage
              uri={game.background_image}
              style={StyleSheet.absoluteFill}
              size="tile"
              iconSize={22}
            />
            <LinearGradient
              colors={[
                alpha(COLORS.ink, 0),
                alpha(COLORS.ink, 0.4),
                alpha(COLORS.ink, 0.72),
              ]}
              locations={[0.4, 0.75, 1]}
              style={StyleSheet.absoluteFill}
              pointerEvents="none"
            />
            <View style={styles.resume} pointerEvents="none">
              <Ionicons name="play" size={ICON.sm} color={COLORS.white} />
            </View>
            <Text
              style={[styles.name, OVER_IMAGE.heading]}
              numberOfLines={2}
              maxFontSizeMultiplier={FONT_SCALE.label}
            >
              {game.name}
            </Text>
          </ScaleButton>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  /**
   * The same rhythm every other row on the page keeps: a shelf owns the
   * air beneath it. Without the margin this row ended flush against the
   * next section's eyebrow, which is what made the block read as badly
   * spaced however tidy the row itself was.
   */
  block: { gap: SPACING.sm2, marginBottom: SPACING.xl },
  // A minimum, so a larger text size grows the card rather than pushing
  // the name up into the resume glyph.
  card: {
    width: 216,
    minHeight: 122,
    borderRadius: RADIUS.card,
    overflow: 'hidden',
    backgroundColor: COLORS.navy,
    borderWidth: 1,
    borderColor: COLORS.stroke,
    justifyContent: 'flex-end',
    padding: SPACING.sm2,
    ...SHADOW.card,
  },
  resume: {
    position: 'absolute',
    top: SPACING.sm,
    left: SPACING.sm,
    width: 24,
    height: 24,
    borderRadius: RADIUS.pill,
    // The plate, at the strength every other on-art control keeps.
    backgroundColor: alpha(COLORS.ink, 0.42),
    alignItems: 'center',
    justifyContent: 'center',
    paddingLeft: SPACING.xxs,
  },
  name: {
    ...TYPE.labelSmall,
    color: COLORS.white,
  },
});
