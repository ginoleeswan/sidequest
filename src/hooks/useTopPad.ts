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
 * screen on native. True for anything pushed onto the stack; false for
 * a tab root, whose wordmark row is laid out above the page.
 */
export function useTopPad(hasBackButton: boolean): number {
  const insets = useSafeAreaInsets();
  const { isExpanded } = useBreakpoint();

  // A desk page stands in the sidebar shell, whose column already pads
  // the top; forty-eight more was the clearance for a top bar that no
  // longer exists, and it read as a page that had forgotten to start.
  if (isExpanded) return SPACING.md;

  if (hasBackButton || Platform.OS === 'web')
    return insets.top + SPACING.xl * 2;

  // A native tab root opens on its wordmark row, and that row sits in
  // the flow above the page having already cleared the status bar. The
  // page used to clear it a second time — sixty dead points between the
  // brand and the title on every tab, the first thing the screenshots
  // showed. What is left is only the air between a row and a heading.
  return SPACING.sm;
}
