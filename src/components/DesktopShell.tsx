import { StyleSheet, View, useWindowDimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Sidebar } from './Sidebar';
import { Textured } from './Textured';
import { COLORS } from '@/styles/colors';
import { SPACING } from '@/styles/theme';

/**
 * The desk's one shell: the sidebar on the left, the page on the right.
 *
 * Home built this and every other page built something else - a slim
 * top bar of text links over a centred column - so walking from Home
 * to the Library changed the app's whole structure under you, as if
 * you had left for another site. The sidebar is the app's structure on
 * a desk; every page stands inside it, with its own place lit.
 */
export function DesktopShell({
  activeKey,
  search,
  children,
}: {
  activeKey: string | null;
  search?: React.ReactNode;
  children: React.ReactNode;
}) {
  const { height: windowHeight } = useWindowDimensions();
  return (
    <Textured style={styles.background}>
      <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
        <View style={[styles.shell, { minHeight: windowHeight }]}>
          <Sidebar activeKey={activeKey} search={search} />
          <View style={styles.main}>{children}</View>
        </View>
      </SafeAreaView>
    </Textured>
  );
}

const styles = StyleSheet.create({
  background: { flexGrow: 1, backgroundColor: COLORS.darkGrey },
  container: { flex: 1 },
  shell: { flex: 1, flexDirection: 'row', width: '100%' },
  main: { flex: 1, paddingHorizontal: SPACING.xl, paddingTop: SPACING.lg },
});
