import { SPACING } from '@/styles/theme';

/**
 * The phone masthead's fixed measures, shared with its skeleton.
 *
 * The masthead used to be a banner: a landscape screenshot cropped to
 * a portrait screen, which lost whatever the picture was composed
 * around, with the name and the figures typed over its foot. It is now
 * what every storefront shelves a game by — the box, standing on an
 * ambient blur of its own artwork, with the title treatment under it.
 * The poster's size is a constant rather than a share of the window so
 * the bones can stand exactly where the art will and the swap is a
 * dissolve rather than a jump.
 */
export const POSTER = { width: 156, height: 208 } as const;

/** Room for the floating back control or the brand lockup above the box. */
export const MASTHEAD_TOP = SPACING.xl * 2;

/**
 * The title's reserved height. The typed name arrives first and the
 * publisher's logo replaces it when it lands; without a fixed slot the
 * page would shift under the reader as the taller mark came in.
 */
export const TITLE_SLOT = 72;
