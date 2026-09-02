import {
  clearSearches,
  forgetSearch,
  readSearches,
  rememberSearch,
} from '../searchHistory';
import { useFakeStorage } from '@/test-utils';

let store: Record<string, string>;
beforeAll(() => {
  store = useFakeStorage();
});
beforeEach(() => {
  for (const key of Object.keys(store)) delete store[key];
});

/**
 * The search box remembers where it has been. What matters is that the
 * list stays short, most recent first, and never repeats itself.
 */
describe('recent searches', () => {
  it('starts empty', () => {
    expect(readSearches()).toEqual([]);
  });

  it('puts the latest first and keeps one copy of a term', () => {
    rememberSearch('hades');
    rememberSearch('celeste');
    expect(rememberSearch('Hades')).toEqual(['Hades', 'celeste']);
  });

  it('tidies what was typed and ignores a single letter', () => {
    expect(rememberSearch('  hollow   knight ')).toEqual(['hollow knight']);
    expect(rememberSearch('h')).toEqual(['hollow knight']);
  });

  it('keeps only the last eight', () => {
    for (let i = 0; i < 10; i++) rememberSearch(`game ${i}`);
    const list = readSearches();
    expect(list).toHaveLength(8);
    expect(list[0]).toBe('game 9');
  });

  it('forgets one, or all of them', () => {
    rememberSearch('hades');
    rememberSearch('celeste');
    expect(forgetSearch('hades')).toEqual(['celeste']);
    clearSearches();
    expect(readSearches()).toEqual([]);
  });

  it('skips anything in storage that is not a term', () => {
    store['sidequest.searches.v1'] = JSON.stringify(['ok', 3, '', null]);
    expect(readSearches()).toEqual(['ok']);
  });
});
