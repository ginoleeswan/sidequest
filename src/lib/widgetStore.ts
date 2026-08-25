/**
 * Web's half of the widget bridge: there are no widgets here.
 *
 * The `.native.ts` sibling holds the real store. A file split rather
 * than a dynamic import for two reasons: Metro follows imports
 * statically, so this keeps @bacons/apple-targets out of the web bundle
 * entirely — and jest's VM cannot execute a dynamic import() at all,
 * which made the bridge silently untestable: the catch around it read
 * "no native module" when the truth was "no module system".
 */
export interface WidgetStore {
  store: {
    set(key: string, value: string): void;
    remove(key: string): void;
  };
  reload: (kind: string) => void;
}

export function widgetStore(): WidgetStore | null {
  return null;
}
