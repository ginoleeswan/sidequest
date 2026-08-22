import { forwardRef } from 'react';
import { Animated } from 'react-native';

/**
 * Wrap a react-native-svg component so `Animated.createAnimatedComponent`
 * can drive it without leaking a stray attribute onto the web DOM.
 *
 * `createAnimatedComponent` always forces `collapsable: false` onto the
 * props it hands its wrapped component — an Android-only hint telling
 * the native view layer not to flatten the view away, which the animated
 * driver needs so it has a real node to attach to
 * (react-native/src/private/animated/createAnimatedPropsHook.js). RN's
 * own `View` and `Text` never show this: react-native-web's
 * implementations of them destructure `collapsable` out before spreading
 * the rest onto the DOM node, so the prop is consumed and forgotten.
 * react-native-svg's components have no such awareness — an SVG element
 * has no view-flattening concept to hint about — so they forward
 * whatever they don't recognise straight through to the underlying DOM
 * node. `collapsable={false}` then lands there as a literal camelCase
 * attribute, and React warns that it isn't a valid non-boolean one.
 *
 * This sits one layer inside `createAnimatedComponent` and strips the
 * prop before it ever reaches the SVG component, so the DOM never sees
 * it. Everything else — every other prop, and the ref, which react-
 * native-svg's components use for imperative methods like
 * `setNativeProps` — passes through untouched, so this changes nothing
 * about how the animation actually runs.
 */
// The `any` bound here matches the one `Animated.createAnimatedComponent`
// itself uses; a narrower bound can't express "any react-native-svg
// component" while still letting the result come back typed as that
// exact component.
export function animatedSvg<T extends React.ComponentType<any>>(
  Component: T
): Animated.AnimatedComponent<T> {
  const Filtered = forwardRef<unknown, Record<string, unknown>>(
    function AnimatedSvgFiltered(props, ref) {
      const { collapsable: _collapsable, ...rest } = props;
      // `Component` is generic over `T`, so TS can't confirm its props and
      // ref line up with this untyped pass-through wrapper — but at every
      // call site below it's a react-native-svg class component, whose
      // instance is exactly what `ref` points at and whose props are
      // exactly `rest`, so the cast is just telling TS what's already true.
      const AnyComponent = Component as unknown as React.ComponentType<
        Record<string, unknown> & { ref?: typeof ref }
      >;
      return <AnyComponent ref={ref} {...rest} />;
    }
  );
  Filtered.displayName = `AnimatedSvg(${Component.displayName ?? 'Component'})`;
  // Cast `Filtered` to `T` and the result back to `Animated.AnimatedComponent<T>`:
  // `Filtered` is a same-shaped runtime pass-through of `Component`, so this
  // makes `createAnimatedComponent` compute `AnimatedProps` from `T` exactly
  // as it would have for `Component` itself — callers get the identical
  // prop types they'd have gotten from `Animated.createAnimatedComponent(Component)`.
  return Animated.createAnimatedComponent(
    Filtered as unknown as T
  ) as Animated.AnimatedComponent<T>;
}
