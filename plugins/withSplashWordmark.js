const { withDangerousMod } = require('expo/config-plugins');
const fs = require('node:fs');
const path = require('node:path');

/**
 * Reached by file path, because the package does not export it.
 *
 * expo-splash-screen's `exports` map publishes only `.` and `./plugin`,
 * so a bare specifier is refused. Resolving through the package.json's
 * own location yields an absolute path, which `require` accepts without
 * consulting the map. It is a private module, so this is a bet on its
 * path — one that throws at prebuild rather than silently shipping a
 * splash with no wordmark, which is the failure worth having.
 */
const { withIosSplashScreenStoryboard } = require(
  path.join(
    path.dirname(require.resolve('expo-splash-screen/package.json')),
    'plugin/build/withIosSplashScreenStoryboard'
  )
);

/**
 * Puts the wordmark at the foot of the launch screen.
 *
 * expo-splash-screen offers one image view, `imageWidth` by
 * `imageWidth`, aspect-fitted and centred. That fits a mark and nothing
 * else: fold the wordmark into the same file and the picture has to be
 * tall, a tall picture is fitted by its height, and the mark comes out
 * a third of its intended size — measured at 58pt where 191 was asked
 * for. The limitation is the plugin's, not the platform's; a storyboard
 * holds as many views as it likes.
 *
 * Getting a second one in took two failures worth recording.
 *
 * A `withDangerousMod` edit is overwritten. Dangerous mods run during
 * prebuild, but the storyboard is serialised afterwards by a base mod,
 * so the constraints and the resource entry vanished while the image
 * view survived — it lives in a section the base mod leaves alone.
 *
 * Registering on the storyboard mod AFTER expo-splash-screen is refused
 * outright: "provider must be the last mod added". Registering BEFORE it
 * is allowed and still useless for constraints, because
 * `applyImageToSplashScreenXML` opens by emptying them:
 *
 *   mainView.constraints[0].constraint = [];
 *   xml.document.resources[0].image = [];
 *
 * What it does NOT clear is `subviews` — it appends with
 * `ensureUniquePush`. So anything that has to survive must live inside
 * the image view element itself, which rules out constraints and rules
 * IN springs and struts: a fixed bottom margin with flexible left,
 * right and top margins is a bottom-pinned, horizontally centred view,
 * expressed entirely as a frame and an autoresizing mask.
 *
 * Older than autolayout, and exactly right here — the view is a fixed
 * size and the only question is which edges it holds to.
 *
 * This plugin must therefore be listed BEFORE expo-splash-screen in
 * app.json. Listed after, prebuild fails loudly.
 */

/** Matches WORDMARK_W/H in scripts/brand-assets.mjs. */
const W = 200;
const H = 32;

/**
 * Clear of the home indicator, and mirrored by SplashCurtain so the
 * wordmark does not move when the animation takes over.
 */
const BOTTOM_MARGIN = 60;

/** The storyboard's reference device; margins do the rest. */
const REF_W = 393;
const REF_H = 852;

const ID = 'EXPO-SplashWordmark';
const IMAGE = 'SplashScreenWordmark';

const CONTENTS = JSON.stringify(
  {
    images: [1, 2, 3].map((scale) => ({
      idiom: 'universal',
      filename: scale === 1 ? 'wordmark.png' : `wordmark@${scale}x.png`,
      scale: `${scale}x`,
    })),
    info: { version: 1, author: 'expo' },
  },
  null,
  2
);

/** The three densities brand-assets rendered, into the catalogue. */
function withWordmarkAsset(config) {
  return withDangerousMod(config, [
    'ios',
    async (cfg) => {
      const set = path.join(
        cfg.modRequest.platformProjectRoot,
        cfg.modRequest.projectName,
        'Images.xcassets',
        `${IMAGE}.imageset`
      );
      const assets = path.join(cfg.modRequest.projectRoot, 'assets');
      fs.mkdirSync(set, { recursive: true });
      for (const [src, out] of [
        ['splash-wordmark.png', 'wordmark.png'],
        ['splash-wordmark@2x.png', 'wordmark@2x.png'],
        ['splash-wordmark@3x.png', 'wordmark@3x.png'],
      ]) {
        fs.copyFileSync(path.join(assets, src), path.join(set, out));
      }
      fs.writeFileSync(path.join(set, 'Contents.json'), CONTENTS);
      return cfg;
    },
  ]);
}

function withWordmarkView(config) {
  return withIosSplashScreenStoryboard(config, (cfg) => {
    const view =
      cfg.modResults.document.scenes[0].scene[0].objects[0].viewController[0]
        .view[0];
    const subviews = view.subviews[0];
    if (subviews.imageView.some((v) => v.$.id === ID)) return cfg;

    subviews.imageView.push({
      $: {
        id: ID,
        userLabel: IMAGE,
        image: IMAGE,
        contentMode: 'scaleAspectFit',
        userInteractionEnabled: 'NO',
        // YES, so the mask below is honoured rather than ignored in
        // favour of constraints that are about to be deleted.
        translatesAutoresizingMaskIntoConstraints: 'YES',
      },
      rect: [
        {
          $: {
            key: 'frame',
            x: String((REF_W - W) / 2),
            y: String(REF_H - H - BOTTOM_MARGIN),
            width: String(W),
            height: String(H),
          },
        },
      ],
      autoresizingMask: [
        {
          $: {
            key: 'autoresizingMask',
            // Left and right flex together: the view stays centred.
            flexibleMinX: 'YES',
            flexibleMaxX: 'YES',
            // Only the top flexes, so the bottom margin is fixed.
            flexibleMinY: 'YES',
          },
        },
      ],
    });
    return cfg;
  });
}

module.exports = function withSplashWordmark(config) {
  return withWordmarkView(withWordmarkAsset(config));
};
