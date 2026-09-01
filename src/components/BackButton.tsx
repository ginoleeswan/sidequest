import Ionicons from '@expo/vector-icons/Ionicons';
import { useRouter } from 'expo-router';
import { Platform, StyleSheet, Text } from 'react-native';

import { Mark } from './Mark';
import { ScaleButton } from './ScaleButton';
import { COLORS } from '@/styles/colors';
import { SPACING } from '@/styles/theme';
import { OVER_IMAGE, WORDMARK } from '@/styles/typography';

/**
 * Whether the page is running as an installed app, chrome-less.
 *
 * In a browser tab the browser itself owns "back" — the toolbar button
 * and the edge swipe — so drawing our own chevron duplicates a control
 * the platform already provides, floating over the artwork as clutter.
 * Installed to a home screen there is no browser chrome at all, and the
 * chevron becomes the only way backwards. Read at render rather than at
 * import: the answer never changes within a page's life, but a module
 * constant is welded shut against tests, and the call costs nothing.
 */
const isStandalone = () =>
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
  if (!isStandalone()) {
    return (
      <ScaleButton
        onPress={() => router.replace('/')}
        style={styles.brand}
        accessibilityLabel="Go to the Sidequest home page"
      >
        {/* The app's one lockup — the mark and the wordmark, exactly as
            the header and the footer set them. A brand drawn three
            ways is three brands; this corner had invented a fourth by
            setting the name in bare label type. */}
        <Mark size={20} />
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
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
    height: 40,
  },
  /**
   * The home page's exact lockup — Mark at 20, wordmark at h1 in
   * lightGrey — not a smaller cousin of it. One brand, one size,
   * whichever page's corner it stands in.
   */
  brandMark: { ...WORDMARK },
  button: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
    // The pill, moved in from the page wrappers: a floating chevron
    // needs a ground to read as a control, and it is the only branch
    // of this component that does.
    borderRadius: 20,
    backgroundColor: COLORS.plate,
    borderWidth: 1,
    borderColor: COLORS.strokeOnImage,
    overflow: 'hidden',
  },
  icon: {
    color: COLORS.lightGrey,
    fontSize: 40,
  },
});
