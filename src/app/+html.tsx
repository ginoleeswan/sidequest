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
          content="https://sidequest-bice-nu.vercel.app/og.png"
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
          content="https://sidequest-bice-nu.vercel.app/og.png"
        />
        <style dangerouslySetInnerHTML={{ __html: css }} />
        <script dangerouslySetInnerHTML={{ __html: registerServiceWorker }} />
      </head>
      <body>{children}</body>
    </html>
  );
}

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
     * The canvas is the FOOTER's colour, not the page's. Every page ends
     * in a flat navy SiteFooter band, and the document ends with it - so
     * wherever iOS Safari paints past the document (under the toolbar,
     * during overscroll) it reads as the footer continuing. The grain
     * texture lives in the app tree and ends, on purpose, at the
     * footer's hairline. (COLORS.navy)
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

  /* One focus language: no ring on pointer/programmatic focus, a branded
     ring for keyboard navigation. */
  :focus { outline: none; }
  :focus-visible {
    outline: 2px solid #7EB1FF;
    outline-offset: 2px;
    border-radius: 4px;
  }
`;
