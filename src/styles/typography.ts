import { StyleSheet } from 'react-native';

import { COLORS } from './colors';

export const TYPE = StyleSheet.create({
  h2: {
    fontFamily: 'Noah-Black',
    fontSize: 25,
    color: COLORS.lightGrey,
  },
  h3: {
    fontFamily: 'Noah-Bold',
    fontSize: 18,
    color: COLORS.lightGrey,
  },
  p: {
    fontFamily: 'Noah-Regular',
    fontSize: 12,
    color: COLORS.lightGrey,
  },
});
