import { fireEvent, render, screen } from '@testing-library/react-native';

import { ReadMoreText } from '../ReadMoreText';

const BODY = 'A long description of a game that runs well past three lines.';

/** Long copy stays short until you ask for it. */
describe('collapsible text', () => {
  it('starts clamped, and offers to expand', async () => {
    await render(<ReadMoreText>{BODY}</ReadMoreText>);
    expect(screen.getByText(BODY).props.numberOfLines).toBe(3);
    expect(screen.getByText('Read more')).toBeTruthy();
  });

  it('expands and collapses again on each press', async () => {
    await render(<ReadMoreText>{BODY}</ReadMoreText>);
    await fireEvent.press(screen.getByText('Read more'));
    expect(screen.getByText(BODY).props.numberOfLines).toBeUndefined();
    await fireEvent.press(screen.getByText('Show less'));
    expect(screen.getByText(BODY).props.numberOfLines).toBe(3);
  });

  /**
   * Native reports how many lines the text laid out in. Fewer than the
   * clamp means the clamp cut nothing, and a "Read more" that opens
   * nothing is the tell of a templated page.
   */
  it('withholds the control when the clamp cut nothing', async () => {
    await render(<ReadMoreText>{BODY}</ReadMoreText>);
    await fireEvent(screen.getByText(BODY), 'textLayout', {
      nativeEvent: { lines: [{ text: BODY }] },
    });
    expect(screen.queryByText('Read more')).toBeNull();
  });

  it('keeps the control when the text ran past the clamp', async () => {
    await render(<ReadMoreText>{BODY}</ReadMoreText>);
    await fireEvent(screen.getByText(BODY), 'textLayout', {
      nativeEvent: { lines: [{}, {}, {}, {}] },
    });
    expect(screen.getByText('Read more')).toBeTruthy();
  });

  /**
   * A disclosure has to say it is one: a button, and whether it is
   * open, so VoiceOver can announce "collapsed" before the press and
   * "expanded" after it.
   */
  it('announces itself as a button that opens and closes', async () => {
    await render(<ReadMoreText>{BODY}</ReadMoreText>);
    const control = screen.getByRole('button');
    expect(control.props.accessibilityState).toMatchObject({
      expanded: false,
    });
    await fireEvent.press(control);
    expect(screen.getByRole('button').props.accessibilityState).toMatchObject({
      expanded: true,
    });
  });

  it('honours a clamp the caller sets', async () => {
    await render(<ReadMoreText numberOfLines={1}>{BODY}</ReadMoreText>);
    expect(screen.getByText(BODY).props.numberOfLines).toBe(1);
  });
});
