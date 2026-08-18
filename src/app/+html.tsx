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
      height: 100lvh;
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
`;
