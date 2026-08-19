import { act, render, screen } from '@testing-library/react-native';
import { Platform, Text } from 'react-native';

import { WhenNear } from '../WhenNear';

const Place = () => <Text>placeholder</Text>;
const Real = () => <Text>real</Text>;

describe('WhenNear on native', () => {
  /**
   * Native has no IntersectionObserver, and FlatList already virtualises
   * there, so deferring would cost a frame and buy nothing.
   */
  it('renders immediately without waiting for anything', async () => {
    await render(
      <WhenNear placeholder={<Place />}>
        <Real />
      </WhenNear>
    );
    expect(screen.getByText('real')).toBeTruthy();
  });
});

describe('WhenNear on web', () => {
  const observers: {
    cb: IntersectionObserverCallback;
    opts?: IntersectionObserverInit;
  }[] = [];
  let disconnected = 0;
  let originalOS: typeof Platform.OS;

  beforeEach(() => {
    observers.length = 0;
    disconnected = 0;
    originalOS = Platform.OS;
    Object.defineProperty(Platform, 'OS', { configurable: true, value: 'web' });
    Object.defineProperty(globalThis, 'IntersectionObserver', {
      configurable: true,
      writable: true,
      value: class {
        constructor(
          cb: IntersectionObserverCallback,
          opts?: IntersectionObserverInit
        ) {
          observers.push({ cb, opts });
        }
        observe() {}
        disconnect() {
          disconnected += 1;
        }
        unobserve() {}
        takeRecords() {
          return [];
        }
        root = null;
        rootMargin = '';
        thresholds = [];
      },
    });
  });

  afterEach(() => {
    Object.defineProperty(Platform, 'OS', {
      configurable: true,
      value: originalOS,
    });
  });

  it('holds the place until the section is near', async () => {
    await render(
      <WhenNear placeholder={<Place />}>
        <Real />
      </WhenNear>
    );
    expect(screen.getByText('placeholder')).toBeTruthy();
    expect(screen.queryByText('real')).toBeNull();
  });

  it('swaps in the real thing once it intersects', async () => {
    await render(
      <WhenNear placeholder={<Place />}>
        <Real />
      </WhenNear>
    );
    await act(async () => {
      observers[0].cb(
        [{ isIntersecting: true } as IntersectionObserverEntry],
        {} as IntersectionObserver
      );
    });
    expect(screen.getByText('real')).toBeTruthy();
    expect(screen.queryByText('placeholder')).toBeNull();
  });

  it('stays put while it is only reported as not intersecting', async () => {
    await render(
      <WhenNear placeholder={<Place />}>
        <Real />
      </WhenNear>
    );
    await act(async () => {
      observers[0].cb(
        [{ isIntersecting: false } as IntersectionObserverEntry],
        {} as IntersectionObserver
      );
    });
    expect(screen.getByText('placeholder')).toBeTruthy();
  });

  it('starts a screen ahead, so content is ready before it is reached', async () => {
    await render(
      <WhenNear placeholder={<Place />}>
        <Real />
      </WhenNear>
    );
    expect(observers[0].opts?.rootMargin).toBe('100% 0px');
  });

  it('stops observing once it has swapped', async () => {
    await render(
      <WhenNear placeholder={<Place />}>
        <Real />
      </WhenNear>
    );
    await act(async () => {
      observers[0].cb(
        [{ isIntersecting: true } as IntersectionObserverEntry],
        {} as IntersectionObserver
      );
    });
    expect(disconnected).toBeGreaterThan(0);
  });

  /** Losing the observer must cost the optimisation, never the content. */
  it('shows everything when there is no observer to lean on', async () => {
    Object.defineProperty(globalThis, 'IntersectionObserver', {
      configurable: true,
      writable: true,
      value: undefined,
    });
    await render(
      <WhenNear placeholder={<Place />}>
        <Real />
      </WhenNear>
    );
    expect(screen.getByText('real')).toBeTruthy();
  });
});
