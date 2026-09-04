import { render, screen } from '@testing-library/react-native';
import { Platform } from 'react-native';

import { ChromeWeld } from '../ChromeWeld';

/**
 * The weld is a browser fix, and only a browser fix.
 *
 * It exists because iOS Safari paints its own chrome in the html canvas
 * colour, so a full-bleed hero has to start at that colour or the two
 * meet on a line. The app has no such chrome — only a status bar, which
 * floats over the artwork — and painting the weld there put a grey lid
 * across the top of every game's hero: a seam invented to hide one that
 * was never there.
 */
const REAL = Platform.OS;
const setPlatform = (os: string) =>
  Object.defineProperty(Platform, 'OS', { value: os, configurable: true });

afterEach(() => setPlatform(REAL));

describe('ChromeWeld', () => {
  it('paints the join in a browser', async () => {
    setPlatform('web');
    await render(<ChromeWeld height={200} />);
    expect(screen.toJSON()).not.toBeNull();
  });

  it('draws nothing on native — there is no chrome to weld to', async () => {
    setPlatform('ios');
    await render(<ChromeWeld height={200} />);
    expect(screen.toJSON()).toBeNull();
  });
});
