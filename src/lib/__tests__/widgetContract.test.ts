import { readFileSync } from 'node:fs';
import { join } from 'node:path';

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
