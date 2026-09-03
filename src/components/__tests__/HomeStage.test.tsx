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
  eyebrow: 'Tonight',
  date: 'Thu, 20 Aug',
  title: 'Hades',
  figure: '3h left',
  detail: 'You could see the credits before bed.',
  action: 'Finish it',
  ...over,
});

/**
 * Every percentage-width box in the tree: the progress bar's fill, and
 * nothing else on this stage. RNTL 14 dropped the component queries,
 * and the bar has no text to find it by.
 */
function fills(view: { toJSON: () => unknown }): string[] {
  const found: string[] = [];
  const walk = (node: unknown) => {
    if (!node || typeof node !== 'object') return;
    const el = node as {
      props?: { style?: unknown };
      children?: unknown[];
    };
    for (const style of StyleSheet.flatten(el.props?.style)
      ? [StyleSheet.flatten(el.props?.style)]
      : []) {
      const width = (style as { width?: unknown }).width;
      if (typeof width === 'string' && width.endsWith('%')) found.push(width);
    }
    el.children?.forEach(walk);
  };
  walk(view.toJSON());
  return found;
}

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
    expect(screen.getByText(/TONIGHT/)).toBeTruthy();
    expect(screen.getByText('Hades')).toBeTruthy();
    expect(
      screen.getByText(/You could see the credits before bed\./)
    ).toBeTruthy();
  });

  /**
   * The headline is the name. It used to be the sentence "Finish
   * Hades", which put the verb in the largest type on the page and
   * again on the button two hundred points below it — and left the
   * publisher's mark, which can only ever stand for a name, with a
   * sentence to stand in for.
   */
  it('sets the name as the headline, and the verb only on the button', async () => {
    await renderApp(
      <HomeStage slides={[slide()]} games={[]} headerHeight={0} height={400} />
    );
    expect(screen.getByText('Hades')).toBeTruthy();
    expect(screen.queryByText('Finish Hades')).toBeNull();
    expect(screen.getByText('Finish it')).toBeTruthy();
  });

  /**
   * The date is proof the page is today's; the reason is why this game
   * is on it. Welded together they read as one line of tracked caps
   * with the proof in front — "THURSDAY, SEPTEMBER 3 · TONIGHT".
   */
  it('says the reason first and the date after it', async () => {
    await renderApp(
      <HomeStage slides={[slide()]} games={[]} headerHeight={0} height={400} />
    );
    const eyebrow = screen.getByText(/TONIGHT/);
    expect(eyebrow).toBeTruthy();
    expect(screen.getByText(/Thu, 20 Aug/)).toBeTruthy();
  });

  it('draws how far through a game already under way', async () => {
    const view = await renderApp(
      <HomeStage
        slides={[slide({ progress: 0.75 })]}
        games={[]}
        headerHeight={0}
        height={400}
      />
    );
    expect(fills(view)).toEqual(['75%']);
  });

  /**
   * A bar at zero in the loudest place on the page says "you have not
   * started this" about the one game the stage is recommending.
   */
  it('draws no bar for a game with nothing to measure', async () => {
    const view = await renderApp(
      <HomeStage
        slides={[slide({ progress: undefined })]}
        games={[]}
        headerHeight={0}
        height={400}
      />
    );
    expect(fills(view)).toEqual([]);
  });

  /**
   * The indicator was `pointerEvents: none` — three marks saying
   * "there are three of these" and doing nothing when pressed. On a
   * desk, where there is no swipe, that made two thirds of the stage
   * reachable only by guessing that the picture could be dragged.
   */
  it('turns the page when you press a dot', async () => {
    await renderApp(
      <HomeStage
        slides={[slide(), slide({ key: 'b', game: game(2, 'Tunic') })]}
        games={[]}
        headerHeight={0}
        height={400}
      />
    );
    const second = screen.getByLabelText('Slide 2 of 2');
    expect(second).toBeTruthy();
    await fireEvent.press(second);
    // The copy follows the picture: the second slide's action is now
    // the one under the reader's thumb.
    expect(screen.getByLabelText('Finish it: Tunic')).toBeTruthy();
  });

  it('gives a phone no chevrons to press, because it has a thumb', async () => {
    await renderApp(
      <HomeStage
        slides={[slide(), slide({ key: 'b', game: game(2, 'Tunic') })]}
        games={[]}
        headerHeight={0}
        height={400}
      />
    );
    expect(screen.queryByLabelText('Next slide')).toBeNull();
  });

  describe('on a desk, where there is no swipe', () => {
    beforeEach(() =>
      jest.mocked(useBreakpoint).mockReturnValue({
        width: 1280,
        isCompact: false,
        isExpanded: true,
        columns: 4,
      })
    );
    afterEach(() =>
      jest.mocked(useBreakpoint).mockReturnValue({
        width: 390,
        isCompact: true,
        isExpanded: false,
        columns: 2,
      })
    );

    /**
     * The desk keeps its words on the artwork: a 3:1 banner at this
     * width has a whole empty half for them, which is what the asset
     * was composed for. So there the picture is the whole stage.
     */
    it('keeps the picture behind the words, where there is room for both', async () => {
      await renderApp(
        <HomeStage
          slides={[slide()]}
          games={[]}
          headerHeight={0}
          height={500}
        />
      );
      const band = screen.getByTestId('stage-band');
      expect(StyleSheet.flatten(band.props.style)?.height).toBe(500);
    });

    it('pages by chevron, and hides the one with nowhere to go', async () => {
      await renderApp(
        <HomeStage
          slides={[slide(), slide({ key: 'b', game: game(2, 'Tunic') })]}
          games={[]}
          headerHeight={0}
          height={400}
        />
      );
      // Nothing behind the first slide, so nothing to press: a dimmed
      // disc over a bright still is a smudge on the artwork.
      expect(screen.queryByLabelText('Previous slide')).toBeNull();
      await fireEvent.press(screen.getByLabelText('Next slide'));
      expect(screen.getByLabelText('Finish it: Tunic')).toBeTruthy();
      expect(screen.getByLabelText('Previous slide')).toBeTruthy();
      expect(screen.queryByLabelText('Next slide')).toBeNull();
    });
  });

  /**
   * The picture gets a band and the words get the ground.
   *
   * A phone's stage was a 0.70:1 window onto a 16:9 frame with two
   * hundred points of copy laid across its bottom third — the artwork
   * cropped to its middle and then half covered by the words. The band
   * is shorter than the stage by exactly the room the copy needs, so
   * nothing is ever drawn over the picture.
   */
  it('gives the picture a band of its own on a phone', async () => {
    await renderApp(
      <HomeStage slides={[slide()]} games={[]} headerHeight={0} height={500} />
    );
    const band = screen.getByTestId('stage-band');
    const height = StyleSheet.flatten(band.props.style)?.height;
    expect(height).toBeLessThan(500);
    expect(height).toBeGreaterThan(180);
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
