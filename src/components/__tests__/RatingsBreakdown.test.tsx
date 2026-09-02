import { render, screen } from '@testing-library/react-native';

import { RatingsBreakdown } from '../RatingsBreakdown';
import type { RatingBucket } from '@/api/types';

const buckets = [
  { id: 5, title: 'exceptional', count: 12926, percent: 62.5 },
  { id: 4, title: 'recommended', count: 5400, percent: 26.1 },
  { id: 1, title: 'skip', count: 300, percent: 1.4 },
] as RatingBucket[];

/** The community verdict, as bars — silent when nobody has voted. */
describe('the ratings breakdown', () => {
  it('stays out of the way when there are no ratings', async () => {
    await render(
      <RatingsBreakdown
        ratings={
          [
            { id: 5, title: 'exceptional', count: 0, percent: 0 },
          ] as RatingBucket[]
        }
      />
    );
    expect(screen.toJSON()).toBeNull();
  });

  it('labels each bucket in words, not slugs', async () => {
    await render(<RatingsBreakdown ratings={buckets} />);
    expect(screen.getByText('Exceptional')).toBeTruthy();
    expect(screen.getByText('Recommended')).toBeTruthy();
    expect(screen.queryByText('exceptional')).toBeNull();
  });

  it('abbreviates the counts, and leaves the total to the section head', async () => {
    await render(<RatingsBreakdown ratings={buckets} />);
    expect(screen.getByText('12.9k')).toBeTruthy();
    // The page's eyebrow says "18,626 ratings on RAWG" above this; a
    // footnote saying it again under the bars was the same fact twice.
    expect(screen.queryByText(/player ratings/)).toBeNull();
  });

  /**
   * The share who rated it recommended or better — the one number that
   * answers "are these hours worth spending", which is the question the
   * bars leave the reader to work out for themselves.
   */
  it('leads with the share who liked it', async () => {
    await render(<RatingsBreakdown ratings={buckets} />);
    // 12,926 + 5,400 of 18,626.
    expect(screen.getByText('98%')).toBeTruthy();
    expect(screen.getByText('rated it recommended or better')).toBeTruthy();
  });

  it('falls back to the raw title for a bucket it does not know', async () => {
    await render(
      <RatingsBreakdown
        ratings={
          [
            { id: 9, title: 'sublime', count: 4, percent: 100 },
          ] as RatingBucket[]
        }
      />
    );
    expect(screen.getByText('sublime')).toBeTruthy();
  });
});
