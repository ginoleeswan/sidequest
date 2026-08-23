import { Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useBreakpoint } from './useBreakpoint';
import { SPACING } from '@/styles/theme';

/**
 * How much room a screen has to leave above its first line.
 *
 * Every screen in the app opened on `insets.top + SPACING.xl * 2` — 123
 * points on a modern iPhone, a seventh of the screen, before the eyebrow
 * starts. That number was not arbitrary: it was clearing the floating
 * back button that sits over the top-left of a pushed screen.
 *
 * On a tab root it is clearing nothing. Library and Plan stopped being
 * pushed screens when they became tabs, and their back buttons went with
 * that — on native. On the web they keep one, because the web has no tab
 * bar and the screen would otherwise have no way out. So the clearance
 * genuinely differs by platform here, because the chrome does.
 *
 * @param hasBackButton Whether a floating back button sits over this
 * screen on native. True for anything pushed onto the stack.
 */
export function useTopPad(hasBackButton: boolean): number {
  const insets = useSafeAreaInsets();
  const { isExpanded } = useBreakpoint();

  // Wide layouts put a real header above the content and need none of this.
  if (isExpanded) return SPACING.xl * 1.5;

  const clears = hasBackButton || Platform.OS === 'web';
  return insets.top + (clears ? SPACING.xl * 2 : SPACING.md);
}
