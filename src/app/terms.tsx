import { ContentPage, H, P } from '@/components/ContentPage';
import { RouteError } from '@/components/RouteError';

export default function TermsScreen() {
  return (
    <ContentPage title="Terms of Use" updated="August 2026">
      <P>
        Sidequest is a free, independent game-discovery site provided as-is. By
        using it you agree to the points below.
      </P>
      <H>The service</H>
      <P>
        Sidequest displays video game information for personal, non-commercial
        discovery. We don’t sell games — store links take you to third-party
        storefronts governed by their own terms.
      </P>
      <H>The data</H>
      <P>
        Game titles, artwork, and metadata belong to their respective publishers
        and are provided via the RAWG API under RAWG’s terms. Accuracy isn’t
        guaranteed: release dates, scores, and availability can change or be
        wrong.
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
