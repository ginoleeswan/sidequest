import { act, render, screen } from '@testing-library/react-native';
import { Animated, Platform, Text } from 'react-native';

import { ScreenFade } from '../ScreenFade';
import { useReducedMotion } from '@/hooks/useReducedMotion';

/**
 * The fade exists because the navigator's own `animation: 'fade'`
 * silently did nothing on web — a feature that was tested and absent at
 * the same time. So what is pinned here is the behaviour that made it
 * necessary: the first paint is left alone, a later route change
 * actually moves the opacity, and anyone who asked for less animation
 * gets the cut back.
 *
 * And that it only happens on web. The fault is the WEB navigator's;
 * iOS animates its own transitions, and this ran there too — wrapping
 * the whole router and dipping all of it, tab bar included, on every
 * change of path. A tab switch is a change of path, so switching tabs
 * flashed the entire app.
 */
jest.mock('@/hooks/useReducedMotion', () => ({
  useReducedMotion: jest.fn(() => false),
}));
const mockedReduced = useReducedMotion as jest.Mock;

/**
 * Whether a fade was actually started. Asserting on the animation
 * rather than on a style object is the point: the bug this component
 * exists to fix was a transition that no-opped while every check
 * around it passed.
 */
let timing: jest.SpyInstance;

const at = (pathname: string) => {
  (globalThis as { routePathname?: string }).routePathname = pathname;
};

/** The suite runs as iOS; the fade is a web behaviour. */
const NATIVE = Platform.OS;
const setPlatform = (os: string) =>
  Object.defineProperty(Platform, 'OS', { value: os, configurable: true });

beforeEach(() => {
  jest.useFakeTimers();
  mockedReduced.mockReturnValue(false);
  at('/');
  timing = jest.spyOn(Animated, 'timing');
});
afterEach(() => {
  setPlatform(NATIVE);
  jest.useRealTimers();
  timing.mockRestore();
  delete (globalThis as { routePathname?: string }).routePathname;
});

describe('ScreenFade', () => {
  it('renders what it wraps', async () => {
    await render(
      <ScreenFade>
        <Text>the screen</Text>
      </ScreenFade>
    );
    expect(screen.getByText('the screen')).toBeTruthy();
  });

  it('leaves the first paint alone — the app is already arriving', async () => {
    await render(
      <ScreenFade>
        <Text>the screen</Text>
      </ScreenFade>
    );
    // No fade started at all: there is nothing to fade in over.
    expect(timing).not.toHaveBeenCalled();
  });

  it('a later route change dips and settles back to full, on web', async () => {
    setPlatform('web');
    const view = await render(
      <ScreenFade>
        <Text>the screen</Text>
      </ScreenFade>
    );
    at('/plan');
    await act(async () => {
      view.rerender(
        <ScreenFade>
          <Text>the screen</Text>
        </ScreenFade>
      );
    });
    // A fade really ran, and it ends fully opaque.
    expect(timing).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({ toValue: 1 })
    );
    await act(async () => {
      jest.runAllTimers();
    });
    expect(screen.getByText('the screen')).toBeTruthy();
  });

  /**
   * The platform draws its own transitions, so a second one laid over
   * the top is not a refinement — it is a flash on every tab switch.
   */
  it('never dips on native, whatever the route does', async () => {
    const view = await render(
      <ScreenFade>
        <Text>the screen</Text>
      </ScreenFade>
    );
    at('/plan');
    await act(async () => {
      view.rerender(
        <ScreenFade>
          <Text>the screen</Text>
        </ScreenFade>
      );
    });
    expect(timing).not.toHaveBeenCalled();
    expect(screen.getByText('the screen')).toBeTruthy();
  });

  it('honours a request for less animation with no dip at all', async () => {
    mockedReduced.mockReturnValue(true);
    const view = await render(
      <ScreenFade>
        <Text>the screen</Text>
      </ScreenFade>
    );
    at('/library');
    await act(async () => {
      view.rerender(
        <ScreenFade>
          <Text>the screen</Text>
        </ScreenFade>
      );
    });
    expect(timing).not.toHaveBeenCalled();
    expect(screen.getByText('the screen')).toBeTruthy();
  });
});
