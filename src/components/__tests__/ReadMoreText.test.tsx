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

  /**
   * Native reports how many lines the text laid out in. Fewer than the
   * clamp means the clamp cut nothing, and a "Read More" that opens
   * nothing is the tell of a templated page.
   */
  it('withholds the control when the clamp cut nothing', async () => {
    await render(<ReadMoreText>{BODY}</ReadMoreText>);
    await fireEvent(screen.getByText(BODY), 'textLayout', {
      nativeEvent: { lines: [{ text: BODY }] },
    });
    expect(screen.queryByText('Read More')).toBeNull();
  });

  it('keeps the control when the text ran past the clamp', async () => {
    await render(<ReadMoreText>{BODY}</ReadMoreText>);
    await fireEvent(screen.getByText(BODY), 'textLayout', {
      nativeEvent: { lines: [{}, {}, {}, {}] },
    });
    expect(screen.getByText('Read More')).toBeTruthy();
  });

  it('honours a clamp the caller sets', async () => {
    await render(<ReadMoreText numberOfLines={1}>{BODY}</ReadMoreText>);
    expect(screen.getByText(BODY).props.numberOfLines).toBe(1);
  });
});
