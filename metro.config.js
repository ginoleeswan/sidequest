// Learn more https://docs.expo.io/guides/customizing-metro
const { getDefaultConfig } = require('expo/metro-config');
const https = require('https');

const config = getDefaultConfig(__dirname);

// Web loads the fonts as woff2 — a third of the bytes of the same TTF,
// with the same glyph coverage. Metro does not treat woff2 as an asset
// out of the box, so the extension has to be declared or the require
// resolves to nothing.
config.resolver.assetExts.push('woff2');

// Mirror the /rawg and /media rewrites in vercel.json (backed by
// api/rawg-proxy.ts in production) so local web dev also calls RAWG
// same-origin. RAWG's API sends no CORS headers, so a direct browser
// fetch to api.rawg.io is blocked outside of a same-origin proxy — this
// is that proxy for `expo start --web`.
const MEDIA_PREFIX = '/media/';
const DATA_PREFIX = '/rawg/';

function proxyMedia(req, res) {
  https
    .get('https://media.rawg.io/' + req.url.slice(MEDIA_PREFIX.length), (upstreamRes) => {
      res.writeHead(upstreamRes.statusCode ?? 502, upstreamRes.headers);
      upstreamRes.pipe(res);
    })
    .on('error', () => {
      res.writeHead(502);
      res.end('RAWG media proxy error');
    });
}

function proxyData(req, res) {
  // Same contract as api/rawg-proxy.ts: the client sends no key, this
  // injects the real one server-side, so RAWG_API_KEY never has to reach
  // the browser even in local dev.
  const key = process.env.RAWG_API_KEY?.trim();
  if (!key) {
    res.writeHead(503, { 'Content-Type': 'application/json' });
    res.end(
      JSON.stringify({ error: 'RAWG_API_KEY is not set — add it to .env' })
    );
    return;
  }

  const url = new URL(req.url, 'http://localhost');
  const path = url.pathname.slice(DATA_PREFIX.length);
  url.searchParams.delete('key');
  url.searchParams.set('key', key);

  https
    .get(`https://api.rawg.io/api/${path}?${url.searchParams}`, (upstreamRes) => {
      const chunks = [];
      upstreamRes.on('data', (chunk) => chunks.push(chunk));
      upstreamRes.on('end', () => {
        // RAWG embeds this same URL — key included — in list responses'
        // next/previous fields. The app never follows them, so the key
        // is scrubbed outright rather than rewritten.
        const body = Buffer.concat(chunks).toString('utf8').split(key).join('');
        res.writeHead(upstreamRes.statusCode ?? 502, {
          'Content-Type': upstreamRes.headers['content-type'] ?? 'application/json',
          'Content-Length': Buffer.byteLength(body),
        });
        res.end(body);
      });
    })
    .on('error', () => {
      res.writeHead(502);
      res.end('RAWG proxy error');
    });
}

config.server = {
  ...config.server,
  enhanceMiddleware: (metroMiddleware) => (req, res, next) => {
    if (req.url.startsWith(MEDIA_PREFIX)) return proxyMedia(req, res);
    if (req.url.startsWith(DATA_PREFIX)) return proxyData(req, res);
    return metroMiddleware(req, res, next);
  },
};

module.exports = config;
