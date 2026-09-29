import type { LearnBlock, LearnInlineMark, LearnInlineNode, LearnTextNode } from './types';

const HTML_BLOCK_TAG = /<\/?(p|h[1-6]|ul|ol|li|blockquote|div|section|article|br)\b/i;
const MARKDOWN_BLOCK = /(?:^|\n)\s{0,3}(?:#{1,3}\s|[-*+]\s|\d+\.\s|>\s|---+$)/m;
const MARKDOWN_INLINE = /(\*\*|__|(^|[^\w])\*|\[.+\]\(|<u>|<strong>|<em>|<a\s)/i;

const ENTITY_MAP: Record<string, string> = {
  '&amp;': '&',
  '&lt;': '<',
  '&gt;': '>',
  '&quot;': '"',
  '&#39;': "'",
  '&nbsp;': ' ',
};

export function looksLikeHtmlDocument(value: string): boolean {
  return HTML_BLOCK_TAG.test(value);
}

export function sanitizeLearnHref(href: string): string | null {
  const trimmed = href.trim();
  if (!trimmed || /^javascript:/i.test(trimmed)) return null;
  if (/^(https?:|mailto:|\/|#)/i.test(trimmed)) return trimmed;
  return null;
}

function decodeEntities(value: string): string {
  return value.replace(/&(?:amp|lt|gt|quot|#39|nbsp);/g, (entity) => ENTITY_MAP[entity] ?? entity);
}

function stripRemainingTags(value: string): string {
  return decodeEntities(value.replace(/<[^>]+>/g, ''));
}

/** Best-effort HTML → markdown so TipTap HTML and seeded text share one renderer. */
export function htmlToMarkdown(html: string): string {
  return decodeEntities(
    html
      .replace(/\r\n/g, '\n')
      .replace(/<br\s*\/?>/gi, '\n')
      .replace(/<\/p>/gi, '\n\n')
      .replace(/<p[^>]*>/gi, '')
      .replace(/<h([1-3])[^>]*>/gi, (_match, level: string) => `${'#'.repeat(Number(level))} `)
      .replace(/<\/h[1-3]>/gi, '\n\n')
      .replace(/<(strong|b)>/gi, '**')
      .replace(/<\/(strong|b)>/gi, '**')
      .replace(/<(em|i)>/gi, '*')
      .replace(/<\/(em|i)>/gi, '*')
      .replace(/<u>/gi, '<u>')
      .replace(/<\/u>/gi, '</u>')
      .replace(/<(s|del|strike)>/gi, '~~')
      .replace(/<\/(s|del|strike)>/gi, '~~')
      .replace(/<a\b[^>]*href=["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>/gi, (_m, href: string, label: string) => {
        const safe = sanitizeLearnHref(href);
        const text = stripRemainingTags(label);
        return safe ? `[${text}](${safe})` : text;
      })
      .replace(/<li[^>]*>/gi, '- ')
      .replace(/<\/li>/gi, '\n')
      .replace(/<\/?(ul|ol)[^>]*>/gi, '\n')
      .replace(/<blockquote[^>]*>/gi, '> ')
      .replace(/<\/blockquote>/gi, '\n\n')
      .replace(/<hr\s*\/?>/gi, '\n\n---\n\n')
      .replace(/<[^>]+>/g, ''),
  )
    .replace(/[ \t]+\n/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

function hasRichSyntax(content: string): boolean {
  return looksLikeHtmlDocument(content) || MARKDOWN_BLOCK.test(content) || MARKDOWN_INLINE.test(content);
}

function textNode(text: string, marks: LearnInlineMark[] = []): LearnTextNode {
  return { type: 'text', text, marks };
}

function uniqueMarks(marks: LearnInlineMark[]): LearnInlineMark[] {
  return [...new Set(marks)];
}

function takeWrapped(
  input: string,
  start: number,
  open: string,
  close: string,
): { inner: string; end: number } | null {
  if (!input.startsWith(open, start)) return null;
  const closeAt = input.indexOf(close, start + open.length);
  if (closeAt === -1) return null;
  return { inner: input.slice(start + open.length, closeAt), end: closeAt + close.length };
}

function parseInline(input: string, inherited: LearnInlineMark[] = []): LearnInlineNode[] {
  const nodes: LearnInlineNode[] = [];
  let buffer = '';
  let index = 0;

  const flush = () => {
    if (!buffer) return;
    nodes.push(textNode(buffer, inherited));
    buffer = '';
  };

  while (index < input.length) {
    if (input.startsWith('<u>', index)) {
      const wrapped = takeWrapped(input, index, '<u>', '</u>');
      if (wrapped) {
        flush();
        nodes.push(...parseInline(wrapped.inner, uniqueMarks([...inherited, 'underline'])));
        index = wrapped.end;
        continue;
      }
    }

    if (input[index] === '[') {
      const closeLabel = input.indexOf('](', index);
      let closeHref = -1;
      if (closeLabel > index) {
        let depth = 1;
        for (let cursor = closeLabel + 2; cursor < input.length; cursor += 1) {
          const char = input[cursor];
          if (char === '(') depth += 1;
          if (char === ')') {
            depth -= 1;
            if (depth === 0) {
              closeHref = cursor;
              break;
            }
          }
        }
      }
      if (closeLabel > index && closeHref > closeLabel) {
        const label = input.slice(index + 1, closeLabel);
        const href = sanitizeLearnHref(input.slice(closeLabel + 2, closeHref));
        const children = parseInline(label, inherited).flatMap((node) =>
          node.type === 'text' ? [node] : node.children,
        );
        flush();
        if (href) {
          nodes.push({ type: 'link', href, children });
        } else {
          nodes.push(...children);
        }
        index = closeHref + 1;
        continue;
      }
    }

    const wrappers: Array<{ open: string; close: string; marks: LearnInlineMark[] }> = [
      { open: '***', close: '***', marks: ['bold', 'italic'] },
      { open: '**', close: '**', marks: ['bold'] },
      { open: '__', close: '__', marks: ['bold'] },
      { open: '~~', close: '~~', marks: ['strike'] },
      { open: '*', close: '*', marks: ['italic'] },
      { open: '_', close: '_', marks: ['italic'] },
      { open: '`', close: '`', marks: ['code'] },
    ];

    let matched = false;
    for (const wrapper of wrappers) {
      const wrapped = takeWrapped(input, index, wrapper.open, wrapper.close);
      if (!wrapped || !wrapped.inner) continue;
      if ((wrapper.open === '*' || wrapper.open === '_') && /\s/.test(wrapped.inner[0] ?? '')) continue;
      flush();
      if (wrapper.marks.includes('code')) {
        nodes.push(textNode(wrapped.inner, uniqueMarks([...inherited, 'code'])));
      } else {
        nodes.push(...parseInline(wrapped.inner, uniqueMarks([...inherited, ...wrapper.marks])));
      }
      index = wrapped.end;
      matched = true;
      break;
    }
    if (matched) continue;

    buffer += input[index];
    index += 1;
  }

  flush();
  return nodes.filter((node) => node.type === 'link' || node.text.length > 0);
}

function isBlockStart(line: string): boolean {
  return /^(#{1,3}\s|[-*+]\s|\d+\.\s|>\s|---+$)/.test(line.trim());
}

function parseMarkdownBlocks(markdown: string): LearnBlock[] {
  const lines = markdown.replace(/\r\n/g, '\n').split('\n');
  const blocks: LearnBlock[] = [];
  let index = 0;

  while (index < lines.length) {
    const raw = lines[index] ?? '';
    const line = raw.trimEnd();
    if (!line.trim()) {
      index += 1;
      continue;
    }

    if (/^---+$/.test(line.trim())) {
      blocks.push({ type: 'hr' });
      index += 1;
      continue;
    }

    const heading = /^(#{1,3})\s+(.+)$/.exec(line.trim());
    if (heading) {
      const level = heading[1]!.length as 1 | 2 | 3;
      blocks.push({ type: 'heading', level, children: parseInline(heading[2] ?? '') });
      index += 1;
      continue;
    }

    if (/^>\s?/.test(line)) {
      const quoted: string[] = [];
      while (index < lines.length && /^>\s?/.test(lines[index] ?? '')) {
        quoted.push((lines[index] ?? '').replace(/^>\s?/, ''));
        index += 1;
      }
      blocks.push({ type: 'blockquote', children: parseInline(quoted.join(' ').trim()) });
      continue;
    }

    if (/^\s*[-*+]\s+/.test(line)) {
      const items: LearnInlineNode[][] = [];
      while (index < lines.length && /^\s*[-*+]\s+/.test(lines[index] ?? '')) {
        items.push(parseInline((lines[index] ?? '').replace(/^\s*[-*+]\s+/, '')));
        index += 1;
      }
      blocks.push({ type: 'bulletList', items });
      continue;
    }

    if (/^\s*\d+\.\s+/.test(line)) {
      const items: LearnInlineNode[][] = [];
      while (index < lines.length && /^\s*\d+\.\s+/.test(lines[index] ?? '')) {
        items.push(parseInline((lines[index] ?? '').replace(/^\s*\d+\.\s+/, '')));
        index += 1;
      }
      blocks.push({ type: 'orderedList', items });
      continue;
    }

    const paragraph: string[] = [];
    while (index < lines.length) {
      const current = lines[index] ?? '';
      if (!current.trim() || isBlockStart(current)) break;
      paragraph.push(current.trim());
      index += 1;
    }
    blocks.push({ type: 'paragraph', children: parseInline(paragraph.join(' ')) });
  }

  return blocks;
}

export function parseLearnContent(content: string): LearnBlock[] {
  const trimmed = content.replace(/\r\n/g, '\n').trim();
  if (!trimmed) return [];

  if (!hasRichSyntax(trimmed)) {
    return trimmed
      .split(/\n+/)
      .map((part) => part.trim())
      .filter(Boolean)
      .map((part) => ({ type: 'paragraph' as const, children: [textNode(part)] }));
  }

  const markdown = looksLikeHtmlDocument(trimmed) ? htmlToMarkdown(trimmed) : trimmed;
  return parseMarkdownBlocks(markdown);
}

export function learnContentToPlainText(content: string): string {
  return parseLearnContent(content)
    .flatMap((block) => {
      if (block.type === 'hr') return [];
      if (block.type === 'bulletList' || block.type === 'orderedList') {
        return block.items.map((item) => item.map(inlinePlain).join(''));
      }
      return [block.children.map(inlinePlain).join('')];
    })
    .filter(Boolean)
    .join('\n\n');
}

function inlinePlain(node: LearnInlineNode): string {
  return node.type === 'text' ? node.text : node.children.map((child) => child.text).join('');
}
