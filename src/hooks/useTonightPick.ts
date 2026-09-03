import { useMemo, useState } from 'react';

import { useHydrated } from './useHydrated';
import { remainingHours } from '@/lib/duration';
import { useDurations } from '@/lib/durations';
import { useLibrary } from '@/lib/library';
import { pickTonight } from '@/lib/scheduler';
import { sessionMinutesFor } from '@/lib/sessions';
import type { TonightPick } from '@/lib/stage';

/**
 * How long tonight is.
 *
 * Ninety minutes is a Tuesday. Read once, after hydration — the
 * pre-rendered HTML has no idea what day it is being read on, and a
 * Saturday's answer in Monday's markup is a hydration mismatch.
 */
function useSessionMinutes(): number {
  const hydrated = useHydrated();
  const [minutes] = useState(() => sessionMinutesFor());
  return hydrated ? minutes : 90;
}

/**
 * The one thing to play tonight.
 *
 * Everything else on the home page is a storefront — the same rows for
 * everyone. This is the part only Sidequest can answer: given what you
 * saved and how long those games take, here is the one you could
 * actually finish this evening. Null when there is nothing to say, which
 * is most of the time on a first visit.
 */
export function useTonightPick(): TonightPick | null {
  const sessionMinutes = useSessionMinutes();
  const { byStatus } = useLibrary();
  const { durationOf } = useDurations();

  return useMemo(() => {
    const entries = [
      ...byStatus('playing').map((e) => ({ entry: e, playing: true })),
      ...byStatus('wishlist').map((e) => ({ entry: e, playing: false })),
    ];

    const tonight = pickTonight(
      entries.map(({ entry, playing }) => ({
        id: entry.game.id,
        name: entry.game.name,
        hours: remainingHours(durationOf(entry.game).hours, {
          hoursPlayed: entry.hoursPlayed,
          playing,
        }),
        playing,
      })),
      sessionMinutes
    );

    const chosen =
      tonight.finishable ?? tonight.continueGame ?? tonight.shortest;
    const found = entries.find((e) => e.entry.game.id === chosen?.id)?.entry;
    const game = found?.game;
    if (!chosen || !game || !found) return null;

    /**
     * How far in, when the library knows.
     *
     * Only for a game with hours on it: a wishlist pick has nothing to
     * measure, and a bar sitting at zero says "you have not started"
     * in the loudest place on the page, which is the one thing the
     * stage must never say about the game it is recommending.
     */
    const total = durationOf(game).hours;
    const played = found.hoursPlayed ?? 0;
    const progress =
      played > 0 && total > 0 ? Math.min(played / total, 1) : undefined;

    return {
      game,
      hours: chosen.hours,
      verb: tonight.finishable
        ? 'Finish'
        : tonight.continueGame
          ? 'Continue'
          : 'Start',
      reason: tonight.finishable
        ? 'You could see the credits before bed.'
        : tonight.continueGame
          ? 'Already under way — chip away at it.'
          : 'The shortest thing you’ve saved.',
      progress,
    };
  }, [byStatus, durationOf, sessionMinutes]);
}
