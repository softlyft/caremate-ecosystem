export type LearnInlineMark = 'bold' | 'italic' | 'underline' | 'strike' | 'code';

export type LearnTextNode = {
  type: 'text';
  text: string;
  marks: LearnInlineMark[];
};

export type LearnLinkNode = {
  type: 'link';
  href: string;
  children: LearnTextNode[];
};

export type LearnInlineNode = LearnTextNode | LearnLinkNode;

export type LearnBlock =
  | { type: 'heading'; level: 1 | 2 | 3; children: LearnInlineNode[] }
  | { type: 'paragraph'; children: LearnInlineNode[] }
  | { type: 'bulletList'; items: LearnInlineNode[][] }
  | { type: 'orderedList'; items: LearnInlineNode[][] }
  | { type: 'blockquote'; children: LearnInlineNode[] }
  | { type: 'hr' };
