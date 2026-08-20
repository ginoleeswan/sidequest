import Head from 'expo-router/head';

/**
 * The document title for a route.
 *
 * Not optional decoration: expo-router's head manager emits its own
 * empty `<title>` into every exported page, and an empty title beats the
 * fallback in `+html.tsx` because the first title element in the
 * document wins. A route that sets nothing therefore ships with a blank
 * browser tab, a blank bookmark, and a blank name in search results —
 * and axe flags it as a serious violation on every load.
 */
export function PageTitle({ children }: { children: string }) {
  return (
    <Head>
      <title>{children}</title>
    </Head>
  );
}
