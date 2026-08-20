import { screen } from '@testing-library/react-native';

import { YearBlocks } from '../YearBlocks';
import { renderApp } from '@/test-utils';

/** Twelve months, four rows, one block per game you saw the end of. */
describe('the year blocks', () => {
  const empty = Array.from({ length: 12 }, () => 0);

  const filled = () => screen.queryAllByTestId('year-block-on');

  it('names every month', async () => {
    await renderApp(<YearBlocks months={empty} landed={null} />);
    // Initials, so January, June and July all answer to J.
    expect(screen.getAllByText('J')).toHaveLength(3);
    expect(screen.getByText('D')).toBeTruthy();
    expect(screen.queryAllByTestId(/year-block-/)).toHaveLength(48);
  });

  it('draws one block per game finished', async () => {
    const months = [...empty];
    months[2] = 3;
    await renderApp(<YearBlocks months={months} landed={null} />);
    expect(filled()).toHaveLength(3);
  });

  /** A prolific month is still four blocks tall; the card has a ceiling. */
  it('does not overflow a month past the card', async () => {
    const months = [...empty];
    months[5] = 9;
    await renderApp(<YearBlocks months={months} landed={null} />);
    expect(filled()).toHaveLength(4);
  });

  it('shows a still year when nothing landed', async () => {
    await renderApp(<YearBlocks months={empty} landed={null} />);
    expect(filled()).toHaveLength(0);
  });
});
