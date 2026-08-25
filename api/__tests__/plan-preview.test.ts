import handler, { planDescription, renderPlanPreview } from '../plan-preview';
import { decodePlan, encodePlan } from '../../src/lib/planLink';

/**
 * The card a shared plan unfurls into.
 *
 * The plan travels inside the link, so unlike the game previews there
 * is no upstream to mock and no failure but a link that does not
 * decode — which must fall back to the generic card, because a
 * truncated link pasted into a chat should still unfurl as Sidequest
 * rather than as an error.
 */

const plan = {
  pace: 8,
  games: [
    { name: 'Hades', hours: 12 },
    { name: 'Tunic', hours: 12 },
    { name: 'Outer Wilds', hours: 16 },
  ],
};

function respond(p?: string) {
  const headers: Record<string, string> = {};
  let sent = '';
  let code = 0;
  handler(
    { query: p === undefined ? {} : { p } },
    {
      setHeader: (name, value) => void (headers[name] = value),
      status: (c) => {
        code = c;
        return { send: (body: string) => void (sent = body) };
      },
    }
  );
  return { headers, sent, code };
}

describe('planDescription', () => {
  it('reads as the list a friend was sent', () => {
    expect(planDescription(plan)).toContain('Hades (12h) · Tunic (12h)');
    expect(planDescription(plan)).toContain('actually finish');
  });

  it('speaks its cap instead of trailing off', () => {
    const many = {
      pace: 8,
      games: Array.from({ length: 8 }, (_, i) => ({
        name: `Game ${i + 1}`,
        hours: 10,
      })),
    };
    const text = planDescription(many);
    expect(text).toContain('and 3 more');
    expect(text).not.toContain('Game 6');
  });
});

describe('renderPlanPreview', () => {
  const encoded = encodePlan(plan);
  const html = renderPlanPreview(plan, encoded);

  it('titles the card with the plan’s own summary', () => {
    expect(html).toContain('A plan: 3 games · 40 hours');
  });

  it('sends the tap to the page a human sees', () => {
    // The unfurl and the tap must agree: og:url goes back to /shared
    // with the same payload, never to this API route.
    expect(html).toContain(
      `content="https://gosidequest.vercel.app/shared?p=${encodeURIComponent(encoded)}"`
    );
    expect(html).not.toContain('/api/plan-preview');
  });

  it('cannot be broken out of by a game name', () => {
    const hostile = renderPlanPreview(
      { pace: 6, games: [{ name: '"/><script>alert(1)</script>', hours: 2 }] },
      'x'
    );
    expect(hostile).not.toContain('<script>alert(1)</script>');
  });
});

describe('the handler', () => {
  it('unfurls a real link', () => {
    const { code, sent, headers } = respond(encodePlan(plan));
    expect(code).toBe(200);
    expect(sent).toContain('A plan: 3 games');
    // Pure function of the URL, so the edge may keep it a long time.
    expect(headers['Cache-Control']).toContain('s-maxage');
  });

  it('round-trips through the app’s own decoder', () => {
    // The whole reason the decoder is imported rather than copied: what
    // this card describes must be exactly what the page will open.
    const encoded = encodePlan(plan);
    expect(decodePlan(encoded)?.games.map((g) => g.name)).toEqual([
      'Hades',
      'Tunic',
      'Outer Wilds',
    ]);
    expect(respond(encoded).sent).toContain('Outer Wilds');
  });

  it('gives a truncated link the generic card, not an error', () => {
    const { code, sent } = respond('definitely-not-a-plan');
    expect(code).toBe(200);
    expect(sent).toContain('Know which games you can actually finish');
    expect(sent).not.toContain('A plan:');
  });

  it('gives a bare visit the generic card too', () => {
    expect(respond().code).toBe(200);
  });
});
