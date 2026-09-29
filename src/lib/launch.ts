/**
 * Whether the launch curtain is still up, and a queue for the work that
 * should wait for it.
 *
 * The splash curtain runs on the native driver, but it shares the main
 * thread with everything the first screen mounts underneath it — and
 * Home mounts a lot: nine shelves, dozens of tiles, their images. All of
 * it landing in the curtain's second is what made the hand-off stutter.
 * So what is below the fold waits until the curtain has gone, and then
 * comes in one piece at a time rather than in one burst on the frame the
 * stage starts its entrance.
 *
 * Nothing waits unless a curtain was actually raised: tests, the web and
 * any screen mounted later all see it down.
 */

let curtainUp = false;
const waiting: (() => void)[] = [];
let draining = false;

/** Between one deferred piece and the next: about three frames. */
const GAP = 48;
/** The longest anything will wait, whatever happens to the curtain. */
const SAFETY = 3000;

/** The curtain is starting. Called once, by SplashCurtain. */
export function raiseCurtain(): void {
  if (curtainUp) return;
  curtainUp = true;
  setTimeout(lowerCurtain, SAFETY);
}

/** The curtain has gone: release what waited, one piece at a time. */
export function lowerCurtain(): void {
  if (!curtainUp) return;
  curtainUp = false;
  drain();
}

function drain() {
  if (draining) return;
  draining = true;
  const next = () => {
    const release = waiting.shift();
    if (!release) {
      draining = false;
      return;
    }
    release();
    setTimeout(next, GAP);
  };
  next();
}

/** Read once, outside React: is the curtain up right now? */
export function isCurtainUp(): boolean {
  return curtainUp || draining;
}

/**
 * Queue a piece of deferred work behind the curtain. Runs at once if
 * the curtain is already down; otherwise after it, in order, spaced.
 * Returns a cancel for a caller that unmounts first.
 */
export function afterCurtain(run: () => void): () => void {
  if (!curtainUp && !draining) {
    run();
    return () => {};
  }
  let live = true;
  const release = () => live && run();
  waiting.push(release);
  if (!curtainUp) drain();
  return () => {
    live = false;
  };
}
