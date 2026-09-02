import { Platform } from 'react-native';

import { COLORS } from '@/styles/colors';

/**
 * The one header every native stack draws.
 *
 * Transparent, chevron only: several screens open on full-bleed
 * artwork that must run under the status bar, and UIKit still floats
 * the back control on its own glass capsule. Web keeps its hand-drawn
 * button — there is no navigation bar in a browser — so the header is
 * off there.
 *
 * Shared between the root stack and the route groups nested inside it,
 * so a game pushed from a game gets exactly the header a game pushed
 * from a tab did.
 */
export const NATIVE_STACK_OPTIONS = {
  headerShown: Platform.OS !== 'web',
  headerTransparent: true,
  headerTitle: '',
  /* Chevron only. Without this the capsule reads "(tabs)" — UIKit
     labels the back button with the previous route's name, and the
     previous route is a group. */
  headerBackButtonDisplayMode: 'minimal' as const,
  headerBackTitle: '',
  headerTintColor: COLORS.white,
  contentStyle: { backgroundColor: COLORS.darkGrey },
};
