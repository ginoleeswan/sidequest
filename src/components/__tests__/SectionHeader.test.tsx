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

  /**
   * Neither face has a "→": a typed arrow fell back to the system font
   * and was read aloud as "right arrow". It is drawn as a chevron.
   */
  it('draws a typed arrow as a chevron and keeps it out of the label', async () => {
    const onAction = jest.fn();
    await render(
      <SectionHeader
        title="Your week"
        actionLabel="Share →"
        onAction={onAction}
      />
    );
    expect(screen.queryByText(/→/)).toBeNull();
    expect(screen.getByText('Share')).toBeTruthy();
    await fireEvent.press(screen.getByLabelText('Share'));
    expect(onAction).toHaveBeenCalled();
  });

  it('colours the eyebrow by what it is about', async () => {
    await render(
      <SectionHeader title="Credits" eyebrow="Finished" tone="finished" />
    );
    const style = JSON.stringify(screen.getByText('Finished').props.style);
    expect(style).toContain('#3ECF8E');
  });
});
