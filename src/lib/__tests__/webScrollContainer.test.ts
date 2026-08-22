import { webScrollContainerStyle } from '../webScrollContainer';

/**
 * Regression coverage for a bug that shipped invisibly: on web,
 * `about.tsx`'s own `overflow-x: hidden` was quietly turning its
 * ScrollView into a second scroll container, which stole `position:
 * sticky` out from under the memcard's `ScrollStage` before it ever
 * reached the screen — measured live as the sticky element's viewport
 * top running 0 -> -720 -> -1440 across the track instead of holding
 * at 0. Nothing here failed loudly; the page just silently stopped
 * pinning.
 *
 * These two values are the entire fix, so they are pinned exactly:
 * `clip` (not `hidden`) is what avoids creating a scroll container,
 * and `overflow-y: visible` (not left to compute on its own) is what
 * keeps the document as the app's only scroller.
 */
describe('webScrollContainerStyle', () => {
  it('clips horizontal overflow on web without creating a scroll container', () => {
    expect(webScrollContainerStyle('web')).toEqual({
      overflowX: 'clip',
      overflowY: 'visible',
    });
  });

  it('leaves native ScrollView behaviour untouched', () => {
    expect(webScrollContainerStyle('ios')).toBeNull();
    expect(webScrollContainerStyle('android')).toBeNull();
  });
});
