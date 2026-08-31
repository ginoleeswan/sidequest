import Ionicons from '@expo/vector-icons/Ionicons';
import { useRouter } from 'expo-router';
import { Platform, StyleSheet, Text } from 'react-native';

import { ScaleButton } from './ScaleButton';
import { COLORS } from '@/styles/colors';
import { OVER_IMAGE, TYPE } from '@/styles/typography';

/**
 * Whether the page is running as an installed app, chrome-less.
 *
 * In a browser tab the browser itself owns "back" — the toolbar button
 * and the edge swipe — so drawing our own chevron duplicates a control
 * the platform already provides, floating over the artwork as clutter.
 * Installed to a home screen there is no browser chrome at all, and the
 * chevron becomes the only way backwards. Checked once: display-mode
 * does not change within a page's life.
 */
const STANDALONE =
  Platform.OS === 'web' &&
  typeof window !== 'undefined' &&
  typeof window.matchMedia === 'function' &&
  window.matchMedia('(display-mode: standalone)').matches;

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

  /**
   * In a browser tab, the brand chip instead of a chevron.
   *
   * Safari's own back already covers retreat, and the person a shared
   * link brings in has no history here anyway — their back leaves the
   * site. What that person lacks is a way IN, so the top-left corner
   * offers the front door: the wordmark, going Home. The installed app
   * keeps the chevron, where it is the only navigation there is.
   */
  if (!STANDALONE) {
    return (
      <ScaleButton
        onPress={() => router.replace('/')}
        style={styles.brand}
        accessibilityLabel="Go to the Sidequest home page"
      >
        <Text style={[styles.brandMark, onImage && OVER_IMAGE.heading]}>
          SIDEQUEST
        </Text>
      </ScaleButton>
    );
  }

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
  brand: {
    paddingHorizontal: 14,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  brandMark: {
    ...TYPE.label,
    color: COLORS.white,
    letterSpacing: 1.6,
  },
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
