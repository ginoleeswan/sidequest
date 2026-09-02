import { Platform } from 'react-native';

import type { ArtIO } from './widgetArtIO';

const APP_GROUP = 'group.com.glstudio.sidequest';

/** The folder inside the shared container; the Swift side spells it too. */
const FOLDER = 'widget-art';

/**
 * Artwork as files in the app-group container.
 *
 * The first pass shipped covers as base64 inside `UserDefaults`, under a
 * two-hundred-kilobyte budget, because the only bridge to the widgets
 * anybody had wired was a string store. That budget held three or four
 * screenshots — and nothing else. The container is a directory as well
 * as a plist, and `expo-file-system` can reach it: a picture written
 * here is read by the extension with one `UIImage(contentsOfFile:)`,
 * costs the plist nothing, and can be a logo, an icon and a box for
 * every game the week names rather than one screenshot for tonight.
 *
 * Every call degrades to nothing. A build without the native module, a
 * device without the app group, a CDN having a bad afternoon: each is a
 * widget that looks the way it looked last week, never an exception in
 * the plan screen.
 */
export function widgetArtIO(): ArtIO | null {
  if (Platform.OS !== 'ios') return null;
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports -- platform-conditional module
    const fs = require('expo-file-system') as typeof import('expo-file-system');
    const container = fs.Paths.appleSharedContainers?.[APP_GROUP];
    if (!container) return null;
    const dir = new fs.Directory(container, FOLDER);
    if (!dir.exists) dir.create({ intermediates: true, idempotent: true });
    return {
      has: (name) => {
        try {
          return new fs.File(dir, name).exists;
        } catch {
          return false;
        }
      },
      save: async (name, url) => {
        try {
          const file = new fs.File(dir, name);
          if (file.exists) file.delete();
          await fs.File.downloadFileAsync(url, file);
          return true;
        } catch {
          return false;
        }
      },
      prune: (keep) => {
        try {
          for (const item of dir.list()) {
            if (item instanceof fs.File && !keep.has(item.name)) {
              try {
                item.delete();
              } catch {
                /* a file that will not go is a file that stays */
              }
            }
          }
        } catch {
          /* nothing to prune */
        }
      },
    };
  } catch {
    return null;
  }
}
