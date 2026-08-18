import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { useRouter } from 'expo-router';

import { DynamicIcon, type IconType } from './DynamicIcon';
import { DISCOVER, GENRES, type Section } from '@/constants/categories';
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

function NavGroup({
  heading,
  sections,
  activeKey,
  onSelect,
}: {
  heading: string;
  sections: Section[];
  activeKey: string | null;
  onSelect: (section: Section) => void;
}) {
  return (
    <>
      <Text style={styles.navHeading}>{heading}</Text>
      {sections.map((section) => (
        <NavItem
          key={section.key}
          label={section.title}
          iconName={section.iconName}
          iconType={section.iconType}
          active={section.key === activeKey}
          onPress={() => onSelect(section)}
        />
      ))}
    </>
  );
}

interface Props {
  /** 'home' for the storefront view, a section key, or null while searching. */
  activeKey: string | null;
  onHome: () => void;
  onSelect: (section: Section) => void;
}

/** Persistent left navigation for expanded (desktop) layouts. */
export function Sidebar({ activeKey, onHome, onSelect }: Props) {
  const router = useRouter();
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
        <NavItem
          label="My Library"
          iconName="library"
          iconType="ionicon"
          active={false}
          onPress={() => router.push('/library')}
        />
        <NavItem
          label="The Plan"
          iconName="map"
          iconType="ionicon"
          active={false}
          onPress={() => router.push('/plan')}
        />
        <NavGroup
          heading="Discover"
          sections={DISCOVER}
          activeKey={activeKey}
          onSelect={onSelect}
        />
        <NavGroup
          heading="Genres"
          sections={GENRES}
          activeKey={activeKey}
          onSelect={onSelect}
        />
      </ScrollView>

      <View style={styles.footerRow}>
        <Text style={styles.footerLink} onPress={() => router.push('/about')}>
          About
        </Text>
        <Text style={styles.footerLink} onPress={() => router.push('/terms')}>
          Terms
        </Text>
        <Text style={styles.footerLink} onPress={() => router.push('/privacy')}>
          Privacy
        </Text>
      </View>
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
    marginBottom: SPACING.lg,
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
    paddingVertical: SPACING.sm + 1,
    paddingHorizontal: SPACING.sm + 2,
    borderRadius: RADIUS.sm,
  },
  navItemActive: { backgroundColor: COLORS.blue },
  navItemHovered: { backgroundColor: 'rgba(255,255,255,0.06)' },
  navLabel: { fontFamily: 'Noah-Bold', fontSize: 13.5 },
  footerRow: { flexDirection: 'row', gap: SPACING.md, marginBottom: 6 },
  footerLink: {
    fontFamily: 'Noah-Bold',
    fontSize: 11,
    color: COLORS.mediumGrey,
  },
  footer: {
    fontFamily: 'Noah-Regular',
    fontSize: 10,
    color: COLORS.mediumGrey,
    opacity: 0.7,
  },
});
