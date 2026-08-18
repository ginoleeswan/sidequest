import { StyleSheet } from 'react-native';

import { COLORS } from './colors';

/**
 * The type scale. Noah Black carries display and headings, Noah Bold
 * carries UI labels, Noah Regular carries prose.
 */
export const TYPE = StyleSheet.create({
  display: {
    fontFamily: 'Noah-Black',
    fontSize: 32,
    lineHeight: 36,
    color: COLORS.white,
  },
  h1: {
    fontFamily: 'Noah-Black',
    fontSize: 24,
    lineHeight: 28,
    color: COLORS.lightGrey,
  },
  h2: {
    fontFamily: 'Noah-Black',
    fontSize: 20,
    lineHeight: 24,
    color: COLORS.lightGrey,
  },
  h3: {
    fontFamily: 'Noah-Bold',
    fontSize: 16,
    lineHeight: 20,
    color: COLORS.lightGrey,
  },
  body: {
    fontFamily: 'Noah-Regular',
    fontSize: 14,
    lineHeight: 21,
    color: COLORS.lightGrey,
  },
  p: {
    fontFamily: 'Noah-Regular',
    fontSize: 13,
    lineHeight: 20,
    color: COLORS.lightGrey,
  },
  caption: {
    fontFamily: 'Noah-Regular',
    fontSize: 12,
    lineHeight: 16,
    color: COLORS.mediumGrey,
  },
  /** Tiny uppercase labels: stats, section eyebrows, nav headings. */
  micro: {
    fontFamily: 'Noah-Bold',
    fontSize: 10,
    letterSpacing: 1,
    textTransform: 'uppercase',
    color: COLORS.mediumGrey,
  },
});
