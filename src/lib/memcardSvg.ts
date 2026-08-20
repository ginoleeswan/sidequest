import { blocksByMonth, MONTH_INITIALS, type Memcard } from './memcard';

/**
 * The Memcard, drawn.
 *
 * One function producing one SVG string, used for both the card on
 * screen and the image someone posts — so what gets shared is exactly
 * what was seen, rather than a second implementation that drifts.
 *
 * 1200x630 because that is what every social preview crops to; a card
 * that arrives letterboxed is a card nobody posts twice.
 */

export const CARD_WIDTH = 1200;
export const CARD_HEIGHT = 630;

const INK = '#F7F8FA';
const DIM = '#8A93A6';
const AMBER = '#F5A524';
const CARD = '#1D2431';
const SHELL = '#0E121A';

/** Twelve columns, one per month; blocks stack upward within a month. */
const GRID = {
  x: 700,
  y: 190,
  width: 420,
  height: 200,
  columns: 12,
  rows: 4,
};

/** Names on the card, before it stops being a card and starts being a list. */
const NAMED = 8;

const escape = (text: string) =>
  text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');

/**
 * The memory card silhouette: a rounded rectangle with the corner cut
 * off, which is the shape everyone who owned one can still draw from
 * memory.
 */
function shell(): string {
  const x = GRID.x - 40;
  const y = GRID.y - 60;
  const w = GRID.width + 80;
  const h = GRID.height + 120;
  const notch = 46;
  return `<path d="M ${x + 16} ${y} H ${x + w - notch} L ${x + w} ${y + notch} V ${
    y + h - 16
  } a 16 16 0 0 1 -16 16 H ${x + 16} a 16 16 0 0 1 -16 -16 V ${
    y + 16
  } a 16 16 0 0 1 16 -16 Z" fill="${SHELL}" stroke="rgba(255,255,255,0.10)" stroke-width="2"/>`;
}

function blocks(card: Memcard): string {
  const months = blocksByMonth(card);
  const cellW = GRID.width / GRID.columns;
  const cellH = GRID.height / GRID.rows;
  const parts: string[] = [];

  for (let month = 0; month < GRID.columns; month++) {
    for (let row = 0; row < GRID.rows; row++) {
      const filled = row < Math.min(months[month], GRID.rows);
      const x = GRID.x + month * cellW + 2;
      // Blocks stack from the bottom, so a good month reads as a tower.
      const y = GRID.y + (GRID.rows - 1 - row) * cellH + 2;
      parts.push(
        `<rect x="${x.toFixed(1)}" y="${y.toFixed(1)}" width="${(
          cellW - 4
        ).toFixed(1)}" height="${(cellH - 4).toFixed(1)}" rx="4" fill="${
          filled ? AMBER : 'rgba(255,255,255,0.05)'
        }"/>`
      );
    }
    const labelX = GRID.x + month * cellW + cellW / 2;
    parts.push(
      `<text x="${labelX.toFixed(1)}" y="${
        GRID.y + GRID.height + 26
      }" font-family="Noah-Regular, Helvetica, Arial, sans-serif" font-size="15" fill="${DIM}" text-anchor="middle">${
        MONTH_INITIALS[month]
      }</text>`
    );
  }
  return parts.join('');
}

/** The stamp. Slightly askew, because a straight stamp is a label. */
function stamp(): string {
  return `<g transform="translate(845 545) rotate(-6)">
    <rect x="-14" y="-30" width="250" height="60" rx="8" fill="none" stroke="${AMBER}" stroke-width="3" opacity="0.85"/>
    <text x="111" y="10" font-family="Noah-Black, Helvetica, Arial, sans-serif" font-size="27" letter-spacing="3" fill="${AMBER}" text-anchor="middle">ROLL CREDITS</text>
  </g>`;
}

/**
 * The games themselves, in two columns.
 *
 * The blocks are the shape of the year; these are the year. A card
 * without the titles on it is a chart, and nobody posts a chart of
 * their own hobby.
 */
function names(card: Memcard): string {
  const shown = card.blocks.slice(0, NAMED);
  const rest = card.count - shown.length;
  const parts: string[] = [];

  shown.forEach((block, index) => {
    const column = index % 2;
    const row = Math.floor(index / 2);
    const x = 80 + column * 290;
    const y = 430 + row * 36;
    parts.push(
      `<circle cx="${x + 5}" cy="${y - 6}" r="4" fill="${AMBER}"/>` +
        `<text x="${x + 22}" y="${y}" font-family="Noah-Bold, Helvetica, Arial, sans-serif" font-size="19" fill="${INK}">${escape(
          block.name.length > 24 ? `${block.name.slice(0, 23)}…` : block.name
        )}</text>`
    );
  });

  if (rest > 0) {
    parts.push(
      `<text x="80" y="${430 + Math.ceil(shown.length / 2) * 36 + 10}" font-family="Noah-Regular, Helvetica, Arial, sans-serif" font-size="17" fill="${DIM}">and ${rest} more</text>`
    );
  }
  return parts.join('');
}

export interface SvgOptions {
  /**
   * A @font-face block embedding the app's typeface.
   *
   * Needed only for export: an SVG drawn onto a canvas cannot reach the
   * page's fonts, so without this the shared image would arrive in
   * whatever the renderer falls back to. On screen the page has the
   * fonts already.
   */
  fontCss?: string;
}

export function memcardSvg(
  card: Memcard,
  { fontCss }: SvgOptions = {}
): string {
  const title = card.longest
    ? `Longest: ${escape(card.longest.name)} · ${Math.round(card.longest.hours)}h`
    : 'Every game you see the end of counts';

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${CARD_WIDTH}" height="${CARD_HEIGHT}" viewBox="0 0 ${CARD_WIDTH} ${CARD_HEIGHT}">
  ${fontCss ? `<defs><style type="text/css">${fontCss}</style></defs>` : ''}
  <rect width="${CARD_WIDTH}" height="${CARD_HEIGHT}" fill="${CARD}"/>
  <rect width="${CARD_WIDTH}" height="4" fill="${AMBER}"/>

  <text x="80" y="96" font-family="Noah-Black, Helvetica, Arial, sans-serif" font-size="26" letter-spacing="4" fill="${INK}">SIDEQUEST</text>
  <text x="80" y="128" font-family="Noah-Regular, Helvetica, Arial, sans-serif" font-size="17" fill="${DIM}">Your backlog, minus the guilt</text>

  <text x="80" y="236" font-family="Noah-Black, Helvetica, Arial, sans-serif" font-size="72" fill="${INK}">${card.year}</text>
  <text x="80" y="292" font-family="Noah-Bold, Helvetica, Arial, sans-serif" font-size="32" fill="${INK}">${escape(
    card.headline
  )}</text>
  <text x="80" y="330" font-family="Noah-Regular, Helvetica, Arial, sans-serif" font-size="19" fill="${DIM}">${escape(
    card.subhead
  )}</text>
  <text x="80" y="368" font-family="Noah-Regular, Helvetica, Arial, sans-serif" font-size="17" fill="${DIM}">${title}</text>

  ${shell()}
  ${blocks(card)}
  ${names(card)}
  ${card.count > 0 ? stamp() : ''}
  <text x="80" y="590" font-family="Noah-Regular, Helvetica, Arial, sans-serif" font-size="16" fill="${DIM}">sidequest — what you can actually finish</text>
</svg>`;
}
