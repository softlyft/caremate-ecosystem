import { classifyUserMessage } from './policy';

describe('classifyUserMessage', () => {
  it('allows general education questions', () => {
    const result = classifyUserMessage('What is blood pressure?');
    expect(result.action).toBe('allow');
    expect(result.intent).toBe('education');
  });

  it('refuses prescribing / dose change asks', () => {
    const result = classifyUserMessage('Should I increase my dose of metformin?');
    expect(result.action).toBe('refuse');
  });

  it('flags emergency chest pain', () => {
    const result = classifyUserMessage('I have severe chest pain and cannot breathe');
    expect(result.action).toBe('emergency');
  });
});
