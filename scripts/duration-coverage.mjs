#!/usr/bin/env node
/**
 * Duration-coverage validation (assumption A1 in docs/PRODUCT.md).
 *
 * The product's feasibility math needs an hours-to-beat figure for the games
 * in a realistic library. This script measures how well the candidate data
 * sources actually cover one:
 *
 *   1. RAWG `playtime`        — free with the key we already use. Crude
 *                               (single community average, integer hours).
 *   2. IGDB `game_time_to_beat` — richer (hastily/normally/completely) but
 *                               needs Twitch credentials.
 *
 * A real Steam library skews popular at the head with a long indie tail, so
 * we sample RAWG's catalogue in three popularity strata (by `added` rank)
 * rather than only the chart-toppers.
 *
 * Usage:
 *   RAWG_API_KEY=... node scripts/duration-coverage.mjs
 *   RAWG_API_KEY=... TWITCH_CLIENT_ID=... TWITCH_CLIENT_SECRET=... \
 *     node scripts/duration-coverage.mjs        # adds the IGDB leg
 *
 * Options: --json <path> to also write raw results.
 */

const RAWG_KEY = process.env.RAWG_API_KEY;
const TWITCH_ID = process.env.TWITCH_CLIENT_ID;
const TWITCH_SECRET = process.env.TWITCH_CLIENT_SECRET;

if (!RAWG_KEY) {
  console.error("RAWG_API_KEY is required.");
  process.exit(1);
}

// Popularity strata: RAWG page ranks (page_size 40). Head ≈ everyone's
// library staples; mid ≈ known but not universal; tail ≈ the indie long tail
// where coverage problems would hide.
const STRATA = [
  { name: "head", pages: [1, 2, 3] }, //    ranks    1–120
  { name: "mid", pages: [25, 26, 27] }, //  ranks  961–1080
  { name: "tail", pages: [150, 175, 200] }, // ranks ~6k–8k
];

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function getJSON(url, init) {
  const res = await fetch(url, init);
  if (!res.ok) throw new Error(`${res.status} ${res.statusText} for ${url}`);
  return res.json();
}

async function sampleRAWG() {
  const games = [];
  for (const stratum of STRATA) {
    for (const page of stratum.pages) {
      const data = await getJSON(
        `https://api.rawg.io/api/games?key=${RAWG_KEY}&page_size=40&ordering=-added&page=${page}`
      );
      for (const g of data.results) {
        games.push({
          stratum: stratum.name,
          slug: g.slug,
          name: g.name,
          released: g.released,
          added: g.added,
          rawgPlaytime: g.playtime ?? 0,
        });
      }
      await sleep(250);
    }
  }
  return games;
}

// ---------------------------------------------------------------- IGDB leg
async function igdbToken() {
  const res = await getJSON(
    `https://id.twitch.tv/oauth2/token?client_id=${TWITCH_ID}&client_secret=${TWITCH_SECRET}&grant_type=client_credentials`,
    { method: "POST" }
  );
  return res.access_token;
}

async function igdb(token, endpoint, body) {
  await sleep(300); // stay under IGDB's 4 req/s
  const res = await fetch(`https://api.igdb.com/v4/${endpoint}`, {
    method: "POST",
    headers: { "Client-ID": TWITCH_ID, Authorization: `Bearer ${token}` },
    body,
  });
  if (!res.ok) throw new Error(`IGDB ${endpoint}: ${res.status}`);
  return res.json();
}

async function enrichIGDB(games) {
  const token = await igdbToken();

  // Stage 1 — match RAWG slugs to IGDB game ids, in batches.
  const bySlug = new Map();
  for (let i = 0; i < games.length; i += 100) {
    const batch = games.slice(i, i + 100);
    const slugs = batch.map((g) => `"${g.slug}"`).join(",");
    const rows = await igdb(
      token,
      "games",
      `fields id,slug; where slug = (${slugs}); limit 200;`
    );
    for (const r of rows) bySlug.set(r.slug, r.id);
  }

  // Stage 1b — fuzzy-search stragglers by name (slug conventions differ).
  for (const g of games) {
    if (bySlug.has(g.slug)) continue;
    const safe = g.name.replace(/"/g, "");
    const rows = await igdb(
      token,
      "games",
      `fields id,slug,name; search "${safe}"; limit 1;`
    );
    if (rows[0]) bySlug.set(g.slug, rows[0].id);
  }

  // Stage 2 — time-to-beat rows for every matched id.
  const ids = [...new Set([...bySlug.values()])];
  const ttbByGame = new Map();
  for (let i = 0; i < ids.length; i += 100) {
    const rows = await igdb(
      token,
      "game_time_to_beats",
      `fields game_id,hastily,normally,completely,count; where game_id = (${ids
        .slice(i, i + 100)
        .join(",")}); limit 200;`
    );
    for (const r of rows) ttbByGame.set(r.game_id, r);
  }

  for (const g of games) {
    const id = bySlug.get(g.slug);
    g.igdbMatched = id != null;
    const ttb = id != null ? ttbByGame.get(id) : undefined;
    g.igdbNormallyHrs = ttb?.normally ? +(ttb.normally / 3600).toFixed(1) : null;
    g.igdbSubmissions = ttb?.count ?? 0;
  }
}

// ------------------------------------------------------------------ report
function pct(part, whole) {
  return whole === 0 ? "  n/a" : `${((100 * part) / whole).toFixed(0).padStart(4)}%`;
}

function report(games, withIGDB) {
  const strata = [...STRATA.map((s) => s.name), "TOTAL"];
  console.log("\nDuration coverage by popularity stratum");
  console.log(
    "stratum  n    RAWG playtime>0" + (withIGDB ? "   IGDB matched   IGDB has TTB" : "")
  );
  for (const name of strata) {
    const rows = name === "TOTAL" ? games : games.filter((g) => g.stratum === name);
    const rawg = rows.filter((g) => g.rawgPlaytime > 0).length;
    let line = `${name.padEnd(8)}${String(rows.length).padEnd(5)}${pct(rawg, rows.length)}`;
    if (withIGDB) {
      const matched = rows.filter((g) => g.igdbMatched).length;
      const ttb = rows.filter((g) => g.igdbNormallyHrs != null).length;
      line += `           ${pct(matched, rows.length)}          ${pct(ttb, rows.length)}`;
    }
    console.log(line);
  }
  if (withIGDB) {
    const misses = games.filter((g) => g.igdbNormallyHrs == null).slice(0, 15);
    console.log("\nSample of games with no IGDB time-to-beat:");
    for (const m of misses) console.log(`  [${m.stratum}] ${m.name}`);
  }
}

const games = await sampleRAWG();
const withIGDB = Boolean(TWITCH_ID && TWITCH_SECRET);
if (withIGDB) await enrichIGDB(games);
else console.log("(TWITCH_CLIENT_ID/SECRET not set — skipping IGDB leg)");

report(games, withIGDB);

const jsonIdx = process.argv.indexOf("--json");
if (jsonIdx !== -1 && process.argv[jsonIdx + 1]) {
  const { writeFileSync } = await import("node:fs");
  writeFileSync(process.argv[jsonIdx + 1], JSON.stringify(games, null, 2));
  console.log(`\nRaw results written to ${process.argv[jsonIdx + 1]}`);
}
