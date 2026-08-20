import { fireEvent, screen, waitFor } from '@testing-library/react-native';
import { Platform } from 'react-native';

import MemcardScreen from '../memcard';
import { shareMemcard } from '@/lib/memcardImage';
import { renderApp, useFakeStorage } from '@/test-utils';

jest.mock('@/lib/memcardImage', () => ({
  shareMemcard: jest.fn(async () => 'saved' as const),
}));

let store: Record<string, string>;
const KEY = 'sidequest.library.v1';

const at = (year: number, month: number) => Date.UTC(year, month, 10);

let restoreOS: () => void;
beforeAll(() => {
  store = useFakeStorage();
  // Saving the card is a web capability; the screen only offers it there.
  const previous = Platform.OS;
  Object.defineProperty(Platform, 'OS', { value: 'web', configurable: true });
  restoreOS = () =>
    Object.defineProperty(Platform, 'OS', {
      value: previous,
      configurable: true,
    });
});
afterAll(() => restoreOS());
beforeEach(() => {
  for (const k of Object.keys(store)) delete store[k];
  jest.mocked(shareMemcard).mockClear();
});

function seed(
  rows: { id: number; name: string; hours: number; finishedAt?: number }[]
) {
  store[KEY] = JSON.stringify(
    Object.fromEntries(
      rows.map((row) => [
        String(row.id),
        {
          addedAt: row.finishedAt ?? at(2026, 0),
          finishedAt: row.finishedAt,
          status: row.finishedAt ? 'finished' : 'wishlist',
          game: { id: row.id, name: row.name, playtime: row.hours },
        },
      ])
    )
  );
}

/**
 * The share artifact. It celebrates finishing rather than volume, and it
 * has to be honest when there is nothing to celebrate yet — a card
 * congratulating someone on zero games would be worse than no card.
 */
describe('the Memcard screen', () => {
  it('encourages rather than congratulates when nothing is finished', async () => {
    seed([{ id: 1, name: 'Waiting', hours: 10 }]);
    await renderApp(<MemcardScreen />);
    expect(screen.getByText('No credits rolled yet')).toBeTruthy();
    expect(screen.queryByText(/Save or share/)).toBeNull();
  });

  it('shows the year you finished things in', async () => {
    const year = new Date().getFullYear();
    seed([
      { id: 1, name: 'Celeste', hours: 12, finishedAt: at(year, 1) },
      { id: 2, name: 'Hades', hours: 25, finishedAt: at(year, 5) },
    ]);
    await renderApp(<MemcardScreen />);
    expect(
      screen.getByLabelText(new RegExp(`${year}: 2 games finished`))
    ).toBeTruthy();
  });

  it('offers each year there is something to show for', async () => {
    seed([
      { id: 1, name: 'Old', hours: 12, finishedAt: at(2024, 1) },
      { id: 2, name: 'New', hours: 25, finishedAt: at(2026, 5) },
    ]);
    await renderApp(<MemcardScreen />);
    // 2026 appears twice: the year chip and the section's eyebrow.
    expect(screen.getAllByText('2026').length).toBeGreaterThan(1);
    await fireEvent.press(screen.getByText('2024'));
    expect(
      screen.getByLabelText(/2024: One game, all the way to the credits/)
    ).toBeTruthy();
  });

  it('hands the card over as a file', async () => {
    seed([{ id: 1, name: 'Celeste', hours: 12, finishedAt: at(2026, 1) }]);
    await renderApp(<MemcardScreen />);
    await fireEvent.press(screen.getByText('Save or share this card'));
    await waitFor(() => expect(shareMemcard).toHaveBeenCalled());
    expect(screen.getByText(/Card saved/)).toBeTruthy();
  });

  it('says so when the card cannot be drawn, rather than doing nothing', async () => {
    jest
      .mocked(shareMemcard)
      .mockRejectedValueOnce(new Error('This browser cannot draw the card'));
    seed([{ id: 1, name: 'Celeste', hours: 12, finishedAt: at(2026, 1) }]);
    await renderApp(<MemcardScreen />);
    await fireEvent.press(screen.getByText('Save or share this card'));
    await waitFor(() =>
      expect(screen.getByText('This browser cannot draw the card')).toBeTruthy()
    );
  });
});
