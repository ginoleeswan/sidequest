import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

// eslint-disable-next-line @typescript-eslint/no-require-imports -- CommonJS config, no types
import appConfig = require('../../../app.config.js');

import { HORIZON_DAYS } from '../alerts';
import { COLORS } from '@/styles/colors';
import { LANDING_WELL } from '@/styles/landing';

/**
 * Everything the widgets keep a second copy of.
 *
 * A widget extension is a separate binary that cannot call into
 * JavaScript, so a handful of values necessarily exist twice — a
 * palette, a horizon, the name of the container both sides open. Every
 * one of them is a copy, and a copy is a thing that falls behind.
 *
 * One already did: `widgetBridge`'s table of widget kinds never learned
 * the fourth widget's name, and both consequences were invisible from
 * this side. The lesson generalises, and these are the rest of them.
 *
 * All of it is cheap — reading four small files — and it fails at the
 * moment somebody repaints the app and forgets that the Lock Screen
 * has its own tin of paint.
 */

const widgetsDir = join(__dirname, '..', '..', '..', 'targets', 'widgets');
const read = (...parts: string[]) =>
  readFileSync(join(widgetsDir, ...parts), 'utf8');

/**
 * The widget's colour names, and the app token each one is a copy of.
 *
 * Named for their job rather than their hue on both sides, so this
 * table is the whole of the mapping — `$ground` is the app's navy
 * because the widget's ground is what the app calls navy, not because
 * anybody matched two hex codes by eye.
 */
const PALETTE: Record<string, string> = {
  $accent: COLORS.accent,
  $violet: COLORS.violet,
  $mint: COLORS.mint,
  $coral: COLORS.coral,
  $ground: COLORS.navy,
  $well: LANDING_WELL,
  $muted: COLORS.mediumGrey,
};

/** `#3ECF8E` → the three 0–1 components an Xcode colorset stores. */
const components = (hex: string) => ({
  red: parseInt(hex.slice(1, 3), 16) / 255,
  green: parseInt(hex.slice(3, 5), 16) / 255,
  blue: parseInt(hex.slice(5, 7), 16) / 255,
});

describe('the widget palette, against the app it is a copy of', () => {
  const config = read('expo-target.config.js');

  it.each(Object.entries(PALETTE))(
    '%s is still the colour the app paints with',
    (token, hex) => {
      // The config is what prebuild turns into colour sets, so it is
      // the one that has to agree with `styles/colors`.
      expect(config).toContain(`${token}: '${hex}'`);
    }
  );

  it('declares no colour the app does not have a name for', () => {
    const declared = Array.from(
      config.matchAll(/(\$[a-z]+):\s*'#[0-9A-Fa-f]{6}'/g),
      (match) => match[1]
    );
    expect(declared.sort()).toEqual(Object.keys(PALETTE).sort());
  });

  /**
   * The checked-in colour sets are prebuild's output, and two of them
   * were written by hand when the palette grew. A wrong digit there is
   * a widget in subtly the wrong colour, on a screen nobody would
   * think to compare against anything.
   */
  it.each(Object.entries(PALETTE))(
    '%s has a colour set holding exactly that value',
    (token, hex) => {
      const set = JSON.parse(
        read('Assets.xcassets', `${token}.colorset`, 'Contents.json')
      );
      const stored = set.colors[0].color.components;
      const want = components(hex);
      expect(stored.red).toBeCloseTo(want.red, 6);
      expect(stored.green).toBeCloseTo(want.green, 6);
      expect(stored.blue).toBeCloseTo(want.blue, 6);
      expect(stored.alpha).toBe(1);
    }
  );
});

describe('the constants the widgets restate', () => {
  /**
   * The ring is drawn against the same horizon the app uses to decide a
   * deadline is worth mentioning, so a date at the edge of that window
   * is a full circle. Two different numbers is a ring that lies.
   */
  it('draws its ring against the app’s own horizon', () => {
    const swift = read('Shared.swift');
    const found = /let alertHorizonDays = (\d+)/.exec(swift);
    expect(found).not.toBeNull();
    expect(Number(found?.[1])).toBe(HORIZON_DAYS);
  });

  /**
   * The load-bearing string. Declared on both binaries because on one
   * side only it is a data path with one end — and if the two ever
   * disagree the widgets do not break loudly, they simply never find a
   * plan.
   */
  it('opens the same container the app does', () => {
    const appJson = JSON.parse(
      readFileSync(join(__dirname, '..', '..', '..', 'app.json'), 'utf8')
    );
    const groups: string[] =
      appJson.expo.ios.entitlements['com.apple.security.application-groups'];
    expect(groups.length).toBeGreaterThan(0);
    for (const group of groups) {
      expect(read('expo-target.config.js')).toContain(`'${group}'`);
    }
  });
});

/**
 * Where a tap lands.
 *
 * The widgets are the one surface that navigates the app from outside
 * it, by writing a URL into a binary that cannot be asked whether the
 * route on the other end exists. A renamed screen does not break a
 * widget at build time and does not break it at read time — it breaks
 * on the tap, weeks later, in somebody's hand.
 *
 * So the scheme is checked against the one the config hands to iOS, and
 * every path is checked against the files expo-router actually turns
 * into routes.
 */
describe('the deep links the widgets write', () => {
  const swift = read('Shared.swift');

  /** Every `\(scheme)://…` in the Swift, as a path with its dynamic
   * segments generalised — `game/\(id)` is the route, `game/12` is one
   * of its addresses. The scheme is interpolated per build variant
   * (see `Deep.scheme`), so the links are recognised by their shape
   * rather than by a literal scheme. */
  const linked = Array.from(
    swift.matchAll(
      /\\\(scheme\):\/\/([A-Za-z0-9\-_/]*(?:\\\([a-z]+\)[A-Za-z0-9\-_/]*)*)/g
    ),
    (match) => match[1].replace(/\\\([a-z]+\)/g, ':param')
  );

  /**
   * Every route in `src/app`, by the path it answers on.
   *
   * Groups are transparent — `(tabs)/plan` is reachable as `plan` —
   * and a dynamic segment is generalised the same way the links above
   * are, so the two sides are compared as routes rather than as
   * strings that happen to match.
   */
  const routes = (() => {
    const root = join(__dirname, '..', '..', 'app');
    const found = new Set<string>();
    const walk = (dir: string, prefix: string[]) => {
      for (const entry of readdirSync(dir, { withFileTypes: true })) {
        const name = entry.name;
        if (
          name === '__tests__' ||
          name.startsWith('+') ||
          name.startsWith('_')
        ) {
          continue;
        }
        if (entry.isDirectory()) {
          const segment = /^\(.*\)$/.test(name) ? [] : [name];
          walk(join(dir, name), [...prefix, ...segment]);
          continue;
        }
        if (!name.endsWith('.tsx')) continue;
        const base = name.replace(/\.tsx$/, '');
        const segment = base === 'index' ? [] : [base];
        found.add(
          [...prefix, ...segment]
            .map((part) => (/^\[.+\]$/.test(part) ? ':param' : part))
            .join('/')
        );
      }
    };
    walk(root, []);
    return found;
  })();

  it('writes at least the links the widgets are known to have', () => {
    // A regex that quietly matched nothing would make every assertion
    // below vacuously true, which is the failure mode a contract test
    // has to be most careful about.
    expect(linked).toEqual(
      expect.arrayContaining(['plan', 'memcard', 'game/:param'])
    );
  });

  it.each(Array.from(new Set(linked)))(
    'sidequest://%s is a route the app still has',
    (path) => {
      expect(Array.from(routes)).toContain(path);
    }
  );

  /**
   * The scheme, per variant.
   *
   * `app.config.js` gives each install variant a scheme of its own so
   * two builds on one phone cannot both claim `sidequest://`; the Swift
   * derives which one it belongs to from the extension's bundle id.
   * Both sides restate the same three names, so they are checked
   * against each other: the production scheme the Swift hard-codes,
   * and the suffixes it appends for the dev and preview bundles.
   */
  it('uses the scheme the config gives iOS, for every variant', () => {
    const appJson = JSON.parse(
      readFileSync(join(__dirname, '..', '..', '..', 'app.json'), 'utf8')
    );
    const production = swift.match(/productionScheme = "([a-z-]+)"/)?.[1];
    expect(production).toBeDefined();

    const original = process.env.APP_VARIANT;
    try {
      delete process.env.APP_VARIANT;
      expect(appConfig({ config: appJson.expo }).scheme).toBe(production);
      for (const [variant, marker] of [
        ['development', 'dev'],
        ['preview', 'preview'],
      ] as const) {
        process.env.APP_VARIANT = variant;
        const { scheme, ios } = appConfig({ config: appJson.expo });
        // The Swift appends the marker to the production scheme…
        expect(scheme).toBe(`${production}-${marker}`);
        expect(swift).toContain(`return "\\(productionScheme)-${marker}"`);
        // …when the bundle id carries it, which is where it reads it.
        expect(ios.bundleIdentifier).toContain(`.${marker}`);
        expect(swift).toContain(`bundle.contains(".${marker}.")`);
      }
    } finally {
      if (original === undefined) delete process.env.APP_VARIANT;
      else process.env.APP_VARIANT = original;
    }
    // Nothing else in the Swift spells a scheme out.
    for (const url of swift.matchAll(/"([a-z-]+):\/\//g)) {
      expect(url[1]).toBe(production);
    }
  });
});

/**
 * The keys, which are the container's whole schema.
 *
 * The app writes strings into `UserDefaults` under names it chooses and
 * the widgets read them back under names they were compiled with. There
 * is no type, no handshake and no error — a key written on one side and
 * spelled differently on the other is not a crash, it is a widget that
 * quietly never finds anything, which is indistinguishable from a
 * reader who has not made a plan yet.
 *
 * Only writes are checked. `clearWidgets` also removes `tonight` and
 * `week`, which are what builds before the timeline wrote and which
 * nothing reads on purpose — forgetting a key no longer in use is the
 * correct thing to do with it, not a contract to keep.
 */
describe('the keys the two binaries share', () => {
  const bridge = readFileSync(join(__dirname, '..', 'widgetBridge.ts'), 'utf8');
  const swift = read('Shared.swift');

  const written = Array.from(
    new Set(
      Array.from(bridge.matchAll(/store\.set\(\s*'([a-z]+)'/g), (m) => m[1])
    )
  );

  it('finds the writes it is about to make claims about', () => {
    expect(written.sort()).toEqual(['art', 'plan', 'year']);
  });

  it.each(written)('the widgets read the “%s” the app writes', (key) => {
    expect(swift).toContain(`"${key}"`);
  });
});
