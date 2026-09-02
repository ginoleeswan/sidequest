import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

import appConfig from '../../../app.config.js';
import { SITE_ORIGIN } from '@/constants/site';

/**
 * Universal links: a game link in a message opens the app, not Safari.
 *
 * Three files have to agree and none of them can check the others.
 * `app.json` claims the domain through an entitlement; the site
 * publishes an association file naming which apps may claim it and
 * which paths they take; `vercel.json` has to serve that file where
 * Apple looks, as JSON. A mismatch fails silently, in Apple's CDN,
 * days after the deploy — so the agreement is checked here.
 */
const root = join(__dirname, '..', '..', '..');
const appJson = JSON.parse(readFileSync(join(root, 'app.json'), 'utf8'));
const aasa = JSON.parse(
  readFileSync(join(root, 'public', 'apple-app-site-association.json'), 'utf8')
);
const vercel = JSON.parse(readFileSync(join(root, 'vercel.json'), 'utf8'));
const host = new URL(SITE_ORIGIN).host;

/** The bundle id each install variant is built with. */
const bundleIds = (['production', 'development', 'preview'] as const).map(
  (variant) => {
    const original = process.env.APP_VARIANT;
    process.env.APP_VARIANT = variant;
    try {
      return appConfig({ config: appJson.expo }).ios.bundleIdentifier as string;
    } finally {
      if (original === undefined) delete process.env.APP_VARIANT;
      else process.env.APP_VARIANT = original;
    }
  }
);

describe('the app claims the site', () => {
  it('through an applinks entitlement for the site the app lives on', () => {
    expect(appJson.expo.ios.associatedDomains).toEqual([`applinks:${host}`]);
  });
});

describe('the site names the apps that may open it', () => {
  const detail = aasa.applinks.details[0];

  it('lists every install variant under the team that signs them', () => {
    const team = appJson.expo.ios.appleTeamId as string;
    expect(detail.appIDs.sort()).toEqual(
      bundleIds.map((id) => `${team}.${id}`).sort()
    );
  });

  /**
   * Every path the association hands to the app is a route the app
   * has. A path that reaches the app and finds no screen is a link
   * that used to open a web page and now opens "not found".
   */
  const routes = (() => {
    const found = new Set<string>();
    const walk = (dir: string, prefix: string[]) => {
      for (const entry of readdirSync(dir, { withFileTypes: true })) {
        const name = entry.name;
        if (
          name === '__tests__' ||
          name.startsWith('+') ||
          name.startsWith('_')
        )
          continue;
        if (entry.isDirectory()) {
          const segment = /^\(.*\)$/.test(name) ? [] : [name];
          walk(join(dir, name), [...prefix, ...segment]);
          continue;
        }
        if (!name.endsWith('.tsx')) continue;
        const base = name.replace(/\.(web\.)?tsx$/, '');
        const segment = base === 'index' ? [] : [base];
        found.add(
          [...prefix, ...segment]
            .map((part) => (/^\[.+\]$/.test(part) ? '*' : part))
            .join('/')
        );
      }
    };
    walk(join(root, 'src', 'app'), []);
    return found;
  })();

  const patterns: string[] = detail.components.map(
    (c: { '/': string }) => c['/']
  );
  it.each(patterns)('%s is a route the app has', (pattern) => {
    expect(Array.from(routes)).toContain(pattern.replace(/^\//, ''));
  });

  it('leaves the landing and legal pages to the browser', () => {
    const paths = detail.components.map((c: { '/': string }) => c['/']);
    for (const web of ['/', '/about', '/privacy', '/terms']) {
      expect(paths).not.toContain(web);
    }
  });
});

describe('the site serves the association where Apple looks', () => {
  it('rewrites the well-known path to the file', () => {
    expect(vercel.rewrites).toEqual(
      expect.arrayContaining([
        {
          source: '/.well-known/apple-app-site-association',
          destination: '/apple-app-site-association.json',
        },
      ])
    );
  });

  it('as JSON, which Apple requires', () => {
    const rule = vercel.headers.find((h: { source: string }) =>
      h.source.includes('apple-app-site-association')
    );
    expect(rule).toBeDefined();
    expect(rule.headers).toEqual(
      expect.arrayContaining([
        { key: 'Content-Type', value: 'application/json' },
      ])
    );
  });
});
