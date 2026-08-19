import { useState } from 'react';
import {
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
  type ViewStyle,
} from 'react-native';

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
    ? COLORS.darkGrey
    : hovered
      ? COLORS.white
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
  /**
   * Search lives here rather than in a bar above the content: desktop
   * users look top-left for it, and the content column gets its full
   * height back for the thing they came to see.
   */
  search?: React.ReactNode;
}

/** Persistent left navigation for expanded (desktop) layouts. */
export function Sidebar({ activeKey, onHome, onSelect, search }: Props) {
  const router = useRouter();
  return (
    <View style={[styles.sidebar, STICKY]}>
      <Pressable onPress={onHome} accessibilityRole="link">
        <Text style={styles.wordmark}>SIDEQUEST</Text>
      </Pressable>
      <Text style={styles.tagline}>Discover your next game</Text>
      {search ? <View style={styles.search}>{search}</View> : null}

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

    </View>
  );
}

/**
 * The document is the scroller on desktop too; the sidebar opts out by
 * pinning itself. position: sticky isn't in RN's types - cast confined
 * here, native never mounts this component.
 */
const STICKY =
  Platform.OS === 'web'
    ? ({ position: 'sticky', top: 0, height: '100dvh' } as unknown as ViewStyle)
    : null;

const styles = StyleSheet.create({
  sidebar: {
    width: LAYOUT.sidebarWidth,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.lg,
    backgroundColor: 'rgba(39,47,63,0.45)',
    borderRightWidth: StyleSheet.hairlineWidth,
    borderRightColor: 'rgba(255,255,255,0.08)',
  },
  wordmark: {
    fontFamily: 'Noah-Black',
    fontSize: 22,
    color: COLORS.white,
    letterSpacing: 1.5,
  },
  tagline: {
    fontFamily: 'Noah-Regular',
    fontSize: 11,
    color: COLORS.mediumGrey,
    marginTop: SPACING.xs,
  },
  search: { marginTop: SPACING.md, marginBottom: SPACING.md },
  nav: { flex: 1 },
  navContent: { gap: 2, paddingBottom: SPACING.sm },
  navHeading: {
    fontFamily: 'Noah-Bold',
    fontSize: 10.5,
    letterSpacing: 1.4,
    textTransform: 'uppercase',
    color: COLORS.mediumGrey,
    marginTop: SPACING.lg,
    marginBottom: SPACING.sm,
    paddingTop: SPACING.md,
    paddingHorizontal: SPACING.sm + 2,
    borderTopWidth: 1,
    borderTopColor: COLORS.stroke,
  },
  navItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm + 2,
    paddingVertical: SPACING.sm + 1,
    paddingHorizontal: SPACING.sm + 2,
    borderRadius: RADIUS.sm,
  },
  navItemActive: { backgroundColor: COLORS.white },
  navItemHovered: { backgroundColor: 'rgba(255,255,255,0.06)' },
  navLabel: { fontFamily: 'Noah-Bold', fontSize: 13.5 },
});
