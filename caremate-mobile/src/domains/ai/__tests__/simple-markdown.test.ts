import { parseSimpleMarkdown } from '@/domains/ai/simple-markdown';

describe('parseSimpleMarkdown', () => {
  it('returns plain text unchanged', () => {
    expect(parseSimpleMarkdown('Hello world')).toEqual([{ type: 'text', text: 'Hello world' }]);
  });

  it('parses **bold** markers', () => {
    expect(parseSimpleMarkdown('Say **Bold Text** please')).toEqual([
      { type: 'text', text: 'Say ' },
      { type: 'bold', text: 'Bold Text' },
      { type: 'text', text: ' please' },
    ]);
  });

  it('parses italic, code, and mixed markers', () => {
    expect(parseSimpleMarkdown('Use *care* and `dose` daily')).toEqual([
      { type: 'text', text: 'Use ' },
      { type: 'italic', text: 'care' },
      { type: 'text', text: ' and ' },
      { type: 'code', text: 'dose' },
      { type: 'text', text: ' daily' },
    ]);
  });

  it('prefers bold over italic when using double asterisks', () => {
    expect(parseSimpleMarkdown('**keep**')).toEqual([{ type: 'bold', text: 'keep' }]);
  });
});
