import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { CoverImage } from './CoverImage';
import { Rail } from './Rail';
import { SectionHeader } from './SectionHeader';
import { useHydrated } from '@/hooks/useHydrated';
import { clearRecent, readRecent } from '@/lib/recent';
import { COLORS } from '@/styles/colors';
import { RADIUS, SPACING } from '@/styles/theme';
import { TYPE } from '@/styles/typography';

/**
 * Where you left off.
 *
 * Browsing is a lot of opening things and going back, and until now the
 * app forgot every one of them. Read once per mount — this is a list of
 * twelve on the device, not something worth a subscription.
 */
export function RecentShelf({ inset = SPACING.md }: { inset?: number }) {
  const router = useRouter();
  const hydrated = useHydrated();
  const [games, setGames] = useState(() => (hydrated ? readRecent() : []));
  // The pre-rendered HTML had no history, so the hydration render must
  // not either; the real list arrives on the next commit.
  const [adopted, setAdopted] = useState(hydrated);
  if (hydrated && !adopted) {
    setAdopted(true);
    setGames(readRecent());
  }

  if (games.length < 2) return null;

  return (
    <View style={styles.block}>
      <View style={{ paddingHorizontal: inset }}>
        <SectionHeader
          title="Where you left off"
          actionLabel="Clear"
          onAction={() => {
            clearRecent();
            setGames([]);
          }}
        />
      </View>
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
          <Pressable
            onPress={() => router.push(`/game/${game.id}`)}
            accessibilityRole="link"
            accessibilityLabel={game.name}
            style={styles.item}
          >
            <CoverImage
              uri={game.background_image}
              style={styles.art}
              size="thumb"
              iconSize={18}
            />
            <Text style={styles.name} numberOfLines={1}>
              {game.name}
            </Text>
          </Pressable>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  block: { gap: SPACING.sm },
  item: { width: 132, gap: 6 },
  art: {
    width: 132,
    height: 76,
    borderRadius: RADIUS.sm,
    backgroundColor: COLORS.navy,
  },
  name: {
    ...TYPE.fine,
    color: COLORS.mediumGrey,
  },
});
