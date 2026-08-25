import {
  decodePlan,
  sharedSummary,
  type SharedPlan,
} from '../src/lib/planLink';

/**
 * Link previews for shared plans (Vercel serverless function).
 *
 * A shared plan is the app's ask — somebody sends their week to a
 * friend — and until now the link unfurled as the generic site card,
 * which tells the friend nothing about what they were sent. Game pages
 * got real cards in `api/preview.ts`; the viral surface did not.
 *
 * Unlike a game preview, this one needs no upstream at all: the plan
 * travels inside the link, so the card is a pure function of the URL.
 * No API key, no timeout, no failure mode beyond a link that does not
 * decode — which gets the generic card rather than an error, because a
 * truncated link pasted into a chat should still unfurl as Sidequest.
 *
 * Crawlers only. Humans never reach this file: the vercel.json rule
 * that sends bots here is a REDIRECT, not a rewrite, because rewrites
 * run after the filesystem check and `/shared` is a real static file —
 * a rewrite would never fire. Redirects run first, and every unfurler
 * follows one hop.
 *
 * The decoder is imported from the app, not copied. Two parsers for
 * one link format is how a plan that opens in the app fails to unfurl,
 * or worse, unfurls as a different plan.
 */

const SITE = 'https://gosidequest.vercel.app';

/** Text inside an HTML attribute or body must not be able to close it. */
const escapeHtml = (value: string): string =>
  value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');

/**
 * The list a friend actually reads: names, with lengths.
 *
 * Capped well under every platform's description limit, and the cap is
 * spoken rather than silent — "and 2 more" is information, an ellipsis
 * is an apology.
 */
export function planDescription(plan: SharedPlan): string {
  const SHOWN = 5;
  const named = plan.games
    .slice(0, SHOWN)
    .map((game) => `${game.name} (${Math.round(game.hours)}h)`)
    .join(' · ');
  const rest = plan.games.length - SHOWN;
  const list = rest > 0 ? `${named} and ${rest} more` : named;
  return `${list} — sent with Sidequest, which works out what you can actually finish.`;
}

export function renderPlanPreview(plan: SharedPlan, encoded: string): string {
  const title = `A plan: ${sharedSummary(plan)} — Sidequest`;
  const description = planDescription(plan);
  // Back to the page a human sees, so the unfurl and the tap agree.
  const url = `${SITE}/shared?p=${encodeURIComponent(encoded)}`;

  const og = [
    ['og:type', 'article'],
    ['og:site_name', 'Sidequest'],
    ['og:title', title],
    ['og:description', description],
    ['og:image', `${SITE}/og.png`],
    ['og:url', url],
  ]
    .map(
      ([property, content]) =>
        `<meta property="${property}" content="${escapeHtml(content)}"/>`
    )
    .join('');

  const twitter = [
    ['twitter:card', 'summary_large_image'],
    ['twitter:title', title],
    ['twitter:description', description],
    ['twitter:image', `${SITE}/og.png`],
  ]
    .map(
      ([name, content]) =>
        `<meta name="${name}" content="${escapeHtml(content)}"/>`
    )
    .join('');

  // A crawler that reads text rather than tags still gets a real page.
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"/>
<title>${escapeHtml(title)}</title>
<meta name="description" content="${escapeHtml(description)}"/>
<link rel="canonical" href="${url}"/>
${og}${twitter}
</head><body>
<h1>${escapeHtml(title)}</h1>
<p>${escapeHtml(description)}</p>
<p><a href="${url}">Open this plan on Sidequest</a></p>
</body></html>`;
}

/** The card a link that carries no readable plan falls back to. */
const GENERIC = `<!doctype html><html lang="en"><head><meta charset="utf-8"/>
<title>Sidequest</title>
<meta name="description" content="Know which games you can actually finish."/>
<meta property="og:site_name" content="Sidequest"/>
<meta property="og:title" content="Sidequest"/>
<meta property="og:description" content="Know which games you can actually finish."/>
<meta property="og:image" content="${SITE}/og.png"/>
<meta property="og:url" content="${SITE}/shared"/>
</head><body><h1>Sidequest</h1></body></html>`;

export default function handler(
  req: { query: Record<string, string | string[] | undefined> },
  res: {
    status: (code: number) => { send: (body: string) => void };
    setHeader: (name: string, value: string) => void;
  }
) {
  const raw = req.query.p;
  const encoded = Array.isArray(raw) ? raw[0] : raw;

  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  // Pure function of the URL, so the edge can keep it for a long time.
  res.setHeader(
    'Cache-Control',
    'public, s-maxage=604800, stale-while-revalidate=2592000'
  );

  const plan = encoded ? decodePlan(encoded) : null;
  if (!plan) {
    res.status(200).send(GENERIC);
    return;
  }
  res.status(200).send(renderPlanPreview(plan, encoded as string));
}
