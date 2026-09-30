import type { Game } from '@/api/types';
import { SPACING } from '@/styles/theme';

/**
 * The web's action bar: none.
 *
 * The bar is pinned under a phone's thumb once the decision has scrolled
 * away, and only a phone gets it — the game page draws it on native and
 * nowhere else. Its real body lives in `GameActionBar.native.tsx`, so the
 * web bundle stops carrying code for a control it never shows. The
 * height is exported here too, because the page reserves room for the
 * bar on every platform it reads it on.
 */
export const ACTION_BAR_HEIGHT = 48 + SPACING.sm2 * 2;

export function GameActionBar(_props: { game: Game; visible: boolean }) {
  return null;
}
