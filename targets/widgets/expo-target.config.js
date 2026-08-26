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
  /**
   * NOT "Sidequest", which is what this said and what broke the first
   * build.
   *
   * The name becomes the Xcode target's name and its `productName`, and
   * the app target is already called Sidequest — so the project carried
   * two targets with one name, building `Sidequest.app` and
   * `Sidequest.appex` through the same intermediate paths. Xcode reports
   * that as "Multiple commands produce conflicting outputs", which
   * names the symptom and not the cause.
   *
   * The bundle identifier is unaffected either way: it comes from the
   * app's own id plus the target type, and stays
   * com.glstudio.sidequest.widget.
   */
  name: 'Widgets',
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
    $mint: '#3ECF8E',
    $coral: '#F87168',
    $ground: '#272F3F',
    $well: '#1E2532',
    $muted: '#A3A9B8',
  },
  entitlements: {
    'com.apple.security.application-groups': ['group.com.glstudio.sidequest'],
  },
};
