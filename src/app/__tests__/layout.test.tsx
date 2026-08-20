import { render, screen } from '@testing-library/react-native';
import { useFonts } from 'expo-font';
import * as SplashScreen from 'expo-splash-screen';

import RootLayout from '../_layout';
import { useFakeStorage } from '@/test-utils';

jest.mock('expo-font', () => ({
  useFonts: jest.fn(() => [true, null]),
  isLoaded: () => true,
  FontDisplay: { SWAP: 'swap' },
}));

beforeAll(() => {
  useFakeStorage();
  // The layout mounts the whole app, which reaches for RAWG.
  process.env.EXPO_PUBLIC_RAWG_API_KEY = 'test-key';
  globalThis.fetch = jest.fn(
    async () => new Response('{"count":0,"next":null,"results":[]}')
  ) as unknown as typeof fetch;
});
beforeEach(() => jest.mocked(SplashScreen.hideAsync).mockClear());

/**
 * The root layout holds the splash screen and the provider stack. Its
 * one genuinely dangerous branch is the font that never arrives: hold
 * the splash for that and the app never starts at all.
 */
describe('the root layout', () => {
  it('waits for the fonts before showing anything', async () => {
    jest.mocked(useFonts).mockReturnValue([false, null]);
    await render(<RootLayout />);
    expect(screen.toJSON()).toBeNull();
    expect(SplashScreen.hideAsync).not.toHaveBeenCalled();
  });

  it('starts anyway when a font fails, rather than holding the splash for ever', async () => {
    jest
      .mocked(useFonts)
      .mockReturnValue([false, new Error('font 404') as never]);
    await render(<RootLayout />);
    expect(screen.toJSON()).not.toBeNull();
    expect(SplashScreen.hideAsync).toHaveBeenCalled();
  });

  it('drops the splash once the fonts land', async () => {
    jest.mocked(useFonts).mockReturnValue([true, null]);
    await render(<RootLayout />);
    expect(SplashScreen.hideAsync).toHaveBeenCalled();
  });
});
