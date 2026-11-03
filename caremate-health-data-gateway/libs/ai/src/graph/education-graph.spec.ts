import { selectBoundedHistory } from './education-graph';

describe('selectBoundedHistory', () => {
  it('returns chronological recent turns within message budget', () => {
    const messages = [
      { role: 'user' as const, content: 'What is hypertension?' },
      { role: 'assistant' as const, content: 'High blood pressure.' },
      { role: 'user' as const, content: 'What causes it?' },
      { role: 'assistant' as const, content: 'Diet, genetics, and more.' },
    ];

    const selected = selectBoundedHistory(messages, { maxMessages: 2 });
    expect(selected).toEqual([
      { role: 'user', content: 'What causes it?' },
      { role: 'assistant', content: 'Diet, genetics, and more.' },
    ]);
  });

  it('respects char budget from the newest messages', () => {
    const messages = [
      { role: 'user' as const, content: 'A'.repeat(100) },
      { role: 'assistant' as const, content: 'B'.repeat(100) },
      { role: 'user' as const, content: 'short ask' },
    ];

    const selected = selectBoundedHistory(messages, {
      maxMessages: 10,
      maxChars: 50,
    });
    expect(selected).toEqual([{ role: 'user', content: 'short ask' }]);
  });

  it('drops empty and non chat roles', () => {
    const selected = selectBoundedHistory([
      { role: 'user', content: '   ' },
      { role: 'assistant', content: 'Hello' },
      { role: 'user', content: 'Follow up?' },
    ]);
    expect(selected).toEqual([
      { role: 'assistant', content: 'Hello' },
      { role: 'user', content: 'Follow up?' },
    ]);
  });
});
