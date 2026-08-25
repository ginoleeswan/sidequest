import { Asset } from 'expo-asset';
import { Platform } from 'react-native';

import type { Memcard } from './memcard';
import { CARD_HEIGHT, CARD_WIDTH, memcardSvg } from './memcardSvg';

/**
 * The card as a file someone can post.
 *
 * Web only, and deliberately client-side: the card is built from a
 * library that never leaves the device, so rendering it on a server
 * would mean uploading exactly the data this app promises not to
 * collect.
 *
 * The fonts are inlined rather than referenced. An SVG drawn onto a
 * canvas is its own document — it cannot reach the page's fonts — so
 * without embedding them the shared image would arrive in whatever the
 * renderer falls back to, which is the one part of a share artifact
 * nobody forgives.
 */

const FACES: { family: string; module: number }[] = [
  {
    family: 'Noah-Black',
    module: require('../../assets/fonts/Noah-Black.woff2'),
  },
  {
    family: 'Noah-Bold',
    module: require('../../assets/fonts/Noah-Bold.woff2'),
  },
  {
    family: 'Noah-Regular',
    module: require('../../assets/fonts/Noah-Regular.woff2'),
  },
];

/** Rendered at 2x: a card that looks soft on a phone is not shareable. */
const SCALE = 2;

let fontCssCache: string | null = null;

async function base64(url: string): Promise<string> {
  const response = await fetch(url);
  const buffer = await response.arrayBuffer();
  let binary = '';
  const bytes = new Uint8Array(buffer);
  for (let i = 0; i < bytes.length; i++)
    binary += String.fromCharCode(bytes[i]);
  return btoa(binary);
}

async function fontCss(): Promise<string> {
  if (fontCssCache) return fontCssCache;
  const faces = await Promise.all(
    FACES.map(async ({ family, module }) => {
      const uri = Asset.fromModule(module).uri;
      const data = await base64(uri);
      return `@font-face{font-family:'${family}';src:url(data:font/woff2;base64,${data}) format('woff2');}`;
    })
  );
  fontCssCache = faces.join('');
  return fontCssCache;
}

/** Draw the card and hand back PNG bytes. */
async function memcardPng(card: Memcard): Promise<Blob> {
  const svg = memcardSvg(card, { fontCss: await fontCss() });
  const url = URL.createObjectURL(new Blob([svg], { type: 'image/svg+xml' }));

  try {
    const image = new Image();
    image.decoding = 'sync';
    await new Promise<void>((resolve, reject) => {
      image.onload = () => resolve();
      image.onerror = () => reject(new Error('The card could not be drawn'));
      image.src = url;
    });

    const canvas = document.createElement('canvas');
    canvas.width = CARD_WIDTH * SCALE;
    canvas.height = CARD_HEIGHT * SCALE;
    const context = canvas.getContext('2d');
    if (!context) throw new Error('This browser cannot draw the card');
    context.drawImage(image, 0, 0, canvas.width, canvas.height);

    return await new Promise<Blob>((resolve, reject) =>
      canvas.toBlob(
        (blob) =>
          blob ? resolve(blob) : reject(new Error('The card came out empty')),
        'image/png'
      )
    );
  } finally {
    URL.revokeObjectURL(url);
  }
}

/**
 * Share the card, or save it.
 *
 * Where the browser can hand a file to another app — every phone that
 * matters — that is the path someone actually wants: straight into a
 * post. Everywhere else it downloads, which is what a desktop expects
 * anyway.
 */
export async function shareMemcard(card: Memcard): Promise<'shared' | 'saved'> {
  if (Platform.OS !== 'web') throw new Error('Sharing is web-only for now');

  const blob = await memcardPng(card);
  const file = new File([blob], `sidequest-${card.year}.png`, {
    type: 'image/png',
  });

  const sharer = navigator as Navigator & {
    canShare?: (data: { files: File[] }) => boolean;
    share?: (data: { files: File[]; title?: string }) => Promise<void>;
  };

  if (sharer.share && sharer.canShare?.({ files: [file] })) {
    await sharer.share({ files: [file], title: `Sidequest ${card.year}` });
    return 'shared';
  }

  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = file.name;
  link.click();
  URL.revokeObjectURL(url);
  return 'saved';
}
