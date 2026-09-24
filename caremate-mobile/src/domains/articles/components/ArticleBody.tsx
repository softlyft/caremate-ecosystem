import * as WebBrowser from 'expo-web-browser';
import { type ReactNode } from 'react';
import { StyleSheet, type TextStyle, View } from 'react-native';

import { AppText } from '@/components/ui/AppText';
import { parseLearnContent, type LearnInlineNode } from '@caremate/learn-content';
import { palette } from '@/theme';

function renderInline(nodes: LearnInlineNode[], baseStyle: TextStyle = styles.paragraph): ReactNode[] {
  return nodes.map((node, index) => {
    if (node.type === 'link') {
      return (
        <AppText
          key={index}
          variant="body"
          style={[baseStyle, styles.link]}
          onPress={() => {
            void WebBrowser.openBrowserAsync(node.href);
          }}
        >
          {renderInline(node.children, { ...baseStyle, ...styles.link })}
        </AppText>
      );
    }

    return (
      <AppText
        key={index}
        variant="body"
        style={[
          baseStyle,
          node.marks.includes('bold') ? styles.bold : null,
          node.marks.includes('italic') ? styles.italic : null,
          node.marks.includes('underline') ? styles.underline : null,
          node.marks.includes('strike') ? styles.strike : null,
          node.marks.includes('code') ? styles.code : null,
        ]}
      >
        {node.text}
      </AppText>
    );
  });
}

export function ArticleBody({ content }: { content: string }) {
  const blocks = parseLearnContent(content);

  return (
    <View style={styles.stack}>
      {blocks.map((block, index) => {
        if (block.type === 'heading') {
          return (
            <AppText
              key={index}
              variant="body"
              style={block.level === 3 ? styles.heading3 : styles.heading2}
            >
              {renderInline(block.children, block.level === 3 ? styles.heading3 : styles.heading2)}
            </AppText>
          );
        }

        if (block.type === 'bulletList' || block.type === 'orderedList') {
          return (
            <View key={index} style={styles.list}>
              {block.items.map((item, itemIndex) => (
                <View key={itemIndex} style={styles.listItem}>
                  <AppText variant="body" style={styles.paragraph}>
                    {block.type === 'orderedList' ? `${itemIndex + 1}.` : '•'}
                  </AppText>
                  <AppText variant="body" style={[styles.paragraph, styles.listCopy]}>
                    {renderInline(item)}
                  </AppText>
                </View>
              ))}
            </View>
          );
        }

        if (block.type === 'blockquote') {
          return (
            <View key={index} style={styles.quote}>
              <AppText variant="body" style={styles.quoteText}>
                {renderInline(block.children, styles.quoteText)}
              </AppText>
            </View>
          );
        }

        if (block.type === 'hr') {
          return <View key={index} style={styles.rule} />;
        }

        return (
          <AppText key={index} variant="body" style={styles.paragraph}>
            {renderInline(block.children)}
          </AppText>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  stack: {
    gap: 16,
  },
  paragraph: {
    fontSize: 16,
    lineHeight: 28,
    color: palette.text,
  },
  heading2: {
    fontSize: 20,
    lineHeight: 26,
    fontWeight: '700',
    color: palette.text,
  },
  heading3: {
    fontSize: 18,
    lineHeight: 24,
    fontWeight: '600',
    color: palette.text,
  },
  bold: {
    fontWeight: '700',
  },
  italic: {
    fontStyle: 'italic',
  },
  underline: {
    textDecorationLine: 'underline',
  },
  strike: {
    textDecorationLine: 'line-through',
  },
  code: {
    fontSize: 14,
    backgroundColor: palette.background,
  },
  link: {
    color: palette.primary,
    fontWeight: '600',
    textDecorationLine: 'underline',
  },
  list: {
    gap: 8,
  },
  listItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
  },
  listCopy: {
    flex: 1,
  },
  quote: {
    borderLeftWidth: 3,
    borderLeftColor: palette.primary,
    paddingLeft: 12,
  },
  quoteText: {
    fontSize: 16,
    lineHeight: 26,
    color: palette.textSecondary,
    fontStyle: 'italic',
  },
  rule: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: palette.divider,
  },
});
