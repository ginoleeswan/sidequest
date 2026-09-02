import Ionicons from '@expo/vector-icons/Ionicons';
import {
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { Chip } from './Chip';
import { GameTile } from './GameTile';
import { Rail } from './Rail';
import { SectionHeader } from './SectionHeader';
import type { Game } from '@/api/types';
import { DISCOVER, GENRES, type Section } from '@/constants/categories';
import { COLORS } from '@/styles/colors';
import { GUTTER, LAYOUT, SPACING } from '@/styles/theme';
import { TYPE } from '@/styles/typography';

/** The doors on offer before you type: the shop's own sections, then genres. */
const DOORS: Section[] = [
  ...DISCOVER.filter((s) => s.key !== 'trending'),
  ...GENRES,
];

interface Props {
  /** Recent searches, latest first. */
  recent: string[];
  onPick: (term: string) => void;
  onForget: (term: string) => void;
  onClear: () => void;
  onOpenSection: (section: Section) => void;
  /** What is trending, already loaded by the storefront — no request of its own. */
  popular: Game[];
  /** Clearance for the floating header. */
  paddingTop: number;
  paddingBottom?: number;
}

/**
 * Search, before you have typed anything.
 *
 * Opening the box used to leave the storefront where it was, dimmed
 * behind a keyboard: the page you had just left, with nothing on it to
 * do. The box now opens on its own screen, the way every search people
 * reach for without thinking does — the last things you looked for,
 * the doors into the shop, and what everyone is looking at right now.
 * The last of those costs nothing: it is the trending row the home
 * page already fetched.
 */
export function SearchLanding({
  recent,
  onPick,
  onForget,
  onClear,
  onOpenSection,
  popular,
  paddingTop,
  paddingBottom = 0,
}: Props) {
  return (
    <ScrollView
      style={styles.scroll}
      contentContainerStyle={[styles.content, { paddingTop, paddingBottom }]}
      keyboardShouldPersistTaps="handled"
      keyboardDismissMode="on-drag"
      showsVerticalScrollIndicator={false}
    >
      {recent.length > 0 ? (
        <View style={styles.block}>
          <SectionHeader
            eyebrow="Recent"
            title="You looked for"
            actionLabel="Clear"
            actionAccessibilityLabel="Clear recent searches"
            onAction={onClear}
          />
          <View>
            {recent.map((term) => (
              <View key={term} style={styles.recentRow}>
                <Pressable
                  onPress={() => onPick(term)}
                  style={styles.recentPress}
                  accessibilityRole="button"
                  accessibilityLabel={`Search again for ${term}`}
                >
                  <Ionicons
                    name="time-outline"
                    size={18}
                    color={COLORS.mediumGrey}
                  />
                  <Text style={styles.recentTerm} numberOfLines={1}>
                    {term}
                  </Text>
                </Pressable>
                <Pressable
                  onPress={() => onForget(term)}
                  hitSlop={10}
                  style={styles.forget}
                  accessibilityRole="button"
                  accessibilityLabel={`Forget ${term}`}
                >
                  <Ionicons name="close" size={16} color={COLORS.mediumGrey} />
                </Pressable>
              </View>
            ))}
          </View>
        </View>
      ) : null}

      <View style={styles.block}>
        <SectionHeader eyebrow="Browse" title="Start somewhere" />
        <View style={styles.doors}>
          {DOORS.map((section) => (
            <Chip
              key={section.key}
              title={section.title}
              iconName={section.iconName}
              iconType={section.iconType}
              bare
              onPress={() => onOpenSection(section)}
            />
          ))}
        </View>
      </View>

      {popular.length > 0 ? (
        <View style={styles.block}>
          <SectionHeader eyebrow="Right now" title="Everyone's looking at" />
          <Rail
            data={popular}
            keyExtractor={(game) => String(game.id)}
            inset={GUTTER}
            renderItem={(game) => (
              <GameTile game={game} width={LAYOUT.shelfTileWidth * 0.8} />
            )}
          />
        </View>
      ) : null}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  // Web: the document scrolls, so this must not claim a viewport of its
  // own. Native: without flex it sizes to its content and never scrolls.
  scroll: Platform.OS === 'web' ? {} : { flex: 1 },
  content: {
    paddingHorizontal: GUTTER,
    gap: SPACING.xl,
  },
  block: { gap: SPACING.md },
  recentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
  },
  recentPress: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.md,
    paddingVertical: SPACING.sm + 2,
  },
  recentTerm: {
    ...TYPE.body,
    color: COLORS.lightGrey,
    flex: 1,
  },
  forget: { padding: SPACING.xs },
  doors: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: SPACING.sm,
  },
});
