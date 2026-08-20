/**
 * Measures what the first visit actually costs.
 *
 * "Feels like an app" is a claim; this turns it into numbers. The site
 * is served the way Vercel serves it — brotli, cleanUrls — and loaded
 * over a throttled connection with a throttled CPU, because the phone
 * this has to feel good on is not this machine.
 *
 * RAWG is stubbed rather than blocked: an empty response arrives fast
 * and deterministically, so what is measured is the app's own weight
 * rather than someone else's API on the night.
 *
 * Reports, and fails only against deliberately loose budgets — a
 * regression that doubles the bundle should break the build; ordinary
 * jitter should not.
 */
import { chromium } from 'playwright';

import { serve } from './serve.mjs';

const PORT = 8943;
const ROOT = new URL('../dist', import.meta.url).pathname;
const ROUTES = ['/', '/game/3498'];

/** Roughly a good 4G phone: enough to see the shape of the load. */
const NETWORK = {
  offline: false,
  latency: 70,
  downloadThroughput: (4 * 1000 * 1000) / 8,
  uploadThroughput: (1 * 1000 * 1000) / 8,
};
const CPU_SLOWDOWN = 4;

/**
 * Loose on purpose: a doubling breaks the build, jitter does not.
 *
 * Measured on this machine at the time of writing: 335 KB of JS, LCP
 * around 3.8s, CLS under 0.005. A runner is slower than a laptop, so the
 * time budget has real headroom while still catching a regression that
 * puts the icon font — or anything like it — back on the critical path.
 */
const BUDGETS = {
  /** Compressed bytes of JS the first visit must download. */
  scriptKb: 450,
  /** Total compressed bytes, including fonts. */
  totalKb: 700,
  /** Largest contentful paint, milliseconds. */
  lcpMs: 6000,
  /** Cumulative layout shift. */
  cls: 0.05,
};

const server = await serve(ROOT, PORT);
const browser = await chromium.launch({
  executablePath: process.env.CHROMIUM_PATH || undefined,
});

const failures = [];
const rows = [];

for (const route of ROUTES) {
  const context = await browser.newContext({
    viewport: { width: 390, height: 844 },
    isMobile: true,
    hasTouch: true,
  });
  // An empty page from RAWG, instantly: measure our weight, not theirs.
  await context.route('**/rawg/**', (r) =>
    r.fulfill({
      status: 200,
      contentType: 'application/json',
      body: '{"count":0,"next":null,"results":[]}',
    })
  );
  await context.route('**/media/**', (r) => r.abort());

  const page = await context.newPage();
  const client = await context.newCDPSession(page);
  await client.send('Network.emulateNetworkConditions', NETWORK);
  await client.send('Emulation.setCPUThrottlingRate', { rate: CPU_SLOWDOWN });

  // Bytes come from CDP rather than content-length: the responses are
  // compressed on the fly and carry no length header, so the only honest
  // number is what the network layer says it actually transferred.
  let scriptBytes = 0;
  let totalBytes = 0;
  const kinds = new Map();
  await client.send('Network.enable');
  client.on('Network.responseReceived', ({ requestId, response }) => {
    kinds.set(requestId, response.headers['content-type'] ?? '');
  });
  client.on('Network.loadingFinished', ({ requestId, encodedDataLength }) => {
    totalBytes += encodedDataLength;
    if (/javascript/.test(kinds.get(requestId) ?? ''))
      scriptBytes += encodedDataLength;
  });

  await page.addInitScript(() => {
    window.__lcp = 0;
    window.__cls = 0;
    window.__lcpElement = '';
    new PerformanceObserver((list) => {
      for (const entry of list.getEntries()) {
        window.__lcp = entry.startTime;
        const node = entry.element;
        window.__lcpElement = node
          ? `${node.tagName.toLowerCase()}${node.className ? '.' + String(node.className).split(' ')[0] : ''}`
          : entry.url || '';
      }
    }).observe({ type: 'largest-contentful-paint', buffered: true });
    new PerformanceObserver((list) => {
      for (const entry of list.getEntries())
        if (!entry.hadRecentInput) window.__cls += entry.value;
    }).observe({ type: 'layout-shift', buffered: true });
  });

  await page.goto(`http://localhost:${PORT}${route}`, {
    waitUntil: 'domcontentloaded',
  });
  await page.waitForTimeout(6000);

  const { lcp, lcpElement, cls, fcp } = await page.evaluate(() => ({
    lcp: Math.round(window.__lcp),
    lcpElement: window.__lcpElement ?? '',
    cls: Number(window.__cls.toFixed(4)),
    fcp: Math.round(
      performance.getEntriesByName('first-contentful-paint')[0]?.startTime ?? 0
    ),
  }));

  const scriptKb = Math.round(scriptBytes / 1024);
  const totalKb = Math.round(totalBytes / 1024);
  rows.push({ route, fcp, lcp, lcpElement, cls, scriptKb, totalKb });

  if (scriptKb > BUDGETS.scriptKb)
    failures.push(`${route}: ${scriptKb} KB of JS over ${BUDGETS.scriptKb} KB`);
  if (totalKb > BUDGETS.totalKb)
    failures.push(`${route}: ${totalKb} KB total over ${BUDGETS.totalKb} KB`);
  if (lcp > BUDGETS.lcpMs)
    failures.push(`${route}: LCP ${lcp}ms over ${BUDGETS.lcpMs}ms`);
  if (cls > BUDGETS.cls)
    failures.push(`${route}: CLS ${cls} over ${BUDGETS.cls}`);

  await context.close();
}

await browser.close();
server.close();

console.log(
  `\n4G, ${CPU_SLOWDOWN}x CPU slowdown, compressed as production serves it\n`
);
console.log(
  'route          FCP     LCP     CLS     JS      total   LCP element'
);
for (const r of rows) {
  console.log(
    `${r.route.padEnd(14)} ${String(r.fcp + 'ms').padEnd(7)} ${String(
      r.lcp + 'ms'
    ).padEnd(7)} ${String(r.cls).padEnd(7)} ${String(r.scriptKb + 'KB').padEnd(
      7
    )} ${String(r.totalKb + 'KB').padEnd(7)} ${r.lcpElement}`
  );
}

if (failures.length) {
  console.error(`\nOver budget:\n`);
  for (const failure of failures) console.error(`  ${failure}`);
  process.exit(1);
}
console.log('\nWithin budget.');
