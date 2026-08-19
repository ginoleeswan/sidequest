import { queryClient } from '../queryClient';
import { RawgError } from '../rawg';

type RetryFn = (failureCount: number, error: unknown) => boolean;
type DelayFn = (attempt: number, error: unknown) => number;

const queries = queryClient.getDefaultOptions().queries;
const retry = queries?.retry as RetryFn;
const retryDelay = queries?.retryDelay as DelayFn;

const rawgError = (status: number, retryable: boolean, retryAfter?: number) =>
  new RawgError({
    status,
    message: `RAWG games: ${status}`,
    userMessage: 'x',
    retryable,
    retryAfter,
  });

describe('retry policy', () => {
  it('gives up immediately on an error the API layer called final', () => {
    expect(retry(0, rawgError(404, false))).toBe(false);
    expect(retry(0, rawgError(401, false))).toBe(false);
  });

  it('retries a retryable failure, but not for ever', () => {
    expect(retry(0, rawgError(503, true))).toBe(true);
    expect(retry(1, rawgError(503, true))).toBe(true);
    expect(retry(2, rawgError(503, true))).toBe(false);
  });

  it('retries unknown errors conservatively', () => {
    expect(retry(0, new Error('boom'))).toBe(true);
    expect(retry(2, new Error('boom'))).toBe(false);
  });

  it('backs off exponentially, with a ceiling', () => {
    const first = retryDelay(0, new Error('x'));
    const second = retryDelay(1, new Error('x'));
    expect(second).toBeGreaterThan(first);
    expect(retryDelay(20, new Error('x'))).toBeLessThanOrEqual(15_000);
  });

  it('waits at least as long as a rate limiter asked', () => {
    expect(retryDelay(0, rawgError(429, true, 30))).toBe(30_000);
  });
});
