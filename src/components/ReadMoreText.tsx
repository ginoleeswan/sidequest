import { useState } from 'react';
import { Pressable, Text, type StyleProp, type TextStyle } from 'react-native';

import { COLORS } from '@/styles/colors';

interface Props {
  children: string;
  numberOfLines?: number;
  style?: StyleProp<TextStyle>;
}

/** Collapsible text — replaces @fawazahmed/react-native-read-more. */
export function ReadMoreText({ children, numberOfLines = 3, style }: Props) {
  const [expanded, setExpanded] = useState(false);
  return (
    <Pressable onPress={() => setExpanded((e) => !e)}>
      <Text style={style} numberOfLines={expanded ? undefined : numberOfLines}>
        {children}
      </Text>
      <Text style={[style, { color: COLORS.blue, fontFamily: 'Noah-Bold' }]}>
        {expanded ? 'Show Less' : 'Read More'}
      </Text>
    </Pressable>
  );
}
