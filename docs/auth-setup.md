# Auth providers — what exists and why

Configured by hand across three consoles. Written down because none of
it lives in this repository, and the next person to touch it (including
future us) will otherwise be reverse-engineering a dashboard.

## Supabase

|          |                                                             |
| -------- | ----------------------------------------------------------- |
| Project  | `sidequest` — `kcefulsgjqiqrupxllsn`                        |
| Org      | `gL-studios` — `fkusqmdnuhrghilomche`                       |
| Region   | `eu-west-1`                                                 |
| Callback | `https://kcefulsgjqiqrupxllsn.supabase.co/auth/v1/callback` |

Enabled: **Email**, **Apple**, **Google**.

### Redirect URLs

Authentication → URL Configuration → Redirect URLs has to list every
place a sign-in link is allowed to land, or Supabase sends the link to
the Site URL instead and the app never sees it. The web needs the
deployment's origin; native needs the app's own scheme, one per build
variant (`app.config.js`), all pointing at the You page where the
sign-in row lives:

```
https://gosidequest.vercel.app
sidequest://you
sidequest-dev://you
sidequest-preview://you
```

The email flow depends on this on native: the app reads the session out
of the URL it is opened with (`lib/auth.tsx`), which it can only do if
the link was allowed to open the app.

## Google

Cloud project `sidequest-506413`, under `ginoleemusic@gmail.com`. One
project per product, matching Lala / Hero / Karma Kart / glow / Trxy.

Two OAuth clients, and both are needed:

| Client | ID                                               | For                                                                                      |
| ------ | ------------------------------------------------ | ---------------------------------------------------------------------------------------- |
| Web    | `856441670004-4n9usmi6uiuotb8pirolc01maighaast…` | the web redirect flow; Supabase exchanges the code server-side, so this one has a secret |
| iOS    | `856441670004-huokukuefp2ejpo667u8584vaig3iohf…` | native sign-in. A public client — no secret exists for it                                |

Both IDs go in Supabase's Google → Client IDs. Supabase validates the
`aud` of an incoming ID token against that list, so omitting the iOS one
makes native sign-in fail with a token that is otherwise perfectly valid.

The consent screen is **External**, which starts in **testing mode**:
only Google accounts added as test users can sign in at all. It has to
be published before real users exist.

## Apple

Team `A85929B4HV`.

| Kind        | Identifier                                        |
| ----------- | ------------------------------------------------- |
| App ID      | `com.glstudio.sidequest` — Sign In with Apple     |
| App ID      | `com.glstudio.sidequest.dev` — Sign In with Apple |
| Services ID | `com.glstudio.sidequest.signin`                   |
| Key         | `W3GA4TG97B`                                      |

None of these existed before — the app had no Apple presence at all, and
the simulator builds worked purely on a local bundle identifier.

Supabase's Apple → Client IDs holds **three** values, and the reason is
easy to get wrong: the web flow authenticates as the **Services ID**,
while native Sign in with Apple sends the **bundle ID** as the token
audience. Miss `.dev` and sign-in works in production and fails in the
build you are testing in.

### The secret is not the .p8

Supabase asks for a "Secret Key"; Apple gives you a `.p8`. The `.p8` is
a private key used to _sign_ a JWT, and that JWT is the secret. Generate
it with:

```
npm run apple:secret path/to/AuthKey_W3GA4TG97B.p8 | pbcopy
```

**It expires every 180 days.** Web Sign in with Apple stops working when
it does — silently, from the app's point of view. Native is unaffected;
it uses the ID token flow and never touches this secret.

Current secret expires: **19 Feb 2027**.

## Still to do

- Publish the Google consent screen (currently testing-mode only)
- Configure SMTP — "Confirm email" is on, and Supabase's shared sender
  is rate-limited and not for production
- An Android OAuth client, if Android ever ships
