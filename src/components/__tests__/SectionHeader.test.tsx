import { fireEvent, render, screen } from '@testing-library/react-native';

import { SectionHeader } from '../SectionHeader';

/** One way section titles are rendered, everywhere. */
describe('the section header', () => {
  it('renders the title alone', async () => {
    await render(<SectionHeader title="Your route" />);
    expect(screen.getByText('Your route')).toBeTruthy();
  });

  it('carries an eyebrow above the title when given one', async () => {
    await render(<SectionHeader title="The Plan" eyebrow="4 in your queue" />);
    expect(screen.getByText('4 in your queue')).toBeTruthy();
  });

  it('runs its action on press', async () => {
    const onAction = jest.fn();
    await render(
      <SectionHeader
        title="Trending"
        actionLabel="See all"
        onAction={onAction}
      />
    );
    await fireEvent.press(screen.getByText('See all'));
    expect(onAction).toHaveBeenCalled();
  });

  it('omits an action label with nothing behind it', async () => {
    await render(<SectionHeader title="Trending" actionLabel="See all" />);
    expect(screen.queryByText('See all')).toBeNull();
  });
});
