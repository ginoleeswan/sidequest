import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { DynamicIcon } from './DynamicIcon';
import { CATEGORIES, type Category } from '@/constants/categories';
import { COLORS } from '@/styles/colors';
import { LAYOUT, RADIUS, SPACING } from '@/styles/theme';

interface Props {
  activeKey: string | null;
  onSelect: (category: Category) => void;
}

/** Persistent left navigation for expanded (desktop) layouts. */
export function Sidebar({ activeKey, onSelect }: Props) {
  return (
    <View style={styles.sidebar}>
      <Text style={styles.wordmark}>SIDEQUEST</Text>
      <Text style={styles.tagline}>Discover your next game</Text>

      <ScrollView
        style={styles.nav}
        contentContainerStyle={styles.navContent}
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.navHeading}>Browse</Text>
        {CATEGORIES.map((category) => {
          const active = category.key === activeKey;
          return (
            <Pressable
              key={category.key}
              onPress={() => onSelect(category)}
              style={[styles.navItem, active && styles.navItemActive]}
            >
              <DynamicIcon
                type={category.iconType}
                name={category.iconName}
                size={18}
                color={active ? COLORS.white : COLORS.mediumGrey}
              />
              <Text style={[styles.navLabel, active && styles.navLabelActive]}>
                {category.title}
              </Text>
            </Pressable>
          );
        })}
      </ScrollView>

      <Text style={styles.footer}>Game data by RAWG</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  sidebar: {
    width: LAYOUT.sidebarWidth,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.lg,
    borderRightWidth: StyleSheet.hairlineWidth,
    borderRightColor: 'rgba(255,255,255,0.08)',
  },
  wordmark: {
    fontFamily: 'Noah-Black',
    fontSize: 24,
    color: COLORS.lightGrey,
    letterSpacing: 0.5,
  },
  tagline: {
    fontFamily: 'Noah-Regular',
    fontSize: 11,
    color: COLORS.mediumGrey,
    marginTop: SPACING.xs,
    marginBottom: SPACING.xl,
  },
  nav: { flex: 1 },
  navContent: { gap: 2, paddingBottom: SPACING.lg },
  navHeading: {
    fontFamily: 'Noah-Bold',
    fontSize: 10,
    letterSpacing: 1.2,
    textTransform: 'uppercase',
    color: COLORS.mediumGrey,
    marginBottom: SPACING.sm,
    paddingHorizontal: SPACING.sm + 2,
  },
  navItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm + 2,
    paddingVertical: SPACING.sm + 2,
    paddingHorizontal: SPACING.sm + 2,
    borderRadius: RADIUS.sm,
  },
  navItemActive: { backgroundColor: COLORS.blue },
  navLabel: {
    fontFamily: 'Noah-Bold',
    fontSize: 14,
    color: COLORS.mediumGrey,
  },
  navLabelActive: { color: COLORS.white },
  footer: {
    fontFamily: 'Noah-Regular',
    fontSize: 10,
    color: COLORS.mediumGrey,
    opacity: 0.7,
  },
});
