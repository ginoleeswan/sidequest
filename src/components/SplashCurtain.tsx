/**
 * The web's launch curtain: none.
 *
 * The curtain is the hand-off from a phone's static launch screen, and
 * a browser has no launch screen to hand off from — it never ran here.
 * Its body, its choreography and the curves it samples live in
 * `SplashCurtain.native.tsx`, so the web bundle stops carrying them.
 */
export function SplashCurtain() {
  return null;
}
