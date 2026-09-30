import Ionicons from '@expo/vector-icons/Ionicons';
import { useRouter } from 'expo-router';
import { useEffect } from 'react';
import {
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
} from 'react-native';
import {
  SafeAreaView,
  useSafeAreaInsets,
} from 'react-native-safe-area-context';

import { useBreakpoint } from '@/hooks/useBreakpoint';

import { Mark } from './Mark';
import { RailClock } from './RailClock';
import { Sidebar } from './Sidebar';
import { Textured } from './Textured';
import type { Section } from '@/constants/categories';
import { usePersistedState } from '@/hooks/usePersistedState';
import { COLORS } from '@/styles/colors';
import { RADIUS, SHADOW, SPACING } from '@/styles/theme';
import { WORDMARK } from '@/styles/typography';

/**
 * The desk's one shell: the rail on the left, the page as a sheet on it.
 *
 * Every page used to stand in a flat two-column layout - a navy column,
 * a hairline, a grey column - the frame every product ships. This one
 * is the app's own material at its largest scale. The rail is the desk:
 * navy, grained, recessed. The page is a sheet lifted off it, with a
 * rounded corner where it meets the rail and a soft edge, and the
 * stage's artwork bleeds inside the sheet rather than stopping at a
 * rule. Home, Library, Plan and You all stand on the same desk.
 *
 * The rail folds. Below 1200 points it folds itself - a 232-point rail
 * is a fifth of the column there - on the media pages it starts folded,
 * and anywhere it folds on request, remembered. Folded, it is the Mark,
 * the glyphs and tonight's hour. It does not spring open under the
 * pointer: a fold is a choice, and a rail that undoes it whenever the
 * pointer crosses it cannot be trusted to stay folded. The Mark under
 * the pointer becomes the way in; so does Cmd+backslash.
 */
const FOLD_BELOW = 1200;
const RAIL_KEY = 'sidequest.rail.v1';

/**
 * Whether this build can ever stand on a tablet.
 *
 * Decided once, from two things the bundler already knows: the
 * platform, and the iPad preview seam `useBreakpoint` reads. Both are
 * inlined at build time, so on an ordinary web build this folds to
 * `false`, the tablet branch below is unreachable, and the minifier
 * drops `TabletShell` from a bundle that could never show it — the
 * web pays for the sheet and the rail, not for a shell it has no tab
 * bar to pair with. The preview export sets the seam and keeps it.
 */
const TABLET =
  Platform.OS !== 'web' || process.env.EXPO_PUBLIC_PREVIEW_TABLET === '1';

export function DesktopShell({
  activeKey,
  onHome,
  onSelect,
  search,
  foldByDefault = false,
  flush = false,
  bar = 'brand',
  children,
}: {
  activeKey: string | null;
  onHome?: () => void;
  onSelect?: (section: Section) => void;
  search?: React.ReactNode;
  /**
   * Start folded unless the reader has chosen otherwise: the media
   * pages, where the picture is the point and the rail is a bystander.
   */
  foldByDefault?: boolean;
  /**
   * No padding of the shell's own: the page pads itself, inside its
   * scroller. A page whose picture runs to the sheet's edges needs
   * this - a scroll view clips at its own box, so a hero pulled into
   * the shell's padding with negative margins was cut off exactly
   * there, twenty points from the top and thirty-two from the sides.
   */
  flush?: boolean;
  /**
   * What a tablet draws across the top, where the desk has a sidebar.
   * `brand` is the bar a tab root wants — the wordmark, the search if
   * the page has one, You; `none` is for a pushed screen, which draws
   * its own back button over its own hero and wants nothing above it.
   * The web ignores it: the sidebar is the chrome there.
   */
  bar?: 'brand' | 'none';
  children: React.ReactNode;
}) {
  // The same question the page asked to get here, answered the same
  // way: the sidebar exists where the breakpoint says there is a desk.
  const { isDesk } = useBreakpoint();
  if (TABLET && !isDesk) {
    return (
      <TabletShell bar={bar} onHome={onHome} search={search} flush={flush}>
        {children}
      </TabletShell>
    );
  }
  return (
    <WebShell
      activeKey={activeKey}
      onHome={onHome}
      onSelect={onSelect}
      search={search}
      foldByDefault={foldByDefault}
      flush={flush}
    >
      {children}
    </WebShell>
  );
}

/**
 * The tablet's shell: the desk's column without the desk's sidebar.
 *
 * An iPad has the room for the wide layout and has a native tab bar
 * for getting between the roots, so what it needs from a shell is the
 * column the wide pages were drawn for — the same padding the web's
 * sheet gives them, so `stageBleedWide` and its siblings bleed to the
 * same edges — and, on a tab root, the one row of chrome a tab bar
 * cannot carry: the brand, the search, and You. No sheet, no radius,
 * no fold: the page stands on the ground the way every native screen
 * does, and a pushed screen (`bar="none"`) gets the column and nothing
 * else, its own back button already floating over its hero.
 *
 * The status bar is cleared by the bar's own padding rather than a
 * SafeAreaView around everything, so that a pushed screen's absolute
 * back button, measured from the top of the window like every other
 * screen's, lands where it does on a phone.
 */
function TabletShell({
  bar,
  onHome,
  search,
  flush,
  children,
}: {
  bar: 'brand' | 'none';
  onHome?: () => void;
  search?: React.ReactNode;
  flush: boolean;
  children: React.ReactNode;
}) {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  return (
    <Textured style={styles.tablet}>
      {bar === 'brand' && (
        <View style={[styles.bar, { paddingTop: insets.top + SPACING.sm }]}>
          <Pressable
            onPress={onHome ?? (() => router.push('/'))}
            accessibilityRole="button"
            accessibilityLabel="Home"
            hitSlop={8}
            style={styles.brand}
          >
            <Mark size={22} />
            <Text style={styles.wordmark}>sidequest</Text>
          </Pressable>
          {search ? <View style={styles.barSearch}>{search}</View> : null}
          <Pressable
            onPress={() => router.push('/you')}
            hitSlop={8}
            accessibilityRole="button"
            accessibilityLabel="You"
            style={styles.you}
          >
            <Ionicons
              name="person-circle-outline"
              size={24}
              color={COLORS.lightGrey}
            />
          </Pressable>
        </View>
      )}
      <View style={flush ? styles.mainFlush : styles.main}>{children}</View>
    </Textured>
  );
}

function WebShell({
  activeKey,
  onHome,
  onSelect,
  search,
  foldByDefault,
  flush,
  children,
}: {
  activeKey: string | null;
  onHome?: () => void;
  onSelect?: (section: Section) => void;
  search?: React.ReactNode;
  foldByDefault: boolean;
  flush: boolean;
  children: React.ReactNode;
}) {
  const { height: windowHeight } = useWindowDimensions();
  // The app's one source of width, so the fold agrees with the layout
  // that chose this shell in the first place.
  const { width } = useBreakpoint();
  const [choice, setChoice] = usePersistedState<'open' | 'closed' | null>(
    RAIL_KEY,
    null
  );
  const collapsed = choice
    ? choice === 'closed'
    : foldByDefault || width < FOLD_BELOW;
  const toggle = () => setChoice(collapsed ? 'open' : 'closed');

  // ⌘\ / Ctrl+\ folds and unfolds from the keyboard.
  useEffect(() => {
    if (Platform.OS !== 'web' || typeof window === 'undefined') return;
    const onKey = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key === '\\') {
        event.preventDefault();
        setChoice(collapsed ? 'open' : 'closed');
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [collapsed, setChoice]);

  return (
    <Textured style={styles.desk}>
      <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
        <View style={[styles.shell, { minHeight: windowHeight }]}>
          <Sidebar
            activeKey={activeKey}
            onHome={onHome}
            onSelect={onSelect}
            search={search}
            collapsed={collapsed}
            onToggle={toggle}
            foot={<RailClock collapsed={collapsed} />}
          />
          <View style={styles.sheet}>
            <Textured fill />
            <View style={flush ? styles.mainFlush : styles.main}>
              {children}
            </View>
          </View>
        </View>
      </SafeAreaView>
    </Textured>
  );
}

const styles = StyleSheet.create({
  tablet: { flex: 1, backgroundColor: COLORS.darkGrey },
  bar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.lg,
    paddingHorizontal: SPACING.xl,
    paddingBottom: SPACING.sm,
    minHeight: 52,
  },
  brand: { flexDirection: 'row', alignItems: 'center', gap: SPACING.sm },
  wordmark: { ...WORDMARK },
  /** Centred between the brand and You, and never wider than a field. */
  barSearch: {
    flex: 1,
    maxWidth: 440,
    marginHorizontal: 'auto',
    alignSelf: 'center',
  },
  you: { marginLeft: 'auto' },
  desk: { flexGrow: 1, backgroundColor: COLORS.navy },
  container: { flex: 1 },
  shell: { flex: 1, flexDirection: 'row', width: '100%' },
  /**
   * The sheet: the page's ground, lifted. A corner only where it meets
   * the rail - the top-left - because that is the one edge that is a
   * join; the others are the window's.
   */
  sheet: {
    flex: 1,
    minWidth: 0,
    marginTop: SPACING.md,
    backgroundColor: COLORS.darkGrey,
    borderTopLeftRadius: RADIUS.xl,
    overflow: 'hidden',
    ...SHADOW.card,
  },
  main: { flex: 1, paddingHorizontal: SPACING.xl, paddingTop: SPACING.lg },
  mainFlush: { flex: 1 },
});
