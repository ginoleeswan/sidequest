import { act, fireEvent, screen } from '@testing-library/react-native';
import { StyleSheet } from 'react-native';
import { router } from 'expo-router';

import { HomeStage } from '../HomeStage';
import type { Game } from '@/api/types';
import type { StageSlide } from '@/lib/stage';
import { renderApp } from '@/test-utils';
import { getMovies } from '@/api/rawg';
import { useBreakpoint } from '@/hooks/useBreakpoint';

jest.mock('@/api/rawg', () => ({
  ...jest.requireActual('@/api/rawg'),
  getMovies: jest.fn(),
}));
jest.mock('@/hooks/useBreakpoint', () => ({
  useBreakpoint: jest.fn(() => ({
    width: 390,
    isCompact: true,
    isExpanded: false,
    columns: 2,
  })),
}));

const game = (id: number, name: string): Game =>
  ({ id, name, background_image: null }) as unknown as Game;

const slide = (over: Partial<StageSlide> = {}): StageSlide => ({
  key: 'tonight-1',
  kind: 'tonight',
  game: game(1, 'Hades'),
  eyebrow: 'Thursday, 20 August · Tonight',
  title: 'Finish Hades',
  detail: '3h left. You could see the credits before bed.',
  action: 'Finish it',
  ...over,
});

/** The first thing anyone sees. */
describe('the home stage', () => {
  beforeEach(() => jest.mocked(router.push).mockClear());

  it('shows nothing rather than an empty frame', async () => {
    await renderApp(
      <HomeStage slides={[]} games={[]} headerHeight={0} height={400} />
    );
    expect(screen.queryByText('Finish it')).toBeNull();
  });

  /**
   * The rail this replaced showed a cover, a star and a year. The reason
   * is the whole point of the redesign, so it is the thing pinned.
   */
  it('leads with the reason, not just the artwork', async () => {
    await renderApp(
      <HomeStage slides={[slide()]} games={[]} headerHeight={0} height={400} />
    );
    expect(screen.getByText('THURSDAY, 20 AUGUST · TONIGHT')).toBeTruthy();
    expect(screen.getByText('Finish Hades')).toBeTruthy();
    expect(
      screen.getByText('3h left. You could see the credits before bed.')
    ).toBeTruthy();
  });

  it('opens the game behind the primary action', async () => {
    await renderApp(
      <HomeStage slides={[slide()]} games={[]} headerHeight={0} height={400} />
    );
    await fireEvent.press(screen.getByText('Finish it'));
    expect(router.push).toHaveBeenCalledWith('/game/1');
  });

  it('opens something from the page when you cannot decide', async () => {
    await renderApp(
      <HomeStage
        slides={[slide()]}
        games={[game(9, 'Something Else')]}
        headerHeight={0}
        height={400}
      />
    );
    await fireEvent.press(screen.getByText('Surprise me'));
    expect(router.push).toHaveBeenCalledWith('/game/9');
  });

  /** With nothing else loaded, the dice still have to land somewhere. */
  it('falls back to the stage itself for a random pick', async () => {
    await renderApp(
      <HomeStage slides={[slide()]} games={[]} headerHeight={0} height={400} />
    );
    await fireEvent.press(screen.getByText('Surprise me'));
    expect(router.push).toHaveBeenCalledWith('/game/1');
  });

  /**
   * Regression: the slides were laid out before the stage had been
   * measured, so every one of them sat at offset 0 and the last one
   * covered the rest. The stage opened on its second slide.
   */
  it('gives its slides a width before it has been measured', async () => {
    await renderApp(
      <HomeStage
        slides={[slide(), slide({ key: 'fresh-2', game: game(2, 'Next') })]}
        games={[]}
        headerHeight={0}
        height={400}
      />
    );
    const first = screen.getByTestId('stage-slide-0');
    const { width } = StyleSheet.flatten(first.props.style);
    expect(width).toBeGreaterThan(0);
  });

  it('names the action for a screen reader, since the label alone is a verb', async () => {
    await renderApp(
      <HomeStage slides={[slide()]} games={[]} headerHeight={0} height={400} />
    );
    expect(screen.getByLabelText('Finish it: Hades')).toBeTruthy();
  });
});

/**
 * The dwell: linger on a slide and the still comes to life. Pinned on
 * both edges - it must not start before the beat is up, and a phone
 * must never start it at all - because the failure modes are a video
 * download on every flick past the stage, and a phone's data budget
 * spent on artwork that was designed to be a picture.
 */
describe('the stage trailer dwell', () => {
  const trailer = {
    id: 9,
    name: 'Trailer',
    preview: 'https://media.rawg.io/media/p.jpg',
    data: { max: 'https://steamcdn-a.akamaihd.net/steam/apps/1/movie_max.mp4' },
  };
  const expanded = () =>
    jest.mocked(useBreakpoint).mockReturnValue({
      width: 1280,
      isCompact: false,
      isExpanded: true,
      columns: 4,
    });

  beforeEach(() => {
    jest.useFakeTimers();
    // A mocked return value outlives the test that set it; every case
    // starts as a phone and says so, rather than inheriting the last
    // case's desk.
    jest.mocked(useBreakpoint).mockReturnValue({
      width: 390,
      isCompact: true,
      isExpanded: false,
      columns: 2,
    });
    jest.mocked(getMovies).mockClear();
    jest.mocked(getMovies).mockResolvedValue({
      count: 1,
      next: null,
      results: [trailer],
    });
  });
  afterEach(() => jest.useRealTimers());

  it('brings the still to life only after the beat, on a wide stage', async () => {
    expanded();
    await renderApp(
      <HomeStage slides={[slide()]} games={[]} headerHeight={0} height={400} />
    );
    expect(screen.queryByTestId('stage-trailer')).toBeNull();
    await act(async () => {
      jest.advanceTimersByTime(3100);
    });
    expect(await screen.findByTestId('stage-trailer')).toBeTruthy();
    expect(getMovies).toHaveBeenCalledWith(1);
  });

  it('never asks for a trailer on a phone', async () => {
    await renderApp(
      <HomeStage slides={[slide()]} games={[]} headerHeight={0} height={400} />
    );
    await act(async () => {
      jest.advanceTimersByTime(3100);
    });
    expect(screen.queryByTestId('stage-trailer')).toBeNull();
    expect(getMovies).not.toHaveBeenCalled();
  });
});
