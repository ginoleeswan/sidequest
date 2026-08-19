import { fireEvent, render, screen } from '@testing-library/react-native';

import { Message } from '../Message';

/** Every dead end in the app is this component. */
describe('the empty state', () => {
  it('shows a title on its own', async () => {
    await render(<Message icon="search" title="Nothing here" />);
    expect(screen.getByText('Nothing here')).toBeTruthy();
  });

  it('adds the detail line when there is more to say', async () => {
    await render(
      <Message icon="search" title="Nothing here" detail="Try another word." />
    );
    expect(screen.getByText('Try another word.')).toBeTruthy();
  });

  it('offers a way out when it is given both a label and a handler', async () => {
    const onAction = jest.fn();
    await render(
      <Message
        icon="search"
        title="Nothing here"
        actionLabel="Clear search"
        onAction={onAction}
      />
    );
    await fireEvent.press(screen.getByText('Clear search'));
    expect(onAction).toHaveBeenCalled();
  });

  it('does not render a button that would do nothing', async () => {
    await render(
      <Message icon="search" title="Nothing here" actionLabel="Clear search" />
    );
    expect(screen.queryByText('Clear search')).toBeNull();
  });
});
