import { ContentPage, H, P } from '@/components/ContentPage';
import { RouteError } from '@/components/RouteError';

export default function TermsScreen() {
  return (
    <ContentPage title="Terms of Use" updated="September 2026">
      <P>
        Sidequest is a free, independent app and website for planning what to
        play, provided as-is. By using it you agree to the points below.
      </P>
      <H>The service</H>
      <P>
        Sidequest shows video game information and helps you plan your own time
        around it, for personal, non-commercial use. We don’t sell games — store
        links take you to third-party storefronts governed by their own terms.
      </P>
      <H>Your account</H>
      <P>
        An account is optional. If you create one, you are responsible for the
        sign-in method you use and for what you sync to it. You can delete it
        from the app at any time, which removes the account and everything
        synced to it. We may remove an account that is used to abuse the
        service.
      </P>
      <H>The data</H>
      <P>
        Game titles, artwork, and metadata belong to their respective publishers
        and are provided via the RAWG, IGDB, Steam, SteamGridDB and Twitch APIs
        under their terms. Accuracy isn’t guaranteed: release dates, lengths,
        scores, and availability can change or be wrong, and a plan is an
        estimate, not a promise.
      </P>
      <H>No warranty</H>
      <P>
        The service is provided without warranty of any kind. It may change,
        break, or go away. We’re not liable for decisions made on the basis of
        information shown here.
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
