import { useEffect, useRef, useState } from 'react';
import { Animated, StyleSheet, View } from 'react-native';

import { useAnimatedValue } from '@/hooks/useAnimatedValue';

const DURATION = 220;

type Phase = 'bones' | 'crossfade' | 'content';

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
 * While loading, the bones are the page: they sit in normal flow and give
 * the document its height. That matters on iOS — a document shorter than
 * the viewport leaves Safari's translucent toolbar blurring over bare
 * canvas instead of over content, which reads as a slab covering the
 * bottom of the screen.
 *
 * Once the content arrives the roles swap: content takes the flow, and
 * the bones become an overlay that fades out on top of it. Because the
 * skeletons are measured to land on the same pixels as the content, the
 * swap is invisible and the transition is a dissolve rather than a jump.
 */
export function Reveal({ pending, skeleton, children }: Props) {
  const progress = useAnimatedValue(pending ? 0 : 1);
  const [phase, setPhase] = useState<Phase>(pending ? 'bones' : 'content');
  const wasPending = useRef(pending);

  useEffect(() => {
    if (pending) {
      wasPending.current = true;
      progress.setValue(0);
      // Deliberate: this effect syncs an animation's lifecycle to a prop
      // rather than deriving state from one. The rule guards against
      // cascading renders; each branch here settles in a single pass.
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setPhase('bones');
      return;
    }
    if (!wasPending.current) {
      // Content was ready immediately (warm cache): no theatre.
      progress.setValue(1);
      setPhase('content');
      return;
    }
    wasPending.current = false;
    setPhase('crossfade');
    const animation = Animated.timing(progress, {
      toValue: 1,
      duration: DURATION,
      useNativeDriver: true,
    });
    animation.start(({ finished }) => finished && setPhase('content'));
    return () => animation.stop();
  }, [pending, progress]);

  // Loading: the bones hold the page open on their own.
  if (phase === 'bones') return <View>{skeleton}</View>;

  return (
    <View>
      <Animated.View style={{ opacity: progress }}>{children}</Animated.View>
      {phase === 'crossfade' && (
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
