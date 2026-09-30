import { useEffect } from 'react';
import {
  Animated,
  KeyboardAvoidingView,
  Modal,
  PanResponder,
  Platform,
  Pressable,
  StyleSheet,
  View,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useAnimatedValue } from '@/hooks/useAnimatedValue';
import { useBreakpoint } from '@/hooks/useBreakpoint';
import { useReducedMotion } from '@/hooks/useReducedMotion';
import { COLORS } from '@/styles/colors';
import { DURATION, EASING, SPRING } from '@/styles/motion';
import { MATERIAL, RADIUS, SHADOW, SPACING } from '@/styles/theme';

/** How far a sheet travels in, and how far a drag must pull to close it. */
const TRAVEL = 480;
const DISMISS_AT = 90;

interface Props {
  visible: boolean;
  onClose: () => void;
  children: React.ReactNode;
  /** Read by VoiceOver when the sheet opens. */
  accessibilityLabel?: string;
  style?: StyleProp<ViewStyle>;
}

/**
 * A sheet that behaves like a phone's sheet.
 *
 * The app's sheets were centred web dialogs that faded in: on a phone
 * they sat in the middle of the screen, out of the thumb's reach, and
 * the numeric keyboard rose over the Save button because nothing in the
 * app avoided the keyboard at all. This one comes up from the bottom
 * edge, carries a grabber, follows a downward drag and closes past a
 * threshold, and rides above the keyboard. On a wide screen, where the
 * bottom edge is a long way from anything, it is a centred card again.
 */
export function BottomSheet({
  visible,
  onClose,
  children,
  accessibilityLabel,
  style,
}: Props) {
  const insets = useSafeAreaInsets();
  const { isCompact } = useBreakpoint();
  const reduced = useReducedMotion();
  const shift = useAnimatedValue(TRAVEL);
  const drag = useAnimatedValue(0);

  useEffect(() => {
    if (!visible) return;
    drag.setValue(0);
    if (reduced) {
      shift.setValue(0);
      return;
    }
    shift.setValue(TRAVEL);
    Animated.spring(shift, {
      toValue: 0,
      ...SPRING.surface,
      useNativeDriver: true,
    }).start();
  }, [visible, reduced, shift, drag]);

  const close = () => {
    if (reduced) return onClose();
    Animated.timing(shift, {
      toValue: TRAVEL,
      duration: DURATION.base,
      easing: EASING.exit,
      useNativeDriver: true,
    }).start(() => onClose());
  };

  const pan = PanResponder.create({
    onMoveShouldSetPanResponder: (_, g) => g.dy > 6 && g.dy > Math.abs(g.dx),
    onPanResponderMove: (_, g) => drag.setValue(Math.max(0, g.dy)),
    onPanResponderRelease: (_, g) => {
      if (g.dy > DISMISS_AT || g.vy > 1.2) return close();
      Animated.spring(drag, {
        toValue: 0,
        ...SPRING.surface,
        useNativeDriver: true,
      }).start();
    },
  });

  const bottom = isCompact;

  return (
    <Modal
      transparent
      visible={visible}
      animationType="fade"
      onRequestClose={close}
      statusBarTranslucent
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={[styles.root, bottom ? styles.rootBottom : styles.rootCentre]}
      >
        <Pressable
          style={styles.backdrop}
          onPress={close}
          accessibilityRole="button"
          accessibilityLabel="Close"
        />
        <Animated.View
          accessibilityViewIsModal
          accessibilityLabel={accessibilityLabel}
          style={[
            styles.sheet,
            bottom
              ? [
                  styles.sheetBottom,
                  { paddingBottom: insets.bottom + SPACING.lg },
                ]
              : styles.sheetCentre,
            bottom && {
              transform: [{ translateY: Animated.add(shift, drag) }],
            },
            style,
          ]}
        >
          {bottom ? (
            <View
              style={styles.grabberZone}
              {...pan.panHandlers}
              accessibilityElementsHidden
              importantForAccessibility="no-hide-descendants"
            >
              <View style={styles.grabber} />
            </View>
          ) : null}
          {children}
        </Animated.View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  rootBottom: { justifyContent: 'flex-end' },
  rootCentre: {
    justifyContent: 'center',
    alignItems: 'center',
    padding: SPACING.lg,
  },
  backdrop: {
    ...StyleSheet.absoluteFill,
    backgroundColor: 'rgba(9,12,19,0.72)',
  },
  sheet: {
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.strokeStrong,
    padding: SPACING.lg,
    gap: SPACING.sm,
    boxShadow: `${MATERIAL.edge.boxShadow}, ${SHADOW.float.boxShadow}`,
  },
  sheetBottom: {
    borderTopLeftRadius: RADIUS.md,
    borderTopRightRadius: RADIUS.md,
    borderBottomWidth: 0,
    paddingTop: 0,
  },
  sheetCentre: {
    width: '100%',
    maxWidth: 420,
    borderRadius: RADIUS.md,
  },
  grabberZone: {
    alignItems: 'center',
    paddingTop: SPACING.sm2,
    paddingBottom: SPACING.sm,
  },
  grabber: {
    width: 36,
    height: 5,
    borderRadius: 3,
    backgroundColor: COLORS.strokeStrong,
  },
});
