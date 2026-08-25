/**
 * A fake Vercel request/response pair, for exercising the serverless
 * handlers the way the platform calls them. Each handler declares its
 * own structural req/res types, so this stays deliberately loose and
 * the individual suites cast to the handler's parameter types.
 */

export interface Sent {
  code: number | null;
  body: unknown;
  headers: Record<string, string>;
  ended: boolean;
}

export function fakeRes() {
  const sent: Sent = { code: null, body: null, headers: {}, ended: false };
  const res = {
    status: (code: number) => {
      sent.code = code;
      return {
        json: (body: unknown) => {
          sent.body = body;
        },
        end: () => {
          sent.ended = true;
        },
        send: (body: unknown) => {
          sent.body = body;
        },
      };
    },
    setHeader: (name: string, value: string) => {
      sent.headers[name] = value;
    },
    json: (body: unknown) => {
      sent.body = body;
    },
    end: () => {
      sent.ended = true;
    },
  };
  return { res, sent };
}

let nextIp = 0;

/**
 * A request from a fresh IP each time, so the module-scope rate
 * limiters never bleed between tests. Tests OF the limiter pass their
 * own fixed ip instead.
 */
export function fakeReq(over: Record<string, unknown> = {}) {
  nextIp += 1;
  return {
    method: 'GET',
    query: {},
    headers: { 'x-real-ip': `10.0.${Math.floor(nextIp / 250)}.${nextIp % 250}` },
    ...over,
  };
}

/** The same, pinned to one caller — for exercising the limiter itself. */
export function fromIp(ip: string, over: Record<string, unknown> = {}) {
  return fakeReq({ headers: { 'x-real-ip': ip }, ...over });
}
