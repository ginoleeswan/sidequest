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
});
