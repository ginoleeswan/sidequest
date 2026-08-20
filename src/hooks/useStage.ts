import { useQuery } from '@tanstack/react-query';
import { useMemo, useState } from 'react';

import { useHydrated } from './useHydrated';
import { useTonightPick } from './useTonightPick';
import { getOutThisWeek, getOutTodayCount } from '@/api/rawg';
import type { Game, Paged } from '@/api/types';
import { buildStage, type StageSlide } from '@/lib/stage';

/**
 * The home page's opening argument.
 *
 * Two extra requests at most, both cached for the hour: what came out
 * this week, and how much of it landed today. Everything else the stage
 * needs is already on the page.
 *
 * Gated on hydration for the same reason the old date line was — the
 * HTML is pre-rendered at build time, so a date or a library baked into
 * it is wrong by the next morning.
 */
export function useStage({
  trending,
  short,
  enabled,
}: {
  trending: Game[];
  short: Game[];
  enabled: boolean;
}): StageSlide[] {
  const hydrated = useHydrated();
  const tonight = useTonightPick();
  const [now] = useState(() => Date.now());
  const day = new Date(now).toDateString();

  const week = useQuery({
    queryKey: ['stage-week', day],
    queryFn: () => getOutThisWeek(1),
    select: (r: Paged<Game>) => r.results,
    enabled: enabled && hydrated,
    staleTime: 60 * 60 * 1000,
  });

  const outToday = useQuery({
    queryKey: ['out-today', day],
    queryFn: getOutTodayCount,
    enabled: enabled && hydrated,
    staleTime: 60 * 60 * 1000,
  });

  const fresh = week.data;
  const count = outToday.data;

  /**
   * Nothing until the week has answered.
   *
   * The stage is the page's opening statement, and it used to be built
   * twice: once from what was already loaded, then again a beat later
   * with the fresh slide inserted at the front. Beyond being a statement
   * that changed its mind, prepending into a scroll-snap container makes
   * the browser keep the slide it had snapped to in view — so the stage
   * silently opened on its second slide, but only when the request was
   * slow enough. The page is showing its skeleton over this window
   * anyway.
   *
   * The page's own games count too: they arrive on their own schedule,
   * and a stage assembled before them would be rebuilt when they land.
   */
  const settled =
    (week.isSuccess || week.isError) &&
    (trending.length > 0 || short.length > 0);

  return useMemo(
    () =>
      !settled
        ? []
        : buildStage({
            tonight: hydrated ? tonight : null,
            fresh: fresh ?? [],
            short,
            trending,
            outToday: count ?? 0,
            dateLabel: hydrated
              ? new Date(now).toLocaleDateString(undefined, {
                  weekday: 'long',
                  day: 'numeric',
                  month: 'long',
                })
              : '',
          }),
    [settled, hydrated, tonight, fresh, short, trending, count, now]
  );
}
