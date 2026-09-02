/**
 * The verdict, said the way this app says things.
 *
 * A histogram of five buckets and a percentage are facts; nobody on a
 * sofa reads a histogram. The page used to leave the reader to work
 * out what "94% recommend it" and "38% reached the credits" meant
 * together, which is the one sum worth doing here: a game people love
 * and finish is a different proposition from one they love and put
 * down, and only the two numbers side by side can tell them apart.
 *
 * Written as a small table rather than clever prose generation, so
 * every sentence the page can say is in this file and can be read.
 */
export interface VerdictInput {
  /** Share who rated it recommended or better, 0-100, or null. */
  liked: number | null;
  /** Share of owners who reached the credits, 0-100, or null. */
  finished: number | null;
  hours: number;
}

export function verdictLine({
  liked,
  finished,
  hours,
}: VerdictInput): string | null {
  if (liked == null && finished == null) return null;

  if (liked == null) {
    return finished! >= 45
      ? 'Most who own it reach the credits.'
      : 'Few who own it reach the credits. Worth knowing before you start.';
  }

  if (liked >= 85 && finished != null && finished >= 45) {
    return 'Loved, and finished. The rare one people see all the way through.';
  }
  if (liked >= 70 && finished != null && finished >= 45) {
    return 'Well liked, and most who start it finish it.';
  }
  if (liked >= 70 && finished != null && finished < 25) {
    return hours >= 30
      ? 'Well liked, rarely finished: a long one that people put down.'
      : 'Well liked, rarely finished. Worth knowing before you start.';
  }
  if (liked >= 70) return 'Well liked. Most come away glad they played it.';
  if (liked >= 45) return 'Divided. Loved by some, shrugged at by as many.';
  return 'A hard sell. Most who rated it would not recommend it.';
}
