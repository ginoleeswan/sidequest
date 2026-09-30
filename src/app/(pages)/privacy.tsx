import { A, ContentPage, H, P } from '@/components/ContentPage';
import { RouteError } from '@/components/RouteError';

/**
 * The privacy policy, for the app and the site alike.
 *
 * Written to be true of the build that ships, not of the one that came
 * before it: an earlier version said "no accounts, no sign-in", which
 * stopped being so the day sync arrived. Everything the app sends off
 * the device is named here, with what it is for and where it goes, and
 * the App Store's privacy questionnaire is answered from this page
 * rather than the other way around (docs/app-store/app-privacy.md).
 */
export default function PrivacyScreen() {
  return (
    <ContentPage title="Privacy" updated="September 2026">
      <P>
        The short version: Sidequest works without an account, keeps your
        library on your device, and collects nothing it doesn’t need to do the
        one thing you asked it to do. This page names everything that leaves the
        device, what it’s for, and how to delete it.
      </P>

      <H>What stays on your device</H>
      <P>
        Your library, your plan, your pace, your play sessions, what you dropped
        and why, what you searched for and what you recently viewed all live in
        the app’s own storage on this device. None of it is sent anywhere unless
        you sign in (below) or share something yourself. The widgets read the
        same data from a container on the device that only Sidequest can open;
        they never go online. Deleting the app deletes all of it.
      </P>

      <H>If you sign in</H>
      <P>
        Signing in is optional and unlocks nothing — it exists so your library
        and plan can follow you to another device. You can sign in with Apple,
        with Google, or with a link sent to your email. We store the email
        address your provider gives us and an account identifier; if you use
        Hide My Email with Apple, that relay address is all we see. We never
        receive a password, and we do not use your email for anything other than
        the sign-in link you asked for.
      </P>
      <P>
        While you are signed in, the following syncs to our servers and is
        stored against your account: your library and its shelves; your plan,
        pace and the game lengths you corrected; your notes, tags, deadlines and
        ratings; and, if you connected Steam, your Steam ID, profile name and
        avatar so the other device can connect too. Play sessions, drop reasons,
        searches and recently viewed stay on the device and are never uploaded.
      </P>
      <P>
        Accounts and synced data are stored with Supabase in the European Union.
        Each row is protected by a policy that lets only its owner read or write
        it. We do not sell, share or use any of it for advertising or analytics
        — there are none in the app.
      </P>

      <H>Deleting your account</H>
      <P>
        Account → Delete account removes your account and everything synced to
        it from our servers, immediately and permanently. Nothing on the device
        is touched: the app signs out and your library stays exactly where it
        was. Signing out without deleting keeps the account and its data until
        you come back.
      </P>

      <H>Steam</H>
      <P>
        If you connect Steam, the profile name or ID you type is sent through
        our server to Valve’s official Web API to look up your public game list
        and hours. Our server keeps none of it; the result is stored on your
        device, and on your account only if you are signed in. Steam can only be
        read this way if your Steam profile’s game details are public, and
        disconnecting removes the snapshot from the device.
      </P>

      <H>Game data</H>
      <P>
        Game titles, artwork, screenshots, trailers, release dates and how long
        games take come from RAWG, IGDB, Steam, SteamGridDB and Twitch, fetched
        through our own domain so that no API key ever reaches your device.
        Those requests carry the game being looked up and nothing about you.
        Store links open the storefront in your browser, where that store’s own
        privacy policy applies.
      </P>

      <H>Crash reports</H>
      <P>
        When a screen breaks, Sidequest sends the shape of that failure — the
        error message, the technical stack trace, which screen it happened on
        and the window size — so it can be fixed. That report carries no
        identifier, sets no cookie, and cannot be linked to you or to any other
        report. It never includes what you searched for, what you viewed, or
        anything in your library.
      </P>

      <H>Calendar and notifications</H>
      <P>
        If you ask for it, Sidequest writes your planned evenings and finished
        games into a calendar of its own on this device, and reminds you of an
        evening or a deadline with a local notification. Both are done entirely
        on the device, only after you grant permission, and can be switched off
        in Settings at any time. We never read your other calendars, and there
        is no push server.
      </P>

      <H>Sharing</H>
      <P>
        Sharing a plan makes a link that carries the plan inside it; anyone with
        the link can see those games and dates, and nothing else. The Memcard
        share makes an image on the device and hands it to the share sheet.
        Neither is stored by us.
      </P>

      <H>Hosting</H>
      <P>
        The site and the API proxies run on Vercel, whose servers process
        standard connection logs (such as IP addresses) to serve requests.
        Vercel’s and Supabase’s privacy policies govern that processing.
      </P>

      <H>Children</H>
      <P>
        Sidequest is not directed at children under 13, and we do not knowingly
        collect information from them.
      </P>

      <H>Changes and contact</H>
      <P>
        If this policy changes, this page will say so with the date above
        updated. Questions and requests about your data go to{' '}
        <A href="https://github.com/ginoleeswan/sidequest/issues">
          github.com/ginoleeswan/sidequest/issues
        </A>
        , or reach the developer through the links on the Support page.
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
