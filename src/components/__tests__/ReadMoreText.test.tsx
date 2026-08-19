import { fireEvent, render, screen } from '@testing-library/react-native';

import { ReadMoreText } from '../ReadMoreText';

const BODY = 'A long description of a game that runs well past three lines.';

/** Long copy stays short until you ask for it. */
describe('collapsible text', () => {
  it('starts clamped, and offers to expand', async () => {
    await render(<ReadMoreText>{BODY}</ReadMoreText>);
    expect(screen.getByText(BODY).props.numberOfLines).toBe(3);
    expect(screen.getByText('Read More')).toBeTruthy();
  });

  it('expands and collapses again on each press', async () => {
    await render(<ReadMoreText>{BODY}</ReadMoreText>);
    await fireEvent.press(screen.getByText('Read More'));
    expect(screen.getByText(BODY).props.numberOfLines).toBeUndefined();
    await fireEvent.press(screen.getByText('Show Less'));
    expect(screen.getByText(BODY).props.numberOfLines).toBe(3);
  });

  it('honours a clamp the caller sets', async () => {
    await render(<ReadMoreText numberOfLines={1}>{BODY}</ReadMoreText>);
    expect(screen.getByText(BODY).props.numberOfLines).toBe(1);
  });
});
