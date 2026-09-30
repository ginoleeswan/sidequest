import Ionicons from '@expo/vector-icons/Ionicons';
import {
  createContext,
  useCallback,
  useEffect,
  useContext,
  useRef,
  useState,
} from 'react';
import {
  AccessibilityInfo,
  Animated,
  Platform,
  Pressable,
  StyleSheet,
  Text,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useAnimatedValue } from '@/hooks/useAnimatedValue';
import { useReducedMotion } from '@/hooks/useReducedMotion';
import { COLORS } from '@/styles/colors';
import { DURATION, EASING, SPRING } from '@/styles/motion';
import { HIT_SLOP, MATERIAL, RADIUS, SPACING } from '@/styles/theme';
import { TYPE } from '@/styles/typography';

type IconName = keyof typeof Ionicons.glyphMap;

/**
 * The one thing a confirmation can offer: taking it back.
 *
 * Several acts in this app remove something — letting a game go,
 * clearing the recent shelf — and a confirmation that cannot be tapped
 * turns every mis-tap into a loss. With an action the toast takes
 * touches and stays long enough to be read and reached.
 */
export interface ToastAction {
  label: string;
  onPress: () => void;
}

type Show = (message: string, icon?: IconName, action?: ToastAction) => void;

const ToastContext = createContext<Show>(() => {});

/** How long a plain confirmation stays, and one that can be undone. */
const HOLD = 2200;
const HOLD_WITH_ACTION = 4500;

export const useToast = () => useContext(ToastContext);

/** Quiet bottom-center confirmations: "Saved — Want to play". */
export function ToastProvider({ children }: { children: React.ReactNode }) {
  const insets = useSafeAreaInsets();
  const [toast, setToast] = useState<{
    message: string;
    icon: IconName;
    action?: ToastAction;
    key: number;
  } | null>(null);
  const progress = useAnimatedValue(0);
  const reduced = useReducedMotion();
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // The dismiss timer outlives the provider otherwise, and fires against
  // a tree that is no longer mounted — which throws rather than doing
  // nothing, because the animation it drives has been torn down with it.
  useEffect(
    () => () => {
      if (timer.current) clearTimeout(timer.current);
    },
    []
  );

  const hide = useCallback(() => {
    Animated.timing(progress, {
      toValue: 0,
      duration: DURATION.base,
      easing: EASING.exit,
      useNativeDriver: true,
    }).start(({ finished }) => finished && setToast(null));
  }, [progress]);

  const show = useCallback<Show>(
    (message, icon = 'checkmark-circle', action) => {
      if (timer.current) clearTimeout(timer.current);
      setToast({ message, icon, action, key: Date.now() });
      // A toast is visual only; VoiceOver never heard "Saved" at all.
      AccessibilityInfo.announceForAccessibility(
        action ? `${message}. ${action.label} available.` : message
      );
      (reduced
        ? Animated.timing(progress, {
            toValue: 1,
            duration: DURATION.fast,
            useNativeDriver: true,
          })
        : Animated.spring(progress, {
            toValue: 1,
            ...SPRING.surface,
            useNativeDriver: true,
          })
      ).start();
      timer.current = setTimeout(hide, action ? HOLD_WITH_ACTION : HOLD);
    },
    [progress, reduced, hide]
  );

  return (
    <ToastContext.Provider value={show}>
      {children}
      {toast && (
        <Animated.View
          key={toast.key}
          pointerEvents={toast.action ? 'box-none' : 'none'}
          style={[
            styles.toast,
            {
              // 72 clears the native tab bar; the web has none, so the
              // same offset left a toast hovering mid-air. 28 sits it
              // where a confirmation reads as arriving from the edge.
              bottom: insets.bottom + (Platform.OS === 'web' ? 28 : 72),
            },
            {
              opacity: progress,
              transform: [
                {
                  translateY: progress.interpolate({
                    inputRange: [0, 1],
                    outputRange: [reduced ? 0 : 14, 0],
                  }),
                },
              ],
            },
          ]}
        >
          <Ionicons name={toast.icon} size={15} color={COLORS.white} />
          <Text style={styles.text}>{toast.message}</Text>
          {toast.action ? (
            <Pressable
              onPress={() => {
                if (timer.current) clearTimeout(timer.current);
                toast.action?.onPress();
                hide();
              }}
              hitSlop={HIT_SLOP.md}
              accessibilityRole="button"
              accessibilityLabel={toast.action.label}
              style={({ pressed }) => [
                styles.action,
                pressed && styles.actionPressed,
              ]}
            >
              <Text style={styles.actionText}>{toast.action.label}</Text>
            </Pressable>
          ) : null}
        </Animated.View>
      )}
    </ToastContext.Provider>
  );
}

const styles = StyleSheet.create({
  toast: {
    /*
     * Absolute anchors to the root view, which on native never scrolls
     * — but on web the document itself is the scroller, so an absolute
     * toast rides up the page with it. Fixed pins it to the viewport,
     * which is where a confirmation lives: it talks to the person, not
     * to the paragraph they happened to be near.
     */
    position: Platform.OS === 'web' ? ('fixed' as 'absolute') : 'absolute',
    alignSelf: 'center',
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
    backgroundColor: COLORS.inkSurface,
    borderWidth: 1,
    borderColor: COLORS.strokeStrong,
    borderRadius: RADIUS.lg,
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.sm2,
    // Lit along the top like every raised surface, and one shadow
    // string rather than the shadow props beside an inset: on the web
    // both become `box-shadow` and whichever lands second erases the
    // other.
    boxShadow: `${MATERIAL.edge.boxShadow}, 0 10px 24px rgba(0,0,0,0.4)`,
    zIndex: 100,
  },
  text: {
    ...TYPE.labelSmall,
    color: COLORS.lightGrey,
  },
  action: {
    marginLeft: SPACING.xs,
    paddingLeft: SPACING.md,
    borderLeftWidth: 1,
    borderLeftColor: COLORS.strokeStrong,
  },
  actionPressed: { opacity: 0.6 },
  actionText: {
    ...TYPE.labelSmall,
    color: COLORS.accent,
  },
});
