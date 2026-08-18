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
`;
