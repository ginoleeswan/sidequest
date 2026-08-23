/**
 * The home-screen widget's Xcode target, declared rather than clicked.
 *
 * A widget is a separate binary with its own bundle id, entitlements and
 * signing, which is why it cannot be added over the air: it has to exist
 * in the build. This file is what `@bacons/apple-targets` turns into
 * that target during prebuild, so the whole thing stays in version
 * control instead of living in an .xcodeproj nobody can review.
 *
 * The app group is the point of doing this now. A widget cannot call
 * into JavaScript and has no access to the app's own sandbox — the only
 * way it ever sees a plan is a container both binaries can open. Adding
 * the group later would mean re-provisioning and another build, so it
 * goes in with the target even though nothing writes to it yet.
 */
module.exports = {
  type: 'widget',
  name: 'Tonight',
  // Matches the app's own dark ground, so the widget reads as part of
  // the same object rather than a white card with our logo on it.
  colors: {
    $accent: '#F2A93B',
    $ground: '#272F3F',
  },
  entitlements: {
    'com.apple.security.application-groups': ['group.com.glstudio.sidequest'],
  },
};
