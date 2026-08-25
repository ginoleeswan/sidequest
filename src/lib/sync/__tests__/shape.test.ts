import {
  applyDurations,
  applyLibrary,
  durationsUpload,
  entryStamp,
  fromStamp,
  gamesUpload,
  libraryUpload,
  localDurations,
  localLibrary,
  preferencesDownload,
  preferencesUpload,
  remoteDurations,
  remoteLibrary,
  toStamp,
  type LibraryRow,
} from '../shape';
import type { LibraryEntry } from '../../library';
import type { Game } from '@/api/types';

/**
 * Field names, units, and null against undefined. Nothing clever here —
 * which is the point, because this is the layer where a library comes
 * back with everybody's notes silently dropped.
 */

const game = (over: Partial<Game> = {}): Game =>
  ({
    id: 42,
    slug: 'hades',
    name: 'Hades',
    background_image: 'https://media.rawg.io/hades.jpg',
    released: '2020-09-17',
    playtime: 21,
    metacritic: 93,
    parent_platforms: [],
    genres: [],
    ...over,
  }) as unknown as Game;

const entry = (over: Partial<LibraryEntry> = {}): LibraryEntry => ({
  game: game(),
  status: 'playing',
  addedAt: 1_700_000_000_000,
  ...over,
});

describe('timestamps', () => {
  it('cross to Postgres and back without drifting', () => {
    const ms = 1_700_000_000_000;
    expect(fromStamp(toStamp(ms))).toBe(ms);
  });

  it('treat a null column as absent, not as 1970', () => {
    expect(fromStamp(null)).toBeUndefined();
  });

  it('fall back to when the game was saved, for libraries older than sync', () => {
    expect(entryStamp(entry())).toBe(1_700_000_000_000);
    expect(entryStamp(entry({ updatedAt: 1_800_000_000_000 }))).toBe(
      1_800_000_000_000
    );
  });
});

describe('a library entry, round tripped', () => {
  it('carries every field a person actually typed', () => {
    const rich = entry({
      note: 'co-op with Sam',
      rating: 4,
      tags: ['co-op', 'winter'],
      deadline: 1_750_000_000_000,
      want: 3,
      hoursPlayed: 12.5,
      steamAppId: 1145360,
      finishedAt: 1_760_000_000_000,
      updatedAt: 1_770_000_000_000,
    });

    const [uploaded] = libraryUpload(localLibrary({ '42': rich }));
    const [back] = remoteLibrary([uploaded as LibraryRow]);

    expect(back.value).toMatchObject({
      status: 'playing',
      note: 'co-op with Sam',
      rating: 4,
      tags: ['co-op', 'winter'],
      deadline: 1_750_000_000_000,
      want: 3,
      hoursPlayed: 12.5,
      steamAppId: 1145360,
      finishedAt: 1_760_000_000_000,
    });
  });

  it('sends absent optional fields as null, never as undefined', () => {
    // Postgres takes null; undefined silently omits the column, which
    // makes a cleared note indistinguishable from an unchanged one.
    const [row] = libraryUpload(localLibrary({ '42': entry() }));
    expect(row.note).toBeNull();
    expect(row.rating).toBeNull();
    expect(row.tags).toBeNull();
    expect(row.deleted_at).toBeNull();
  });

  it('a tombstone still satisfies the columns the table demands', () => {
    const [row] = libraryUpload([{ key: '42', clientUpdatedAt: 1_700_000_000_000 }]);
    expect(row.deleted_at).not.toBeNull();
    expect(row.game_id).toBe(42);
    expect(row.status).toBeTruthy();
    expect(row.added_at).toBeTruthy();
  });

  it('a pulled tombstone arrives as a delete, not as an entry', () => {
    const [row] = remoteLibrary([
      {
        game_id: 42,
        status: 'wishlist',
        added_at: toStamp(1),
        finished_at: null,
        hours_played: null,
        steam_app_id: null,
        deadline: null,
        want: null,
        note: null,
        rating: null,
        tags: null,
        client_updated_at: toStamp(1_700_000_000_000),
        deleted_at: toStamp(1_700_000_000_000),
      },
    ]);
    expect(row.deleted).toBe(true);
    expect(row.value).toBeUndefined();
  });
});

describe('applyLibrary', () => {
  it('keeps the device’s own artwork rather than a pulled stub', () => {
    // The regression this exists to stop: a shelf of blanks. A pulled
    // row knows the game id and nothing else.
    const stub = { game: { id: 42 } as Game, status: 'playing' as const, addedAt: 1 };
    const next = applyLibrary([{ key: '42', clientUpdatedAt: 2, value: stub }], {
      '42': entry(),
    });
    expect(next['42'].game.name).toBe('Hades');
    expect(next['42'].game.background_image).toContain('hades');
  });

  it('takes a pulled game whole when the device has never seen it', () => {
    const named = entry({ game: game({ id: 7, name: 'Tunic' }) });
    const next = applyLibrary([{ key: '7', clientUpdatedAt: 2, value: named }], {});
    expect(next['7'].game.name).toBe('Tunic');
  });

  it('drops tombstones instead of storing empty entries', () => {
    const next = applyLibrary([{ key: '42', clientUpdatedAt: 2 }], {});
    expect(next).toEqual({});
  });
});

describe('the games cache', () => {
  it('offers only games it can actually name', () => {
    const rows = gamesUpload({
      '42': entry(),
      // A stub pulled from another device, not yet filled in: uploading
      // it would overwrite a good public row with a nameless one.
      '7': { game: { id: 7 } as Game, status: 'wishlist', addedAt: 1 },
    });
    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({ id: 42, name: 'Hades', slug: 'hades' });
  });
});

describe('durations', () => {
  it('round trip the numbers people corrected by hand', () => {
    const carried = localDurations({ '42': 33 }, 1_700_000_000_000);
    const [row] = durationsUpload(carried);
    expect(row).toMatchObject({ game_id: 42, hours: 33, deleted_at: null });
    const [back] = remoteDurations([row]);
    expect(applyDurations([back])).toEqual({ '42': 33 });
  });

  it('discard a correction of zero rather than storing a nonsense length', () => {
    expect(applyDurations([{ key: '42', clientUpdatedAt: 1, value: 0 }])).toEqual(
      {}
    );
  });

  it('mark a removed correction as a tombstone', () => {
    const [row] = durationsUpload([{ key: '42', clientUpdatedAt: 1 }]);
    expect(row.deleted_at).not.toBeNull();
    const [back] = remoteDurations([row]);
    expect(back.deleted).toBe(true);
  });
});

describe('preferences', () => {
  it('round trip the plan settings', () => {
    const row = preferencesUpload(
      { pace: 8, planWindow: '4w', steam: { id: '76561' } },
      1_700_000_000_000
    );
    expect(row).toMatchObject({ pace: 8, plan_window: '4w' });
    expect(preferencesDownload(row)).toMatchObject({ pace: 8, planWindow: '4w' });
  });

  it('send an unset pace as null rather than dropping the column', () => {
    const row = preferencesUpload({}, 1);
    expect(row.pace).toBeNull();
    expect(row.plan_window).toBeNull();
    expect(preferencesDownload(row).pace).toBeUndefined();
  });
});
