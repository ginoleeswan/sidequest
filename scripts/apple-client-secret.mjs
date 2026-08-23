#!/usr/bin/env node
/**
 * Apple's client secret for Supabase, which is not the .p8 file.
 *
 * This trips everyone up once. Supabase's Apple provider asks for a
 * "Secret Key" and Apple gives you a .p8, so the obvious move is to
 * paste the .p8 in — and it fails. The .p8 is a PRIVATE KEY used to
 * SIGN a short-lived JWT, and that JWT is the secret. Apple documents
 * this as "Creating a client secret"; the dashboard field name does not
 * hint at any of it.
 *
 * Everything here runs on this machine. The key is read, used to sign,
 * and never written anywhere or sent to anything.
 *
 * Apple caps the lifetime at six months, so this has to be re-run and
 * re-pasted twice a year or web sign-in stops working. That is not a
 * bug in this script — it is Apple's rule, and Supabase warns about it
 * on the same panel.
 *
 * Usage:
 *   node scripts/apple-client-secret.mjs path/to/AuthKey_ABC123XYZ.p8
 *
 * The Key ID is read from the filename, which is how Apple names the
 * download. Override any of it with flags if yours was renamed:
 *   --key-id ABC123XYZ  --team-id A85929B4HV  --client-id com.x.y
 */
import { Buffer } from 'node:buffer';
import { createSign } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { basename } from 'node:path';

/** Sidequest's own values, so the common case needs no flags. */
const TEAM_ID = 'A85929B4HV';
const CLIENT_ID = 'com.glstudio.sidequest.signin';

/**
 * 180 days, deliberately short of Apple's six-month ceiling.
 *
 * The limit is documented as "six months", which is not a number of
 * seconds — and the value copied around the internet, 15777000, works
 * out at 182.6 days, close enough to the edge that whether it is
 * accepted depends on how Apple rounds a month. The three days that
 * buys are worth nothing; a token rejected as invalid_client with no
 * explanation costs an afternoon. So: comfortably inside, on purpose.
 */
const MAX_LIFETIME = 180 * 24 * 60 * 60;

const args = process.argv.slice(2);
const flag = (name) => {
  const i = args.indexOf(`--${name}`);
  return i === -1 ? undefined : args[i + 1];
};

const keyPath = args.find((a) => !a.startsWith('--') && a.endsWith('.p8'));
if (!keyPath) {
  console.error(`
Give it the .p8 Apple let you download once:

  node scripts/apple-client-secret.mjs ~/Downloads/AuthKey_ABC123XYZ.p8

If you no longer have that file, it cannot be recovered — revoke the key
in the developer portal and create a new one.
`);
  process.exit(1);
}

// Apple names the download AuthKey_<KEYID>.p8, so the id is right there.
const keyId =
  flag('key-id') ?? basename(keyPath).match(/AuthKey_(\w+)\.p8/)?.[1];
if (!keyId) {
  console.error(
    'Could not read a Key ID from the filename. Pass it: --key-id ABC123XYZ'
  );
  process.exit(1);
}

const teamId = flag('team-id') ?? TEAM_ID;
const clientId = flag('client-id') ?? CLIENT_ID;
const key = readFileSync(keyPath, 'utf8');

const now = Math.floor(Date.now() / 1000);
const b64url = (obj) => Buffer.from(JSON.stringify(obj)).toString('base64url');

const header = b64url({ alg: 'ES256', kid: keyId });
const payload = b64url({
  iss: teamId,
  iat: now,
  exp: now + MAX_LIFETIME,
  aud: 'https://appleid.apple.com',
  sub: clientId,
});

/**
 * ieee-p1363, not the DER default.
 *
 * Node signs ECDSA as DER unless told otherwise, and a JWS signature is
 * the raw r‖s pair. Sign this with the default and you get a token that
 * looks entirely correct, base64-decodes fine, and is rejected by Apple
 * with a bare invalid_client — an afternoon of debugging hidden in one
 * option.
 */
const signer = createSign('SHA256');
signer.update(`${header}.${payload}`);
const signature = signer.sign({ key, dsaEncoding: 'ieee-p1363' }, 'base64url');

const expires = new Date((now + MAX_LIFETIME) * 1000);
console.error(`
Client ID : ${clientId}
Team ID   : ${teamId}
Key ID    : ${keyId}
Expires   : ${expires.toDateString()}  ← re-run before this

Paste the line below into Supabase → Authentication → Providers →
Apple → "Secret Key (for OAuth)", then enable the toggle and Save.
`);
// stdout alone, so it can be piped straight to the clipboard:
//   node scripts/apple-client-secret.mjs key.p8 | pbcopy
console.log(`${header}.${payload}.${signature}`);
