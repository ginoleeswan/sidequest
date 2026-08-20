import { useEffect, useState } from 'react';

import { useReducedMotion } from './useReducedMotion';
import { DURATION, EASING } from '@/styles/motion';

/**
 * A number that arrives by counting rather than by appearing.
 *
 * Only worth doing where the number is the point. On the finish screen
 * "credits rolled" going from forty-three hours to fifty-five is the
 * reward for the thing you just did, and watching it move is the
 * difference between a statistic and a payoff.
 *
 * Returns the target immediately when the user has asked for less
 * animation, or when there is nothing to travel.
 */
export function useCountUp(to: number, from = 0, run = true): number {
  const reduced = useReducedMotion();
  // Derived, not assigned: settling the no-travel cases in state would
  // mean writing to it from inside an effect, which is a cascading
  // render for a value that was never going to change.
  const travels = run && !reduced && from !== to;
  const [value, setValue] = useState(travels ? from : to);

  useEffect(() => {
    if (!travels) return;
    const started = Date.now();
    let frame = 0;
    const tick = () => {
      const elapsed = Date.now() - started;
      const t = Math.min(elapsed / DURATION.entrance, 1);
      // The same curve everything else in the app decelerates on.
      setValue(from + (to - from) * EASING.standard(t));
      if (t < 1) frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [travels, to, from]);

  return travels ? value : to;
}
