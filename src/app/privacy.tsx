import { ContentPage, H, P } from '@/components/ContentPage';
import { RouteError } from '@/components/RouteError';

export default function PrivacyScreen() {
  return (
    <ContentPage title="Privacy" updated="August 2026">
      <P>The short version: Sidequest doesn’t want your data.</P>
      <H>What we collect</H>
      <P>
        Nothing about you. Sidequest has no accounts, no sign-in, no analytics,
        no advertising, and no cookies set by us. Your searches, your browsing
        and your library stay in your browser — the library never leaves this
        device unless you copy it out yourself.
      </P>
      <H>Crash reports</H>
      <P>
        When a screen breaks, Sidequest sends the shape of that failure — the
        error message, the technical stack trace, which page it happened on, and
        your window size — so it can be fixed. That report carries no
        identifier, sets no cookie, and cannot be linked to you or to any other
        report. It never includes what you searched for, what you viewed, or
        anything in your library.
      </P>
      <H>Third parties</H>
      <P>
        Game data is fetched from the RAWG API, proxied through our own domain.
        Standard web server logs (such as IP addresses) may be processed by our
        hosting provider, Vercel, to serve the site. Their privacy policy
        governs that processing.
      </P>
      <P>
        If you connect Steam, your profile name is sent to Valve’s official Web
        API through our server to look up your games and hours. The result is
        kept on your device, and our server stores none of it.
      </P>
      <H>Changes</H>
      <P>
        If this policy ever changes — for example, if accounts are added — this
        page will say so, with the date above updated.
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
