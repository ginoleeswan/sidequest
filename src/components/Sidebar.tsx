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
import { LAYOUT, RADIUS, SHADOW, SPACING } from '@/styles/theme';
import { TYPE, WORDMARK } from '@/styles/typography';

interface NavItemProps {
  label: string;
  iconName: string;
  iconType: IconType;
  active: boolean;
  onPress: () => void;
  /** The rail at its narrow width: the glyph alone, the label spoken. */
  compact?: boolean;
}

function NavItem({
  label,
  iconName,
  iconType,
  active,
  onPress,
  compact = false,
}: NavItemProps) {
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
        compact && styles.navItemCompact,
        active && styles.navItemActive,
        !active && hovered && styles.navItemHovered,
      ]}
      accessibilityRole="link"
      accessibilityLabel={label}
    >
      <DynamicIcon
        type={iconType}
        name={iconName}
        size={18}
        color={active ? COLORS.accent : color}
      />
      {compact ? null : (
        <Text style={[styles.navLabel, { color }]}>{label}</Text>
      )}
    </Pressable>
  );
}

function NavGroup({
  heading,
  sections,
  activeKey,
  onSelect,
  compact,
}: {
  heading: string;
  sections: Section[];
  activeKey: string | null;
  onSelect: (section: Section) => void;
  compact: boolean;
}) {
  return (
    <>
      {compact ? (
        <View style={styles.navRule} />
      ) : (
        <Text style={styles.navHeading}>{heading}</Text>
      )}
      {sections.map((section) => (
        <NavItem
          key={section.key}
          label={section.title}
          iconName={section.iconName}
          iconType={section.iconType}
          active={section.key === activeKey}
          onPress={() => onSelect(section)}
          compact={compact}
        />
      ))}
    </>
  );
}

/**
 * The sidebar control, as the products people use all day draw it: a
 * menu glyph, not a chevron - a chevron says "next", this says "the
 * panel". Open, it rides the brand row's end; folded, it stands under
 * the Mark on the glyph column, where a folded rail's controls are.
 * Cmd+\ (Ctrl+\) does the same from the keyboard, the convention
 * Notion and Linear share.
 */
function Toggle({
  collapsed,
  onToggle,
}: {
  collapsed: boolean;
  onToggle: () => void;
}) {
  const [hovered, setHovered] = useState(false);
  return (
    <Pressable
      onPress={onToggle}
      onHoverIn={() => setHovered(true)}
      onHoverOut={() => setHovered(false)}
      hitSlop={6}
      style={[
        styles.toggle,
        collapsed && styles.toggleFolded,
        hovered && styles.toggleHovered,
      ]}
      accessibilityRole="button"
      accessibilityLabel={
        collapsed
          ? 'Expand the sidebar (Cmd+\\)'
          : 'Collapse the sidebar (Cmd+\\)'
      }
    >
      <DynamicIcon
        type="ionicon"
        name="menu"
        size={18}
        color={hovered ? COLORS.white : COLORS.mediumGrey}
      />
    </Pressable>
  );
}

interface Props {
  /**
   * 'home' for the storefront view, a section key, 'library' or 'plan'
   * for those pages, or null while searching.
   */
  activeKey: string | null;
  /** Home owns these; every other page takes the defaults, which navigate. */
  onHome?: () => void;
  onSelect?: (section: Section) => void;
  /**
   * Search lives here rather than in a bar above the content: desktop
   * users look top-left for it, and the content column gets its full
   * height back for the thing they came to see.
   */
  search?: React.ReactNode;
  /**
   * The rail at 72 points: the Mark, the glyphs, the hour. Collapses
   * itself where the column is tight and on request anywhere; a rail
   * you can fold is what lets a desk page have the whole desk.
   */
  collapsed?: boolean;
  onToggle?: () => void;
  /** The foot of the rail - tonight's clock lives here. */
  foot?: React.ReactNode;
  /**
   * Folded, but peeking: the full rail laid over the page while the
   * pointer rests on it, the way ChatGPT's does. Nothing underneath
   * moves; the sheet keeps the folded rail's width.
   */
  overlay?: boolean;
  onHoverIn?: () => void;
  onHoverOut?: () => void;
}

/** Persistent left navigation for expanded (desktop) layouts. */
export function Sidebar({
  activeKey,
  onHome,
  onSelect,
  search,
  collapsed = false,
  onToggle,
  foot,
  overlay = false,
  onHoverIn,
  onHoverOut,
}: Props) {
  const router = useRouter();
  /**
   * One sidebar, every page. Home drives it with state - a section is a
   * view of the storefront, not a route - so from any other page the
   * same click goes to Home carrying the section as the parameter Home
   * already reads on arrival.
   */
  const goHome = onHome ?? (() => router.push('/'));
  const select =
    onSelect ??
    ((section: Section) =>
      router.push({ pathname: '/', params: { category: section.key } }));
  return (
    <View
      style={[
        styles.sidebar,
        collapsed && styles.sidebarCollapsed,
        STICKY,
        overlay && styles.sidebarOverlay,
      ]}
      onPointerEnter={onHoverIn}
      onPointerLeave={onHoverOut}
    >
      <View style={styles.top}>
        <Pressable
          onPress={goHome}
          accessibilityRole="link"
          accessibilityLabel="Sidequest home"
          style={styles.brand}
        >
          {/* The phone's exact lockup - Mark at 20, wordmark at h1 in
            lightGrey - not a slightly larger, slightly whiter cousin of
            it. One brand, one size, whichever surface's corner it is in. */}
          <Mark size={20} />
          {collapsed ? null : <Text style={styles.wordmark}>sidequest</Text>}
        </Pressable>
        {onToggle && !collapsed ? (
          <Toggle collapsed={false} onToggle={onToggle} />
        ) : null}
      </View>
      {onToggle && collapsed ? <Toggle collapsed onToggle={onToggle} /> : null}
      {search && !collapsed ? (
        <View style={styles.search}>{search}</View>
      ) : null}
      {search && collapsed && onToggle ? (
        <Pressable
          onPress={onToggle}
          style={[styles.navItem, styles.navItemCompact]}
          accessibilityRole="button"
          accessibilityLabel="Search games"
        >
          <DynamicIcon
            type="ionicon"
            name="search"
            size={18}
            color={COLORS.mediumGrey}
          />
        </Pressable>
      ) : null}

      <ScrollView
        style={styles.nav}
        contentContainerStyle={styles.navContent}
        showsVerticalScrollIndicator={false}
      >
        <NavItem
          label="Home"
          compact={collapsed}
          iconName="home"
          iconType="ionicon"
          active={activeKey === 'home'}
          onPress={goHome}
        />
        <NavItem
          label="My Library"
          compact={collapsed}
          iconName="library"
          iconType="ionicon"
          active={activeKey === 'library'}
          onPress={() => router.push('/library')}
        />
        <NavItem
          label="The Plan"
          compact={collapsed}
          iconName="map"
          iconType="ionicon"
          active={activeKey === 'plan'}
          onPress={() => router.push('/plan')}
        />
        {/* You, with the roots: on a desk the sidebar is the app's one
            chrome, and an account entry that appeared in some pages'
            section headers and not others was the same control in
            different places. */}
        <NavItem
          label="You"
          compact={collapsed}
          iconName="person-circle"
          iconType="ionicon"
          active={activeKey === 'you'}
          onPress={() => router.push('/you')}
        />
        <NavGroup
          heading="Discover"
          sections={DISCOVER}
          activeKey={activeKey}
          onSelect={select}
          compact={collapsed}
        />
        <NavGroup
          heading="Genres"
          sections={GENRES}
          activeKey={activeKey}
          onSelect={select}
          compact={collapsed}
        />
      </ScrollView>
      {foot}
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
    // The desk's own colour and nothing at its edge: the sheet of the
    // page lifts off it with a corner and a shadow, and a rule beside
    // that would be a second edge.
    backgroundColor: COLORS.navy,
  },
  sidebarCollapsed: { width: LAYOUT.railWidth, paddingHorizontal: SPACING.sm },
  /**
   * On the nav's own spine. A rail is a column, and this one had three
   * left edges in its first two hundred points - the Mark at the rail's
   * padding, the glyphs ten points in, the wordmark and the labels at
   * two more. The Mark now stands on the glyph column and the wordmark
   * on the label column, so the whole rail reads as one alignment.
   */
  top: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingLeft: SPACING.sm + 4,
    marginBottom: SPACING.md,
  },
  toggle: {
    width: 32,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: RADIUS.sm,
  },
  toggleHovered: { backgroundColor: COLORS.raised },
  // On the glyph column: the rail's padding puts the column at 28, and
  // a 32-point control centred on an 18-point glyph starts 7 before it.
  toggleFolded: { marginLeft: SPACING.sm + 4 - 7, marginTop: SPACING.sm },
  /**
   * Peeking: laid over the page at full width, lifted with the sheet's
   * own shadow, while the layout underneath keeps the folded width.
   */
  sidebarOverlay: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    width: LAYOUT.sidebarWidth,
    paddingHorizontal: SPACING.md,
    zIndex: 50,
    ...SHADOW.card,
  },
  navItemCompact: {
    justifyContent: 'center',
    paddingHorizontal: 0,
    borderLeftWidth: 0,
  },
  navRule: {
    height: 1,
    backgroundColor: COLORS.stroke,
    marginVertical: SPACING.md,
    marginHorizontal: SPACING.sm,
  },
  // Mark 20 + 8 puts the wordmark at exactly the label column's edge,
  // measured: glyph 18 + gap 10 on the rows below lands on the same x.
  brand: { flexDirection: 'row', alignItems: 'center', gap: SPACING.sm },
  wordmark: { ...WORDMARK },
  search: { marginBottom: SPACING.md },
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
