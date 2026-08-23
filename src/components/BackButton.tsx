import Ionicons from '@expo/vector-icons/Ionicons';
import { useRouter } from 'expo-router';
import { Platform, StyleSheet } from 'react-native';

import { ScaleButton } from './ScaleButton';
import { COLORS } from '@/styles/colors';
import { OVER_IMAGE } from '@/styles/typography';

/**
 * @param onImage Sitting over artwork, where the glyph needs a shadow to
 * survive whatever is behind it. On a flat page it does not: a drop
 * shadow with nothing to lift off is decoration, and it only muddies a
 * thin stroke.
 */
export function BackButton({ onImage = false }: { onImage?: boolean }) {
  const router = useRouter();

  /**
   * Web only, now that the platform draws its own.
   *
   * Every pushed screen used to hand-draw this chevron because the root
   * Stack ran with `headerShown: false` — no navigation bar existed in
   * the app, so nothing gave us the system back gesture's matching
   * affordance, the title that appears on scroll, or the material UIKit
   * puts behind a bar on iOS 26. We were imitating glass in CSS.
   *
   * A browser has no navigation bar and no history stack the platform
   * will draw for us, so the hand-drawn one stays exactly where it was.
   * Rendering null here rather than editing nine call sites keeps the
   * decision in one place, where it cannot drift.
   */
  if (Platform.OS !== 'web') return null;
  // Deep links (shared URLs, fresh tabs) have no history to pop - fall
  // back to home instead of a button that silently does nothing.
  const goBack = () => {
    if (router.canGoBack()) {
      router.back();
    } else {
      router.replace('/');
    }
  };
  return (
    <ScaleButton
      onPress={goBack}
      style={styles.button}
      accessibilityLabel="Go back"
    >
      <Ionicons
        name="chevron-back"
        style={[styles.icon, onImage && OVER_IMAGE.heading]}
      />
    </ScaleButton>
  );
}

const styles = StyleSheet.create({
  button: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  icon: {
    color: COLORS.lightGrey,
    fontSize: 40,
  },
});
