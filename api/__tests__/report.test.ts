import handler from '../report';
import { fakeReq, fakeRes, fromIp } from './harness';

type Req = Parameters<typeof handler>[0];
type Res = Parameters<typeof handler>[1];

const post = (body: unknown, over: Record<string, unknown> = {}) =>
  fakeReq({ method: 'POST', body, ...over }) as unknown as Req;

const consoleError = jest
  .spyOn(console, 'error')
  .mockImplementation(() => undefined);

afterAll(() => consoleError.mockRestore());
beforeEach(() => consoleError.mockClear());

describe('api/report', () => {
  it('only answers POST, and says so', async () => {
    const { res, sent } = fakeRes();
    await handler(fakeReq() as unknown as Req, res as unknown as Res);
    expect(sent.code).toBe(405);
    expect(sent.headers.Allow).toBe('POST');
  });

  it('accepts a crash and logs only the named fields, truncated', async () => {
    const { res, sent } = fakeRes();
    await handler(
      post({
        message: 'boom',
        route: '/game/1',
        secret: 'should never appear',
        stack: 'x'.repeat(5000),
      }),
      res as unknown as Res
    );
    expect(sent.code).toBe(204);
    expect(sent.ended).toBe(true);
    const logged = consoleError.mock.calls[0].join(' ');
    expect(logged).toContain('boom');
    expect(logged).not.toContain('should never appear');
    // The stack is capped, not passed through.
    expect(logged.length).toBeLessThan(4600);
  });

  it('rejects a report with no message', async () => {
    const { res, sent } = fakeRes();
    await handler(post({ route: '/x' }), res as unknown as Res);
    expect(sent.code).toBe(400);
  });

  it('rejects malformed JSON bodies', async () => {
    const { res, sent } = fakeRes();
    await handler(post('{not json'), res as unknown as Res);
    expect(sent.code).toBe(400);
  });

  it('rejects an oversize report before parsing it', async () => {
    const { res, sent } = fakeRes();
    await handler(
      post(JSON.stringify({ message: 'x'.repeat(9000) })),
      res as unknown as Res
    );
    expect(sent.code).toBe(413);
    expect(consoleError).not.toHaveBeenCalled();
  });

  it('rate-limits a single caller, and only that caller', async () => {
    let last = 0;
    for (let i = 0; i < 21; i++) {
      const { res, sent } = fakeRes();
      await handler(
        fromIp('9.9.9.9', { method: 'POST', body: { message: 'hi' } }) as unknown as Req,
        res as unknown as Res
      );
      last = sent.code ?? 0;
    }
    expect(last).toBe(429);
    // A different caller is untouched by the first one's ceiling.
    const { res, sent } = fakeRes();
    await handler(post({ message: 'hi' }), res as unknown as Res);
    expect(sent.code).toBe(204);
  });
});
