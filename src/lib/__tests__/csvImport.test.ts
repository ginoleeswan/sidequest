import { parseCsv, splitCsvLine } from '../csvImport';

/**
 * Nobody agrees on column names, and a lot of game titles contain
 * commas. Reading the header and taking what is recognised beats
 * demanding a shape — and a paste that cannot be read has to say so.
 */
describe('reading a pasted library', () => {
  it('splits a line without cutting a title in half', () => {
    expect(
      splitCsvLine('"Bloodstained: Ritual, of the Night",finished')
    ).toEqual(['Bloodstained: Ritual, of the Night', 'finished']);
  });

  it('handles a quote inside a quoted title', () => {
    expect(splitCsvLine('"Don""t Starve",playing')).toEqual([
      'Don"t Starve',
      'playing',
    ]);
  });

  it('reads a Backloggd-shaped export', () => {
    const { rows } = parseCsv(
      ['Title,Status,Hours', 'Celeste,Completed,12', 'Hades,Playing,8'].join(
        '\n'
      )
    );
    expect(rows).toEqual([
      { title: 'Celeste', status: 'finished', hours: 12 },
      { title: 'Hades', status: 'playing', hours: 8 },
    ]);
  });

  it('reads a spreadsheet that calls things something else', () => {
    const { rows } = parseCsv(
      ['Game Name,Progress,Main Story', 'Tunic,Beaten,14'].join('\n')
    );
    expect(rows[0]).toEqual({ title: 'Tunic', status: 'finished', hours: 14 });
  });

  it('takes a title on its own, which is all it needs', () => {
    const { rows } = parseCsv(['name', 'Celeste', 'Hades'].join('\n'));
    expect(rows.map((r) => r.title)).toEqual(['Celeste', 'Hades']);
    expect(rows[0].status).toBeUndefined();
  });

  it('treats anything it does not recognise as something to play', () => {
    const { rows } = parseCsv(
      ['Title,Status', 'Celeste,Wishlisted'].join('\n')
    );
    expect(rows[0].status).toBe('wishlist');
  });

  it('reads hours out of whatever they were written as', () => {
    const { rows } = parseCsv(
      ['Title,Hours', 'A,12h', 'B,8 hours', 'C,nonsense'].join('\n')
    );
    expect(rows.map((r) => r.hours)).toEqual([12, 8, undefined]);
  });

  it('keeps one row per game', () => {
    const { rows } = parseCsv(
      ['Title', 'Celeste', 'celeste', 'Hades'].join('\n')
    );
    expect(rows).toHaveLength(2);
  });

  it('says what it found when there is no title column', () => {
    const { rows, headers } = parseCsv(['Foo,Bar', '1,2'].join('\n'));
    expect(rows).toEqual([]);
    expect(headers).toEqual(['foo', 'bar']);
  });

  it('never throws on a paste that is not a CSV at all', () => {
    expect(parseCsv('')).toEqual({ rows: [], headers: [] });
    expect(parseCsv('just some text')).toEqual({ rows: [], headers: [] });
  });

  /**
   * The most natural thing anybody pastes.
   *
   * This wanted a header row with a column it recognised, so a backlog
   * pasted one game a line came back empty with the first game eaten as
   * a column name and the app answering "no title column, expected
   * Title, Name or Game" — telling somebody to go and make a
   * spreadsheet before it would help them. For the reader with no Steam
   * account, that was the whole door closed.
   */
  describe('a plain list of titles', () => {
    it('reads every line as a game', () => {
      const { rows } = parseCsv(
        ['Hades', 'Elden Ring', 'Outer Wilds'].join('\n')
      );
      expect(rows.map((row) => row.title)).toEqual([
        'Hades',
        'Elden Ring',
        'Outer Wilds',
      ]);
    });

    it('does not eat the first game as a header', () => {
      const { rows } = parseCsv(['Hades', 'Tunic'].join('\n'));
      expect(rows.map((row) => row.title)).toContain('Hades');
    });

    it('drops a header if the list happens to have one', () => {
      const { rows } = parseCsv(['Title', 'Hades', 'Tunic'].join('\n'));
      expect(rows.map((row) => row.title)).toEqual(['Hades', 'Tunic']);
    });

    it('keeps the same game once', () => {
      const { rows } = parseCsv(['Hades', 'hades', 'Tunic'].join('\n'));
      expect(rows).toHaveLength(2);
    });

    /**
     * Half the lines, not any of them: plenty of titles carry a comma,
     * and one of them in a list of forty must not turn the whole paste
     * into a spreadsheet nobody can read.
     */
    it('survives a title with a comma in it', () => {
      const { rows } = parseCsv(
        [
          'Hades',
          'Crisis Core: Final Fantasy VII, Reunion',
          'Tunic',
          'Outer Wilds',
        ].join('\n')
      );
      expect(rows).toHaveLength(4);
    });

    /**
     * A table whose columns mean nothing keeps the honest error:
     * guessing which one holds the names is how a library fills up
     * with dates and ratings.
     */
    it('still refuses a spreadsheet it cannot read', () => {
      const { rows, headers } = parseCsv(['Foo,Bar', '1,2', '3,4'].join('\n'));
      expect(rows).toEqual([]);
      expect(headers).toEqual(['foo', 'bar']);
    });
  });
});
