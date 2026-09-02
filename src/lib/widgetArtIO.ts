/**
 * Web's half of the widget art store: there are no widgets here, and no
 * shared container to put pictures in. The `.native.ts` sibling holds
 * the real one; see `widgetStore` for why this is a file split rather
 * than a dynamic import.
 */
export interface ArtIO {
  /** Whether a file of this name is already in the container. */
  has(name: string): boolean;
  /** Download `url` into the container under `name`. False on failure. */
  save(name: string, url: string): Promise<boolean>;
  /** Delete every file the manifest no longer names. */
  prune(keep: ReadonlySet<string>): void;
}

export function widgetArtIO(): ArtIO | null {
  return null;
}
