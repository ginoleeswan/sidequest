import handler, {
  escapeHtml,
  previewDescription,
  renderPreview,
} from '../../../api/preview';

const game = (over: Partial<Parameters<typeof renderPreview>[0]> = {}) => ({
  name: 'Hollow Knight: Silksong',
  released: '2025-09-04',
  rating: 4.4,
  playtime: 24,
  background_image: 'https://media.rawg.io/media/games/abc.jpg',
  genres: [{ name: 'Indie' }],
  ...over,
});

describe('escapeHtml', () => {
  it('closes every hole a name could open', () => {
    expect(escapeHtml('<script>alert(1)</script>')).toBe(
      '&lt;script&gt;alert(1)&lt;/script&gt;'
    );
    expect(escapeHtml('a "quoted" & \'single\'')).toBe(
      'a &quot;quoted&quot; &amp; &#39;single&#39;'
    );
  });
});

describe('previewDescription', () => {
  it('leads with the facts that decide a tap', () => {
    expect(previewDescription(game())).toContain('Indie · 2025 · ★ 4.4');
    expect(previewDescription(game())).toContain('~24h to finish');
  });

  it('appends the blurb when there is one', () => {
    const text = previewDescription(
      game({ description_raw: 'A vast, haunted kingdom awaits.' })
    );
    expect(text).toContain('A vast, haunted kingdom awaits.');
  });

  it('collapses whitespace and truncates a long blurb', () => {
    const text = previewDescription(
      game({ description_raw: `word  \n\n  ${'x'.repeat(400)}` })
    );
    expect(text).not.toMatch(/\s{2,}/);
    expect(text).toContain('…');
    expect(text.length).toBeLessThan(260);
  });

  it('still says something when the game has no facts at all', () => {
    const bare = previewDescription({ name: 'Mystery' });
    expect(bare.length).toBeGreaterThan(10);
  });

  it('omits facts it does not have rather than printing blanks', () => {
    const text = previewDescription({ name: 'X', rating: 0, playtime: 0 });
    expect(text).not.toContain('★');
    expect(text).not.toContain('undefined');
    expect(text).not.toContain('~0h');
  });
});

describe('renderPreview', () => {
  it('carries the game, not the site, in every card tag', () => {
    const html = renderPreview(game(), '123');
    expect(html).toContain(
      '<meta property="og:title" content="Hollow Knight: Silksong — Sidequest"/>'
    );
    expect(html).toContain(
      '<meta property="og:image" content="https://media.rawg.io/media/games/abc.jpg"/>'
    );
    expect(html).toContain(
      '<meta property="og:url" content="https://gosidequest.vercel.app/game/123"/>'
    );
    expect(html).toContain('name="twitter:card" content="summary_large_image"');
  });

  it('falls back to the site card when a game has no art', () => {
    const html = renderPreview(game({ background_image: null }), '9');
    expect(html).toContain('/og.png');
  });

  it('cannot be broken out of by a hostile name', () => {
    const html = renderPreview(
      game({ name: '"><script>alert(1)</script>' }),
      '1'
    );
    expect(html).not.toContain('<script>alert(1)');
    expect(html).toContain('&lt;script&gt;');
  });

  it('is readable by a crawler that ignores meta tags', () => {
    const html = renderPreview(game(), '123');
    expect(html).toContain('<h1>Hollow Knight: Silksong</h1>');
    expect(html).toContain(
      'href="https://gosidequest.vercel.app/game/123"'
    );
  });
});

describe('preview handler', () => {
  const ORIGINAL_KEY = process.env.RAWG_API_KEY;

  function fakeRes() {
    const state = { code: 0, body: '', headers: {} as Record<string, string> };
    return {
      state,
      setHeader: (name: string, value: string) => {
        state.headers[name] = value;
      },
      status: (code: number) => {
        state.code = code;
        return {
          send: (body: string) => {
            state.body = body;
          },
        };
      },
    };
  }

  beforeEach(() => {
    process.env.RAWG_API_KEY = 'test-key';
  });
  afterAll(() => {
    process.env.RAWG_API_KEY = ORIGINAL_KEY;
  });

  it('refuses anything that is not a game id', async () => {
    for (const id of ['../../etc/passwd', 'abc', '', '12345678901']) {
      const res = fakeRes();
      await handler({ query: { id } }, res);
      expect(res.state.code).toBe(400);
    }
  });

  it('never puts the API key in what it returns', async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => game(),
    }) as unknown as typeof fetch;

    const res = fakeRes();
    await handler({ query: { id: '123' } }, res);
    expect(res.state.code).toBe(200);
    expect(res.state.body).not.toContain('test-key');
    expect(res.state.body).toContain('Hollow Knight: Silksong');
  });

  it('lets the edge answer repeat crawls', async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => game(),
    }) as unknown as typeof fetch;

    const res = fakeRes();
    await handler({ query: { id: '123' } }, res);
    expect(res.state.headers['Cache-Control']).toContain('s-maxage=86400');
    expect(res.state.headers['Content-Type']).toContain('text/html');
  });

  it('passes a missing game through as missing', async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: false,
      status: 404,
      json: async () => ({}),
    }) as unknown as typeof fetch;

    const res = fakeRes();
    await handler({ query: { id: '999999' } }, res);
    expect(res.state.code).toBe(404);
  });

  it('answers even when RAWG does not', async () => {
    global.fetch = jest
      .fn()
      .mockRejectedValue(new Error('gone')) as unknown as typeof fetch;

    const res = fakeRes();
    await handler({ query: { id: '123' } }, res);
    expect(res.state.code).toBe(504);
    expect(res.state.body).toContain('<!doctype html>');
  });
});
