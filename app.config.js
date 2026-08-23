/**
 * One app, three identities.
 *
 * A development build and the App Store build have to be able to sit on
 * the same phone at the same time, or testing a change means deleting
 * the copy you actually use. iOS decides "same app" by bundle
 * identifier, so the variants need different ones — and once they do,
 * they need different names too, because two icons both labelled
 * "Sidequest" is a worse problem than the one being solved.
 *
 * `app.json` stays the source of truth for everything that does not
 * vary. This file receives it as `config` and changes only the four
 * things that make an install distinct: what it is called, what iOS and
 * Android call it, and the URL scheme that opens it.
 *
 * The scheme matters more than it looks. Two installed builds both
 * claiming `sidequest://` is undefined behaviour — iOS picks one, and
 * which one is not something you get to decide. Since the widgets deep
 * link through that scheme, a dev widget could quietly open the
 * production app. Per-variant schemes make that impossible.
 *
 * Driven by APP_VARIANT, which eas.json sets per build profile. Absent,
 * the answer is production: a local `expo run:ios` with nothing set
 * should build the real app, and a variant that appears by accident is
 * worse than one that has to be asked for.
 */

const VARIANTS = {
  development: {
    suffix: '.dev',
    label: 'Sidequest (Dev)',
    scheme: 'sidequest-dev',
  },
  preview: {
    suffix: '.preview',
    label: 'Sidequest (Preview)',
    scheme: 'sidequest-preview',
  },
  production: { suffix: '', label: 'Sidequest', scheme: 'sidequest' },
};

module.exports = ({ config }) => {
  const variant = VARIANTS[process.env.APP_VARIANT] ?? VARIANTS.production;

  return {
    ...config,
    name: variant.label,
    scheme: variant.scheme,
    ios: {
      ...config.ios,
      bundleIdentifier: `com.glstudio.sidequest${variant.suffix}`,
    },
    android: {
      ...config.android,
      package: `com.glstudio.sidequest${variant.suffix}`,
    },
  };
};
