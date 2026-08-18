import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { DynamicIcon, type IconType } from './DynamicIcon';
import { CATEGORIES, type Category } from '@/constants/categories';
import { COLORS } from '@/styles/colors';
import { LAYOUT, RADIUS, SPACING } from '@/styles/theme';

interface NavItemProps {
  label: string;
  iconName: string;
  iconType: IconType;
  active: boolean;
  onPress: () => void;
}

function NavItem({ label, iconName, iconType, active, onPress }: NavItemProps) {
  const [hovered, setHovered] = useState(false);
  const color = active
    ? COLORS.white
    : hovered
      ? COLORS.lightGrey
      : COLORS.mediumGrey;

  return (
    <Pressable
      onPress={onPress}
      onHoverIn={() => setHovered(true)}
      onHoverOut={() => setHovered(false)}
      style={[
        styles.navItem,
        active && styles.navItemActive,
        !active && hovered && styles.navItemHovered,
      ]}
    >
      <DynamicIcon type={iconType} name={iconName} size={18} color={color} />
      <Text style={[styles.navLabel, { color }]}>{label}</Text>
    </Pressable>
  );
}

interface Props {
  /** 'home' for the storefront view, a category key, or null while searching. */
  activeKey: string | null;
  onHome: () => void;
  onSelect: (category: Category) => void;
}

/** Persistent left navigation for expanded (desktop) layouts. */
export function Sidebar({ activeKey, onHome, onSelect }: Props) {
  return (
    <View style={styles.sidebar}>
      <Text style={styles.wordmark}>SIDEQUEST</Text>
      <Text style={styles.tagline}>Discover your next game</Text>

      <ScrollView
        style={styles.nav}
        contentContainerStyle={styles.navContent}
        showsVerticalScrollIndicator={false}
      >
        <NavItem
          label="Home"
          iconName="home"
          iconType="ionicon"
          active={activeKey === 'home'}
          onPress={onHome}
        />

        <Text style={styles.navHeading}>Browse</Text>
        {CATEGORIES.map((category) => (
          <NavItem
            key={category.key}
            label={category.title}
            iconName={category.iconName}
            iconType={category.iconType}
            active={category.key === activeKey}
            onPress={() => onSelect(category)}
          />
        ))}
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
    marginTop: SPACING.lg,
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
  navItemHovered: { backgroundColor: 'rgba(255,255,255,0.06)' },
  navLabel: { fontFamily: 'Noah-Bold', fontSize: 14 },
  footer: {
    fontFamily: 'Noah-Regular',
    fontSize: 10,
    color: COLORS.mediumGrey,
    opacity: 0.7,
  },
});
