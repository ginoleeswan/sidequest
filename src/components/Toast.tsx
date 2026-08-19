import Ionicons from '@expo/vector-icons/Ionicons';
import {
  createContext,
  useCallback,
  useEffect,
  useContext,
  useRef,
  useState,
} from 'react';
import { Animated, StyleSheet, Text } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useAnimatedValue } from '@/hooks/useAnimatedValue';
import { COLORS } from '@/styles/colors';
import { DURATION, EASING, SPRING } from '@/styles/motion';
import { RADIUS, SPACING } from '@/styles/theme';
import { TYPE } from '@/styles/typography';

type IconName = keyof typeof Ionicons.glyphMap;

const ToastContext = createContext<(message: string, icon?: IconName) => void>(
  () => {}
);

export const useToast = () => useContext(ToastContext);

/** Quiet bottom-center confirmations: "Saved — Want to play". */
export function ToastProvider({ children }: { children: React.ReactNode }) {
  const insets = useSafeAreaInsets();
  const [toast, setToast] = useState<{
    message: string;
    icon: IconName;
    key: number;
  } | null>(null);
  const progress = useAnimatedValue(0);
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

  const show = useCallback(
    (message: string, icon: IconName = 'checkmark-circle') => {
      if (timer.current) clearTimeout(timer.current);
      setToast({ message, icon, key: Date.now() });
      Animated.spring(progress, {
        toValue: 1,
        ...SPRING.surface,
        useNativeDriver: true,
      }).start();
      timer.current = setTimeout(() => {
        Animated.timing(progress, {
          toValue: 0,
          duration: DURATION.base,
          easing: EASING.exit,
          useNativeDriver: true,
        }).start(({ finished }) => finished && setToast(null));
      }, 2200);
    },
    [progress]
  );

  return (
    <ToastContext.Provider value={show}>
      {children}
      {toast && (
        <Animated.View
          key={toast.key}
          pointerEvents="none"
          style={[
            styles.toast,
            { bottom: insets.bottom + 72 },
            {
              opacity: progress,
              transform: [
                {
                  translateY: progress.interpolate({
                    inputRange: [0, 1],
                    outputRange: [14, 0],
                  }),
                },
              ],
            },
          ]}
        >
          <Ionicons name={toast.icon} size={15} color={COLORS.white} />
          <Text style={styles.text}>{toast.message}</Text>
        </Animated.View>
      )}
    </ToastContext.Provider>
  );
}

const styles = StyleSheet.create({
  toast: {
    position: 'absolute',
    alignSelf: 'center',
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
    backgroundColor: '#1D2431',
    borderWidth: 1,
    borderColor: COLORS.strokeStrong,
    borderRadius: RADIUS.lg,
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.sm + 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.4,
    shadowRadius: 24,
    elevation: 12,
    zIndex: 100,
  },
  text: {
    ...TYPE.labelSmall,
    color: COLORS.lightGrey,
  },
});
