import type { PropsWithChildren } from 'react';

/**
 * Static-export HTML shell (web only). Carries the desktop polish the RN
 * tree can't express: themed scrollbars, no white flash before hydration,
 * font smoothing, and text-selection rules that make cards feel like
 * controls instead of copy.
 */
export default function Root({ children }: PropsWithChildren) {
  return (
    <html lang="en">
      <head>
        <meta charSet="utf-8" />
        <meta httpEquiv="X-UA-Compatible" content="IE=edge" />
        <meta
          name="viewport"
          content="width=device-width, initial-scale=1, shrink-to-fit=no, viewport-fit=cover"
        />
        {/* Must equal the html/body canvas below: iOS Safari paints the
            status bar and toolbar with it, and any disagreement shows up
            as a band above the page. COLORS.navy. */}
        <meta name="theme-color" content="#272F3F" />
        <meta name="apple-mobile-web-app-title" content="Sidequest" />
        <link rel="apple-touch-icon" href="/apple-touch-icon.png" />
        <link
          rel="icon"
          href="/icon-192.png"
          type="image/png"
          sizes="192x192"
        />
        {/* Installable: added to a home screen it opens without browser
            chrome, which is both the point of a backlog companion you
            check nightly and the end of every toolbar seam at once. */}
        <link rel="manifest" href="/manifest.webmanifest" />
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta
          name="apple-mobile-web-app-status-bar-style"
          content="black-translucent"
        />

        <title>Sidequest — Discover your next game</title>
        <meta
          name="description"
          content="What's trending, brand new, coming soon, and acclaimed — and a plan for what you can actually finish. No account, no tracking."
        />
        <meta property="og:type" content="website" />
        <meta property="og:site_name" content="Sidequest" />
        <meta
          property="og:title"
          content="Sidequest — Discover your next game"
        />
        <meta
          property="og:description"
          content="Your next game, found — and a plan you'll actually finish."
        />
        <meta
          property="og:image"
          content="https://gosidequest.vercel.app/og.png?v=2"
        />
        <meta property="og:image:width" content="1200" />
        <meta property="og:image:height" content="630" />
        <meta name="twitter:card" content="summary_large_image" />
        <meta
          name="twitter:title"
          content="Sidequest — Discover your next game"
        />
        <meta
          name="twitter:description"
          content="Your next game, found — and a plan you'll actually finish."
        />
        <meta
          name="twitter:image"
          content="https://gosidequest.vercel.app/og.png?v=2"
        />
        <style dangerouslySetInnerHTML={{ __html: css }} />
        <script dangerouslySetInnerHTML={{ __html: startAtTheTop }} />
        <script dangerouslySetInnerHTML={{ __html: registerServiceWorker }} />
      </head>
      <body>
        {/* First tab stop on every page. Without it, reaching the content
            means tabbing past the whole header and sidebar, every time. */}
        <a href="#main" className="skip-link">
          Skip to content
        </a>
        <div id="main">{children}</div>
      </body>
    </html>
  );
}

/**
 * Refreshing shows the top of the page.
 *
 * This was a React effect, and an effect is too late: the browser has
 * already decided where to put the scroll by the time the app hydrates,
 * and setting `scrollRestoration` then only governs the NEXT load. iOS
 * Safari is worse than that — it restores again after the load event,
 * once late images have settled the layout — so a single scrollTo at
 * hydration gets quietly undone.
 *
 * Head script, before first paint, plus the two moments Safari reaches
 * back in: `load`, and `pageshow` for the back-forward cache.
 */
const startAtTheTop = `
  if ('scrollRestoration' in history) history.scrollRestoration = 'manual';
  window.scrollTo(0, 0);
  addEventListener('load', function () { window.scrollTo(0, 0); });
  addEventListener('pageshow', function (e) {
    if (e.persisted) window.scrollTo(0, 0);
  });
`;

/**
 * Registers the worker after load, so it never competes with the first
 * paint for bandwidth. Guarded on support and wrapped in a catch: an
 * environment that refuses workers (private mode, an unusual browser)
 * should lose offline support, not the page.
 */
const registerServiceWorker = `
  if ('serviceWorker' in navigator) {
    window.addEventListener('load', function () {
      navigator.serviceWorker.register('/sw.js').catch(function () {});
    });
  }
`;

const css = `
  html, body {
    /*
     * One ground, top and bottom. iOS Safari tints both toolbars from
     * a single theme-color, and this is the value it uses - so the
     * document's first and last pixels have to be this navy or a
     * toolbar sits as a visibly lighter strip against the page. The
     * footer's depth is drawn with shadow under its waterline rather
     * than with a second ground, for exactly that reason. (COLORS.navy)
     */
    background-color: #272F3F;
    -webkit-font-smoothing: antialiased;
    -moz-osx-font-smoothing: grayscale;
    /* Stop iOS Safari inflating text on rotation. */
    -webkit-text-size-adjust: 100%;
  }
  ::selection { background: #1E69E1; color: #fff; }


  /*
   * THE DOCUMENT IS THE SCROLLER.
   *
   * Nested viewport-height scroll containers can never paint past iOS
   * Safari's viewport units, which stop short of the physical screen
   * edge - content halted at the toolbar no matter which unit sized the
   * box (three attempts' worth of evidence). Skeletons always looked
   * right because they were plain page content. So every page is now
   * plain page content: the body scrolls, Safari paints it edge to edge
   * under both toolbars, and the toolbar minimises on scroll like a
   * native site.
   */
  html, body {
    margin: 0;
    min-height: 100%;
    /*
     * No rubber band at the top. Overscrolling above the first pixel
     * exposes the canvas behind the document, which is the one place
     * the hero's artwork is supposed to run right up to the browser's
     * own chrome. contain rather than none, so pull-to-refresh
     * survives.
     */
    overscroll-behavior-y: contain;
  }
  #root {
    display: flex;
    flex-direction: column;
    min-height: 100dvh;
  }

  * {
    scrollbar-width: thin;
    scrollbar-color: rgba(255,255,255,0.18) transparent;
    -webkit-tap-highlight-color: transparent;
  }
  *::-webkit-scrollbar { width: 10px; height: 10px; }
  *::-webkit-scrollbar-track { background: transparent; }
  *::-webkit-scrollbar-thumb {
    background: rgba(255,255,255,0.18);
    border-radius: 5px;
  }
  *::-webkit-scrollbar-thumb:hover { background: rgba(255,255,255,0.3); }

  /* Cards and nav are controls: dragging across them shouldn't select text. */
  [role="button"], [role="link"] { user-select: none; }

  /* Hover/active color changes ease instead of snapping. Transform and
     opacity stay out: React Native's Animated drives those per-frame and
     a CSS transition would fight it. */
  [role="button"], [role="link"], a {
    transition:
      background-color 0.12s cubic-bezier(0.2, 0, 0, 1),
      border-color 0.12s cubic-bezier(0.2, 0, 0, 1),
      color 0.12s cubic-bezier(0.2, 0, 0, 1);
  }
  @media (prefers-reduced-motion: reduce) {
    [role="button"], [role="link"], a { transition: none; }
  }

  /* Off-screen until focused, then a real, visible target. Hiding it with
     display:none would take it out of the tab order entirely, which is
     the one thing it must not do. */
  .skip-link {
    position: absolute;
    left: -9999px;
    top: 0;
    z-index: 999;
    padding: 12px 18px;
    background: #F2A93B;
    color: #272F3F;
    font-family: Noah-Bold, system-ui, sans-serif;
    font-size: 15px;
    border-radius: 0 0 8px 0;
    text-decoration: none;
  }
  .skip-link:focus { left: 0; }

  /*
   * One focus language: no ring on pointer/programmatic focus, a branded
   * ring for keyboard navigation.
   *
   * The ring was a light blue belonging to no part of this palette, and
   * it is the first thing a stranger sees — opening the welcome moves
   * focus into the dialog, so the very first screen carried a colour the
   * app never uses anywhere else. It is the accent now. (COLORS.accent)
   */
  /*
   * The grade every cover wears.
   *
   * Every <img> in this app is publisher key art — a few thousand
   * different briefs, each graded to shout on somebody else's store
   * page. Pulled fractionally off full saturation, with a touch of
   * contrast to hold the blacks, they stop competing and start looking
   * like one page. The rest of the unification is a veil at the app's
   * own colour, which CoverImage lays over each frame.
   *
   * It lives here because react-native-web drops style keys it does not
   * recognise, so the filter property is unreachable from a StyleSheet.
   * Measured both ways — RN's array form and a CSS string — and both
   * computed to none.
   */
  #root img { filter: saturate(0.92) contrast(1.03); }

  :focus { outline: none; }
  :focus-visible {
    outline: 2px solid #F2A93B;
    outline-offset: 2px;
    border-radius: 4px;
  }
`;
