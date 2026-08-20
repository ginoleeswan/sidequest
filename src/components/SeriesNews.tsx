import Ionicons from '@expo/vector-icons/Ionicons';
import { useQueries } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import { useMemo } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { CoverImage } from './CoverImage';
import { getSeries } from '@/api/rawg';
import type { Game, Paged } from '@/api/types';
import { useHydrated } from '@/hooks/useHydrated';
import { useLibrary } from '@/lib/library';
import { seriesCandidates, seriesNews } from '@/lib/series';
import { COLORS } from '@/styles/colors';
import { RADIUS, SPACING } from '@/styles/theme';
import { TYPE } from '@/styles/typography';

/** Two is a row; more is a feed, and this is not a feed. */
const MAX = 2;

/**
 * "You finished Hades. Hades II is out."
 *
 * The only news the app can honestly deliver, because it is the only
 * news it can derive: what you finished, crossed with what is coming
 * out. Nothing here is curated by anyone.
 */
export function SeriesNews({ inset = SPACING.md }: { inset?: number }) {
  const router = useRouter();
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
    <View style={[styles.block, { paddingHorizontal: inset }]}>
      {news.map((item) => (
        <Pressable
          key={item.game.id}
          onPress={() => router.push(`/game/${item.game.id}`)}
          style={styles.card}
          accessibilityRole="link"
          accessibilityLabel={item.message}
        >
          <CoverImage
            uri={item.game.background_image}
            style={styles.art}
            size="thumb"
            iconSize={18}
          />
          <View style={styles.body}>
            <View style={styles.eyebrowRow}>
              <Ionicons
                name={item.kind === 'out' ? 'sparkles' : 'time'}
                size={12}
                color={COLORS.accent}
              />
              <Text style={styles.eyebrow}>
                {item.kind === 'out' ? 'BECAUSE YOU FINISHED IT' : 'COMING'}
              </Text>
            </View>
            <Text style={styles.message} numberOfLines={2}>
              {item.message}
            </Text>
          </View>
          <Ionicons
            name="chevron-forward"
            size={14}
            color={COLORS.mediumGrey}
          />
        </Pressable>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  block: { gap: SPACING.sm },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.md,
    padding: SPACING.sm + 2,
    borderRadius: RADIUS.md,
    borderWidth: 1,
    borderColor: COLORS.stroke,
    backgroundColor: 'rgba(255,255,255,0.03)',
  },
  art: { width: 72, height: 44, borderRadius: RADIUS.sm },
  body: { flex: 1, gap: 2 },
  eyebrowRow: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  eyebrow: {
    ...TYPE.tag,
    color: COLORS.accent,
  },
  message: {
    ...TYPE.labelSmall,
    color: COLORS.lightGrey,
  },
});
