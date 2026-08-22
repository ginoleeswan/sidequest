/**
 * How far a reader is through a pinned section, 0 to 1.
 *
 * The track is taller than the window; the stage inside it is stuck to
 * the top. Progress is therefore how much of the track's surplus height
 * has passed the top of the window — nothing to do with where the stage
 * is, which by definition never moves.
 *
 * Pure, and separated from the component, because every interesting
 * case here is an edge: a track shorter than the window has no travel
 * and would otherwise divide by zero, and both ends have to clamp or a
 * reader scrolling past the section keeps driving its animation.
 */
export function stageProgress(
  /** The track's top edge in viewport coordinates. */
  top: number,
  trackHeight: number,
  viewportHeight: number
): number {
  const travel = trackHeight - viewportHeight;
  // No surplus to scroll through: the section is either coming or done.
  if (travel <= 0) return top <= 0 ? 1 : 0;

  const scrolled = -top;
  if (scrolled <= 0) return 0;
  if (scrolled >= travel) return 1;
  return scrolled / travel;
}
