import Ionicons from '@expo/vector-icons/Ionicons';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import { useEffect } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { CoverImage } from './CoverImage';
import { PlatformIcons } from './PlatformIcons';
import { ScaleButton } from './ScaleButton';
import { ScorePill } from './ScorePill';
import { artQuery } from '@/api/art';
import { prefetchGame } from '@/api/gameDetail';
import { igdbCoverUri } from '@/api/igdb';
import type { Game } from '@/api/types';
import { useBreakpoint } from '@/hooks/useBreakpoint';
import { formatHours } from '@/lib/duration';
import { useDurations } from '@/lib/durations';
import { useLibrary, type LibraryStatus } from '@/lib/library';
import { COLORS } from '@/styles/colors';
import { LAYOUT, RADIUS, SPACING } from '@/styles/theme';
import { TYPE } from '@/styles/typography';

/** The shelf's word for each state, in the colour the app gives it. */
const STATUS: Record<
  LibraryStatus,
  { label: string; icon: keyof typeof Ionicons.glyphMap; color: string }
> = {
  wishlist: { label: 'Saved', icon: 'bookmark', color: COLORS.accent },
  playing: { label: 'Playing', icon: 'play', color: COLORS.violet },
  finished: {
    label: 'Finished',
    icon: 'checkmark-circle',
    color: COLORS.mint,
  },
};

interface Props {
  game: Game;
  /** Called as the game opens — the screen uses it to remember the search. */
  onOpen?: () => void;
}

/**
 * One search result: the box art, the name, the facts, and whether
 * you already have it.
 *
 * It was a card — a bordered, shadowed, 30-point-radius plate holding a
 * square crop of a screenshot, with the platform glyph centred under
 * the text like a footnote. Six of them stacked read as six pill
 * buttons, and the square crop turned every cover into a random corner
 * of a scene. A result is a row, not a button: the poster the shelves
 * use, at the height of two lines of type, and the facts set against
 * it. No plate of its own; the rhythm of the rows is the list.
 */
export function SearchResult({ game, onOpen }: Props) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { statusOf } = useLibrary();
  const { durationOf, coverOf, learnDurations } = useDurations();
  const { isCompact } = useBreakpoint();

  // Same batch the tiles join: one IGDB round trip for the whole page.
  useEffect(() => {
    if (game.slug) learnDurations([game]);
  }, [game, learnDurations]);

  // IGDB first; SteamGridDB only after IGDB has said no; the screenshot
  // as the last resort, cropped to the poster's frame like the tiles do.
  const cover = coverOf(game.slug);
  const { data: art } = useQuery({
    ...artQuery(game),
    enabled: cover === null && Boolean(game.slug),
  });
  const grid = cover === null ? art?.grid : null;
  const poster = cover
    ? igdbCoverUri(cover)
    : grid
      ? isCompact
        ? grid.thumb
        : grid.url
      : game.background_image;

  const year = game.released?.slice(0, 4);
  const genre = game.genres?.[0]?.name;
  const facts = [
    year,
    genre,
    game.rating > 0 ? `★ ${game.rating.toFixed(1)}` : null,
  ]
    .filter(Boolean)
    .join(' · ');

  const { hours } = durationOf(game);
  const length = hours > 0 ? formatHours(hours) : null;
  const status = statusOf(game.id);
  const owned = status ? STATUS[status] : null;
  const platforms = game.parent_platforms?.slice(0, 5) ?? [];

  const open = () => {
    onOpen?.();
    router.push(`/game/${game.id}`);
  };

  return (
    <ScaleButton
      onPress={open}
      onPressIn={() => prefetchGame(queryClient, game)}
      style={styles.row}
      activeScale={0.98}
      accessibilityLabel={[game.name, facts, owned?.label]
        .filter(Boolean)
        .join(', ')}
    >
      <CoverImage
        uri={poster}
        fallbackUri={game.background_image}
        style={styles.poster}
        size="thumb"
        iconSize={20}
      />
      <View style={styles.copy}>
        <Text style={styles.name} numberOfLines={2}>
          {game.name}
        </Text>
        {facts ? <Text style={styles.facts}>{facts}</Text> : null}
        {owned || platforms.length > 0 ? (
          <View style={styles.tail}>
            {owned ? (
              <View style={styles.status}>
                <Ionicons name={owned.icon} size={11} color={owned.color} />
                <Text style={[styles.statusText, { color: owned.color }]}>
                  {owned.label}
                </Text>
              </View>
            ) : null}
            {platforms.length > 0 ? (
              <PlatformIcons
                platforms={platforms}
                size={11}
                color={COLORS.mediumGrey}
              />
            ) : null}
          </View>
        ) : null}
      </View>
      {length || game.metacritic != null ? (
        <View style={styles.aside}>
          {length ? <Text style={styles.length}>{length}</Text> : null}
          {game.metacritic != null ? (
            <ScorePill score={game.metacritic} size="sm" />
          ) : null}
        </View>
      ) : null}
    </ScaleButton>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.md,
    paddingVertical: SPACING.sm + 2,
  },
  poster: {
    ...LAYOUT.resultPoster,
    borderRadius: RADIUS.sm,
    overflow: 'hidden',
    backgroundColor: COLORS.navy,
  },
  copy: { flex: 1, gap: 3 },
  name: {
    ...TYPE.h3,
    color: COLORS.lightGrey,
  },
  facts: {
    ...TYPE.caption,
    color: COLORS.mediumGrey,
  },
  // The glyphs sit at the start of their line, with the rest of the
  // copy - not centred under it, which put a lone Switch mark in the
  // middle of the row like a footnote marker.
  tail: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
    alignSelf: 'flex-start',
  },
  status: { flexDirection: 'row', alignItems: 'center', gap: 3 },
  statusText: { ...TYPE.labelTiny },
  aside: { alignItems: 'flex-end', gap: SPACING.xs },
  // Time, in the one colour this app keeps for it; the same word the
  // tiles lead with.
  length: {
    ...TYPE.labelSmall,
    color: COLORS.accent,
  },
});
