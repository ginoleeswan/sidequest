import type { ViewStyle } from 'react-native';

/**
 * The style that keeps a page's outer `ScrollView` from silently
 * becoming a second scroll container on web — a CSS trap `about.tsx`
 * fell into once already.
 *
 * `overflow-x: hidden` on that ScrollView is not a rule this page (or
 * any page) asked for — it is react-native-web's own default style for
 * every vertical `ScrollView` on web (`baseVertical` in
 * `react-native-web/dist/exports/ScrollView/index.js`, which pairs
 * `overflowX: 'hidden'` with `overflowY: 'auto'`). It forces
 * `overflow-y` to compute to `auto` per the CSS overflow spec, whether
 * or not anyone asked for a vertical scrollbar. On web, react-native-web
 * renders the `ScrollView` as the element carrying that rule, which
 * silently makes IT the nearest scroll ancestor for everything inside
 * it. `position: sticky` sticks to its nearest scroll container, not to
 * the viewport — so once that ScrollView became one, a `ScrollStage`'s
 * pinned stage anywhere inside it stops pinning to the screen and
 * starts scrolling past with the rest of the page instead, exactly like
 * everything around it. (The document is meant to be the app's only
 * scroller — see the comment in `+html.tsx`.)
 *
 * Because the rule comes from react-native-web itself rather than from
 * any one page's own styling, this latent sticky-defeating trap is
 * app-wide by construction: every vertical `ScrollView` on web carries
 * it, not just this page's. Anyone adding a pinned section inside a
 * `ScrollView` anywhere in the app needs this same fix.
 *
 * `clip` contains overflow the same way `hidden` does — nothing paints
 * past the box's edge either way — but, unlike `hidden`, it does not
 * establish a scroll container, so it does not drag `overflow-y` along
 * with it. Setting the two axes separately, with `overflow-y: visible`
 * explicit, is what keeps the document as the only scroller.
 *
 * If a future pass "simplifies" the caller back to a single `overflow:
 * hidden`, the page's sticky sections pin off again with no error —
 * only a sticky element that quietly stops sticking. That is the
 * failure mode this function exists to name.
 *
 * Native `ScrollView` has no CSS overflow model to trip over and its
 * scrolling behaviour must not change, so this returns `null` off web.
 *
 * `overflow-x: clip` needs Safari 16+ (2022). Older Safari falls back
 * to `visible` on both axes, which un-contains whatever the page was
 * relying on `overflow-x: hidden` for horizontally, but costs nothing
 * critical to a pinned section: `ScrollStage` already degrades cleanly
 * to an unpinned-but-correct build when its own pinning can't take
 * hold, so a reader on an old Safari sees an unpinned build rather
 * than a broken page.
 */
export function webScrollContainerStyle(platformOS: string): ViewStyle | null {
  if (platformOS !== 'web') return null;
  // `overflow-x`/`overflow-y` as separate properties, and the `clip`
  // value, are not in RN's `ViewStyle` type surface — cast confined
  // here, same idiom as `position: sticky` in `Sidebar.tsx` and
  // `ScrollStage.tsx`.
  return { overflowX: 'clip', overflowY: 'visible' } as unknown as ViewStyle;
}
