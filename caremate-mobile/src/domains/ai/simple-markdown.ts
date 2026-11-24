export type SimpleMarkdownSegment =
  | { type: 'text'; text: string }
  | { type: 'bold'; text: string }
  | { type: 'italic'; text: string }
  | { type: 'code'; text: string };

/**
 * Lightweight inline markdown for CareMate AI bubbles.
 * Supports **bold**, __bold__, *italic*, _italic_, and `code`.
 * Does not handle nested markers or full CommonMark.
 */
export function parseSimpleMarkdown(input: string): SimpleMarkdownSegment[] {
  if (!input) {
    return [{ type: 'text', text: '' }];
  }

  const pattern = /\*\*([^*]+)\*\*|__([^_]+)__|`([^`]+)`|\*([^*\n]+)\*|_([^_\n]+)_/g;
  const segments: SimpleMarkdownSegment[] = [];
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = pattern.exec(input)) !== null) {
    if (match.index > lastIndex) {
      segments.push({ type: 'text', text: input.slice(lastIndex, match.index) });
    }

    if (match[1] != null) {
      segments.push({ type: 'bold', text: match[1] });
    } else if (match[2] != null) {
      segments.push({ type: 'bold', text: match[2] });
    } else if (match[3] != null) {
      segments.push({ type: 'code', text: match[3] });
    } else if (match[4] != null) {
      segments.push({ type: 'italic', text: match[4] });
    } else if (match[5] != null) {
      segments.push({ type: 'italic', text: match[5] });
    }

    lastIndex = match.index + match[0].length;
  }

  if (lastIndex < input.length) {
    segments.push({ type: 'text', text: input.slice(lastIndex) });
  }

  return segments.length > 0 ? segments : [{ type: 'text', text: input }];
}
