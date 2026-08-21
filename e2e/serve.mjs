/**
 * Serves the exported site the way Vercel does.
 *
 * A plain static server 404s every route but `/`, because the export
 * writes `plan.html` rather than `plan/index.html`. vercel.json turns
 * that on with `cleanUrls` and a rewrite for game pages; this mirrors
 * both, so what the checks exercise is what production serves.
 */
import { createServer } from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import { extname, join } from 'node:path';
import { brotliCompressSync, constants, gzipSync } from 'node:zlib';

const MIME = {
  '.html': 'text/html',
  '.js': 'text/javascript',
  '.css': 'text/css',
  '.json': 'application/json',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.svg': 'image/svg+xml',
  '.ttf': 'font/ttf',
  '.woff2': 'font/woff2',
  '.webmanifest': 'application/manifest+json',
};

const isFile = async (path) => {
  try {
    return (await stat(path)).isFile();
  } catch {
    return false;
  }
};

/**
 * Compress the way the CDN does, not the way Node prefers to.
 *
 * brotliCompressSync defaults to quality 11, which is the whole point of
 * brotli and nothing like what a CDN spends on a response. Measured
 * against the live deploy on the day this was written: Vercel sent the
 * entry bundle as 488,301 bytes, and the same bundle at Node's default
 * quality is 381,142 — so every JS figure this harness has ever printed
 * was 105 KB under what a visitor downloads, and the 450 KB budget was
 * being checked against a number production never delivers.
 *
 * Quality 4 lands at 473,405 bytes on that bundle: still a little kind,
 * and about twelve percent out instead of twenty-eight.
 */
const BROTLI = { params: { [constants.BROTLI_PARAM_QUALITY]: 4 } };

export function serve(root, port) {
  const server = createServer(async (req, res) => {
    let path = decodeURIComponent(new URL(req.url, 'http://x').pathname);
    if (/^\/game\/[^/]+$/.test(path)) path = '/game/[id]';
    if (/^\/by\/[^/]+$/.test(path)) path = '/by/[kind]';

    for (const file of [
      join(root, path),
      `${join(root, path)}.html`,
      join(root, path, 'index.html'),
    ]) {
      if (await isFile(file)) {
        const type = MIME[extname(file)] ?? 'application/octet-stream';
        const body = await readFile(file);

        // Vercel compresses text assets, so a local server that does not
        // makes every measurement taken against it a lie: the JS bundle
        // reads as 1.5 MB here and transfers as about a third of that in
        // production.
        const compressible =
          /^(text|application\/(javascript|json|manifest))/.test(type);
        const accepts = req.headers['accept-encoding'] ?? '';
        if (compressible && accepts.includes('br')) {
          res.writeHead(200, {
            'content-type': type,
            'content-encoding': 'br',
          });
          return res.end(brotliCompressSync(body, BROTLI));
        }
        if (compressible && accepts.includes('gzip')) {
          res.writeHead(200, {
            'content-type': type,
            'content-encoding': 'gzip',
          });
          return res.end(gzipSync(body));
        }
        res.writeHead(200, { 'content-type': type });
        return res.end(body);
      }
    }
    res.writeHead(404, { 'content-type': 'text/html' });
    res.end(
      await readFile(join(root, '+not-found.html')).catch(() => 'not found')
    );
  });
  return new Promise((resolve) => server.listen(port, () => resolve(server)));
}
