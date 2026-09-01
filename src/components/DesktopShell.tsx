import { useEffect, useRef, useState } from 'react';
import { Platform, StyleSheet, View, useWindowDimensions } from 'react-native';

import { useBreakpoint } from '@/hooks/useBreakpoint';
import { SafeAreaView } from 'react-native-safe-area-context';

import { RailClock } from './RailClock';
import { Sidebar } from './Sidebar';
import { Textured } from './Textured';
import type { Section } from '@/constants/categories';
import { usePersistedState } from '@/hooks/usePersistedState';
import { COLORS } from '@/styles/colors';
import { LAYOUT, RADIUS, SHADOW, SPACING } from '@/styles/theme';

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
 * is a fifth of the column there - and anywhere it folds on request,
 * remembered. Folded, it is the Mark, the glyphs and tonight's hour.
 */
const FOLD_BELOW = 1200;
const RAIL_KEY = 'sidequest.rail.v1';

export function DesktopShell({
  activeKey,
  onHome,
  onSelect,
  search,
  children,
}: {
  activeKey: string | null;
  onHome?: () => void;
  onSelect?: (section: Section) => void;
  search?: React.ReactNode;
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
  const collapsed = choice ? choice === 'closed' : width < FOLD_BELOW;
  const toggle = () => setChoice(collapsed ? 'open' : 'closed');

  /**
   * Peek: a folded rail opens over the page while the pointer rests on
   * it and closes when it leaves - no click, no layout shift, the
   * behaviour ChatGPT's rail taught everyone to expect. Cleared the
   * moment the rail is opened for real.
   */
  const [peek, setPeek] = useState(false);
  const peeking = collapsed && peek;
  /**
   * A beat before the peek opens, none before it closes. A pointer
   * crossing the rail on its way somewhere else must not flash a
   * panel open; a pointer that rests there for a moment wants it.
   */
  const peekTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const armPeek = () => {
    if (peekTimer.current) clearTimeout(peekTimer.current);
    peekTimer.current = setTimeout(() => setPeek(true), 180);
  };
  const disarmPeek = () => {
    if (peekTimer.current) clearTimeout(peekTimer.current);
    peekTimer.current = null;
    setPeek(false);
  };
  useEffect(
    () => () => {
      if (peekTimer.current) clearTimeout(peekTimer.current);
    },
    []
  );

  // ⌘\ / Ctrl+\ folds and unfolds from the keyboard.
  useEffect(() => {
    if (Platform.OS !== 'web' || typeof window === 'undefined') return;
    const onKey = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key === '\\') {
        event.preventDefault();
        setChoice(collapsed ? 'open' : 'closed');
        setPeek(false);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [collapsed, setChoice]);

  return (
    <Textured style={styles.desk}>
      <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
        <View style={[styles.shell, { minHeight: windowHeight }]}>
          {/* The folded rail's width stays in the layout while a peek
              lays the full rail over the sheet. */}
          {peeking ? <View style={styles.railSlot} /> : null}
          <Sidebar
            activeKey={activeKey}
            onHome={onHome}
            onSelect={onSelect}
            search={search}
            collapsed={collapsed && !peek}
            overlay={peeking}
            onToggle={() => {
              disarmPeek();
              toggle();
            }}
            onHoverIn={collapsed ? armPeek : undefined}
            onHoverOut={collapsed ? disarmPeek : undefined}
            foot={<RailClock collapsed={collapsed && !peek} />}
          />
          <View style={styles.sheet}>
            <Textured fill />
            <View style={styles.main}>{children}</View>
          </View>
        </View>
      </SafeAreaView>
    </Textured>
  );
}

const styles = StyleSheet.create({
  desk: { flexGrow: 1, backgroundColor: COLORS.navy },
  container: { flex: 1 },
  railSlot: { width: LAYOUT.railWidth },
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
});
