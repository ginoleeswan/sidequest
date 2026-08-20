import { decodePlan, encodePlan, sharedSummary } from '../planLink';

/**
 * A plan small enough to live in a URL is a plan that needs no account,
 * no server and no copy of anybody's data. What it must do is survive
 * the round trip, including the titles that are not English.
 */
describe('a plan as a link', () => {
  const plan = {
    pace: 6,
    games: [
      { name: 'Celeste', hours: 12 },
      { name: 'Hades II', hours: 21.5 },
    ],
  };

  it('comes back the way it went in', () => {
    expect(decodePlan(encodePlan(plan))).toEqual(plan);
  });

  it('survives a title that is not latin', () => {
    const japanese = { pace: 4, games: [{ name: '龍が如く', hours: 30 }] };
    expect(decodePlan(encodePlan(japanese))).toEqual(japanese);
  });

  it('is URL-safe, so it can be pasted rather than escaped', () => {
    expect(encodePlan(plan)).toMatch(/^[A-Za-z0-9_-]+$/);
  });

  it('keeps a name that contains its own separators, minus them', () => {
    const awkward = { pace: 6, games: [{ name: 'A|B~C', hours: 5 }] };
    expect(decodePlan(encodePlan(awkward))?.games[0].name).toBe('A B C');
  });

  it('stays pasteable by capping the list', () => {
    const many = {
      pace: 6,
      games: Array.from({ length: 40 }, (_, i) => ({
        name: `Game ${i}`,
        hours: 5,
      })),
    };
    expect(decodePlan(encodePlan(many))?.games).toHaveLength(20);
  });

  it('refuses rubbish rather than rendering it', () => {
    expect(decodePlan('not-a-plan')).toBeNull();
    expect(decodePlan('')).toBeNull();
  });

  it('refuses a plan from a format it does not know', () => {
    const future = btoa('9;6;Celeste~12')
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=+$/, '');
    expect(decodePlan(future)).toBeNull();
  });

  it('refuses a pace that is not a pace', () => {
    const broken = btoa('1;0;Celeste~12')
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=+$/, '');
    expect(decodePlan(broken)).toBeNull();
  });

  it('says what the plan adds up to', () => {
    expect(sharedSummary(plan)).toBe(
      '2 games · 34 hours · about 6 weeks at 6h a week'
    );
  });
});
