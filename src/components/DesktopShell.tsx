import { StyleSheet, View, useWindowDimensions } from 'react-native';

import { useBreakpoint } from '@/hooks/useBreakpoint';
import { SafeAreaView } from 'react-native-safe-area-context';

import { RailClock } from './RailClock';
import { Sidebar } from './Sidebar';
import { Textured } from './Textured';
import type { Section } from '@/constants/categories';
import { usePersistedState } from '@/hooks/usePersistedState';
import { COLORS } from '@/styles/colors';
import { RADIUS, SHADOW, SPACING } from '@/styles/theme';

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
            onToggle={() => setChoice(collapsed ? 'open' : 'closed')}
            foot={<RailClock collapsed={collapsed} />}
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
