import Ionicons from '@expo/vector-icons/Ionicons';
import { StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useOnline } from '@/lib/network';
import { COLORS } from '@/styles/colors';
import { RADIUS, SPACING } from '@/styles/theme';
import { TYPE } from '@/styles/typography';

/**
 * One quiet line, only while the network is gone.
 *
 * Everything the app shows offline is real — the library is on the
 * device, the shelves are the last answers RAWG gave — so the page must
 * not apologise. It should say why a shelf that is usually today's is
 * yesterday's, once, where the eye already looks, and disappear the
 * moment the signal returns. A pill rather than a band: a band across
 * the top is an alarm, and being offline is not one.
 */
export function OfflineNotice() {
  const online = useOnline();
  const insets = useSafeAreaInsets();
  if (online) return null;
  return (
    <View
      style={[styles.wrap, { top: insets.top + SPACING.sm + 2 }]}
      pointerEvents="none"
      accessibilityLiveRegion="polite"
      accessibilityRole="alert"
    >
      <View style={styles.pill}>
        <Ionicons
          name="cloud-offline-outline"
          size={13}
          color={COLORS.lightGrey}
        />
        <Text style={styles.text}>Offline — showing what’s saved here</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    position: 'absolute',
    left: 0,
    right: 0,
    alignItems: 'center',
    zIndex: 40,
  },
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.xs + 2,
    borderRadius: RADIUS.lg,
    backgroundColor: COLORS.plate,
    borderWidth: 1,
    borderColor: COLORS.strokeOnImage,
  },
  text: { ...TYPE.labelTiny, color: COLORS.lightGrey },
});
