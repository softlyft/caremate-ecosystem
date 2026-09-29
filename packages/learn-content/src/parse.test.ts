import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import {
  htmlToMarkdown,
  learnContentToPlainText,
  looksLikeHtmlDocument,
  parseLearnContent,
  sanitizeLearnHref,
} from './parse';

describe('sanitizeLearnHref', () => {
  it('allows http(s), mailto, hashes, and paths', () => {
    assert.equal(sanitizeLearnHref('https://getcaremate.com/privacy'), 'https://getcaremate.com/privacy');
    assert.equal(sanitizeLearnHref('/articles'), '/articles');
    assert.equal(sanitizeLearnHref('#notes'), '#notes');
    assert.equal(sanitizeLearnHref('mailto:help@getcaremate.com'), 'mailto:help@getcaremate.com');
  });

  it('rejects javascript URLs', () => {
    assert.equal(sanitizeLearnHref('javascript:alert(1)'), null);
  });
});

describe('parseLearnContent', () => {
  it('splits legacy plain text on any newline', () => {
    const blocks = parseLearnContent('First line\nSecond line\n\nThird');
    assert.deepEqual(
      blocks.map((block) => (block.type === 'paragraph' ? block.children[0] : null)),
      [
        { type: 'text', text: 'First line', marks: [] },
        { type: 'text', text: 'Second line', marks: [] },
        { type: 'text', text: 'Third', marks: [] },
      ],
    );
  });

  it('parses headings, emphasis, lists, quotes, and links', () => {
    const blocks = parseLearnContent(
      [
        '## Why it matters',
        '',
        'Most adults need **seven to nine** hours, or *more* after illness.',
        '',
        '- Darker room',
        '- Cooler room',
        '',
        '1. Log bedtime',
        '2. Log wake time',
        '',
        '> Talk to a clinician if snoring is loud.',
        '',
        'Read the [privacy policy](https://www.getcaremate.com/privacy) and <u>keep notes</u>.',
      ].join('\n'),
    );

    assert.equal(blocks[0]?.type, 'heading');
    assert.equal(blocks[1]?.type, 'paragraph');
    assert.equal(blocks[2]?.type, 'bulletList');
    assert.equal(blocks[3]?.type, 'orderedList');
    assert.equal(blocks[4]?.type, 'blockquote');
    assert.equal(blocks[5]?.type, 'paragraph');

    const paragraph = blocks[1];
    assert.ok(paragraph && paragraph.type === 'paragraph');
    const bold = paragraph.children.find((node) => node.type === 'text' && node.marks.includes('bold'));
    const italic = paragraph.children.find((node) => node.type === 'text' && node.marks.includes('italic'));
    assert.equal(bold && bold.type === 'text' ? bold.text : '', 'seven to nine');
    assert.equal(italic && italic.type === 'text' ? italic.text : '', 'more');

    const closing = blocks[5];
    assert.ok(closing && closing.type === 'paragraph');
    const link = closing.children.find((node) => node.type === 'link');
    assert.ok(link && link.type === 'link');
    assert.equal(link.href, 'https://www.getcaremate.com/privacy');
    const underline = closing.children.find((node) => node.type === 'text' && node.marks.includes('underline'));
    assert.equal(underline && underline.type === 'text' ? underline.text : '', 'keep notes');
  });

  it('converts stored HTML into the same block model', () => {
    const blocks = parseLearnContent(
      '<h2>Sleep</h2><p>Need <strong>rest</strong> and <em>recovery</em>.</p><ul><li>Dark</li><li>Cool</li></ul>',
    );
    assert.equal(blocks[0]?.type, 'heading');
    assert.equal(blocks[1]?.type, 'paragraph');
    assert.equal(blocks[2]?.type, 'bulletList');
    assert.equal(learnContentToPlainText('<p>Need rest.</p>'), 'Need rest.');
  });

  it('drops javascript links', () => {
    const [block] = parseLearnContent('See [bad](javascript:alert(1)) now');
    assert.ok(block && block.type === 'paragraph');
    assert.equal(block.children.some((node) => node.type === 'link'), false);
    assert.equal(learnContentToPlainText('See [bad](javascript:alert(1)) now'), 'See bad now');
  });
});

describe('htmlToMarkdown', () => {
  it('recognizes HTML documents', () => {
    assert.equal(looksLikeHtmlDocument('<p>Hello</p>'), true);
    assert.equal(looksLikeHtmlDocument('Hello **there**'), false);
  });

  it('round-trips basic tags', () => {
    assert.equal(htmlToMarkdown('<p>Hello <strong>world</strong></p>'), 'Hello **world**');
  });
});
