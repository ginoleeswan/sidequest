/**
 * Strings in the source that are valid Ionicons glyph names but are not
 * icon usages — a DOM event, an ARIA role, a CSS property, a seam
 * variant that happens to share a name with the credit-card glyph.
 *
 * One list, read by both sides of the contract: the subset generator
 * skips these when it scans the source, and the subset test skips them
 * when it checks the scan against the font. When the two lists were
 * separate they drifted within a week — the generator baked the
 * test's own denylist strings into the font as icons.
 */
export const NOT_ICONS = [
  'resize',
  'radio',
  'filter',
  'card',
  // The module that puts text on the clipboard. Copying is drawn with
  // the copy glyph; this one has never been used.
  'clipboard',
  // The ARIA role, asserted on in tests. The icons in use are
  // alert-circle and alert-circle-outline, which are their own names.
  'alert',
  // React Native's Share.share, spied on by method name in tests. The
  // drawn share icon is share-outline, which is its own name.
  'share',
  // The OAuth query parameter a provider redirects back with, read in
  // lib/supabase to decide whether this page load has a session in it.
  'code',
  // window.location, stubbed in the supabase client's tests. There is
  // no map in this app and never has been.
  'location',
] as const;
