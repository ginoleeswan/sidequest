import { pickTonight, planSchedule, type PlanItem } from '../scheduler';

const WEEK_MS = 7 * 24 * 60 * 60 * 1000;
const NOW = 1_750_000_000_000;

const game = (id: number, hours: number, deadlineWeeks?: number): PlanItem => ({
  id,
  name: `Game ${id}`,
  hours,
  deadline: deadlineWeeks != null ? NOW + deadlineWeeks * WEEK_MS : undefined,
});

describe('planSchedule', () => {
  it('schedules everything when there is no deadline', () => {
    const result = planSchedule([game(1, 40), game(2, 8), game(3, 100)], {
      hoursPerWeek: 5,
      now: NOW,
    });
    expect(result.scheduled).toHaveLength(3);
    expect(result.dropped).toHaveLength(0);
  });

  it('orders no-deadline games shortest first (quick wins early)', () => {
    const result = planSchedule([game(1, 40), game(2, 8), game(3, 100)], {
      hoursPerWeek: 5,
      now: NOW,
    });
    expect(result.scheduled.map((s) => s.id)).toEqual([2, 1, 3]);
  });

  it('projects finish dates from weekly capacity', () => {
    const result = planSchedule([game(1, 10)], { hoursPerWeek: 5, now: NOW });
    // 10 hours at 5 h/week = exactly two weeks out.
    expect(result.scheduled[0].finishAt).toBe(NOW + 2 * WEEK_MS);
  });

  it('evicts the longest game when the window overflows', () => {
    // 4 weeks at 10 h/week = 40 hours of capacity.
    const result = planSchedule([game(1, 30), game(2, 15), game(3, 12)], {
      hoursPerWeek: 10,
      now: NOW,
      deadline: NOW + 4 * WEEK_MS,
    });
    expect(result.dropped.map((d) => d.id)).toEqual([1]);
    expect(result.scheduled.map((s) => s.id).sort()).toEqual([2, 3]);
  });

  it('respects per-item deadlines over the global one', () => {
    const result = planSchedule(
      [game(1, 12, 1), game(2, 2, 1)], // both due in 1 week
      { hoursPerWeek: 10, now: NOW }
    );
    // Only 10 hours exist in week one - the 12h game cannot make it.
    expect(result.dropped.map((d) => d.id)).toEqual([1]);
    expect(result.scheduled.map((s) => s.id)).toEqual([2]);
  });

  it('drops zero-duration items instead of scheduling the unknown', () => {
    const result = planSchedule([game(1, 0), game(2, 5)], {
      hoursPerWeek: 5,
      now: NOW,
    });
    expect(result.dropped.map((d) => d.id)).toEqual([1]);
    expect(result.scheduled.map((s) => s.id)).toEqual([2]);
  });

  it('drops everything when there is no weekly capacity', () => {
    const result = planSchedule([game(1, 5)], { hoursPerWeek: 0, now: NOW });
    expect(result.scheduled).toHaveLength(0);
    expect(result.dropped).toHaveLength(1);
  });

  it('handles a deadline already in the past', () => {
    const result = planSchedule([game(1, 1)], {
      hoursPerWeek: 10,
      now: NOW,
      deadline: NOW - WEEK_MS,
    });
    expect(result.scheduled).toHaveLength(0);
  });

  it('keeps finish times monotonically increasing', () => {
    const result = planSchedule([game(1, 9, 4), game(2, 3, 2), game(3, 6, 6)], {
      hoursPerWeek: 6,
      now: NOW,
    });
    const times = result.scheduled.map((s) => s.finishAt);
    expect([...times].sort((a, b) => a - b)).toEqual(times);
  });

  it('never loses a game: scheduled + dropped === input', () => {
    const items = [game(1, 3, 1), game(2, 0), game(3, 40, 2), game(4, 7)];
    const result = planSchedule(items, { hoursPerWeek: 8, now: NOW });
    const ids = [
      ...result.scheduled.map((s) => s.id),
      ...result.dropped.map((d) => d.id),
    ].sort();
    expect(ids).toEqual([1, 2, 3, 4]);
  });

  describe('optimality (brute force cross-check)', () => {
    /** Max on-time count by enumerating every subset in EDD order. */
    function bruteForceBest(items: PlanItem[], hoursPerWeek: number): number {
      let best = 0;
      const n = items.length;
      for (let mask = 0; mask < 1 << n; mask++) {
        const subset = items
          .filter((_, i) => mask & (1 << i))
          .sort((a, b) => (a.deadline ?? Infinity) - (b.deadline ?? Infinity));
        let clock = 0;
        let feasible = true;
        for (const job of subset) {
          clock += job.hours;
          const cap =
            job.deadline == null
              ? Infinity
              : ((job.deadline - NOW) / WEEK_MS) * hoursPerWeek;
          if (clock > cap) {
            feasible = false;
            break;
          }
        }
        if (feasible) best = Math.max(best, subset.length);
      }
      return best;
    }

    // Deterministic pseudo-random cases: mixed durations and deadlines.
    const CASES: PlanItem[][] = [
      [game(1, 5, 1), game(2, 9, 2), game(3, 2, 2), game(4, 12, 3)],
      [
        game(1, 20, 2),
        game(2, 20, 2),
        game(3, 1, 1),
        game(4, 3, 4),
        game(5, 8, 4),
      ],
      [
        game(1, 7),
        game(2, 14, 1),
        game(3, 3, 1),
        game(4, 6, 2),
        game(5, 2, 3),
        game(6, 10),
      ],
      [
        game(1, 4, 1),
        game(2, 4, 1),
        game(3, 4, 1),
        game(4, 4, 2),
        game(5, 4, 2),
      ],
      [game(1, 30, 1), game(2, 1, 1), game(3, 1, 1), game(4, 1, 1)],
    ];

    it.each(CASES.map((c, i) => [i, c] as const))(
      'matches the brute-force optimum (case %i)',
      (_, items) => {
        const hoursPerWeek = 10;
        const result = planSchedule(items, { hoursPerWeek, now: NOW });
        expect(result.scheduled.length).toBe(
          bruteForceBest(items, hoursPerWeek)
        );
      }
    );
  });
});

describe('pickTonight', () => {
  const items = [
    { id: 1, name: 'Long RPG', hours: 60 },
    { id: 2, name: 'Short indie', hours: 1.5 },
    { id: 3, name: 'Mid game', hours: 8, playing: true },
  ];

  it('picks the biggest game that fits the session', () => {
    expect(pickTonight(items, 120).finishable?.id).toBe(2);
  });

  it('returns null finishable when nothing fits', () => {
    expect(pickTonight(items, 30).finishable).toBeNull();
  });

  it('always offers the in-progress game to continue', () => {
    expect(pickTonight(items, 30).continueGame?.id).toBe(3);
  });

  it('falls back to the shortest game overall', () => {
    expect(pickTonight(items, 10).shortest?.id).toBe(2);
  });
});
