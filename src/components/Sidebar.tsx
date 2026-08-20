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
import { Mark } from './Mark';
import { DISCOVER, GENRES, type Section } from '@/constants/categories';
import { COLORS } from '@/styles/colors';
import { LAYOUT, RADIUS, SPACING } from '@/styles/theme';
import { TYPE } from '@/styles/typography';

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
      <DynamicIcon
        type={iconType}
        name={iconName}
        size={18}
        color={active ? COLORS.accent : color}
      />
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
      <Pressable onPress={onHome} accessibilityRole="link" style={styles.brand}>
        <Mark size={22} />
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
  /**
   * A rail, not a margin.
   *
   * This was navy at 45% over the page's dark grey, which resolves to
   * about three values away from it — so the column read as text
   * floating on the left rather than as a surface holding it. Solid
   * navy is a real step down, and the hairline then marks an edge that
   * actually exists.
   */
  sidebar: {
    width: LAYOUT.sidebarWidth,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.lg,
    backgroundColor: COLORS.navy,
    borderRightWidth: 1,
    borderRightColor: COLORS.stroke,
  },
  brand: { flexDirection: 'row', alignItems: 'center', gap: SPACING.sm },
  wordmark: {
    ...TYPE.h1,
    color: COLORS.white,
  },
  tagline: {
    ...TYPE.fine,
    color: COLORS.mediumGrey,
    marginTop: SPACING.xs,
  },
  search: { marginTop: SPACING.md, marginBottom: SPACING.md },
  nav: { flex: 1 },
  navContent: { gap: 2, paddingBottom: SPACING.sm },
  navHeading: {
    ...TYPE.micro,
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
    borderLeftWidth: 2,
    borderLeftColor: 'transparent',
  },
  /**
   * Marked, not spotlit.
   *
   * The active row was a solid white pill — the colour this app spends
   * on its primary button — while every other row sat at forty percent
   * grey. One element at full strength among seventeen at a whisper is
   * a blob, not a hierarchy. A raised surface and the accent say the
   * same thing at the weight a navigation item deserves, and they are
   * the first amber in a rail that otherwise shared nothing with the
   * rest of the app.
   */
  navItemActive: {
    backgroundColor: COLORS.raised,
    borderLeftColor: COLORS.accent,
    // Square on the marked edge: a 2px rule bent around a 10px radius
    // reads as a parenthesis rather than as a marker.
    borderTopLeftRadius: 0,
    borderBottomLeftRadius: 0,
  },
  navItemHovered: { backgroundColor: 'rgba(255,255,255,0.06)' },
  navLabel: { ...TYPE.labelSmall },
});
