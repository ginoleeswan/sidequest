import { Platform } from 'react-native';

import type { WidgetStore } from './widgetStore';

const APP_GROUP = 'group.com.glstudio.sidequest';

/**
 * The shared app-group container, on the one platform that has one.
 *
 * Android resolves this file too, so the iOS gate stays; the try/catch
 * covers builds without the native module (Expo Go), where a stale
 * widget is the correct non-event.
 */
export function widgetStore(): WidgetStore | null {
  if (Platform.OS !== 'ios') return null;
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports -- platform-conditional module
    const { ExtensionStorage } = require('@bacons/apple-targets');
    return {
      store: new ExtensionStorage(APP_GROUP),
      reload: (kind: string) => ExtensionStorage.reloadWidget(kind),
    };
  } catch {
    return null;
  }
}
