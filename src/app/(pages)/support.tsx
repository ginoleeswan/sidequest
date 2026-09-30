import { A, ContentPage, H, P } from '@/components/ContentPage';
import { RouteError } from '@/components/RouteError';

/**
 * The support page the App Store listing points at.
 *
 * Apple asks for a support URL with a way to reach whoever made the
 * app, and this is that page. It answers the questions that come up
 * before anybody has to write in, and then says where to write.
 */
export default function SupportScreen() {
  return (
    <ContentPage title="Support">
      <P>
        Sidequest is made by one person. Questions, bugs and ideas are all
        welcome, and the fastest way to reach me is a GitHub issue — that is
        where fixes get tracked.
      </P>

      <H>Get in touch</H>
      <P>
        Open an issue at{' '}
        <A href="https://github.com/ginoleeswan/sidequest/issues">
          github.com/ginoleeswan/sidequest/issues
        </A>
        , or find me on <A href="https://twitter.com/mrginolee">X (Twitter)</A>{' '}
        or <A href="https://linkedin.com/in/ginoswanepoel">LinkedIn</A>.
      </P>

      <H>Do I need an account?</H>
      <P>
        No. Everything works on the device you are holding. Signing in only
        syncs your library and plan to another device, and you can delete the
        account from the Account screen whenever you like.
      </P>

      <H>Steam won’t connect</H>
      <P>
        Sidequest reads your game list through Valve’s public Web API, which
        only works if your Steam profile’s game details are set to public (Steam
        → Profile → Privacy Settings → Game details). Paste your profile URL,
        your vanity name, or your 17-digit Steam ID.
      </P>

      <H>The widgets are empty</H>
      <P>
        A widget shows tonight’s pick, the week or the month once there is a
        plan to show: save a few games and set your pace on The Plan. If a
        widget stays blank after that, open the app once — it writes the plan
        the widgets read on every launch.
      </P>

      <H>A game’s length is wrong</H>
      <P>
        Lengths come from IGDB and RAWG and are averages. Correct it on the
        game’s page and Sidequest will use your number from then on.
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
