import { useEffect, useRef, useState } from 'react';
import { Animated, StyleSheet, View } from 'react-native';

import { useAnimatedValue } from '@/hooks/useAnimatedValue';

const DURATION = 220;

interface Props {
  /** True while the real content has nothing to show yet. */
  pending: boolean;
  /** The bones. Must occupy the same space the content will. */
  skeleton: React.ReactNode;
  children: React.ReactNode;
}

/**
 * Cross-fades bones into content, in place.
 *
 * Swapping one for the other leaves a frame of bare background between
 * them, and animating the content in from an offset moves it away from
 * the position the bones just promised. Since the skeletons are measured
 * to land on the same pixels as the content, the honest transition is a
 * dissolve: the bones stay mounted, on top, fading out as the content
 * fades up underneath — it reads as the page developing, not swapping.
 */
export function Reveal({ pending, skeleton, children }: Props) {
  const progress = useAnimatedValue(0);
  const [showBones, setShowBones] = useState(pending);
  const wasPending = useRef(pending);

  useEffect(() => {
    if (pending) {
      wasPending.current = true;
      progress.setValue(0);
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setShowBones(true);
      return;
    }
    if (!wasPending.current) {
      // Content was ready immediately (warm cache): no theatre.
      progress.setValue(1);
      // Deliberate: syncing an animation's lifecycle, not deriving state.
      setShowBones(false);
      return;
    }
    wasPending.current = false;
    const animation = Animated.timing(progress, {
      toValue: 1,
      duration: DURATION,
      useNativeDriver: true,
    });
    animation.start(({ finished }) => finished && setShowBones(false));
    return () => animation.stop();
  }, [pending, progress]);

  return (
    <View>
      <Animated.View style={{ opacity: progress }}>{children}</Animated.View>
      {showBones && (
        <Animated.View
          style={[
            StyleSheet.absoluteFill,
            {
              opacity: progress.interpolate({
                inputRange: [0, 1],
                outputRange: [1, 0],
              }),
            },
          ]}
          pointerEvents="none"
        >
          {skeleton}
        </Animated.View>
      )}
    </View>
  );
}
