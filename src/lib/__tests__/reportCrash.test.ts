/**
 * The crash reporter is a privacy promise as much as a feature: the
 * Privacy page tells people it carries no identifier and nothing about
 * what they browsed. These tests hold that promise to the code.
 */
import { reportCrash } from '../reportCrash';

// The reporter only runs on web; the suite runs under the native preset.
// jest.mock is hoisted above the import, so this still applies.
jest.mock('react-native', () => ({ Platform: { OS: 'web' } }));

const globalAny = globalThis as unknown as {
  __DEV__: boolean;
  fetch: jest.Mock;
  location: { pathname: string };
};

describe('reportCrash', () => {
  const originalDev = globalAny.__DEV__;

  beforeEach(() => {
    globalAny.fetch = jest.fn().mockResolvedValue({ ok: true });
    globalAny.location = { pathname: '/game/123' };
    globalAny.__DEV__ = false;
  });

  afterAll(() => {
    globalAny.__DEV__ = originalDev;
  });

  it('stays silent in development', () => {
    globalAny.__DEV__ = true;
    reportCrash(new Error('dev boom'));
    expect(globalAny.fetch).not.toHaveBeenCalled();
  });

  it('sends only the fields the privacy page promises', () => {
    reportCrash(new Error('render failed'));
    expect(globalAny.fetch).toHaveBeenCalledTimes(1);

    const [url, init] = globalAny.fetch.mock.calls[0];
    expect(url).toBe('/api/report');
    const body = JSON.parse(init.body as string) as Record<string, unknown>;
    // Exactly this set, and nothing else. Viewport is absent when the
    // environment has no window to measure.
    const allowed = ['at', 'message', 'route', 'stack', 'viewport'];
    for (const key of Object.keys(body)) expect(allowed).toContain(key);
    expect(body.message).toBe('render failed');
    expect(body.route).toBe('/game/123');
  });

  it('carries no identifier and no credentials', () => {
    reportCrash(new Error('another failure'));
    const [, init] = globalAny.fetch.mock.calls[0];
    const body = JSON.parse(init.body as string) as Record<string, unknown>;
    // No field that could identify a person or a session, and nothing
    // about what they saved. (The stack is a file path, not a person.)
    for (const key of Object.keys(body)) {
      expect(key).not.toMatch(/id|user|session|token|library|query|search/i);
    }
    expect(body.library).toBeUndefined();
    expect(init.credentials).toBeUndefined();
    expect(init.headers).toEqual({ 'content-type': 'application/json' });
  });

  it('reports one problem once, however many times it fires', () => {
    const error = new Error('repeating failure');
    reportCrash(error);
    reportCrash(error);
    reportCrash(error);
    expect(globalAny.fetch).toHaveBeenCalledTimes(1);
  });

  it('never throws out of the error path it is reporting on', () => {
    globalAny.fetch = jest.fn(() => {
      throw new Error('network is gone');
    });
    expect(() => reportCrash(new Error('unique failure'))).not.toThrow();
  });
});
