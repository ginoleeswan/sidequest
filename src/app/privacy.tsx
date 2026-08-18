import { ContentPage, H, P } from '@/components/ContentPage';

export default function PrivacyScreen() {
  return (
    <ContentPage title="Privacy" updated="August 2026">
      <P>The short version: Sidequest doesn’t want your data.</P>
      <H>What we collect</H>
      <P>
        Nothing. Sidequest has no accounts, no sign-in, no analytics scripts, no
        advertising, and no cookies set by us. Your searches and browsing happen
        in your browser and are not stored by us.
      </P>
      <H>Third parties</H>
      <P>
        Game data is fetched from the RAWG API, proxied through our own domain.
        Standard web server logs (such as IP addresses) may be processed by our
        hosting provider, Vercel, to serve the site. Their privacy policy
        governs that processing.
      </P>
      <H>Changes</H>
      <P>
        If this policy ever changes — for example, if accounts are added — this
        page will say so, with the date above updated.
      </P>
    </ContentPage>
  );
}
