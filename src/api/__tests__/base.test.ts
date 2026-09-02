import { Platform } from 'react-native';

import { apiUrl } from '../base';

/**
 * The app's functions, reachable from a phone.
 *
 * Jest runs the native paths, so this is what iOS sends: an absolute
 * URL at the deployment. A relative `/api/...` from a native app is a
 * request to nowhere, and every client in this folder swallows that
 * failure — which is how the native build lost IGDB, Twitch and Steam
 * without a single error saying so.
 */
describe('where the app finds its own API', () => {
  it('is absolute on native', () => {
    expect(Platform.OS).not.toBe('web');
    expect(apiUrl('/api/igdb?slugs=hades')).toBe(
      'https://gosidequest.vercel.app/api/igdb?slugs=hades'
    );
  });

  it('is same-origin on the web', () => {
    const os = Platform.OS;
    Object.defineProperty(Platform, 'OS', { value: 'web', configurable: true });
    try {
      expect(apiUrl('/api/twitch?game=Hades')).toBe('/api/twitch?game=Hades');
    } finally {
      Object.defineProperty(Platform, 'OS', { value: os, configurable: true });
    }
  });
});
