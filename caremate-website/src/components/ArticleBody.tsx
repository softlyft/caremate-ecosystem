import type { ReactNode } from 'react';

import { parseLearnContent, type LearnInlineNode } from '@caremate/learn-content';

import styles from '@/pages/Articles.module.css';

function renderInline(nodes: LearnInlineNode[]): ReactNode[] {
  return nodes.map((node, index) => {
    if (node.type === 'link') {
      return (
        <a key={index} href={node.href} target="_blank" rel="noopener noreferrer">
          {renderInline(node.children)}
        </a>
      );
    }

    let content: ReactNode = node.text;
    if (node.marks.includes('code')) content = <code>{content}</code>;
    if (node.marks.includes('bold')) content = <strong>{content}</strong>;
    if (node.marks.includes('italic')) content = <em>{content}</em>;
    if (node.marks.includes('underline')) content = <u>{content}</u>;
    if (node.marks.includes('strike')) content = <s>{content}</s>;
    return <span key={index}>{content}</span>;
  });
}

export function ArticleBody({ content }: { content: string }) {
  const blocks = parseLearnContent(content);

  return (
    <div className={styles.body}>
      {blocks.map((block, index) => {
        if (block.type === 'heading') {
          const Heading = block.level === 3 ? 'h3' : 'h2';
          return <Heading key={index}>{renderInline(block.children)}</Heading>;
        }
        if (block.type === 'bulletList') {
          return (
            <ul key={index}>
              {block.items.map((item, itemIndex) => (
                <li key={itemIndex}>{renderInline(item)}</li>
              ))}
            </ul>
          );
        }
        if (block.type === 'orderedList') {
          return (
            <ol key={index}>
              {block.items.map((item, itemIndex) => (
                <li key={itemIndex}>{renderInline(item)}</li>
              ))}
            </ol>
          );
        }
        if (block.type === 'blockquote') {
          return <blockquote key={index}>{renderInline(block.children)}</blockquote>;
        }
        if (block.type === 'hr') {
          return <hr key={index} />;
        }
        return <p key={index}>{renderInline(block.children)}</p>;
      })}
    </div>
  );
}
