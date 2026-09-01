import { fireEvent, render, screen } from '@testing-library/react-native';
import { router } from 'expo-router';
import { Text } from 'react-native';

import { Sidebar } from '../Sidebar';
import { DISCOVER, GENRES } from '@/constants/categories';

/**
 * Desktop's permanent navigation. Every category the app knows about has
 * to be reachable from here — a section that exists in the constants but
 * not in this list is a page nobody can find.
 */
describe('the sidebar', () => {
  const props = { activeKey: 'home', onHome: jest.fn(), onSelect: jest.fn() };
  beforeEach(() => {
    props.onHome.mockClear();
    props.onSelect.mockClear();
    jest.mocked(router.push).mockClear();
  });

  it('lists every discover section and every genre', async () => {
    await render(<Sidebar {...props} />);
    for (const section of [...DISCOVER, ...GENRES]) {
      expect(screen.getByText(section.title)).toBeTruthy();
    }
  });

  it('goes home from the brand and from Home', async () => {
    await render(<Sidebar {...props} />);
    await fireEvent.press(screen.getByText('sidequest'));
    await fireEvent.press(screen.getByText('Home'));
    expect(props.onHome).toHaveBeenCalledTimes(2);
  });

  it('routes to the library and the plan', async () => {
    await render(<Sidebar {...props} />);
    await fireEvent.press(screen.getByText('My Library'));
    expect(router.push).toHaveBeenCalledWith('/library');
    await fireEvent.press(screen.getByText('The Plan'));
    expect(router.push).toHaveBeenCalledWith('/plan');
  });

  it('hands back the section you picked, not just its name', async () => {
    await render(<Sidebar {...props} />);
    await fireEvent.press(screen.getByText(GENRES[0].title));
    expect(props.onSelect).toHaveBeenCalledWith(GENRES[0]);
  });

  it('takes search into the rail when it is given one', async () => {
    await render(<Sidebar {...props} search={<Text>Search games…</Text>} />);
    expect(screen.getByText('Search games…')).toBeTruthy();
  });
});
