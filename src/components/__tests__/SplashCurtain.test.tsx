import { act, render, screen } from '@testing-library/react-native';
import { Platform } from 'react-native';

import { SplashCurtain } from '../SplashCurtain';

/**
 * The curtain covers a launch, so the two things worth asserting are
 * that it is there at the start and gone afterwards. A splash that
 * outstays its welcome is a bug with the same shape as one that never
 * shows.
 *
 * Every query here passes `includeHiddenElements`, and that is the point
 * of the third test rather than a workaround: the curtain marks itself
 * hidden from assistive technology, so by default the library cannot see
 * it either. Without the flag "it is gone" and "it is invisible to a
 * screen reader" are the same passing assertion, and neither means
 * anything.
 *
 * Under jest the app runs its native code paths, which is the platform
 * the curtain is for.
 */
const DEEP = { includeHiddenElements: true } as const;

describe('the splash curtain', () => {
  beforeEach(() => jest.useFakeTimers());
  afterEach(() => jest.useRealTimers());

  it('covers the app on launch', async () => {
    await render(<SplashCurtain />);
    expect(screen.getByText('sidequest', DEEP)).toBeTruthy();
  });

  it('gets out of the way, and does not linger', async () => {
    await render(<SplashCurtain />);
    await act(async () => {
      // Comfortably past the run: whatever the choreography costs, the
      // app is not still behind a curtain two seconds in.
      jest.advanceTimersByTime(4000);
    });
    expect(screen.queryByText('sidequest', DEEP)).toBeNull();
  });

  it('is hidden from a screen reader while it covers — it is not content', async () => {
    await render(<SplashCurtain />);
    // Present in the tree, absent from the accessibility one.
    expect(screen.getByText('sidequest', DEEP)).toBeTruthy();
    expect(screen.queryByText('sidequest')).toBeNull();
  });

  it('stays out of the web build entirely', async () => {
    const was = Platform.OS;
    // A plain assignment rather than a spy: Platform.OS is a data
    // property in this preset, and spying on it as a getter throws.
    (Platform as { OS: string }).OS = 'web';
    try {
      await render(<SplashCurtain />);
      expect(screen.queryByText('sidequest', DEEP)).toBeNull();
    } finally {
      (Platform as { OS: string }).OS = was;
    }
  });
});
