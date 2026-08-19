import { ContentPage, H, P } from '@/components/ContentPage';
import { RouteError } from '@/components/RouteError';

export default function AboutScreen() {
  return (
    <ContentPage title="About Sidequest">
      <P>
        Sidequest is a fast, beautiful way to discover your next game — what’s
        trending, what just came out, what’s coming, and what the critics and
        community actually think.
      </P>
      <H>The story</H>
      <P>
        This project began life in 2021 as ARCADE, a game database browser. In
        2026 it was resurrected, rebuilt on a modern stack, and redesigned into
        what you’re using now. It’s an independent project — not affiliated with
        any platform, publisher, or store.
      </P>
      <H>The data</H>
      <P>
        All game data — titles, artwork, ratings, screenshots, and store links —
        comes from RAWG, one of the largest video game databases in the world.
        Community figures reflect RAWG’s users.
      </P>
      <H>Built with</H>
      <P>
        React Native and Expo, running on web, with a single codebase from phone
        to desktop. Open source on GitHub: ginoleeswan/sidequest.
      </P>
    </ContentPage>
  );
}

/**
 * expo-router renders this instead of the route when its render throws,
 * so one bad screen degrades locally rather than blanking the app.
 */
export function ErrorBoundary(props: {
  error: Error;
  retry: () => Promise<void>;
}) {
  return <RouteError {...props} />;
}
