import { useState } from 'react';
import { FlatList, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import type { Game } from '@/api/types';
import { BackButton } from '@/components/BackButton';
import { Chip } from '@/components/Chip';
import { FadeInView } from '@/components/FadeInView';
import { FooterLinks } from '@/components/FooterLinks';
import { GameTile } from '@/components/GameTile';
import { Message } from '@/components/Message';
import { SectionHeader } from '@/components/SectionHeader';
import { Textured } from '@/components/Textured';
import { useBreakpoint } from '@/hooks/useBreakpoint';
import { STATUS_META, useLibrary, type LibraryStatus } from '@/lib/library';
import { COLORS } from '@/styles/colors';
import { LAYOUT, SPACING } from '@/styles/theme';

const TABS: LibraryStatus[] = ['wishlist', 'playing', 'finished'];

const EMPTY_COPY: Record<LibraryStatus, { title: string; detail: string }> = {
  wishlist: {
    title: 'Nothing saved yet',
    detail:
      'Tap the bookmark on any game — or “Want to play” on its page — and it lands here.',
  },
  playing: {
    title: 'Nothing in progress',
    detail: 'Mark a game as Playing and it will wait for you here.',
  },
  finished: {
    title: 'No credits rolled yet',
    detail: 'Finish something and give it a home on this shelf.',
  },
};

/** Sentinel filling an incomplete final grid row so tiles keep their width. */
const SPACER = { spacer: true } as const;
type GridItem = Game | typeof SPACER;
const isSpacer = (item: GridItem): item is typeof SPACER => 'spacer' in item;

function padToRows(items: Game[], columns: number): GridItem[] {
  const remainder = items.length % columns;
  if (remainder === 0) return items;
  return [...items, ...Array(columns - remainder).fill(SPACER)];
}

export default function LibraryScreen() {
  const { byStatus, count } = useLibrary();
  const { columns } = useBreakpoint();
  const insets = useSafeAreaInsets();
  const [tab, setTab] = useState<LibraryStatus>('wishlist');

  const games = byStatus(tab).map((entry) => entry.game);

  return (
    <Textured style={styles.background}>
      <View style={[styles.backButton, { top: insets.top + SPACING.sm }]}>
        <BackButton />
      </View>

      <FadeInView style={styles.container}>
        <View
          style={[styles.inner, { paddingTop: insets.top + SPACING.xl * 2 }]}
        >
          <SectionHeader
            title="My Library"
            eyebrow={
              count > 0
                ? `${count} ${count === 1 ? 'game' : 'games'}`
                : undefined
            }
          />
          <View style={styles.tabs}>
            {TABS.map((status) => (
              <Chip
                key={status}
                title={STATUS_META[status].label}
                selected={tab === status}
                onPress={() => setTab(status)}
              />
            ))}
          </View>

          {games.length === 0 ? (
            <Message
              icon="library-outline"
              title={EMPTY_COPY[tab].title}
              detail={EMPTY_COPY[tab].detail}
            />
          ) : (
            <FlatList
              key={`lib-${columns}`}
              data={padToRows(games, columns)}
              numColumns={columns}
              columnWrapperStyle={styles.gridRow}
              keyExtractor={(item, index) =>
                isSpacer(item) ? `spacer-${index}` : String(item.id)
              }
              renderItem={({ item }) =>
                isSpacer(item) ? (
                  <View style={styles.gridSpacer} />
                ) : (
                  <GameTile game={item} />
                )
              }
              showsVerticalScrollIndicator={false}
              ListFooterComponent={<FooterLinks />}
              contentContainerStyle={[
                styles.gridContent,
                { paddingBottom: insets.bottom + 84 },
              ]}
            />
          )}
        </View>
      </FadeInView>
    </Textured>
  );
}

const styles = StyleSheet.create({
  background: { flex: 1, backgroundColor: COLORS.darkGrey },
  backButton: { position: 'absolute', left: SPACING.lg, zIndex: 30 },
  container: { flex: 1 },
  inner: {
    flex: 1,
    width: '100%',
    maxWidth: LAYOUT.maxExpandedWidth,
    alignSelf: 'center',
    paddingHorizontal: SPACING.xl,
    gap: SPACING.md,
  },
  tabs: { flexDirection: 'row', flexWrap: 'wrap', gap: SPACING.sm },
  gridRow: { gap: LAYOUT.gridGap },
  gridContent: { gap: LAYOUT.gridGap },
  gridSpacer: { flex: 1 },
});
