import { useMemo } from 'react';
import { StyleSheet, Text, type StyleProp, type TextStyle } from 'react-native';

import { parseSimpleMarkdown } from '@/domains/ai/simple-markdown';
import { fontFamily, palette, radius } from '@/theme';

type AiMarkdownTextProps = {
  content: string;
  style?: StyleProp<TextStyle>;
};

/** Renders common AI markdown markers as nested Text styles inside a bubble. */
export function AiMarkdownText({ content, style }: AiMarkdownTextProps) {
  const segments = useMemo(() => parseSimpleMarkdown(content), [content]);

  return (
    <Text style={style}>
      {segments.map((segment, index) => {
        if (segment.type === 'text') {
          return <Text key={`t-${index}`}>{segment.text}</Text>;
        }
        if (segment.type === 'bold') {
          return (
            <Text key={`b-${index}`} style={styles.bold}>
              {segment.text}
            </Text>
          );
        }
        if (segment.type === 'italic') {
          return (
            <Text key={`i-${index}`} style={styles.italic}>
              {segment.text}
            </Text>
          );
        }
        return (
          <Text key={`c-${index}`} style={styles.code}>
            {segment.text}
          </Text>
        );
      })}
    </Text>
  );
}

const styles = StyleSheet.create({
  bold: {
    fontFamily: fontFamily.semiBold,
    fontWeight: '600',
  },
  italic: {
    fontStyle: 'italic',
  },
  code: {
    fontFamily: fontFamily.fallback,
    backgroundColor: 'rgba(15, 23, 42, 0.06)',
    borderRadius: radius.sm,
    paddingHorizontal: 3,
    color: palette.text,
  },
});
