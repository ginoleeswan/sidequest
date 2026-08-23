/**
 * The home-screen and Lock Screen widgets, declared rather than clicked.
 *
 * A widget extension is a separate binary with its own bundle id,
 * entitlements and signing, which is why none of this can arrive over
 * the air: it has to exist in the build. This file is what
 * `@bacons/apple-targets` turns into that Xcode target during prebuild,
 * so the whole thing stays in version control instead of living in a
 * project file nobody can review.
 *
 * The app group is the load-bearing part. A widget cannot call into
 * JavaScript and has no access to the app's sandbox — a container both
 * binaries can open is the only way it ever sees a plan. It is declared
 * on the app as well (see `ios.entitlements` in app.json); on one side
 * only it is a data path with one end.
 */
module.exports = {
  type: 'widget',
  name: 'Sidequest',
  /**
   * The app's own palette, as colour sets the Swift reads by name.
   *
   * Named for their job rather than their hue, the same as
   * `styles/colors.ts`, so a repaint is one edit in each place rather
   * than a search for hex codes across two languages.
   */
  colors: {
    $accent: '#F2A93B',
    $violet: '#9D8FFF',
    $ground: '#272F3F',
    $well: '#1E2532',
    $muted: '#A3A9B8',
  },
  entitlements: {
    'com.apple.security.application-groups': ['group.com.glstudio.sidequest'],
  },
};
