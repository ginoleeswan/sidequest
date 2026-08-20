import {
  ALL_SECTIONS,
  DISCOVER,
  findSection,
  GENRES,
  HOME_SHELVES,
} from '../categories';

const ORIGINAL_KEY = process.env.EXPO_PUBLIC_RAWG_API_KEY;
let calls: string[];

beforeAll(() => {
  process.env.EXPO_PUBLIC_RAWG_API_KEY = 'test-key';
});
afterAll(() => {
  process.env.EXPO_PUBLIC_RAWG_API_KEY = ORIGINAL_KEY;
});
beforeEach(() => {
  calls = [];
  globalThis.fetch = jest.fn(async (input: RequestInfo | URL) => {
    calls.push(String(input));
    return new Response(JSON.stringify({ count: 0, next: null, results: [] }));
  }) as unknown as typeof fetch;
});

/**
 * These are copy-pasted entries with one word changed, which is exactly
 * the shape of thing that silently ends up fetching the wrong genre.
 */
describe('the sections', () => {
  it('gives every section a unique key and title', () => {
    const keys = ALL_SECTIONS.map((s) => s.key);
    const titles = ALL_SECTIONS.map((s) => s.title);
    expect(new Set(keys).size).toBe(keys.length);
    expect(new Set(titles).size).toBe(titles.length);
  });

  it('asks for its own genre, and no other', async () => {
    for (const genre of GENRES) {
      calls = [];
      await genre.fetch(1);
      expect(calls).toHaveLength(1);
      expect(decodeURIComponent(calls[0])).toContain(`genres=${genre.key}`);
    }
  });

  it('sends every discover section somewhere different', async () => {
    const urls = new Set<string>();
    for (const section of DISCOVER) {
      calls = [];
      await section.fetch(1);
      // Several shelves share an ordering and differ only by their date
      // window — "new releases" and "coming soon" are the same query
      // pointed at different fortnights — so the whole URL is the test.
      urls.add(decodeURIComponent(calls[0]));
    }
    expect(urls.size).toBe(DISCOVER.length);
  });

  it('finds a section by key, and nothing by a key it does not have', () => {
    expect(findSection('indie')?.title).toBe('Indie');
    expect(findSection('not-a-genre')).toBeUndefined();
  });

  it('builds the home shelves out of real sections', () => {
    for (const shelf of HOME_SHELVES) {
      expect(findSection(shelf.key)).toBe(shelf);
    }
  });
});
