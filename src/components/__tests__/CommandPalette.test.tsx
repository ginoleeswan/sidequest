import { act, fireEvent, screen } from '@testing-library/react-native';
import { router } from 'expo-router';
import { Platform } from 'react-native';

import { CommandPalette } from '../CommandPalette';
import { renderApp, useFakeStorage } from '@/test-utils';

let store: Record<string, string>;
let restoreOS: () => void;
let keyboard: EventTarget;

beforeAll(() => {
  store = useFakeStorage();
  // The preset's `window` has no event API; the browser's does. One
  // EventTarget stands in for it so the shortcut can actually be pressed.
  keyboard = new EventTarget();
  Object.defineProperty(globalThis, 'window', {
    configurable: true,
    value: {
      addEventListener: keyboard.addEventListener.bind(keyboard),
      removeEventListener: keyboard.removeEventListener.bind(keyboard),
    },
  });
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
  jest.mocked(router.push).mockClear();
});

const press = async (key: string, meta = true) =>
  act(async () => {
    const event = new Event('keydown') as Event & {
      key: string;
      metaKey: boolean;
      ctrlKey: boolean;
      preventDefault: () => void;
    };
    event.key = key;
    event.metaKey = meta;
    event.ctrlKey = false;
    keyboard.dispatchEvent(event);
  });

/**
 * The shortcut people already have in their fingers from every other
 * tool. It has to open, take you somewhere, and get out of the way.
 */
describe('the command palette', () => {
  it('stays shut until asked for', async () => {
    await renderApp(<CommandPalette />);
    expect(screen.queryByLabelText('Go to')).toBeNull();
  });

  it('opens on the shortcut', async () => {
    await renderApp(<CommandPalette />);
    await press('k');
    expect(screen.getByLabelText('Go to')).toBeTruthy();
  });

  it('closes again on escape', async () => {
    await renderApp(<CommandPalette />);
    await press('k');
    await press('Escape', false);
    expect(screen.queryByLabelText('Go to')).toBeNull();
  });

  it('goes where you asked', async () => {
    await renderApp(<CommandPalette />);
    await press('k');
    await fireEvent.press(screen.getByText('The Plan'));
    expect(router.push).toHaveBeenCalledWith('/plan');
  });

  it('finds the games in your own library', async () => {
    store['sidequest.library.v1'] = JSON.stringify({
      '42': {
        addedAt: 1,
        status: 'wishlist',
        game: { id: 42, name: 'Pentiment', playtime: 9 },
      },
    });
    await renderApp(<CommandPalette />);
    await press('k');
    await fireEvent.changeText(screen.getByLabelText('Go to'), 'penti');
    await fireEvent.press(screen.getByText('Pentiment'));
    expect(router.push).toHaveBeenCalledWith('/game/42');
  });

  it('filters to what was typed', async () => {
    await renderApp(<CommandPalette />);
    await press('k');
    await fireEvent.changeText(screen.getByLabelText('Go to'), 'amnesty');
    expect(screen.getByText('Backlog amnesty')).toBeTruthy();
    expect(screen.queryByText('The Plan')).toBeNull();
  });

  it('says so rather than showing an empty box', async () => {
    await renderApp(<CommandPalette />);
    await press('k');
    await fireEvent.changeText(screen.getByLabelText('Go to'), 'zzzzzz');
    expect(screen.getByText('Nothing by that name.')).toBeTruthy();
  });

  it('takes the first match on enter', async () => {
    await renderApp(<CommandPalette />);
    await press('k');
    await fireEvent.changeText(screen.getByLabelText('Go to'), 'library');
    await fireEvent(screen.getByLabelText('Go to'), 'submitEditing');
    expect(router.push).toHaveBeenCalledWith('/library');
  });
});
