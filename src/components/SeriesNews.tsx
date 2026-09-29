import Ionicons from '@expo/vector-icons/Ionicons';
import { useQueries, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import { useMemo } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { CoverImage } from './CoverImage';
import { Touchable } from './Touchable';
import { prefetchGame } from '@/api/gameDetail';
import { getSeries } from '@/api/rawg';
import type { Game, Paged } from '@/api/types';
import { useHydrated } from '@/hooks/useHydrated';
import { useLibrary } from '@/lib/library';
import { seriesCandidates, seriesNews } from '@/lib/series';
import { COLORS } from '@/styles/colors';
import { ICON, RADIUS, SPACING } from '@/styles/theme';
import { FONT_SCALE, TYPE } from '@/styles/typography';

/** Two is a row; more is a feed, and this is not a feed. */
const MAX = 2;

/**
 * "You finished Hades. Hades II is out."
 *
 * The only news the app can honestly deliver, because it is the only
 * news it can derive: what you finished, crossed with what is coming
 * out. Nothing here is curated by anyone.
 *
 * No padding of its own: the feed's column already pays the gutter, and
 * a second one set these cards forty points in while every shelf around
 * them stood at twenty.
 */
export function SeriesNews() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const hydrated = useHydrated();
  const { entries } = useLibrary();

  const library = useMemo(() => Object.values(entries), [entries]);
  const candidates = useMemo(
    () => (hydrated ? seriesCandidates(library) : []),
    [hydrated, library]
  );

  const series = useQueries({
    queries: candidates.map((candidate) => ({
      queryKey: ['series', candidate.game.id],
      queryFn: () => getSeries(candidate.game.id),
      select: (page: Paged<Game>) => page.results,
      staleTime: 12 * 60 * 60 * 1000,
    })),
  });

  const news = useMemo(() => {
    if (!hydrated) return [];
    return candidates
      .flatMap((candidate, index) =>
        seriesNews(candidate, series[index]?.data ?? [], library)
      )
      .slice(0, MAX);
  }, [hydrated, candidates, series, library]);

  if (news.length === 0) return null;

  return (
    <View style={styles.block}>
      {news.map((item) => (
        <Touchable
          key={item.game.id}
          onPress={() => router.push(`/game/${item.game.id}`)}
          onPressIn={() => prefetchGame(queryClient, item.game)}
          feedback="scale"
          style={styles.card}
          accessibilityRole="link"
          accessibilityLabel={item.message}
        >
          <CoverImage
            uri={item.game.background_image}
            style={styles.art}
            size="thumb"
            iconSize={ICON.md}
          />
          <View style={styles.body}>
            {/* Mint, the credits' colour: this news exists because you
                finished something. A release still to come is a date,
                not a length, so it no longer borrows the time amber. */}
            <View style={styles.eyebrowRow}>
              <Ionicons
                name={item.kind === 'out' ? 'sparkles' : 'calendar-outline'}
                size={ICON.sm}
                color={item.kind === 'out' ? COLORS.mint : COLORS.mediumGrey}
              />
              <Text
                style={[
                  styles.eyebrow,
                  item.kind === 'out' && styles.eyebrowFinished,
                ]}
                maxFontSizeMultiplier={FONT_SCALE.label}
              >
                {item.kind === 'out' ? 'BECAUSE YOU FINISHED IT' : 'COMING'}
              </Text>
            </View>
            <Text
              style={styles.message}
              numberOfLines={2}
              maxFontSizeMultiplier={FONT_SCALE.label}
            >
              {item.message}
            </Text>
          </View>
          <Ionicons
            name="chevron-forward"
            size={ICON.sm}
            color={COLORS.mediumGrey}
          />
        </Touchable>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  // A row's own air beneath it, as every shelf keeps.
  block: { gap: SPACING.sm, marginBottom: SPACING.xl },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.md,
    padding: SPACING.sm2,
    borderRadius: RADIUS.card,
    borderWidth: 1,
    borderColor: COLORS.stroke,
    backgroundColor: COLORS.raised,
  },
  art: { width: 72, height: 44, borderRadius: RADIUS.sm },
  body: { flex: 1, gap: SPACING.xxs },
  eyebrowRow: { flexDirection: 'row', alignItems: 'center', gap: SPACING.xs },
  eyebrow: {
    ...TYPE.tag,
    color: COLORS.mediumGrey,
  },
  eyebrowFinished: { color: COLORS.mint },
  message: {
    ...TYPE.labelSmall,
    color: COLORS.lightGrey,
  },
});
