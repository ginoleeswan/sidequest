import { ScrollViewStyleReset } from 'expo-router/html';
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
        <meta name="theme-color" content="#333D51" />
        <meta name="apple-mobile-web-app-title" content="Sidequest" />
        <link rel="apple-touch-icon" href="/apple-touch-icon.png" />

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
        <ScrollViewStyleReset />
        <style dangerouslySetInnerHTML={{ __html: css }} />
      </head>
      <body>{children}</body>
    </html>
  );
}

const css = `
  html, body {
    background-color: #333D51;
    /*
     * The page's noise texture, flattened onto the page colour and inlined
     * (~7KB). Wherever the app's own painted root ends short of the true
     * screen edge (iOS Safari's bottom toolbar / home-indicator region),
     * the body shows through with the identical grain instead of a flat
     * strip - the seam disappears.
     */
    background-image: url(data:image/jpeg;base64,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);
    background-size: 96px 96px;
    background-repeat: repeat;
    -webkit-font-smoothing: antialiased;
    -moz-osx-font-smoothing: grayscale;
    /* Stop iOS Safari inflating text on rotation. */
    -webkit-text-size-adjust: 100%;
  }
  ::selection { background: #1E69E1; color: #fff; }

  /* Full-bleed: the page owns the whole viewport including behind the
     iOS status bar and floating toolbar. */
  html, body, #root {
    height: 100%;
    margin: 0;
  }

  /*
   * React Native Web renders every FlatList as its own nested scroll
   * container sized to its parent. At height:100% that parent is the
   * *small* viewport - the area excluding iOS Safari's floating toolbar -
   * so list content stops dead at the toolbar instead of running beneath
   * it (which is why the skeletons, which are not inside a scroller and
   * therefore scroll the document, looked right and the loaded lists did
   * not). Sizing to the large viewport makes the scroller itself extend
   * behind the browser chrome.
   */
  @supports (height: 100lvh) {
    html, body, #root {
      height: calc(100lvh + env(safe-area-inset-bottom, 0px));
    }
  }

  body {
    /* Stop the rubber-band from revealing a white void past the ends. */
    overscroll-behavior-y: none;
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
      background-color 0.18s ease,
      border-color 0.18s ease,
      color 0.18s ease;
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
