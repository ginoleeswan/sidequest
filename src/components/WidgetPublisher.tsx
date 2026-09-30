/**
 * The web's widget publisher: nothing to publish to.
 *
 * The publisher watches the stores and hands the week, the year and
 * the artwork to the home-screen widgets; a browser has no widgets to
 * hand anything to, and the real one already did nothing here. Its
 * body — and the plan, year and art modules it works out the shapes
 * with — lives in `WidgetPublisher.native.tsx`, so the web bundle
 * stops carrying them.
 */
export function WidgetPublisher() {
  return null;
}
