import { shareMemcard } from '../memcardImage';
import type { Memcard } from '../memcard';

/**
 * The module is a web rasteriser — SVG onto a canvas, fonts inlined —
 * and everything below its platform gate needs a real DOM to mean
 * anything: Image decode, a 2d context, document.fonts. Jest's native
 * environment has none of that, so the drawing body is exercised by the
 * browser battery instead. What belongs HERE is the gate itself, and
 * the fact that the file is loaded at all — a module no test loads is
 * silently absent from the coverage report entirely.
 */
describe('shareMemcard', () => {
  it('refuses off-web, where none of its machinery exists', async () => {
    await expect(
      shareMemcard({ year: 2026, blocks: [] } as unknown as Memcard)
    ).rejects.toThrow(/web-only/);
  });
});
